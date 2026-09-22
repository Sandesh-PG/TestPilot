import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  enforceRateLimit,
  getSecurityErrorStatus,
  isSecurityError,
  readGitHubQuery,
  requireConnectedRepositoryAccess,
} from '@/lib/security/githubAccess';

export type GitHubBranch = {
  name: string;
  protected: boolean;
  default: boolean;
};

export async function GET(request: Request) {
  try {
    const { owner: trimmedOwner, repo: trimmedRepo } = readGitHubQuery(request);
    const userKey = await requireConnectedRepositoryAccess(trimmedOwner, trimmedRepo);
    enforceRateLimit(`github:branches:${userKey}`, 30);
    const cookieStore = await cookies();
    const githubToken = cookieStore.get('github_token')?.value;

    if (!githubToken) {
      return NextResponse.json(
        { error: 'Missing GitHub auth token' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(trimmedOwner)}/${encodeURIComponent(trimmedRepo)}/branches?per_page=100`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'GitHub token is unauthorized' },
        { status: 401 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch repository branches' },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as Array<{
      name?: string;
      protected?: boolean;
      default?: boolean;
    }>;

    const branches = payload
      .filter((branch): branch is { name: string; protected: boolean; default: boolean } => typeof branch?.name === 'string')
      .map((branch) => ({
        name: branch.name,
        protected: Boolean(branch.protected),
        default: Boolean(branch.default),
      }));

    return NextResponse.json({ branches });
  } catch (error) {
    const securityStatus = getSecurityErrorStatus(error);
    if (securityStatus !== null) {
      return NextResponse.json(
        { error: isSecurityError(error) ? error.message : 'Too many requests' },
        { status: securityStatus }
      );
    }

    return NextResponse.json({ error: 'Unable to load repository branches' }, { status: 502 });
  }
}
