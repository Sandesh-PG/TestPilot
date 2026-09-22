import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { db, repositories, users } from '@/db';

const MAX_OWNER_LENGTH = 100;
const MAX_REPOSITORY_LENGTH = 100;
const MAX_BRANCH_LENGTH = 255;
const MAX_PATH_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;

type GitHubQuery = {
    owner: string;
    repo: string;
    branch?: string;
    path?: string;
};

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

const rateLimitEntries = new Map<string, RateLimitEntry>();

export class SecurityInputError extends Error {
    constructor(message = 'Invalid request parameters') {
        super(message);
        this.name = 'SecurityInputError';
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error {
    constructor(message = 'Repository access is not authorized') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

function readRequiredString(value: string | null, field: string, maxLength: number): string {
    const normalized = value?.trim() ?? '';

    if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
        throw new SecurityInputError(`Invalid ${field}`);
    }

    return normalized;
}

function validateOwner(value: string): string {
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/.test(value)) {
        throw new SecurityInputError('Invalid owner');
    }

    return value;
}

function validateRepository(value: string): string {
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/.test(value)) {
        throw new SecurityInputError('Invalid repository');
    }

    return value;
}

function validateBranch(value: string): string {
    if (
        value.length > MAX_BRANCH_LENGTH ||
        value.startsWith('/') ||
        value.endsWith('/') ||
        value.includes('..') ||
        value.includes('//') ||
        !/^[A-Za-z0-9._/-]+$/.test(value)
    ) {
        throw new SecurityInputError('Invalid branch');
    }

    return value;
}

function validatePath(value: string): string {
    if (
        value.length > MAX_PATH_LENGTH ||
        value.startsWith('/') ||
        value.includes('\\') ||
        value.split('/').some((segment) => !segment || segment === '.' || segment === '..')
    ) {
        throw new SecurityInputError('Invalid file path');
    }

    return value;
}

export function readGitHubQuery(
    request: Request,
    options: { branch: true; path?: boolean }
): GitHubQuery & { branch: string };
export function readGitHubQuery(
    request: Request,
    options?: { branch?: false; path?: boolean }
): GitHubQuery;
export function readGitHubQuery(
    request: Request,
    options: { branch?: boolean; path?: boolean } = {}
): GitHubQuery {
    const { searchParams } = new URL(request.url);
    const owner = validateOwner(
        readRequiredString(searchParams.get('owner'), 'owner', MAX_OWNER_LENGTH)
    );
    const repo = validateRepository(
        readRequiredString(searchParams.get('repo'), 'repo', MAX_REPOSITORY_LENGTH)
    );

    const branchValue = searchParams.get('branch');
    const pathValue = searchParams.get('path');

    if (options.branch && branchValue === null) {
        throw new SecurityInputError('Invalid branch');
    }

    if (options.path && pathValue === null) {
        throw new SecurityInputError('Invalid file path');
    }

    return {
        owner,
        repo,
        ...(branchValue !== null
            ? { branch: validateBranch(readRequiredString(branchValue, 'branch', MAX_BRANCH_LENGTH)) }
            : {}),
        ...(pathValue !== null
            ? { path: validatePath(readRequiredString(pathValue, 'path', MAX_PATH_LENGTH)) }
            : {}),
    };
}

export async function requireConnectedRepositoryAccess(owner: string, repo: string): Promise<string> {
    const user = await currentUser();

    if (!user) {
        throw new AuthenticationError();
    }

    const [applicationUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, user.id))
        .limit(1);

    if (!applicationUser) {
        throw new AuthorizationError('User account is not synchronized');
    }

    const [repository] = await db
        .select({ id: repositories.id })
        .from(repositories)
        .where(
            and(
                eq(repositories.userId, applicationUser.id),
                eq(repositories.owner, owner),
                eq(repositories.name, repo)
            )
        )
        .limit(1);

    if (!repository) {
        throw new AuthorizationError();
    }

    const cookieStore = await cookies();
    if (!cookieStore.get('github_token')?.value) {
        throw new AuthenticationError('GitHub authorization is required');
    }

    return String(applicationUser.id);
}

export async function requireAuthenticatedGitHubUser(): Promise<string> {
    const user = await currentUser();

    if (!user) {
        throw new AuthenticationError();
    }

    const cookieStore = await cookies();
    if (!cookieStore.get('github_token')?.value) {
        throw new AuthenticationError('GitHub authorization is required');
    }

    return user.id;
}

export function enforceRateLimit(key: string, limit: number): void {
    const now = Date.now();

    if (rateLimitEntries.size > 10_000) {
        for (const [entryKey, entry] of rateLimitEntries) {
            if (entry.resetAt <= now) {
                rateLimitEntries.delete(entryKey);
            }
        }
    }

    const current = rateLimitEntries.get(key);

    if (!current || current.resetAt <= now) {
        rateLimitEntries.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return;
    }

    if (current.count >= limit) {
        throw new Error('Rate limit exceeded');
    }

    current.count += 1;
}

export function isSecurityError(error: unknown): error is SecurityInputError | AuthenticationError | AuthorizationError {
    return error instanceof SecurityInputError || error instanceof AuthenticationError || error instanceof AuthorizationError;
}

export function getSecurityErrorStatus(error: unknown): number | null {
    if (error instanceof SecurityInputError) {
        return 400;
    }

    if (error instanceof AuthenticationError) {
        return 401;
    }

    if (error instanceof AuthorizationError) {
        return 403;
    }

    if (error instanceof Error && error.message === 'Rate limit exceeded') {
        return 429;
    }

    return null;
}
