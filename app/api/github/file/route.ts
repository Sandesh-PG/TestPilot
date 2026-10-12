import { NextRequest, NextResponse } from 'next/server';
import { getFileContent } from '@/lib/github/fileContent';
import {
    enforceRateLimit,
    getSecurityErrorStatus,
    isSecurityError,
    readGitHubQuery,
    requireConnectedRepositoryAccess,
} from '@/lib/security/githubAccess';

export async function GET(req: NextRequest) {
    try {
        const { owner: trimmedOwner, repo: trimmedRepo, branch: trimmedBranch, path: trimmedPath } = readGitHubQuery(req, { branch: true, path: true });
        const userKey = await requireConnectedRepositoryAccess(trimmedOwner, trimmedRepo);
        enforceRateLimit(`github:file:${userKey}`, 120);

        if (!trimmedPath) {
            return NextResponse.json({ error: 'File path is required' }, { status: 400 });
        }

        const fileContent = await getFileContent({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
            path: trimmedPath,
        });

        return NextResponse.json({
            ...fileContent,
            file: fileContent,
            files: [fileContent],
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'GitHub API failure';

        const securityStatus = getSecurityErrorStatus(error);
        if (securityStatus !== null) {
            return NextResponse.json(
                { error: isSecurityError(error) ? error.message : 'Too many requests' },
                { status: securityStatus }
            );
        }

        if (message === 'GitHub token is unauthorized') {
            return NextResponse.json({ error: 'GitHub authorization is invalid' }, { status: 401 });
        }

        if (message === 'Repository not found') {
            return NextResponse.json(
                { error: message },
                { status: 404 }
            );
        }

        console.error('[GET /api/github/file] error:', error);
        return NextResponse.json({ error: 'Unable to load file content' }, { status: 502 });
    }
}
