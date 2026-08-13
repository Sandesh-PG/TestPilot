import { cookies } from 'next/headers';
import type { RepositoryTreeItem } from './repository';
import { filterRepositoryFiles } from './fileFilter';
import { getRepositoryTree } from './repository';

export const MAX_FILE_SIZE_BYTES = 1_000_000;
export const MAX_CONCURRENT_FILE_REQUESTS = 5;

export type RepositoryFileContent = {
    path: string;
    sha: string;
    size?: number;
    content?: string;
    skipped?: boolean;
    reason?: string;
};

export type RepositoryFilesResult = {
    repository: string;
    branch: string;
    files: RepositoryFileContent[];
    summary: {
        totalFiles: number;
        loadedFiles: number;
        skippedFiles: number;
    };
};

function isSecretFilePath(path: string): boolean {
    const normalized = path.toLowerCase();
    const segments = normalized.split('/');

    if (segments.some((segment) => segment === '.env' || segment.startsWith('.env.'))) {
        return true;
    }

    return normalized.includes('secret') || normalized.includes('token') || normalized.includes('password');
}

function getGitHubRequestHeaders(token: string): Record<string, string> {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

async function fetchFileContentFromGitHub({
    owner,
    repo,
    path,
    branch,
    token,
}: {
    owner: string;
    repo: string;
    path: string;
    branch: string;
    token: string;
}): Promise<RepositoryFileContent> {
    const encodedPath = encodeURIComponent(path);
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: getGitHubRequestHeaders(token),
    });

    if (response.status === 401 || response.status === 403) {
        return {
            path,
            sha: '',
            skipped: true,
            reason: 'unauthorized',
        };
    }

    if (response.status === 404) {
        return {
            path,
            sha: '',
            skipped: true,
            reason: 'not_found',
        };
    }

    if (!response.ok) {
        return {
            path,
            sha: '',
            skipped: true,
            reason: 'github_error',
        };
    }

    const payload = (await response.json()) as {
        type?: string;
        content?: string;
        encoding?: string;
        sha?: string;
        size?: number;
    };

    if (!payload || payload.type !== 'file') {
        return {
            path,
            sha: payload?.sha ?? '',
            size: typeof payload?.size === 'number' ? payload.size : undefined,
            skipped: true,
            reason: 'not_a_file',
        };
    }

    const size = typeof payload.size === 'number' ? payload.size : undefined;
    const sha = payload.sha ?? '';

    if (typeof size === 'number' && size > MAX_FILE_SIZE_BYTES) {
        return {
            path,
            sha,
            size,
            skipped: true,
            reason: 'file_too_large',
        };
    }

    const content = payload.content;
    if (typeof content !== 'string') {
        return {
            path,
            sha,
            size,
            skipped: true,
            reason: 'unsupported_binary',
        };
    }

    if (isSecretFilePath(path)) {
        return {
            path,
            sha,
            size,
            skipped: true,
            reason: 'secret_file',
        };
    }

    try {
        const normalizedBase64 = content.replace(/\s+/g, '');
        const decoded = Buffer.from(normalizedBase64, 'base64').toString('utf8');

        if (decoded.includes('\0')) {
            return {
                path,
                sha,
                size,
                skipped: true,
                reason: 'unsupported_binary',
            };
        }

        return {
            path,
            sha,
            size,
            content: decoded,
        };
    } catch {
        return {
            path,
            sha,
            size,
            skipped: true,
            reason: 'decode_failed',
        };
    }
}

export async function getFileContent({
    owner,
    repo,
    path,
    branch,
}: {
    owner: string;
    repo: string;
    path: string;
    branch: string;
}): Promise<RepositoryFileContent> {
    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();
    const trimmedBranch = branch.trim();
    const trimmedPath = path.trim();

    if (!trimmedOwner || !trimmedRepo || !trimmedBranch || !trimmedPath) {
        throw new Error('owner, repo, branch, and path are required');
    }

    const cookieStore = await cookies();
    const githubToken = cookieStore.get('github_token')?.value;

    if (!githubToken) {
        throw new Error('Missing GitHub auth token');
    }

    if (isSecretFilePath(trimmedPath)) {
        return {
            path: trimmedPath,
            sha: '',
            skipped: true,
            reason: 'secret_file',
        };
    }

    return fetchFileContentFromGitHub({
        owner: trimmedOwner,
        repo: trimmedRepo,
        path: trimmedPath,
        branch: trimmedBranch,
        token: githubToken,
    });
}

export async function getRepositoryFiles({
    owner,
    repo,
    branch,
    files,
}: {
    owner: string;
    repo: string;
    branch: string;
    files: RepositoryTreeItem[];
}): Promise<RepositoryFilesResult> {
    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();
    const trimmedBranch = branch.trim();

    if (!trimmedOwner || !trimmedRepo || !trimmedBranch) {
        throw new Error('owner, repo, and branch are required');
    }

    const validFiles = files.filter((file) => file.type === 'blob' && !isSecretFilePath(file.path));

    const results: Array<RepositoryFileContent | null> = new Array(validFiles.length).fill(null);
    let nextIndex = 0;
    const workerCount = Math.min(MAX_CONCURRENT_FILE_REQUESTS, Math.max(1, validFiles.length || 1));

    const cookieStore = await cookies();
    const githubToken = cookieStore.get('github_token')?.value;

    if (!githubToken) {
        throw new Error('Missing GitHub auth token');
    }

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (true) {
                const currentIndex = nextIndex;
                if (currentIndex >= validFiles.length) {
                    return;
                }

                nextIndex += 1;
                const file = validFiles[currentIndex];
                const result = await fetchFileContentFromGitHub({
                    owner: trimmedOwner,
                    repo: trimmedRepo,
                    path: file.path,
                    branch: trimmedBranch,
                    token: githubToken,
                });

                results[currentIndex] = {
                    ...result,
                    sha: result.sha || file.sha,
                    size: typeof result.size === 'number' ? result.size : file.size,
                };
            }
        })
    );

    const fileResults = results.filter((file): file is RepositoryFileContent => file !== null);
    const loadedFiles = fileResults.filter((file) => !file.skipped);
    const skippedFiles = fileResults.filter((file) => file.skipped);

    return {
        repository: `${trimmedOwner}/${trimmedRepo}`,
        branch: trimmedBranch,
        files: fileResults,
        summary: {
            totalFiles: validFiles.length,
            loadedFiles: loadedFiles.length,
            skippedFiles: skippedFiles.length,
        },
    };
}

export async function getRepositoryContext({
    owner,
    repo,
    branch,
}: {
    owner: string;
    repo: string;
    branch: string;
}): Promise<RepositoryFilesResult> {
    const result = await getRepositoryTree({ owner, repo, branch });
    const filteredFiles = filterRepositoryFiles(result.tree);

    return getRepositoryFiles({
        owner: result.repository.split('/')[0],
        repo: result.repository.split('/')[1],
        branch: result.branch,
        files: filteredFiles,
    });
}
