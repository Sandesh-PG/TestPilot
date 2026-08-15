import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { assembleRepositoryContext } from '@/lib/repository/context';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch');

    if (!owner || !repo || !branch) {
        return NextResponse.json(
            { error: 'owner, repo, and branch are required' },
            { status: 400 }
        );
    }

    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();
    const trimmedBranch = branch.trim();

    if (!trimmedOwner || !trimmedRepo || !trimmedBranch) {
        return NextResponse.json(
            { error: 'owner, repo, and branch are required' },
            { status: 400 }
        );
    }

    try {
        const cookieStore = await cookies();
        const githubToken = cookieStore.get('github_token')?.value;

        if (!githubToken) {
            return NextResponse.json(
                { error: 'Missing GitHub auth token' },
                { status: 401 }
            );
        }

        const context = await assembleRepositoryContext({
            owner: trimmedOwner,
            repo: trimmedRepo,
            branch: trimmedBranch,
        });

        return NextResponse.json(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'GitHub API failure';

        if (message === 'Missing GitHub auth token') {
            return NextResponse.json({ error: message }, { status: 401 });
        }

        if (message === 'GitHub token is unauthorized') {
            return NextResponse.json({ error: message }, { status: 401 });
        }

        if (message === 'Repository not found') {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        return NextResponse.json({ error: message }, { status: 502 });
    }
}
