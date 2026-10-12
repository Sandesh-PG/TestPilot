import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, repositories, testCases } from "@/db";
import { assembleRepositoryContext } from "@/lib/repository/context";
import { analyzeRepositoryContext } from "@/lib/ai/repositoryAnalyzer";
import { generateTestCases } from "@/lib/ai/testGenerator";
import {
    enforceRateLimit,
    getSecurityErrorStatus,
    isSecurityError,
    readGitHubQuery,
    requireConnectedRepositoryAccess,
} from "@/lib/security/githubAccess";

export async function GET(req: NextRequest) {
    try {
        const { owner: trimmedOwner, repo: trimmedRepo, branch: trimmedBranch } = readGitHubQuery(req, { branch: true });
        const applicationUserId = Number(await requireConnectedRepositoryAccess(trimmedOwner, trimmedRepo));
        enforceRateLimit(`github:test-cases:${applicationUserId}`, 10);

        // ------------------------------------------------------------
        // 1. Find the connected repository owned by this user
        // ------------------------------------------------------------
        const [repository] = await db
            .select()
            .from(repositories)
            .where(
                and(
                    eq(repositories.userId, applicationUserId),
                    eq(repositories.owner, trimmedOwner),
                    eq(repositories.name, trimmedRepo)
                )
            )
            .limit(1);

        if (!repository) {
            return NextResponse.json(
                {
                    error: "Repository is not connected to this TestPilot account",
                },
                { status: 404 }
            );
        }

        // ------------------------------------------------------------
        // 2. Build repository context & AST analysis
        // ------------------------------------------------------------
        const context = await assembleRepositoryContext({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
        });

        const analysis = analyzeRepositoryContext(context);

        // ------------------------------------------------------------
        // 3. Generate evidence-grounded, categorized, Playwright-ready test cases
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
        // 4. Persist generated test cases with actionSteps
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
                const existingItem = existing[0];
                if (!existingItem.actionSteps && generatedTest.actionSteps) {
                    const [updated] = await db
                        .update(testCases)
                        .set({ actionSteps: generatedTest.actionSteps })
                        .where(eq(testCases.id, existingItem.id))
                        .returning();
                    persistedTestCases.push(updated);
                } else {
                    persistedTestCases.push(existingItem);
                }
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
                    actionSteps: generatedTest.actionSteps,
                })
                .returning();

            persistedTestCases.push(insertedTestCase);
        }

        // ------------------------------------------------------------
        // 5. Return generated + persisted test cases
        // ------------------------------------------------------------
        return NextResponse.json({
            repositoryId: repository.id,
            testCases: persistedTestCases,
        });
    } catch (error) {
        const securityStatus = getSecurityErrorStatus(error);
        if (securityStatus !== null) {
            return NextResponse.json(
                { error: isSecurityError(error) ? error.message : "Too many requests" },
                { status: securityStatus }
            );
        }

        const message = error instanceof Error ? error.message : "";
        if (message === "GitHub token is unauthorized") {
            return NextResponse.json({ error: "GitHub authorization is invalid" }, { status: 401 });
        }
        if (message === "Repository not found") {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        console.error("[TEST CASE GENERATION] request failed:", error);

        return NextResponse.json(
            { error: "Unable to generate test cases" },
            { status: 502 }
        );
    }
}