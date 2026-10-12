import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db, projects, repositories, testCases, users } from "@/db";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

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

function isValidHttpUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export async function GET(
    _req: NextRequest,
    { params }: RouteContext
) {
    try {
        const appUser = await getApplicationUser();
        if (!appUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const parsedId = Number(id);

        let repo = null;

        if (Number.isInteger(parsedId) && parsedId > 0) {
            const [foundRepo] = await db
                .select()
                .from(repositories)
                .where(
                    and(
                        eq(repositories.userId, appUser.id),
                        or(
                            eq(repositories.id, parsedId),
                            eq(repositories.githubRepoId, parsedId)
                        )
                    )
                )
                .limit(1);
            repo = foundRepo ?? null;
        }

        // If not found by integer, check projects table
        if (!repo) {
            const [foundProj] = await db
                .select()
                .from(projects)
                .where(eq(projects.id, id))
                .limit(1);

            if (foundProj) {
                const [matchingRepo] = await db
                    .select()
                    .from(repositories)
                    .where(
                        and(
                            eq(repositories.userId, appUser.id),
                            eq(repositories.name, foundProj.repoName)
                        )
                    )
                    .limit(1);

                if (matchingRepo) {
                    repo = matchingRepo;
                } else {
                    const fallbackId = Number(foundProj.id) || 1;
                    repo = {
                        id: fallbackId,
                        githubRepoId: fallbackId,
                        name: foundProj.repoName,
                        fullName: foundProj.repoName,
                        owner: foundProj.repoName.split('/')[0] || 'owner',
                        url: foundProj.repoUrl || '',
                        defaultBranch: foundProj.defaultBranch || 'main',
                        isPrivate: false,
                        description: null,
                        language: null,
                        connectedAt: foundProj.createdAt,
                        lastSync: null,
                        targetEnvironmentUrl: foundProj.environmentUrl || 'http://localhost:3000',
                    };
                }
            }
        }

        if (!repo) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        // Fetch persisted test cases for this repository or project
        const conditions = [eq(testCases.projectId, id)];
        if (repo.id) {
            conditions.push(eq(testCases.repositoryId, repo.id));
            conditions.push(eq(testCases.projectId, String(repo.id)));
        }

        const repoTests = await db
            .select()
            .from(testCases)
            .where(or(...conditions));

        const ownerLogin = typeof repo.owner === 'object' && repo.owner !== null ? (repo.owner as { login?: string }).login : repo.owner;
        const repoFullName = repo.fullName || repo.name;
        const repoUrl = repo.url || `https://github.com/${repoFullName}`;

        return NextResponse.json({
            repository: {
                id: repo.githubRepoId || repo.id,
                databaseId: repo.id,
                name: repo.name,
                full_name: repoFullName,
                owner: {
                    login: ownerLogin || 'owner',
                },
                html_url: repoUrl,
                url: repoUrl,
                default_branch: repo.defaultBranch || 'main',
                private: repo.isPrivate ?? false,
                description: repo.description ?? null,
                language: repo.language ?? null,
                targetEnvironmentUrl: repo.targetEnvironmentUrl ?? "http://localhost:3000",
                connectedAt: repo.connectedAt ? new Date(repo.connectedAt).toISOString() : new Date().toISOString(),
                updated_at: repo.connectedAt ? new Date(repo.connectedAt).toISOString() : new Date().toISOString(),
            },
            testCases: repoTests,
        });
    } catch (error) {
        console.error("[GET /api/repositories/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: RouteContext
) {
    try {
        const appUser = await getApplicationUser();
        if (!appUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const parsedId = Number(id);

        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            return NextResponse.json({ error: "Invalid repository ID" }, { status: 400 });
        }

        const body = (await req.json().catch(() => ({}))) as {
            targetEnvironmentUrl?: unknown;
        };

        if (typeof body.targetEnvironmentUrl !== "string") {
            return NextResponse.json(
                { error: "targetEnvironmentUrl is required and must be a string" },
                { status: 400 }
            );
        }

        const cleanUrl = body.targetEnvironmentUrl.trim();

        if (!isValidHttpUrl(cleanUrl)) {
            return NextResponse.json(
                { error: "Invalid targetEnvironmentUrl. Must be a valid HTTP or HTTPS URL (e.g. http://localhost:3000, https://staging.myapp.com)" },
                { status: 400 }
            );
        }

        const [existingRepo] = await db
            .select()
            .from(repositories)
            .where(
                and(
                    eq(repositories.userId, appUser.id),
                    or(
                        eq(repositories.id, parsedId),
                        eq(repositories.githubRepoId, parsedId)
                    )
                )
            )
            .limit(1);

        if (!existingRepo) {
            return NextResponse.json(
                { error: "Repository not found or access denied" },
                { status: 404 }
            );
        }

        const [updatedRepo] = await db
            .update(repositories)
            .set({
                targetEnvironmentUrl: cleanUrl,
            })
            .where(eq(repositories.id, existingRepo.id))
            .returning();

        // Also sync updated environmentUrl to projects table
        await db
            .update(projects)
            .set({ environmentUrl: cleanUrl })
            .where(or(eq(projects.id, String(existingRepo.id)), eq(projects.id, id)));

        return NextResponse.json({
            success: true,
            repository: {
                id: updatedRepo.githubRepoId,
                databaseId: updatedRepo.id,
                name: updatedRepo.name,
                fullName: updatedRepo.fullName,
                owner: updatedRepo.owner,
                targetEnvironmentUrl: updatedRepo.targetEnvironmentUrl,
            },
        });
    } catch (error) {
        console.error("[PATCH /api/repositories/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
