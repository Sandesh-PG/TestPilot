import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db, repositories, testCases, testExecutions, users } from "@/db";
import { executeTestCase } from "@/lib/test-execution/testExecutor";

async function getApplicationUser() {
    const { userId } = await auth();
    if (!userId) {
        return null;
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email) {
        return null;
    }

    const [appUser] = await db
        .select()
        .from(users)
        .where(or(eq(users.clerkId, userId), eq(users.email, email)))
        .limit(1);

    return appUser ?? null;
}

/**
 * GET /api/browserbase/playwright-test?repositoryId=123 or ?testCaseId=456
 * Returns recent test execution history for the repository or test case.
 */
export async function GET(req: NextRequest) {
    try {
        const appUser = await getApplicationUser();
        if (!appUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const testCaseIdParam = searchParams.get("testCaseId");
        const repoIdParam = searchParams.get("repositoryId");

        if (testCaseIdParam) {
            const testCaseId = Number(testCaseIdParam);
            const executions = await db
                .select()
                .from(testExecutions)
                .where(eq(testExecutions.testCaseId, testCaseId))
                .orderBy(desc(testExecutions.createdAt))
                .limit(10);

            return NextResponse.json({ executions });
        }

        if (repoIdParam) {
            const repoId = Number(repoIdParam);
            // Fetch test cases belonging to this repository
            const repoTests = await db
                .select({ id: testCases.id })
                .from(testCases)
                .where(eq(testCases.repositoryId, repoId));

            if (repoTests.length === 0) {
                return NextResponse.json({ executions: [] });
            }

            const testIds = repoTests.map((t) => t.id);
            const executions = await db
                .select()
                .from(testExecutions)
                .where(inArray(testExecutions.testCaseId, testIds))
                .orderBy(desc(testExecutions.createdAt))
                .limit(50);

            return NextResponse.json({ executions });
        }

        return NextResponse.json(
            { error: "Provide testCaseId or repositoryId query parameter" },
            { status: 400 }
        );
    } catch (error) {
        console.error("[GET /api/browserbase/playwright-test]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/browserbase/playwright-test
 * Body: { testCaseId?: number, repositoryId?: number, runAll?: boolean, appUrl?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const appUser = await getApplicationUser();
        if (!appUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json().catch(() => ({}))) as {
            testCaseId?: number;
            repositoryId?: number;
            runAll?: boolean;
            appUrl?: string;
        };

        const { testCaseId, repositoryId, runAll, appUrl: customAppUrl } = body;

        // -------------------------------------------------------------------
        // Scenario A: Run All Tests for a Repository
        // -------------------------------------------------------------------
        if (runAll) {
            if (!repositoryId) {
                return NextResponse.json(
                    { error: "repositoryId is required when runAll is true" },
                    { status: 400 }
                );
            }

            const [repo] = await db
                .select()
                .from(repositories)
                .where(
                    and(
                        eq(repositories.userId, appUser.id),
                        or(eq(repositories.id, repositoryId), eq(repositories.githubRepoId, repositoryId))
                    )
                )
                .limit(1);

            if (!repo) {
                return NextResponse.json({ error: "Repository not found" }, { status: 404 });
            }

            const targetUrl = customAppUrl?.trim() || repo.targetEnvironmentUrl || "http://localhost:3000";

            const allCases = await db
                .select()
                .from(testCases)
                .where(eq(testCases.repositoryId, repo.id));

            if (allCases.length === 0) {
                return NextResponse.json(
                    { error: "No test cases found for this repository. Please generate test cases first." },
                    { status: 404 }
                );
            }

            const executionReports = [];

            // Execute test cases sequentially to prevent Browserbase session concurrency bottlenecks
            for (const testCase of allCases) {
                const [executionRecord] = await db
                    .insert(testExecutions)
                    .values({
                        testCaseId: testCase.id,
                        status: "running",
                        startedAt: new Date(),
                    })
                    .returning();

                const result = await executeTestCase(targetUrl, testCase);

                const [updatedRecord] = await db
                    .update(testExecutions)
                    .set({
                        status: result.status,
                        completedAt: new Date(),
                        sessionId: result.sessionId,
                        sessionUrl: result.sessionUrl,
                        logs: result.logs.join("\n"),
                        error: result.error ?? null,
                    })
                    .where(eq(testExecutions.id, executionRecord.id))
                    .returning();

                executionReports.push({
                    testCaseId: testCase.id,
                    execution: updatedRecord,
                    status: result.status,
                });
            }

            return NextResponse.json({
                success: true,
                targetEnvironmentUrl: targetUrl,
                count: executionReports.length,
                executions: executionReports,
            });
        }

        // -------------------------------------------------------------------
        // Scenario B: Run a Single Test Case
        // -------------------------------------------------------------------
        if (!testCaseId || typeof testCaseId !== "number") {
            return NextResponse.json(
                { error: "testCaseId (number) is required" },
                { status: 400 }
            );
        }

        // Load test case and repository
        const result = await db
            .select({
                testCase: testCases,
                repository: repositories,
            })
            .from(testCases)
            .innerJoin(repositories, eq(testCases.repositoryId, repositories.id))
            .where(eq(testCases.id, testCaseId))
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        }

        const { testCase, repository } = result[0];

        if (repository.userId !== appUser.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const targetUrl = customAppUrl?.trim() || repository.targetEnvironmentUrl || "http://localhost:3000";

        // Insert pending/running execution record
        const [executionRecord] = await db
            .insert(testExecutions)
            .values({
                testCaseId: testCase.id,
                status: "running",
                startedAt: new Date(),
            })
            .returning();

        try {
            // Execute using Playwright over Browserbase
            const executionResult = await executeTestCase(targetUrl, testCase);

            const [updatedExecution] = await db
                .update(testExecutions)
                .set({
                    status: executionResult.status,
                    completedAt: new Date(),
                    sessionId: executionResult.sessionId,
                    sessionUrl: executionResult.sessionUrl,
                    logs: executionResult.logs.join("\n"),
                    error: executionResult.error ?? null,
                })
                .where(eq(testExecutions.id, executionRecord.id))
                .returning();

            return NextResponse.json({
                success: executionResult.status === "passed",
                execution: updatedExecution,
                testCase,
                targetEnvironmentUrl: targetUrl,
                sessionId: executionResult.sessionId,
                sessionUrl: executionResult.sessionUrl,
                logs: executionResult.logs,
                error: executionResult.error,
            });
        } catch (runnerError) {
            const errorMsg = runnerError instanceof Error ? runnerError.message : "Runner crashed";

            const [failedExecution] = await db
                .update(testExecutions)
                .set({
                    status: "failed",
                    completedAt: new Date(),
                    error: errorMsg,
                })
                .where(eq(testExecutions.id, executionRecord.id))
                .returning();

            return NextResponse.json(
                {
                    success: false,
                    execution: failedExecution,
                    error: errorMsg,
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("[POST /api/browserbase/playwright-test]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}