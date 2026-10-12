'use client';

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { UserDetailContext } from '@/context/userDetail';
import EmptyWorkSpace from './EmptyWorkSpace';
import RepoDetails from './RepoDetails';
import DisconnectGitHubButton from './DisconnectGitHubButton';
import {
    Search,
    GitBranch,
    Lock,
    Globe,
    Clock,
    CheckCircle2,
    ArrowRight,
    X,
    FolderGit2,
} from 'lucide-react';

type GitHubRepository = {
    id: number;
    databaseId?: number;
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
    targetEnvironmentUrl?: string | null;
    updated_at: string;
};

type PersistedRepository = {
    id: number;
    databaseId?: number;
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
    targetEnvironmentUrl?: string | null;
    updated_at: string;
    connected_at?: string | null;
    last_sync?: string | null;
};

type WorkspaceRepositoryState = 'loading' | 'connected' | 'not-connected' | 'error';

const LANGUAGE_COLORS: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Shell: '#89e051',
    Dart: '#00B4AB',
};

function formatRelativeDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Updated today';
        if (diffDays === 1) return 'Updated yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
        return dateString;
    }
}

const mapPersistedRepository = (repository: Partial<PersistedRepository> | Record<string, unknown> | null): GitHubRepository | null => {
    if (!repository || typeof repository !== 'object') {
        return null;
    }

    const record = repository as Record<string, unknown>;

    const id = typeof record.id === 'number'
        ? record.id
        : typeof record.githubRepoId === 'number'
            ? record.githubRepoId
            : null;

    const name = typeof record.name === 'string' ? record.name : null;
    const fullName = typeof record.full_name === 'string'
        ? record.full_name
        : typeof record.fullName === 'string'
            ? record.fullName
            : null;

    const ownerValue = record.owner;
    const ownerLogin = typeof ownerValue === 'string'
        ? ownerValue
        : ownerValue && typeof ownerValue === 'object' && typeof (ownerValue as { login?: unknown }).login === 'string'
            ? (ownerValue as { login: string }).login
            : null;

    const htmlUrl = typeof record.html_url === 'string'
        ? record.html_url
        : typeof record.url === 'string'
            ? record.url
            : null;

    const defaultBranch = typeof record.default_branch === 'string'
        ? record.default_branch
        : typeof record.defaultBranch === 'string'
            ? record.defaultBranch
            : null;

    const isPrivate = typeof record.private === 'boolean'
        ? record.private
        : typeof record.isPrivate === 'boolean'
            ? record.isPrivate
            : false;

    const updatedAt = typeof record.updated_at === 'string'
        ? record.updated_at
        : typeof record.connectedAt === 'string'
            ? record.connectedAt
            : typeof record.connected_at === 'string'
                ? record.connected_at
                : new Date().toISOString();

    if (
        id === null ||
        !name ||
        !fullName ||
        !ownerLogin ||
        !htmlUrl ||
        !defaultBranch
    ) {
        return null;
    }

    return {
        id,
        databaseId: typeof record.databaseId === 'number' ? record.databaseId : (typeof record.id === 'number' ? record.id : undefined),
        name,
        full_name: fullName,
        owner: {
            login: ownerLogin,
        },
        html_url: htmlUrl,
        default_branch: defaultBranch,
        private: isPrivate,
        description: typeof record.description === 'string' ? record.description : null,
        language: typeof record.language === 'string' ? record.language : null,
        targetEnvironmentUrl: typeof record.targetEnvironmentUrl === 'string' ? record.targetEnvironmentUrl : 'http://localhost:3000',
        updated_at: updatedAt,
    };
};

