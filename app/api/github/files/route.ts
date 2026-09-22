import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryTree } from '@/lib/github/repository';
import { filterRepositoryFiles } from '@/lib/github/fileFilter';
import { getRepositoryFiles } from '@/lib/github/fileContent';
import {
    enforceRateLimit,
    getSecurityErrorStatus,
    isSecurityError,
    readGitHubQuery,
    requireConnectedRepositoryAccess,
} from '@/lib/security/githubAccess';

export async function GET(req: NextRequest) {
    try {
        const { owner: trimmedOwner, repo: trimmedRepo, branch: trimmedBranch, path: trimmedPath } = readGitHubQuery(req, { branch: true });
        const userKey = await requireConnectedRepositoryAccess(trimmedOwner, trimmedRepo);
        enforceRateLimit(`github:files:${userKey}`, 60);

        const tree = await getRepositoryTree({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
        });

        const filteredFiles = filterRepositoryFiles(tree.tree);

        // If a specific path is provided, retrieve only that file.
        const selectedFiles = trimmedPath
            ? filteredFiles.filter(
                  (file) => file.path === trimmedPath
              )
            : filteredFiles;

        if (trimmedPath && selectedFiles.length === 0) {
            return NextResponse.json(
                { error: 'File not found in filtered repository files' },
                { status: 404 }
            );
        }

        const contextualFiles = await getRepositoryFiles({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
            files: selectedFiles,
        });

        return NextResponse.json(contextualFiles);
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

        return NextResponse.json({ error: 'Unable to load file content' }, { status: 502 });
    }
}