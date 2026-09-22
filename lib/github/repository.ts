import { cookies } from 'next/headers';

export type RepositoryTreeItem = {
    path: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
};

export type RepositoryTreeResult = {
    repository: string;
    branch: string;
    tree: RepositoryTreeItem[];
};

const MAX_TREE_ITEMS = 20_000;

function normalizeTreeItem(item: unknown): RepositoryTreeItem | null {
    if (!item || typeof item !== 'object') {
        return null;
    }

    const record = item as Record<string, unknown>;
    const path = typeof record.path === 'string' ? record.path : null;
    const sha = typeof record.sha === 'string' ? record.sha : null;
    const type = record.type;

    if (!path || !sha || (type !== 'blob' && type !== 'tree')) {
        return null;
    }

    const normalizedItem: RepositoryTreeItem = {
        path,
        type,
        sha,
    };

    if (type === 'blob' && typeof record.size === 'number') {
        normalizedItem.size = record.size;
    }

    return normalizedItem;
}

export async function getRepositoryTree({
    owner,
    repo,
    branch,
}: {
    owner: string;
    repo: string;
    branch: string;
}): Promise<RepositoryTreeResult> {
    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();
    const trimmedBranch = branch.trim();

    if (!trimmedOwner || !trimmedRepo || !trimmedBranch) {
        throw new Error('owner, repo, and branch are required');
    }

    const cookieStore = await cookies();
    const githubToken = cookieStore.get('github_token')?.value;

    if (!githubToken) {
        throw new Error('Missing GitHub auth token');
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(trimmedOwner)}/${encodeURIComponent(trimmedRepo)}/git/trees/${encodeURIComponent(trimmedBranch)}?recursive=1`;

    const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(15_000),
        headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (response.status === 401 || response.status === 403) {
        throw new Error('GitHub token is unauthorized');
    }

    if (response.status === 404) {
        throw new Error('Repository not found');
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`GitHub API failure${errorText ? `: ${errorText}` : ''}`);
    }

    const payload = (await response.json()) as {
        tree?: unknown[];
    };

    if (Array.isArray(payload.tree) && payload.tree.length > MAX_TREE_ITEMS) {
        throw new Error('Repository tree is too large');
    }

    const tree = Array.isArray(payload.tree)
        ? payload.tree
            .map((item) => normalizeTreeItem(item))
            .filter((item): item is RepositoryTreeItem => item !== null)
        : [];

    return {
        repository: `${trimmedOwner}/${trimmedRepo}`,
        branch: trimmedBranch,
        tree,
    };
}
