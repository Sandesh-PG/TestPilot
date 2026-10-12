import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { projects, testCases, testExecutions, repositories, users } from '@/db/schema';

export type ProjectDashboardItem = {
    id: string;
    userId: string;
    repoName: string;
    repoUrl: string | null;
    defaultBranch: string | null;
    environmentUrl: string | null;
    createdAt: Date;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    pendingTests: number;
    successRate: number;
    lastRunAt: Date | null;
    health: 'healthy' | 'failing' | 'idle';
};

export type GlobalDashboardStats = {
    totalProjects: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    overallPassRate: number;
};

export type UserDashboardData = {
    projects: ProjectDashboardItem[];
    stats: GlobalDashboardStats;
};

/**
 * Fetches all connected projects and aggregated test suite metrics for a given Clerk user.
 * Joins test_cases and determines the latest test_execution status per test case.
 */
export async function getUserDashboardData(userId: string): Promise<UserDashboardData> {
    if (!userId) {
        return {
            projects: [],
            stats: {
                totalProjects: 0,
                totalTests: 0,
                totalPassed: 0,
                totalFailed: 0,
                overallPassRate: 0,
            },
        };
    }

    try {
        // 1. Parallelize initial lookup: fetch app user and existing user projects concurrently
        const [[appUser], userProjectsInitial] = await Promise.all([
            db
                .select()
                .from(users)
                .where(eq(users.clerkId, userId))
                .limit(1),
            db
                .select()
                .from(projects)
                .where(eq(projects.userId, userId))
                .orderBy(desc(projects.createdAt)),
        ]);

        let userProjects = userProjectsInitial;

        // 2. If appUser exists, check if any connected repositories in `repositories` need syncing into `projects`
        if (appUser) {
            const userRepos = await db
                .select()
                .from(repositories)
                .where(eq(repositories.userId, appUser.id));

            const existingProjectIds = new Set(userProjectsInitial.map((p) => p.id));
            const missingRepos = userRepos.filter((repo) => !existingProjectIds.has(String(repo.id)));

            if (missingRepos.length > 0) {
                await Promise.all(
                    missingRepos.map(async (repo) => {
                        const projectId = String(repo.id);
                        await db.insert(projects).values({
                            id: projectId,
                            userId,
                            repoName: repo.name,
                            repoUrl: repo.url,
                            defaultBranch: repo.defaultBranch || 'main',
                            environmentUrl: repo.targetEnvironmentUrl || 'http://localhost:3000',
                            createdAt: repo.connectedAt || new Date(),
                        });

                        // Link orphaned test cases to this project ID
                        await db
                            .update(testCases)
                            .set({ projectId })
                            .where(
                                and(
                                    eq(testCases.repositoryId, repo.id),
                                    isNull(testCases.projectId)
                                )
                            );
                    })
                );

                // Refresh userProjects after inserting missing repos
                userProjects = await db
                    .select()
                    .from(projects)
                    .where(eq(projects.userId, userId))
                    .orderBy(desc(projects.createdAt));
            }
        }

        if (userProjects.length === 0) {
            return {
                projects: [],
                stats: {
                    totalProjects: 0,
                    totalTests: 0,
                    totalPassed: 0,
                    totalFailed: 0,
                    overallPassRate: 0,
                },
            };
        }

        const projectIds = userProjects.map((p) => p.id);
        const repoNumericIds = projectIds
            .map((id) => Number(id))
            .filter((n) => Number.isInteger(n) && n > 0);

        // 3. Fetch test cases associated with user's projects
        const conditions = [inArray(testCases.projectId, projectIds)];
        if (repoNumericIds.length > 0) {
            conditions.push(inArray(testCases.repositoryId, repoNumericIds));
        }

        const allProjectTests = await db
            .select()
            .from(testCases)
            .where(or(...conditions));

        const testIds = allProjectTests.map((t) => t.id);

        // 4. Fetch test executions for these test cases
        const allExecutions = testIds.length > 0
            ? await db
                .select()
                .from(testExecutions)
                .where(inArray(testExecutions.testCaseId, testIds))
                .orderBy(desc(testExecutions.createdAt))
            : [];

        // Map latest execution per testCaseId
        const latestExecutions = new Map<number, (typeof testExecutions.$inferSelect)>();
        for (const exec of allExecutions) {
            if (!latestExecutions.has(exec.testCaseId)) {
                latestExecutions.set(exec.testCaseId, exec);
            }
        }

        // Group tests and executions by project ID
        const testsByProjectId = new Map<string, Array<typeof testCases.$inferSelect>>();
        for (const test of allProjectTests) {
            const targetProjId = test.projectId || String(test.repositoryId);
            if (!testsByProjectId.has(targetProjId)) {
                testsByProjectId.set(targetProjId, []);
            }
            testsByProjectId.get(targetProjId)!.push(test);
        }

        // 5. Aggregate metrics per project
        const projectItems: ProjectDashboardItem[] = userProjects.map((project) => {
            const projectTests = testsByProjectId.get(project.id) || [];
            const totalTests = projectTests.length;

            let passedTests = 0;
            let failedTests = 0;
            let pendingTests = 0;
            let latestRunDate: Date | null = null;

            for (const testCase of projectTests) {
                const latest = latestExecutions.get(testCase.id);

                if (!latest) {
                    pendingTests++;
                    continue;
                }

                // Check most recent execution timestamp
                const execDate = latest.completedAt || latest.startedAt || latest.createdAt;
                if (execDate) {
                    const parsedDate = new Date(execDate);
                    if (!latestRunDate || parsedDate > latestRunDate) {
                        latestRunDate = parsedDate;
                    }
                }

                const status = (latest.status || '').toLowerCase();
                if (status === 'passed') {
                    passedTests++;
                } else if (status === 'failed') {
                    failedTests++;
                } else {
                    // 'running', 'pending', 'idle'
                    pendingTests++;
                }
            }

            const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

            let health: 'healthy' | 'failing' | 'idle' = 'idle';
            if (totalTests > 0) {
                health = failedTests > 0 ? 'failing' : 'healthy';
            }

            return {
                id: project.id,
                userId: project.userId,
                repoName: project.repoName,
                repoUrl: project.repoUrl,
                defaultBranch: project.defaultBranch || 'main',
                environmentUrl: project.environmentUrl,
                createdAt: project.createdAt,
                totalTests,
                passedTests,
                failedTests,
                pendingTests,
                successRate,
                lastRunAt: latestRunDate,
                health,
            };
        });

        // 6. Global summary stats across all user projects
        const totalProjects = projectItems.length;
        const totalTests = projectItems.reduce((acc, p) => acc + p.totalTests, 0);
        const totalPassed = projectItems.reduce((acc, p) => acc + p.passedTests, 0);
        const totalFailed = projectItems.reduce((acc, p) => acc + p.failedTests, 0);
        const overallPassRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

        return {
            projects: projectItems,
            stats: {
                totalProjects,
                totalTests,
                totalPassed,
                totalFailed,
                overallPassRate,
            },
        };
    } catch (error) {
        console.error('[getUserDashboardData] Error fetching dashboard data:', error);
        return {
            projects: [],
            stats: {
                totalProjects: 0,
                totalTests: 0,
                totalPassed: 0,
                totalFailed: 0,
                overallPassRate: 0,
            },
        };
    }
}
