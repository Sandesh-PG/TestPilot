import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db, projects, repositories, testCases, testExecutions, users } from "@/db";
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
 * GET /api/browserbase/playwright-test?repositoryId=123, ?projectId=456, or ?testCaseId=789
 * Returns recent test execution history for the repository, project, or test case.
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
        const projectIdParam = searchParams.get("projectId");

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

        if (projectIdParam) {
            const projectTests = await db
                .select({ id: testCases.id })
                .from(testCases)
                .where(eq(testCases.projectId, projectIdParam));

            if (projectTests.length === 0) {
                return NextResponse.json({ executions: [] });
            }

            const testIds = projectTests.map((t) => t.id);
            const executions = await db
                .select()
                .from(testExecutions)
                .where(inArray(testExecutions.testCaseId, testIds))
                .orderBy(desc(testExecutions.createdAt))
                .limit(50);

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
            { error: "Provide testCaseId, projectId, or repositoryId query parameter" },
            { status: 400 }
        );
    } catch (error) {
        console.error("[GET /api/browserbase/playwright-test]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/browserbase/playwright-test
 * Body: { testCaseId?: number, repositoryId?: number, projectId?: string, runAll?: boolean, appUrl?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const appUser = await getApplicationUser();
        const { userId: clerkUserId } = await auth();

        if (!appUser && !clerkUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json().catch(() => ({}))) as {
            testCaseId?: number;
            repositoryId?: number;
            projectId?: string;
            runAll?: boolean;
            appUrl?: string;
        };

        const { testCaseId, repositoryId, projectId, runAll, appUrl: customAppUrl } = body;

        // -------------------------------------------------------------------
        // Scenario A: Run All Tests for a Project or Repository
        // -------------------------------------------------------------------
        if (runAll) {
            let targetUrl = customAppUrl?.trim() || "http://localhost:3000";
            let allCases: (typeof testCases.$inferSelect)[] = [];

            if (projectId) {
                const [projectRecord] = await db
                    .select()
                    .from(projects)
                    .where(eq(projects.id, projectId))
                    .limit(1);

                if (projectRecord?.environmentUrl) {
                    targetUrl = customAppUrl?.trim() || projectRecord.environmentUrl;
                }

                allCases = await db
                    .select()
                    .from(testCases)
                    .where(eq(testCases.projectId, projectId));
            } else if (repositoryId && appUser) {
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

                targetUrl = customAppUrl?.trim() || repo.targetEnvironmentUrl || "http://localhost:3000";

                allCases = await db
                    .select()
                    .from(testCases)
                    .where(eq(testCases.repositoryId, repo.id));
            } else {
                return NextResponse.json(
                    { error: "repositoryId or projectId is required when runAll is true" },
                    { status: 400 }
                );
            }

            if (allCases.length === 0) {
                return NextResponse.json(
                    { error: "No test cases found. Please generate test cases first." },
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

                const result = await executeTestCase(targetUrl, testCase, { executionId: executionRecord.id });

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

        // Load test case
        const [testCase] = await db
            .select()
            .from(testCases)
            .where(eq(testCases.id, testCaseId))
            .limit(1);

        if (!testCase) {
            return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        }

        // Authorize access
        let targetUrl = customAppUrl?.trim() || "http://localhost:3000";
        let isAuthorized = false;

        if (testCase.projectId) {
            const [proj] = await db
                .select()
                .from(projects)
                .where(eq(projects.id, testCase.projectId))
                .limit(1);

            if (proj) {
                if (proj.userId === clerkUserId || (appUser && proj.userId === String(appUser.id))) {
                    isAuthorized = true;
                    if (!customAppUrl && proj.environmentUrl) {
                        targetUrl = proj.environmentUrl;
                    }
                }
            }
        }

        if (!isAuthorized && testCase.repositoryId && appUser) {
            const [repo] = await db
                .select()
                .from(repositories)
                .where(
                    and(
                        eq(repositories.id, testCase.repositoryId),
                        eq(repositories.userId, appUser.id)
                    )
                )
                .limit(1);

            if (repo) {
                isAuthorized = true;
                if (!customAppUrl && repo.targetEnvironmentUrl) {
                    targetUrl = repo.targetEnvironmentUrl;
                }
            }
        }

        // Fallback authorization if context provided
        if (!isAuthorized && (projectId || repositoryId)) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

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
            const executionResult = await executeTestCase(targetUrl, testCase, { executionId: executionRecord.id });

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
                durationMs: executionResult.durationMs,
                error: executionResult.error,
            });
        } catch (executionError) {
            console.error("[PLAYWRIGHT TEST EXECUTION ERROR]:", executionError);

            const errorMessage = executionError instanceof Error ? executionError.message : "Playwright execution failed";

            const [failedExecution] = await db
                .update(testExecutions)
                .set({
                    status: "failed",
                    completedAt: new Date(),
                    error: errorMessage,
                    logs: `[FATAL RUNTIME ERROR]: ${errorMessage}`,
                })
                .where(eq(testExecutions.id, executionRecord.id))
                .returning();

            return NextResponse.json({
                success: false,
                execution: failedExecution,
                error: errorMessage,
            }, { status: 500 });
        }
    } catch (error) {
        console.error("[POST /api/browserbase/playwright-test]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}