'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, or } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db, projects, repositories, testCases, testExecutions, users } from '@/db';

/**
 * Server action to securely delete a project card and cascade all associated test cases and test executions.
 */
export async function deleteProject(projectId: string | number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error('Unauthorized');
    }

    const cleanProjectId = String(projectId).trim();
    if (!cleanProjectId) {
        throw new Error('Project ID is required');
    }

    // 1. Verify project exists and belongs to the authenticated Clerk user
    const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, cleanProjectId), eq(projects.userId, userId)))
        .limit(1);

    if (!project) {
        throw new Error('Project not found or access denied');
    }

    // 2. Look up internal application user to check matching repositories
    const [appUser] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1);

    const testCaseConditions = [eq(testCases.projectId, cleanProjectId)];
    const parsedNumId = Number(cleanProjectId);
    if (Number.isInteger(parsedNumId) && parsedNumId > 0) {
        testCaseConditions.push(eq(testCases.repositoryId, parsedNumId));
    }

    let repoIds: number[] = [];
    if (appUser) {
        const repoConditions = [eq(repositories.name, project.repoName)];
        if (Number.isInteger(parsedNumId) && parsedNumId > 0) {
            repoConditions.push(eq(repositories.id, parsedNumId));
        }

        const matchedRepos = await db
            .select({ id: repositories.id })
            .from(repositories)
            .where(
                and(
                    eq(repositories.userId, appUser.id),
                    or(...repoConditions)
                )
            );

        repoIds = matchedRepos.map((r) => r.id);
        for (const rId of repoIds) {
            testCaseConditions.push(eq(testCases.repositoryId, rId));
        }
    }

    // 3. Find all associated test cases
    const associatedTests = await db
        .select({ id: testCases.id })
        .from(testCases)
        .where(or(...testCaseConditions));

    const testIds = associatedTests.map((t) => t.id);

    // 4. Cascading Deletion
    // Step A: Delete all test executions belonging to these test cases
    if (testIds.length > 0) {
        await db
            .delete(testExecutions)
            .where(inArray(testExecutions.testCaseId, testIds));

        // Step B: Delete all test cases
        await db
            .delete(testCases)
            .where(inArray(testCases.id, testIds));
    }

    // Step C: Delete project from projects table
    await db
        .delete(projects)
        .where(and(eq(projects.id, cleanProjectId), eq(projects.userId, userId)));

    // Step D: Delete from repositories table to prevent dashboard re-sync
    if (repoIds.length > 0 && appUser) {
        await db
            .delete(repositories)
            .where(
                and(
                    inArray(repositories.id, repoIds),
                    eq(repositories.userId, appUser.id)
                )
            );
    }

    // 5. Revalidate dashboard path to recalculate global stats and project lists
    revalidatePath('/dashboard');

    return { success: true };
}
