'use client';

import { useEffect, useRef, useState } from 'react';
import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    FileCode2,
    GitBranch,
    RefreshCw,
    Sparkles,
    Trash2,
} from 'lucide-react';

type RepoDetailsProps = {
    repo: {
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
        branchCount?: number;
        testCount?: number;
    };
    onDisconnect: () => void;
};

type GitHubBranch = {
    name: string;
    protected: boolean;
    default: boolean;
};

type RepositoryFileEntry = {
    path: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
};

type RepositoryFileContent = {
    path: string;
    sha: string;
    size?: number;
    content?: string;
    skipped?: boolean;
    reason?: string;
};

type GeneratedTestCase = {
    title: string;
    description: string;
    type: string;
    priority: string;
    targetRoute: string;
    targetFiles: string[];
    expectedResult: string;
};

const MAX_PREVIEW_LENGTH = 30000;

function formatReason(reason: string | undefined): string {
    switch (reason) {
        case 'not_found':
            return 'File not found in the selected branch.';
        case 'unauthorized':
            return 'GitHub access is unauthorized for this file.';
        case 'secret_file':
            return 'This file was skipped because it appears to contain sensitive data.';
        case 'file_too_large':
            return 'The file is too large to preview safely.';
        case 'unsupported_binary':
            return 'Binary or unsupported content cannot be displayed.';
        case 'not_a_file':
            return 'The selected path is not a file.';
        case 'github_error':
            return 'GitHub returned an error while fetching the file.';
        case 'decode_failed':
            return 'The file content could not be decoded.';
        default:
            return 'This file could not be previewed.';
    }
}

