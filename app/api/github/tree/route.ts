import { NextRequest, NextResponse } from 'next/server';
import { filterRepositoryFiles } from '@/lib/github/fileFilter';
import { getRepositoryTree } from '@/lib/github/repository';
import {
    getSecurityErrorStatus,
    isSecurityError,
    enforceRateLimit,
    readGitHubQuery,
    requireConnectedRepositoryAccess,
} from '@/lib/security/githubAccess';

export async function GET(req: NextRequest) {
    try {
        const { owner: trimmedOwner, repo: trimmedRepo, branch: trimmedBranch } = readGitHubQuery(req, { branch: true });
        const userKey = await requireConnectedRepositoryAccess(trimmedOwner, trimmedRepo);
        enforceRateLimit(`github:tree:${userKey}`, 60);
        const includeFiltered = new URL(req.url).searchParams.get('filtered') === 'true';

        const result = await getRepositoryTree({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
        });

        if (includeFiltered) {
            return NextResponse.json({
                repository: result.repository,
                branch: result.branch,
                files: filterRepositoryFiles(result.tree),
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        const securityStatus = getSecurityErrorStatus(error);
        if (securityStatus !== null) {
            return NextResponse.json(
                { error: isSecurityError(error) ? error.message : 'Too many requests' },
                { status: securityStatus }
            );
        }

        const message = error instanceof Error ? error.message : '';
        if (message === 'GitHub token is unauthorized') {
            return NextResponse.json({ error: 'GitHub authorization is invalid' }, { status: 401 });
        }
        if (message === 'Repository not found') {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Unable to load repository files' }, { status: 502 });
    }
}
