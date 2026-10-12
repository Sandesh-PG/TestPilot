import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db, repositories, users } from "@/db";

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

        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            return NextResponse.json({ error: "Invalid repository ID" }, { status: 400 });
        }

        const [repo] = await db
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

        if (!repo) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        return NextResponse.json({
            repository: {
                id: repo.githubRepoId,
                databaseId: repo.id,
                name: repo.name,
                fullName: repo.fullName,
                owner: repo.owner,
                targetEnvironmentUrl: repo.targetEnvironmentUrl ?? "http://localhost:3000",
                defaultBranch: repo.defaultBranch,
            },
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