export default function RepoDetails({ repo, onDisconnect }: Readonly<RepoDetailsProps>) {
    const branchCount = repo.branchCount ?? 0;
    const testCount = repo.testCount ?? 0;
    const [branches, setBranches] = useState<GitHubBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>(repo.default_branch || 'main');
    const [isLoadingBranches, setIsLoadingBranches] = useState(true);
    const [branchError, setBranchError] = useState<string | null>(null);
    const [fileTree, setFileTree] = useState<RepositoryFileEntry[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [treeError, setTreeError] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [filePreviewError, setFilePreviewError] = useState<string | null>(null);
    const [isGeneratingTests, setIsGeneratingTests] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedTestCases, setGeneratedTestCases] = useState<GeneratedTestCase[]>([]);
    const fileRequestIdRef = useRef(0);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadBranches = async () => {
            setIsLoadingBranches(true);
            setBranchError(null);

            try {
                const params = new URLSearchParams({
                    owner: repo.owner.login,
                    repo: repo.name,
                });

                const response = await fetch(`/api/github/branches?${params.toString()}`, {
                    method: 'GET',
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                    throw new Error(payload?.error ?? 'Unable to load repository branches.');
                }

                const payload = (await response.json()) as { branches?: GitHubBranch[] };
                const nextBranches = payload.branches ?? [];

                if (!isMounted) {
                    return;
                }

                setBranches(nextBranches);

                const preferredBranch = nextBranches.some((branch) => branch.name === repo.default_branch)
                    ? repo.default_branch
                    : nextBranches[0]?.name ?? repo.default_branch;

                setSelectedBranch(preferredBranch);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setBranchError(error instanceof Error ? error.message : 'Unable to load repository branches.');
                setBranches([]);
            } finally {
                if (isMounted) {
                    setIsLoadingBranches(false);
                }
            }
        };

        void loadBranches();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [repo.default_branch, repo.name, repo.owner.login]);

    useEffect(() => {
        if (!selectedBranch) {
            setFileTree([]);
            setSelectedFile(null);
            setFileContent(null);
            setFilePreviewError(null);
            return;
        }

        let isMounted = true;
        const controller = new AbortController();

        const loadTree = async () => {
            setIsLoadingFiles(true);
            setTreeError(null);
            setSelectedFile(null);
            setFileContent(null);
            setFilePreviewError(null);

            try {
                const params = new URLSearchParams({
                    owner: repo.owner.login,
                    repo: repo.name,
                    branch: selectedBranch,
                    filtered: 'true',
                });

                const response = await fetch(`/api/github/tree?${params.toString()}`, {
                    method: 'GET',
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                    throw new Error(payload?.error ?? 'Unable to load repository files.');
                }

                const payload = (await response.json()) as {
                    files?: RepositoryFileEntry[];
                };

                if (!isMounted) {
                    return;
                }

                setFileTree(payload.files ?? []);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setTreeError(error instanceof Error ? error.message : 'Unable to load the repository tree.');
                setFileTree([]);
            } finally {
                if (isMounted) {
                    setIsLoadingFiles(false);
                }
            }
        };

        void loadTree();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [repo.name, repo.owner.login, selectedBranch]);

    const handleFileSelection = async (filePath: string) => {
        if (!selectedBranch || !filePath) {
            return;
        }

        const requestId = ++fileRequestIdRef.current;
        setSelectedFile(filePath);
        setFileContent(null);
        setFilePreviewError(null);
        setIsLoadingFile(true);

        try {
            const params = new URLSearchParams({
                owner: repo.owner.login,
                repo: repo.name,
                branch: selectedBranch,
                path: filePath,
            });

            const response = await fetch(`/api/github/files?${params.toString()}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                const message = payload?.error ?? 'Unable to load file content.';
                if (requestId !== fileRequestIdRef.current) {
                    return;
                }

                setFilePreviewError(message);
                setFileContent(null);
                return;
            }

            const payload = (await response.json()) as {
                files?: RepositoryFileContent[];
            };

            const selectedFileResult = payload.files?.find((file) => file.path === filePath) ?? null;

            if (requestId !== fileRequestIdRef.current) {
                return;
            }

            if (!selectedFileResult) {
                setFilePreviewError('The selected file is not available for preview.');
                setFileContent(null);
                return;
            }

            if (selectedFileResult.skipped) {
                setFilePreviewError(formatReason(selectedFileResult.reason));
                setFileContent(null);
                return;
            }

            if (typeof selectedFileResult.content !== 'string') {
                setFilePreviewError('This file does not contain previewable text content.');
                setFileContent(null);
                return;
            }

            const normalizedContent = selectedFileResult.content.length > MAX_PREVIEW_LENGTH
                ? `${selectedFileResult.content.slice(0, MAX_PREVIEW_LENGTH)}\n\n... content truncated for preview ...`
                : selectedFileResult.content;

            setFileContent(normalizedContent);
        } catch (error) {
            if (requestId !== fileRequestIdRef.current) {
                return;
            }

            setFilePreviewError(error instanceof Error ? error.message : 'Unable to load file content.');
            setFileContent(null);
        } finally {
            if (requestId === fileRequestIdRef.current) {
                setIsLoadingFile(false);
            }
        }
    };

    const handleGenerateTests = async () => {
        if (!selectedBranch) {
            return;
        }

        setIsGeneratingTests(true);
        setGenerationError(null);

        try {
            const params = new URLSearchParams({
                owner: repo.owner.login,
                repo: repo.name,
                branch: selectedBranch,
            });

            const response = await fetch(`/api/github/test-cases?${params.toString()}`, {
                method: 'GET',
            });

            const payload = (await response.json().catch(() => null)) as {
                error?: string;
                testCases?: GeneratedTestCase[];
            } | null;

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Unable to generate test cases.');
            }

            const tests = Array.isArray(payload?.testCases) ? payload.testCases : [];
            setGeneratedTestCases(tests);
        } catch (error) {
            setGenerationError(error instanceof Error ? error.message : 'Unable to generate test cases.');
        } finally {
            setIsGeneratingTests(false);
        }
    };

    const previewContent = fileContent ?? '';

    return (
        <section className="space-y-6">
            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6 shadow-xl backdrop-blur-sm lg:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Connected
                        </div>
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight text-slate-50">{repo.name}</h2>
                            <p className="mt-2 text-sm text-slate-400">{repo.full_name}</p>
                        </div>
                        <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 transition-colors hover:text-white"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open repository
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-3 md:justify-end">
                        <button
                            type="button"
                            disabled
                            title="Synchronization is not available in the current project API"
                            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-500"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Sync unavailable
                        </button>
                        <button
                            type="button"
                            onClick={onDisconnect}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                        >
                            <Trash2 className="h-4 w-4" />
                            Disconnect
                        </button>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-5">
                        <div className="flex items-center gap-2 text-slate-400">
                            <GitBranch className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Default branch</span>
                        </div>
                        <p className="mt-3 text-base font-medium text-slate-200">{repo.default_branch}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-5">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Updated</span>
                        </div>
                        <p className="mt-3 text-base font-medium text-slate-200">{new Date(repo.updated_at).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-5">
                        <div className="flex items-center gap-2 text-slate-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Scanned tests</span>
                        </div>
                        <p className="mt-3 text-base font-medium text-slate-200">{testCount > 0 ? String(testCount) : 'Not scanned yet'}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm lg:p-8">
                <div className="flex flex-col gap-5 border-b border-slate-800/80 pb-6 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
                            <FileCode2 className="h-4 w-4" />
                            Repository explorer
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">Branch and repository inspection</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                            Select a branch, browse repository files, preview content, and generate repository-level tests.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-black/20">
                        <GitBranch className="h-4 w-4 text-slate-400" />
                        {selectedBranch || 'No branch selected'}
                    </div>
                </div>

                <div className="mt-6 max-w-xl">
                    <label htmlFor="repository-branch" className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Active branch</label>
                    {isLoadingBranches ? (
                        <div className="mt-3 h-12 animate-pulse rounded-lg border border-slate-800 bg-slate-950/60" />
                    ) : branchError ? (
                        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                            {branchError}
                        </div>
                    ) : (
                        <select
                            id="repository-branch"
                            value={selectedBranch}
                            onChange={(event) => setSelectedBranch(event.target.value)}
                            className="mt-3 h-12 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                        >
                            {branches.length === 0 ? (
                                <option value={repo.default_branch}>{repo.default_branch}</option>
                            ) : (
                                branches.map((branch) => (
                                    <option key={branch.name} value={branch.name}>
                                        {branch.name}{branch.default ? ' (default)' : ''}
                                    </option>
                                ))
                            )}
                        </select>
                    )}
                </div>

                <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)]">
                    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-4 lg:p-5">
                        <div className="mb-4 flex items-center justify-between text-sm text-slate-200">
                            <span className="font-medium">File browser</span>
                            <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-xs text-slate-400">{fileTree.length} files</span>
                        </div>

                        {isLoadingFiles ? (
                            <div className="space-y-2">
                                {Array.from({ length: 8 }).map((_, index) => (
                                    <div key={index} className="h-9 animate-pulse rounded-md bg-slate-800/70" />
                                ))}
                            </div>
                        ) : treeError ? (
                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                                {treeError}
                            </div>
                        ) : fileTree.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
                                No supported files were found for this branch.
                            </div>
                        ) : (
                            <div className="repo-inspection-scrollbar max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
                                {fileTree.map((file) => {
                                    const depth = file.path.split('/').length - 1;
                                    const isSelected = selectedFile === file.path;

                                    return (
                                        <button
                                            key={file.path}
                                            type="button"
                                            onClick={() => void handleFileSelection(file.path)}
                                            className={`flex min-w-0 w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition ${isSelected
                                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                                                : 'border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'} `}
                                            style={{ paddingLeft: `${12 + depth * 14}px` }}
                                        >
                                            <FileCode2 className="h-4 w-4 shrink-0 text-slate-400" />
                                            <span className="truncate">{file.path.split('/').pop()}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-4 lg:p-5">
                        <div className="mb-4 flex min-w-0 items-center justify-between gap-4 text-sm text-slate-200">
                            <span className="font-medium">File preview</span>
                            {selectedFile ? (
                                <span className="min-w-0 truncate rounded-md bg-slate-900 px-2.5 py-1 text-xs text-slate-400">{selectedFile}</span>
                            ) : null}
                        </div>

                        {!selectedFile ? (
                            <div className="flex min-h-[600px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm leading-6 text-slate-400">
                                Select a file from the browser to preview its content.
                            </div>
                        ) : isLoadingFile ? (
                            <div className="flex min-h-[600px] items-center justify-center">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Loading file content...
                                </div>
                            </div>
                        ) : filePreviewError ? (
                            <div className="flex min-h-[600px] items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
                                {filePreviewError}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
                                <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-400">
                                    <span className="truncate">{selectedFile}</span>
                                    <span>{previewContent.length} chars</span>
                                </div>
                                <pre className="repo-inspection-scrollbar max-h-[600px] overflow-auto whitespace-pre p-5 font-mono text-[13px] leading-7 text-slate-200">
                                    <code>{previewContent}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm lg:p-8">
                <div className="flex flex-col gap-5 border-b border-slate-800/80 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
                            <Sparkles className="h-4 w-4" />
                            AI test planning
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">Test generation</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                            Repository-level generation from the currently selected branch and repository context.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleGenerateTests()}
                        disabled={!selectedBranch || isGeneratingTests}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                    >
                        <Sparkles className="h-4 w-4" />
                        {isGeneratingTests ? 'Generating...' : 'Generate Test Cases'}
                    </button>
                </div>

                {generationError ? (
                    <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                        {generationError}
                    </div>
                ) : null}

                {generatedTestCases.length > 0 ? (
                    <div className="mt-6 grid gap-4">
                        {generatedTestCases.map((testCase, index) => (
                            <article key={`${testCase.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 lg:p-6">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">#{index + 1}</div>
                                        <h4 className="mt-2 text-lg font-semibold text-slate-100">{testCase.title}</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wider">
                                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                                            {testCase.type}
                                        </span>
                                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                                            {testCase.priority}
                                        </span>
                                    </div>
                                </div>

                                <p className="mt-3 text-sm text-slate-300">{testCase.description}</p>

                                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                                        <dt className="text-xs uppercase tracking-wider text-slate-500">Target route</dt>
                                        <dd className="mt-2 break-all text-slate-100">{testCase.targetRoute}</dd>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                                        <dt className="text-xs uppercase tracking-wider text-slate-500">Target files</dt>
                                        <dd className="mt-2 break-all text-slate-100">
                                            {testCase.targetFiles.length > 0 ? testCase.targetFiles.join(', ') : 'N/A'}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                                    <div className="text-xs uppercase tracking-wider text-slate-500">Expected result</div>
                                    <p className="mt-2 text-sm text-slate-200">{testCase.expectedResult}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                        No generated test cases yet. Select a branch and generate repository-level tests.
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-slate-100">Repository overview</h3>
                <p className="mt-2 text-sm text-slate-400">
                    Your repository is connected and ready for inspection, branch-aware browsing, and repository-level test generation.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Visibility</div>
                        <div className="mt-2 text-sm font-medium text-slate-100">{repo.private ? 'Private' : 'Public'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Language</div>
                        <div className="mt-2 text-sm font-medium text-slate-100">{repo.language ?? 'Not available'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Description</div>
                        <div className="mt-2 text-sm font-medium text-slate-100">{repo.description ?? 'No description available'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Branches</div>
                        <div className="mt-2 text-sm font-medium text-slate-100">{branchCount || branches.length || 1}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Tests</div>
                        <div className="mt-2 text-sm font-medium text-slate-100">{testCount > 0 ? String(testCount) : 'Not scanned yet'}</div>
                    </div>
                </div>
            </div>
        </section>
    );
}