import { db, repositories, users } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type IncomingRepository = {
    id: unknown;
    name: unknown;
    full_name: unknown;
    owner: {
        login: unknown;
    };
    html_url: unknown;
    default_branch: unknown;
    private: unknown;
    description?: unknown;
    language?: unknown;
};

type CreateRepositoryBody = {
    repository?: IncomingRepository;
};

async function getApplicationUser() {
    const user = await currentUser();

    if (!user?.primaryEmailAddress?.emailAddress) {
        return null;
    }

    const email = user.primaryEmailAddress.emailAddress;

    const applicationUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    return applicationUsers[0] ?? null;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isValidRepositoryId(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isDuplicateKeyError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

function serializeRepository(repository: (typeof repositories.$inferSelect)) {
    return {
        id: repository.githubRepoId,
        databaseId: repository.id,
        name: repository.name,
        full_name: repository.fullName,
        owner: {
            login: repository.owner,
        },
        html_url: repository.url,
        default_branch: repository.defaultBranch,
        private: repository.isPrivate,
        description: repository.description ?? null,
        language: repository.language ?? null,
        targetEnvironmentUrl: repository.targetEnvironmentUrl ?? 'http://localhost:3000',
        updated_at: repository.connectedAt ? repository.connectedAt.toISOString() : new Date().toISOString(),
        connected_at: repository.connectedAt ? repository.connectedAt.toISOString() : null,
        last_sync: repository.lastSync ? repository.lastSync.toISOString() : null,
    };
}

export async function GET() {
    try {
        const applicationUser = await getApplicationUser();

        if (!applicationUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const persistedRepositories = await db
            .select()
            .from(repositories)
            .where(eq(repositories.userId, applicationUser.id));

        const connectedRepository = persistedRepositories[0] ?? null;

        return NextResponse.json({
            repository: connectedRepository ? serializeRepository(connectedRepository) : null,
        });
    } catch (error) {
        console.error('Error in GET /api/repositories:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const applicationUser = await getApplicationUser();

        if (!applicationUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const deletedRepositories = await db
            .delete(repositories)
            .where(eq(repositories.userId, applicationUser.id))
            .returning();

        return NextResponse.json({
            deleted: deletedRepositories.length > 0,
            repository: null,
        });
    } catch (error) {
        console.error('Error in DELETE /api/repositories:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const applicationUser = await getApplicationUser();

        if (!applicationUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: CreateRepositoryBody;

        try {
            body = (await req.json()) as CreateRepositoryBody;
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const repository = body.repository;

        if (!repository || typeof repository !== 'object') {
            return NextResponse.json({ error: 'Missing repository payload' }, { status: 400 });
        }

        if (
            !isValidRepositoryId(repository.id) ||
            !isNonEmptyString(repository.name) ||
            !isNonEmptyString(repository.full_name) ||
            !repository.owner ||
            typeof repository.owner !== 'object' ||
            !isNonEmptyString(repository.owner.login) ||
            !isNonEmptyString(repository.html_url) ||
            !isNonEmptyString(repository.default_branch) ||
            typeof repository.private !== 'boolean'
        ) {
            return NextResponse.json(
                { error: 'Invalid repository payload' },
                { status: 400 }
            );
        }

        const existingRepository = await db
            .select()
            .from(repositories)
            .where(
                and(
                    eq(repositories.userId, applicationUser.id),
                    eq(repositories.githubRepoId, repository.id)
                )
            )
            .limit(1);

        if (existingRepository[0]) {
            return NextResponse.json(
                { error: 'Repository already connected' },
                { status: 409 }
            );
        }

        const insertedRepositories = await db
            .insert(repositories)
            .values({
                userId: applicationUser.id,
                githubRepoId: repository.id,
                name: repository.name,
                fullName: repository.full_name,
                owner: repository.owner.login,
                url: repository.html_url,
                defaultBranch: repository.default_branch,
                isPrivate: repository.private,
                description: isNonEmptyString(repository.description) ? repository.description : null,
                language: isNonEmptyString(repository.language) ? repository.language : null,
                lastSync: null,
            })
            .returning();

        const insertedRepository = insertedRepositories[0];

        return NextResponse.json(
            { repository: insertedRepository },
            { status: 201 }
        );
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return NextResponse.json(
                { error: 'Repository already connected' },
                { status: 409 }
            );
        }

        console.error('Error in POST /api/repositories:', error);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}