import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { projects, repositories, testCases, testExecutions, users } from '@/db/schema';
import type { TestCase, ExecutionRecord } from '@/components/test-suite/types';

export type WorkspaceHydratedRepository = {
    id: number;
    databaseId?: number;
    projectId: string;
    name: string;
    full_name: string;
    owner: {
        login: string;
    };
    html_url: string;
    default_branch: string;
    private: boolean;
    description: string | null;
    language: string | null;
    targetEnvironmentUrl: string;
    updated_at: string;
    testCases?: TestCase[];
};

export type WorkspaceProjectData = {
    project: typeof projects.$inferSelect;
    repository: WorkspaceHydratedRepository;
    testCases: TestCase[];
    executions: Record<number, ExecutionRecord>;
};

/**
 * Loads and hydrates project data, repository metadata, test cases, and latest execution states
 * for a specific projectId belonging to the authenticated Clerk user.
 */
export async function getWorkspaceProjectData(
    projectId: string,
    clerkUserId: string
): Promise<WorkspaceProjectData | null> {
    if (!projectId || !clerkUserId) {
        return null;
    }

    const cleanProjectId = String(projectId).trim();

    try {
        // 1. Look up the project in the projects table for this user
        const [foundProject] = await db
            .select()
            .from(projects)
            .where(
                and(
                    eq(projects.id, cleanProjectId),
                    eq(projects.userId, clerkUserId)
                )
            )
            .limit(1);

        let projectRecord = foundProject ?? null;

        // 2. Fetch app user to check corresponding repositories
        const [appUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, clerkUserId))
            .limit(1);

        // If not found in projects, check if projectId corresponds to a repositories record
        if (!projectRecord && appUser) {
            const parsedNumId = Number(cleanProjectId);
            if (Number.isInteger(parsedNumId) && parsedNumId > 0) {
                const [matchedRepo] = await db
                    .select()
                    .from(repositories)
                    .where(
                        and(
                            eq(repositories.userId, appUser.id),
                            or(
                                eq(repositories.id, parsedNumId),
                                eq(repositories.githubRepoId, parsedNumId)
                            )
                        )
                    )
                    .limit(1);

                if (matchedRepo) {
                    // Auto-sync into projects table
                    const [createdProject] = await db
                        .insert(projects)
                        .values({
                            id: String(matchedRepo.id),
                            userId: clerkUserId,
                            repoName: matchedRepo.name,
                            repoUrl: matchedRepo.url,
                            defaultBranch: matchedRepo.defaultBranch || 'main',
                            environmentUrl: matchedRepo.targetEnvironmentUrl || 'http://localhost:3000',
                            createdAt: matchedRepo.connectedAt || new Date(),
                        })
                        .onConflictDoUpdate({
                            target: projects.id,
                            set: {
                                repoName: matchedRepo.name,
                                environmentUrl: matchedRepo.targetEnvironmentUrl,
                            },
                        })
                        .returning();

                    projectRecord = createdProject;
                }
            }
        }

        if (!projectRecord) {
            return null;
        }

        // 3. Find matching repository record for rich metadata (language, isPrivate, etc.)
        let matchedRepository = null;
        if (appUser) {
            const parsedId = Number(projectRecord.id);
            const repoConditions = [
                eq(repositories.userId, appUser.id),
                eq(repositories.name, projectRecord.repoName),
            ];

            const [foundRepo] = await db
                .select()
                .from(repositories)
                .where(
                    and(
                        eq(repositories.userId, appUser.id),
                        or(
                            eq(repositories.name, projectRecord.repoName),
                            Number.isInteger(parsedId) && parsedId > 0 ? eq(repositories.id, parsedId) : undefined
                        )
                    )
                )
                .limit(1);

            matchedRepository = foundRepo ?? null;
        }

        // Hydrate repository metadata
        const ownerLogin = matchedRepository?.owner || projectRecord.repoName.split('/')[0] || 'owner';
        const repoFullName = matchedRepository?.fullName || (projectRecord.repoName.includes('/') ? projectRecord.repoName : `${ownerLogin}/${projectRecord.repoName}`);
        const repoUrl = matchedRepository?.url || projectRecord.repoUrl || `https://github.com/${repoFullName}`;
        const fallbackDatabaseId = Number(projectRecord.id) || 1;

        const hydratedRepo: WorkspaceHydratedRepository = {
            id: matchedRepository?.githubRepoId || fallbackDatabaseId,
            databaseId: matchedRepository?.id || fallbackDatabaseId,
            projectId: projectRecord.id,
            name: matchedRepository?.name || projectRecord.repoName,
            full_name: repoFullName,
            owner: {
                login: ownerLogin,
            },
            html_url: repoUrl,
            default_branch: projectRecord.defaultBranch || matchedRepository?.defaultBranch || 'main',
            private: matchedRepository?.isPrivate ?? false,
            description: matchedRepository?.description ?? null,
            language: matchedRepository?.language ?? null,
            targetEnvironmentUrl: projectRecord.environmentUrl || matchedRepository?.targetEnvironmentUrl || 'http://localhost:3000',
            updated_at: projectRecord.createdAt ? new Date(projectRecord.createdAt).toISOString() : new Date().toISOString(),
        };

        // 4. Fetch test cases associated with this project / repository
        const testCaseConditions = [eq(testCases.projectId, projectRecord.id)];
        const projectNum = Number(projectRecord.id);
        if (Number.isInteger(projectNum) && projectNum > 0) {
            testCaseConditions.push(eq(testCases.repositoryId, projectNum));
        }
        if (matchedRepository?.id) {
            testCaseConditions.push(eq(testCases.repositoryId, matchedRepository.id));
        }

        const projectTestCases = await db
            .select()
            .from(testCases)
            .where(or(...testCaseConditions));

        const mappedTests: TestCase[] = projectTestCases.map((tc) => ({
            id: tc.id,
            title: tc.title,
            description: tc.description,
            type: tc.type,
            priority: tc.priority,
            category: (tc as unknown as { category?: string }).category,
            targetRoute: tc.targetRoute,
            targetFiles: Array.isArray(tc.targetFiles) ? (tc.targetFiles as string[]) : [],
            expectedResult: tc.expectedResult,
            actionSteps: Array.isArray(tc.actionSteps) ? (tc.actionSteps as TestCase['actionSteps']) : undefined,
        }));

        hydratedRepo.testCases = mappedTests;

        // 5. Fetch recent executions for these test cases
        const testIds = projectTestCases.map((t) => t.id);
        const executionsMap: Record<number, ExecutionRecord> = {};

        if (testIds.length > 0) {
            const allExecutions = await db
                .select()
                .from(testExecutions)
                .where(inArray(testExecutions.testCaseId, testIds))
                .orderBy(desc(testExecutions.createdAt));

            for (const exec of allExecutions) {
                if (!executionsMap[exec.testCaseId]) {
                    executionsMap[exec.testCaseId] = {
                        testCaseId: exec.testCaseId,
                        status: (exec.status as ExecutionRecord['status']) || 'passed',
                        sessionId: exec.sessionId ?? undefined,
                        sessionUrl: exec.sessionUrl ?? undefined,
                        logs: typeof exec.logs === 'string' ? exec.logs.split('\n') : [],
                        error: exec.error ?? undefined,
                        completedAt: exec.completedAt ? new Date(exec.completedAt).toISOString() : undefined,
                    };
                }
            }
        }

        return {
            project: projectRecord,
            repository: hydratedRepo,
            testCases: mappedTests,
            executions: executionsMap,
        };
    } catch (error) {
        console.error('[getWorkspaceProjectData] Error:', error);
        return null;
    }
}
