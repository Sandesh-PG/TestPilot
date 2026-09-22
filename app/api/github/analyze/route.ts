import { NextRequest, NextResponse } from 'next/server';
import { assembleRepositoryContext } from '@/lib/repository/context';
import { analyzeRepositoryContext } from '@/lib/ai/repositoryAnalyzer';
import {
    enforceRateLimit,
    getSecurityErrorStatus,
    isSecurityError,
    readGitHubQuery,
    requireConnectedRepositoryAccess,
} from '@/lib/security/githubAccess';

export async function GET(req: NextRequest) {
    try {
        const { owner: trimmedOwner, repo: trimmedRepo, branch: trimmedBranch } = readGitHubQuery(req, { branch: true });
        const userKey = await requireConnectedRepositoryAccess(trimmedOwner, trimmedRepo);
        enforceRateLimit(`github:analyze:${userKey}`, 10);

        const context = await assembleRepositoryContext({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
        });

        const analysis = analyzeRepositoryContext(context);

        return NextResponse.json(analysis);
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
        return NextResponse.json({ error: 'Unable to analyze repository' }, { status: 502 });
    }
}
