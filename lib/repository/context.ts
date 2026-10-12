import { getRepositoryContext, type RepositoryFileContent } from '@/lib/github/fileContent';
import {
    MAX_REPOSITORY_CONTEXT_BYTES,
    MAX_REPOSITORY_CONTEXT_FILES,
} from '@/lib/security/content';

export type RepositoryFile = {
    path: string;
    sha: string;
    size?: number;
    content: string;
};

export type RepositoryProject = {
    type: string;
    primaryLanguage?: string;
    packageManager?: string;
};

export type RepositoryContext = {
    repository: string;
    owner: string;
    name: string;
    branch: string;
    project: RepositoryProject;
    files: RepositoryFile[];
    summary: {
        totalFiles: number;
        loadedFiles: number;
        skippedFiles: number;
        totalSize: number;
    };
};

const LANGUAGE_MAP: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.cs': 'csharp',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.scala': 'scala',
    '.sql': 'sql',
    '.sh': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.json': 'json',
};

function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function getFileExtension(path: string): string {
    const fileName = path.split('/').pop() ?? '';
    const lastDot = fileName.lastIndexOf('.');

    if (lastDot <= 0 || lastDot === fileName.length - 1) {
        return '';
    }

    return fileName.slice(lastDot).toLowerCase();
}

function parseJsonSafely<T = Record<string, unknown>>(content: string): T | null {
    try {
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

function inferPackageManagerFromPackageJson(content: string): string | undefined {
    const parsed = parseJsonSafely<Record<string, unknown>>(content);
    if (!parsed) {
        return undefined;
    }

    const packageManager = typeof parsed.packageManager === 'string' ? parsed.packageManager.trim() : '';
    if (packageManager) {
        const manager = packageManager.split('@')[0]?.trim().toLowerCase();
        if (manager === 'npm' || manager === 'pnpm' || manager === 'yarn' || manager === 'bun') {
            return manager;
        }
    }

    const dependencyNames = new Set([
        ...Object.keys((parsed.dependencies as Record<string, unknown>) ?? {}),
        ...Object.keys((parsed.devDependencies as Record<string, unknown>) ?? {}),
    ]);

    if (dependencyNames.has('next') || dependencyNames.has('@next/swc')) {
        return 'npm';
    }

    if (dependencyNames.has('vite')) {
        return 'npm';
    }

    if (dependencyNames.has('react')) {
        return 'npm';
    }

    return undefined;
}

function detectProjectType(files: RepositoryFile[]): string {
    const fileSet = new Set(files.map((file) => normalizePath(file.path).toLowerCase()));

    if (fileSet.has('package.json')) {
        const packageJson = files.find((file) => normalizePath(file.path).toLowerCase() === 'package.json');
        const packageContent = packageJson?.content ?? '';
        const parsed = parseJsonSafely<Record<string, unknown>>(packageContent);

        if (parsed) {
            const deps = {
                ...(parsed.dependencies as Record<string, unknown> ?? {}),
                ...(parsed.devDependencies as Record<string, unknown> ?? {}),
            };
            const depNames = Object.keys(deps);

            if (depNames.includes('next') || depNames.includes('@next/env')) {
                return 'nextjs';
            }

            if (depNames.includes('react') || depNames.includes('react-dom')) {
                return 'react';
            }
        }

        return 'node';
    }

    if (fileSet.has('requirements.txt') || fileSet.has('pyproject.toml')) {
        return 'python';
    }

    if (fileSet.has('pom.xml') || fileSet.has('build.gradle') || fileSet.has('build.gradle.kts')) {
        return 'java';
    }

    if (fileSet.has('go.mod')) {
        return 'go';
    }

    if (fileSet.has('cargo.toml')) {
        return 'rust';
    }

    if (fileSet.has('composer.json')) {
        return 'php';
    }

    return 'generic';
}

function detectPrimaryLanguage(files: RepositoryFile[]): string | undefined {
    const counts = new Map<string, number>();

    for (const file of files) {
        const language = LANGUAGE_MAP[getFileExtension(file.path)];
        if (!language) {
            continue;
        }

        counts.set(language, (counts.get(language) ?? 0) + 1);
    }

    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best?.[0];
}

function normalizeLoadedFile(file: RepositoryFileContent): RepositoryFile | null {
    if (file.skipped || typeof file.content !== 'string') {
        return null;
    }

    return {
        path: file.path,
        sha: file.sha,
        size: typeof file.size === 'number' ? file.size : undefined,
        content: file.content,
    };
}

export async function assembleRepositoryContext({
    owner,
    repo,
    branch,
}: {
    owner: string;
    repo: string;
    branch: string;
}): Promise<RepositoryContext> {
    const repositoryFilesResult = await getRepositoryContext({ owner, repo, branch });
    const loadedFiles = repositoryFilesResult.files
        .map((file) => normalizeLoadedFile(file))
        .filter((file): file is RepositoryFile => file !== null);

    if (loadedFiles.length > MAX_REPOSITORY_CONTEXT_FILES) {
        loadedFiles.length = MAX_REPOSITORY_CONTEXT_FILES;
    }

    const packageJsonFile = loadedFiles.find((file) => normalizePath(file.path).toLowerCase() === 'package.json');
    const packageManager = packageJsonFile ? inferPackageManagerFromPackageJson(packageJsonFile.content) : undefined;

    const projectType = detectProjectType(loadedFiles);
    const primaryLanguage = detectPrimaryLanguage(loadedFiles) ?? (projectType === 'node' ? 'javascript' : undefined);

    const boundedFiles: RepositoryFile[] = [];
    let totalSize = 0;

    for (const file of loadedFiles) {
        const fileSize = typeof file.size === 'number' ? file.size : file.content.length;
        if (totalSize + fileSize > MAX_REPOSITORY_CONTEXT_BYTES) {
            break;
        }

        boundedFiles.push(file);
        totalSize += fileSize;
    }

    const [repositoryOwner, repositoryName] = repositoryFilesResult.repository.split('/') as [string, string];

    return {
        repository: repositoryFilesResult.repository,
        owner: repositoryOwner ?? owner,
        name: repositoryName ?? repo,
        branch: repositoryFilesResult.branch,
        project: {
            type: projectType,
            primaryLanguage,
            packageManager,
        },
        files: boundedFiles,
        summary: {
            totalFiles: repositoryFilesResult.summary.totalFiles,
            loadedFiles: boundedFiles.length,
            skippedFiles: repositoryFilesResult.summary.skippedFiles,
            totalSize,
        },
    };
}
