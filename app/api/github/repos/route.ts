import { cookies } from "next/headers";
import { NextResponse } from 'next/server';
import {
    enforceRateLimit,
    getSecurityErrorStatus,
    isSecurityError,
    requireAuthenticatedGitHubUser,
} from '@/lib/security/githubAccess';

type GitHubOwner = {
    login: string;
};

type GitHubRepository = {
    id: number;
    name: string;
    full_name: string;
    owner: GitHubOwner;
    html_url: string;
    default_branch: string;
    private: boolean;
    description: string | null;
    language: string | null;
    updated_at: string;
};

type RepositoryResponseItem = {
    id: number;
    name: string;
    full_name: string;
    owner: {
        login: string;
    };
    html_url: string;
    default_branch: string;
    private: boolean;
    description: string | null;
    language: string | null;
    updated_at: string;
};

function mapRepository(repository: GitHubRepository): RepositoryResponseItem {
    return {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        owner: {
            login: repository.owner.login,
        },
        html_url: repository.html_url,
        default_branch: repository.default_branch,
        private: repository.private,
        description: repository.description,
        language: repository.language,
        updated_at: repository.updated_at,
    };
}

export async function GET() {
    try {
        const userKey = await requireAuthenticatedGitHubUser();
        enforceRateLimit(`github:repos:${userKey}`, 30);
        const cookieStore = await cookies();
        const githubToken = cookieStore.get('github_token')?.value;

        if (!githubToken) {
            return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });
        }

        const response = await fetch(
            'https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100',
            {
                signal: AbortSignal.timeout(15_000),
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch GitHub repositories' },
                { status: response.status === 401 || response.status === 403 ? 401 : 502 }
            );
        }

        const repositories = (await response.json()) as GitHubRepository[];

        return NextResponse.json({
            repositories: repositories.map(mapRepository),
        });
    } catch (error) {
        const securityStatus = getSecurityErrorStatus(error);
        if (securityStatus !== null) {
            return NextResponse.json(
                { error: isSecurityError(error) ? error.message : 'Too many requests' },
                { status: securityStatus }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch GitHub repositories' },
            { status: 502 }
        );
    }
}