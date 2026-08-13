'use client';

import React, { useContext, useEffect, useState } from 'react';
import { UserDetailContext } from '@/context/userDetail';
import EmptyWorkSpace from './EmptyWorkSpace';
import RepoDetails from './RepoDetails';

type GitHubRepository = {
    id: number;
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
    updated_at: string;
};

type PersistedRepository = {
    id: number;
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
    updated_at: string;
    connected_at?: string | null;
    last_sync?: string | null;
};

type WorkspaceRepositoryState = 'loading' | 'connected' | 'not-connected' | 'error';

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
        updated_at: updatedAt,
    };
};

export default function WorkSpaceBody() {
    const { userDetail } = useContext(UserDetailContext);
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
    const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null);
    const [connectedRepository, setConnectedRepository] = useState<GitHubRepository | null>(null);
    const [repositoryState, setRepositoryState] = useState<WorkspaceRepositoryState>('loading');
    const [repositoryError, setRepositoryError] = useState<string | null>(null);
    const [isLoadingRepositories, setIsLoadingRepositories] = useState(true);
    const [hasGitHubConnection, setHasGitHubConnection] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadPersistedRepository = async () => {
            setRepositoryState('loading');
            setRepositoryError(null);
            setErrorMessage(null);

            try {
                const response = await fetch('/api/repositories', {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error(`Repository lookup failed with status ${response.status}`);
                }

                const data: { repository?: PersistedRepository | null } = await response.json();
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
    }, []);

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
            } catch {
                if (!controller.signal.aborted) {
                    setHasGitHubConnection(true);
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
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 w-40 rounded bg-zinc-800" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="h-28 rounded-xl bg-zinc-900/60" />
                            <div className="h-28 rounded-xl bg-zinc-900/60" />
                            <div className="h-28 rounded-xl bg-zinc-900/60" />
                            <div className="h-28 rounded-xl bg-zinc-900/60" />
                        </div>
                    </div>
                </div>
            );
        }

        if (errorMessage) {
            return (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-100">GitHub repositories unavailable</h2>
                            <p className="mt-2 text-sm text-zinc-400">{errorMessage}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRetry}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (!repositories.length) {
            return (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-100">No repositories found</h2>
                            <p className="mt-2 text-sm text-zinc-400">
                                We could not find any owned repositories in this GitHub account.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRetry}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-100">Select one repository</h2>
                            <p className="mt-1 text-sm text-zinc-400">
                                Choose a single repository to connect in your workspace.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleConnectRepository}
                            disabled={!selectedRepository}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                            Connect Repository
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4">
                        {repositories.map((repository) => {
                            const isSelected = repository.id === selectedRepositoryId;

                            return (
                                <label
                                    key={repository.id}
                                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${isSelected
                                        ? 'border-emerald-500/60 bg-emerald-500/10'
                                        : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/70'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <input
                                            type="radio"
                                            name="repository-selection"
                                            checked={isSelected}
                                            onChange={() => setSelectedRepositoryId(repository.id)}
                                            className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                                        />

                                        <div className="min-w-0 flex-1 space-y-3">
                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg font-semibold text-zinc-50">{repository.name}</h3>
                                                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                                                            {repository.private ? 'Private' : 'Public'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 truncate text-sm text-zinc-400">{repository.full_name}</p>
                                                </div>

                                                <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                                                    <span className="rounded-full bg-zinc-800 px-3 py-1">
                                                        Default branch: {repository.default_branch}
                                                    </span>
                                                    <span className="rounded-full bg-zinc-800 px-3 py-1">
                                                        Owner: {repository.owner.login}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
                                                <div>
                                                    <span className="block text-xs uppercase tracking-wider text-zinc-500">Language</span>
                                                    <span className="mt-1 block text-zinc-200">
                                                        {repository.language ?? 'Not available'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs uppercase tracking-wider text-zinc-500">Updated</span>
                                                    <span className="mt-1 block text-zinc-200">{new Date(repository.updated_at).toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs uppercase tracking-wider text-zinc-500">Description</span>
                                                    <span className="mt-1 block line-clamp-2 text-zinc-200">
                                                        {repository.description ?? 'No description available'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderLoadingState = () => (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
            <div className="space-y-4 animate-pulse">
                <div className="h-4 w-40 rounded bg-zinc-800" />
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-28 rounded-xl bg-zinc-900/60" />
                    <div className="h-28 rounded-xl bg-zinc-900/60" />
                    <div className="h-28 rounded-xl bg-zinc-900/60" />
                    <div className="h-28 rounded-xl bg-zinc-900/60" />
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-[calc(100vh-73px)] bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-4xl space-y-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
                        Workspace
                    </h1>
                    <p className="text-zinc-400">
                        Remaining Credits: {userDetail?.credits}
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
                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold text-zinc-100">Workspace unavailable</h2>
                                <p className="mt-2 text-sm text-zinc-400">{repositoryError ?? 'Unable to load the connected repository right now.'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
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