export default function WorkSpaceBody({ projectId }: { projectId?: string } = {}) {
    const { userDetail } = useContext(UserDetailContext);
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
    const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null);
    const [connectedRepository, setConnectedRepository] = useState<GitHubRepository | null>(null);
    const [repositoryState, setRepositoryState] = useState<WorkspaceRepositoryState>('loading');
    const [repositoryError, setRepositoryError] = useState<string | null>(null);
    const [isLoadingRepositories, setIsLoadingRepositories] = useState(true);
    const [hasGitHubConnection, setHasGitHubConnection] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Search and Language Filtering State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('All');

    useEffect(() => {
        let isMounted = true;

        const loadPersistedRepository = async () => {
            setRepositoryState('loading');
            setRepositoryError(null);
            setErrorMessage(null);

            try {
                const endpoint = projectId
                    ? `/api/repositories/${encodeURIComponent(projectId)}`
                    : '/api/repositories';

                const response = await fetch(endpoint, {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error(`Repository lookup failed with status ${response.status}`);
                }

                const data: { repository?: PersistedRepository | null; testCases?: unknown[] } = await response.json();
                const persistedRepository = data.repository ?? null;
                const mappedRepository = mapPersistedRepository(persistedRepository);

                if (!isMounted) {
                    return;
                }

                if (!mappedRepository) {
                    setConnectedRepository(null);
                    setRepositoryState(persistedRepository ? 'error' : 'not-connected');
                    if (persistedRepository) {
                        setRepositoryError('The stored workspace repository could not be loaded.');
                    }
                    return;
                }

                if (Array.isArray(data.testCases)) {
                    (mappedRepository as unknown as { testCases?: unknown[] }).testCases = data.testCases;
                }

                setConnectedRepository(mappedRepository);
                setRepositoryState('connected');
            } catch {
                if (!isMounted) {
                    return;
                }

                setConnectedRepository(null);
                setRepositoryState('error');
                setRepositoryError('Unable to load the connected repository right now.');
            }
        };

        void loadPersistedRepository();

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    useEffect(() => {
        if (repositoryState !== 'not-connected') {
            return;
        }

        const controller = new AbortController();

        const loadRepositories = async () => {
            setIsLoadingRepositories(true);
            setErrorMessage(null);

            try {
                const response = await fetch('/api/github/repos', {
                    method: 'GET',
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    setHasGitHubConnection(false);
                    setRepositories([]);
                    setSelectedRepositoryId(null);
                    return;
                }

                if (!response.ok) {
                    setHasGitHubConnection(true);
                    setErrorMessage('Unable to load GitHub repositories right now.');
                    return;
                }

                const data: { repositories?: GitHubRepository[] } = await response.json();
                const loadedRepositories = data.repositories ?? [];

                setHasGitHubConnection(true);
                setRepositories(loadedRepositories);
                setSelectedRepositoryId((currentSelectedId) => {
                    if (
                        currentSelectedId !== null &&
                        loadedRepositories.some((repository) => repository.id === currentSelectedId)
                    ) {
                        return currentSelectedId;
                    }

                    return loadedRepositories[0]?.id ?? null;
                });
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setHasGitHubConnection(true);
                const message = error instanceof Error ? error.message : '';
                if (message !== 'Failed to load repositories') {
                    setErrorMessage('Unable to load GitHub repositories right now.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingRepositories(false);
                }
            }
        };

        void loadRepositories();

        return () => {
            controller.abort();
        };
    }, [repositoryState]);

    // Extract dynamic language list from loaded repositories
    const availableLanguages = useMemo(() => {
        const languages = new Set<string>();
        repositories.forEach((repo) => {
            if (repo.language) {
                languages.add(repo.language);
            }
        });
        return ['All', ...Array.from(languages).sort()];
    }, [repositories]);

    // Real-time filtered repositories by search query & language pill
    const filteredRepositories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return repositories.filter((repo) => {
            const matchesSearch =
                !query ||
                repo.name.toLowerCase().includes(query) ||
                repo.full_name.toLowerCase().includes(query) ||
                (repo.description && repo.description.toLowerCase().includes(query));

            const matchesLanguage =
                selectedLanguage === 'All' || repo.language === selectedLanguage;

            return matchesSearch && matchesLanguage;
        });
    }, [repositories, searchQuery, selectedLanguage]);

    const selectedRepository = repositories.find(
        (repository) => repository.id === selectedRepositoryId
    ) ?? null;

    const handleConnectRepository = async () => {
        if (!selectedRepository) {
            return;
        }

        setErrorMessage(null);
        setRepositoryError(null);

        try {
            const response = await fetch('/api/repositories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repository: {
                        id: selectedRepository.id,
                        name: selectedRepository.name,
                        full_name: selectedRepository.full_name,
                        owner: { login: selectedRepository.owner.login },
                        html_url: selectedRepository.html_url,
                        default_branch: selectedRepository.default_branch,
                        private: selectedRepository.private,
                        description: selectedRepository.description,
                        language: selectedRepository.language,
                    },
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const errorMessageText = payload?.error ?? 'Unable to connect repository right now.';
                setErrorMessage(errorMessageText);
                return;
            }

            const payload: { repository?: PersistedRepository | Record<string, unknown> | null } = await response.json().catch(() => ({}));
            const mappedRepository = mapPersistedRepository(payload.repository ?? null);

            if (!mappedRepository) {
                setErrorMessage('Unable to connect repository right now.');
                return;
            }

            setConnectedRepository(mappedRepository);
            setRepositoryState('connected');
            setRepositories([]);
            setSelectedRepositoryId(null);
            setHasGitHubConnection(null);
            setErrorMessage(null);
        } catch {
            setErrorMessage('Unable to connect repository right now.');
        }
    };

    const handleDisconnectRepository = async () => {
        try {
            const response = await fetch('/api/repositories', {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const errorMessageText = payload?.error ?? 'Unable to disconnect repository right now.';
                setErrorMessage(errorMessageText);
                return;
            }

            setConnectedRepository(null);
            setRepositoryState('not-connected');
            setRepositories([]);
            setSelectedRepositoryId(null);
            setHasGitHubConnection(true);
            setIsLoadingRepositories(true);
            setErrorMessage(null);
        } catch {
            setErrorMessage('Unable to disconnect repository right now.');
        }
    };

    const handleRetry = () => {
        setIsLoadingRepositories(true);
        setErrorMessage(null);
        setHasGitHubConnection(true);
        void fetch('/api/github/repos')
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Failed to load repositories');
                }

                const data: { repositories?: GitHubRepository[] } = await response.json();
                const loadedRepositories = data.repositories ?? [];

                setRepositories(loadedRepositories);
                setSelectedRepositoryId((currentSelectedId) => {
                    if (
                        currentSelectedId !== null &&
                        loadedRepositories.some((repository) => repository.id === currentSelectedId)
                    ) {
                        return currentSelectedId;
                    }

                    return loadedRepositories[0]?.id ?? null;
                });
            })
            .catch(() => {
                setErrorMessage('Unable to load GitHub repositories right now.');
            })
            .finally(() => {
                setIsLoadingRepositories(false);
            });
    };

    const renderRepositorySelection = () => {
        if (isLoadingRepositories) {
            return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm">
                    <div className="space-y-6 animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="h-6 w-48 rounded bg-slate-800" />
                            <div className="h-10 w-40 rounded bg-slate-800" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                            <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                            <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                            <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                            <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                            <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                        </div>
                    </div>
                </div>
            );
        }

        if (errorMessage) {
            return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-100">GitHub repositories unavailable</h2>
                            <p className="mt-2 text-sm text-slate-400">{errorMessage}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRetry}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (!repositories.length) {
            return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 shadow-xl backdrop-blur-sm text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 mb-4">
                        <FolderGit2 className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-100">No repositories found</h2>
                    <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                        We could not find any owned repositories in this GitHub account.
                    </p>
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200 shadow-sm"
                    >
                        Refresh repositories
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Header Container */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm space-y-6">
                    {/* Top action row */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white">Select one repository</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                Choose a repository from your GitHub account to connect in your workspace.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <DisconnectGitHubButton />
                            <button
                                type="button"
                                onClick={handleConnectRepository}
                                disabled={!selectedRepository}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 shadow-sm"
                            >
                                <span>Connect Repository</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Search and Language Filters */}
                    <div className="border-t border-slate-800/80 pt-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search repositories by name or description..."
                                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Result Counter */}
                            <div className="text-xs text-slate-400 font-medium">
                                Showing <span className="text-white font-semibold">{filteredRepositories.length}</span> of {repositories.length} {repositories.length === 1 ? 'repository' : 'repositories'}
                            </div>
                        </div>

                        {/* Language Filter Pills */}
                        {availableLanguages.length > 1 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-xs text-slate-400 mr-1 font-medium">Language:</span>
                                {availableLanguages.map((lang) => {
                                    const isActive = selectedLanguage === lang;
                                    return (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => setSelectedLanguage(lang)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                                isActive
                                                    ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 shadow-sm'
                                                    : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            {lang !== 'All' && (
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: LANGUAGE_COLORS[lang] || '#10b981' }}
                                                />
                                            )}
                                            <span>{lang}</span>
                                        </button>
                                    );
                                })}

                                {(searchQuery || selectedLanguage !== 'All') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedLanguage('All');
                                        }}
                                        className="text-xs text-slate-400 hover:text-rose-400 underline underline-offset-2 ml-2 transition-colors cursor-pointer"
                                    >
                                        Reset filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3-Column Card Grid Layout */}
                {filteredRepositories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRepositories.map((repository) => {
                            const isSelected = repository.id === selectedRepositoryId;
                            const langColor = repository.language
                                ? (LANGUAGE_COLORS[repository.language] || '#10b981')
                                : '#64748b';

                            return (
                                <div
                                    key={repository.id}
                                    onClick={() => setSelectedRepositoryId(repository.id)}
                                    className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 cursor-pointer select-none ${
                                        isSelected
                                            ? 'border-emerald-500/90 bg-emerald-950/25 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                                            : 'border-slate-800/90 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-md'
                                    }`}
                                >
                                    {/* Selection badge at top-right corner */}
                                    {isSelected && (
                                        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-md ring-2 ring-slate-950">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                    )}

                                    {/* Top Row: Name and Visibility Badge */}
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h3
                                                    className={`font-semibold text-base tracking-tight truncate transition-colors ${
                                                        isSelected ? 'text-white' : 'text-slate-100 group-hover:text-emerald-300'
                                                    }`}
                                                    title={repository.full_name}
                                                >
                                                    {repository.name}
                                                </h3>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                    {repository.owner.login}
                                                </p>
                                            </div>

                                            {/* Visibility Pill */}
                                            <div className="shrink-0 flex items-center">
                                                {repository.private ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                                        <Lock className="h-3 w-3" />
                                                        <span>Private</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                                        <Globe className="h-3 w-3 text-slate-400" />
                                                        <span>Public</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Middle Row: Description */}
                                        <p
                                            className={`text-xs leading-relaxed line-clamp-2 min-h-[2.5rem] ${
                                                repository.description ? 'text-slate-300' : 'text-slate-500 italic'
                                            }`}
                                        >
                                            {repository.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    {/* Bottom Footer Row */}
                                    <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 gap-2">
                                        {/* Language Badge */}
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {repository.language ? (
                                                <>
                                                    <span
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: langColor }}
                                                    />
                                                    <span className="text-slate-300 truncate font-medium">
                                                        {repository.language}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-500">Plain text</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {/* Default branch */}
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                                <GitBranch className="h-3 w-3 text-slate-500" />
                                                <span>{repository.default_branch}</span>
                                            </div>

                                            {/* Updated date */}
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <Clock className="h-3 w-3 text-slate-500" />
                                                <span>{formatRelativeDate(repository.updated_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Search empty state */
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 mb-4">
                            <Search className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-200">No matching repositories</h3>
                        <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                            No repositories match &quot;{searchQuery}&quot;
                            {selectedLanguage !== 'All' ? ` with language ${selectedLanguage}` : ''}.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedLanguage('All');
                            }}
                            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer shadow-sm"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span>Clear search &amp; filters</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderLoadingState = () => (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm">
            <div className="space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-48 rounded bg-slate-800" />
                    <div className="h-10 w-40 rounded bg-slate-800" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                    <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                    <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                    <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                    <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                    <div className="h-44 rounded-xl border border-slate-800/80 bg-slate-900/50" />
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1500px] space-y-8">
                <div className="mb-6 flex items-center justify-between border-b border-slate-800/80 pb-5">
                    <h1 className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                        Workspace
                    </h1>
                    <p className="text-slate-400">
                        Remaining Credits: <span className="text-slate-200 font-semibold">{userDetail?.credits}</span>
                    </p>
                </div>

                {repositoryState === 'loading' && renderLoadingState()}

                {repositoryState === 'connected' && connectedRepository && (
                    <RepoDetails
                        repo={connectedRepository}
                        onDisconnect={handleDisconnectRepository}
                    />
                )}

                {repositoryState === 'error' && (
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-100">Workspace unavailable</h2>
                                <p className="mt-2 text-sm text-slate-400">{repositoryError ?? 'Unable to load the connected repository right now.'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200"
                            >
                                Refresh page
                            </button>
                        </div>
                    </div>
                )}

                {repositoryState === 'not-connected' && (
                    !hasGitHubConnection ? (
                        <EmptyWorkSpace />
                    ) : (
                        renderRepositorySelection()
                    )
                )}
            </div>
        </main>
    );
}