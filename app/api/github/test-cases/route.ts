import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db, repositories, testCases, users } from "@/db";
import { assembleRepositoryContext } from "@/lib/repository/context";
import { analyzeRepositoryContext } from "@/lib/ai/repositoryAnalyzer";
import { generateTestCases } from "@/lib/ai/testGenerator";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch");

    if (!owner || !repo || !branch) {
        return NextResponse.json(
            { error: "owner, repo, and branch are required" },
            { status: 400 }
        );
    }

    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();
    const trimmedBranch = branch.trim();

    if (!trimmedOwner || !trimmedRepo || !trimmedBranch) {
        return NextResponse.json(
            { error: "owner, repo, and branch are required" },
            { status: 400 }
        );
    }

    try {
        // ------------------------------------------------------------
        // 1. Authenticate with Clerk
        // ------------------------------------------------------------
        const user = await currentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ------------------------------------------------------------
        // 2. Verify GitHub authentication
        // ------------------------------------------------------------
        const cookieStore = await cookies();
        const githubToken = cookieStore.get("github_token")?.value;

        if (!githubToken) {
            return NextResponse.json(
                { error: "Missing GitHub auth token" },
                { status: 401 }
            );
        }

        // ------------------------------------------------------------
        // 3. Resolve the application user
        // ------------------------------------------------------------
        const [applicationUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, user.id))
            .limit(1);

        if (!applicationUser) {
            return NextResponse.json(
                {
                    error:
                        "User account is not synchronized with the application database",
                },
                { status: 403 }
            );
        }

        // ------------------------------------------------------------
        // 4. Find the connected repository owned by this user
        // ------------------------------------------------------------
        const [repository] = await db
            .select()
            .from(repositories)
            .where(
                and(
                    eq(repositories.userId, applicationUser.id),
                    eq(repositories.owner, trimmedOwner),
                    eq(repositories.name, trimmedRepo)
                )
            )
            .limit(1);

        if (!repository) {
            return NextResponse.json(
                {
                    error:
                        "Repository is not connected to this TestPilot account",
                },
                { status: 404 }
            );
        }

        // ------------------------------------------------------------
        // 5. Build repository context
        // ------------------------------------------------------------
        const context = await assembleRepositoryContext({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
        });

        // ------------------------------------------------------------
        // 6. Analyze repository
        // ------------------------------------------------------------
        const analysis = analyzeRepositoryContext(context);

        // ------------------------------------------------------------
        // 7. Generate evidence-grounded test cases
        // ------------------------------------------------------------
        const generated = await generateTestCases(context, analysis);

        if (
            !generated ||
            !Array.isArray(generated.testCases)
        ) {
            return NextResponse.json(
                {
                    error: "Test generator returned an invalid payload",
                },
                { status: 502 }
            );
        }

        // ------------------------------------------------------------
        // 8. Persist generated test cases
        //
        // Avoid inserting the same generated test repeatedly.
        // A test is considered a duplicate when the repository,
        // title, and target route are the same.
        // ------------------------------------------------------------
        const persistedTestCases = [];

        for (const generatedTest of generated.testCases) {
            const existing = await db
                .select()
                .from(testCases)
                .where(
                    and(
                        eq(testCases.repositoryId, repository.id),
                        eq(testCases.title, generatedTest.title),
                        eq(
                            testCases.targetRoute,
                            generatedTest.targetRoute
                        )
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                persistedTestCases.push(existing[0]);
                continue;
            }

            const [insertedTestCase] = await db
                .insert(testCases)
                .values({
                    repositoryId: repository.id,
                    title: generatedTest.title,
                    description: generatedTest.description,
                    type: generatedTest.type,
                    priority: generatedTest.priority,
                    targetRoute: generatedTest.targetRoute,
                    targetFiles: generatedTest.targetFiles,
                    expectedResult: generatedTest.expectedResult,
                })
                .returning();

            persistedTestCases.push(insertedTestCase);
        }

        // ------------------------------------------------------------
        // 9. Return generated + persisted test cases
        // ------------------------------------------------------------
        return NextResponse.json({
            ...generated,
            repositoryId: repository.id,
            testCases: persistedTestCases,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "GitHub API failure";

        if (message === "Missing GitHub auth token") {
            return NextResponse.json(
                { error: message },
                { status: 401 }
            );
        }

        if (message === "GitHub token is unauthorized") {
            return NextResponse.json(
                { error: message },
                { status: 401 }
            );
        }

        if (message === "Repository not found") {
            return NextResponse.json(
                { error: message },
                { status: 404 }
            );
        }

        console.error("[TEST CASE GENERATION]", error);

        return NextResponse.json(
            { error: message },
            { status: 502 }
        );
    }
}