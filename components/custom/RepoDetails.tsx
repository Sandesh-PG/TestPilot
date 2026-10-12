'use client';

import { useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    ExternalLink,
    FileCode2,
    GitBranch,
    Globe,
    Play,
    RefreshCw,
    Server,
    Sparkles,
    Terminal,
    Trash2,
    XCircle,
} from 'lucide-react';
import { TestSuiteView } from '@/components/test-suite/TestSuiteView';
import type { TestCase as GeneratedTestCase, ExecutionRecord as TestCaseExecution, ActionStep } from '@/components/test-suite/types';

type RepoDetailsProps = {
    repo: {
        id?: number;
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

    // Environment URL & Execution State
    const [targetEnvUrl, setTargetEnvUrl] = useState<string>(repo.targetEnvironmentUrl || 'http://localhost:3000');
    const [isSavingEnvUrl, setIsSavingEnvUrl] = useState(false);
    const [envUrlSavedMessage, setEnvUrlSavedMessage] = useState<string | null>(null);
    const [envUrlError, setEnvUrlError] = useState<string | null>(null);

    const [executions, setExecutions] = useState<Record<number, TestCaseExecution>>({});
    const [runningTestIds, setRunningTestIds] = useState<Set<number>>(new Set());
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());

    // Update targetEnvUrl if repo prop changes
    useEffect(() => {
        if (repo.targetEnvironmentUrl) {
            setTargetEnvUrl(repo.targetEnvironmentUrl);
        }
    }, [repo.targetEnvironmentUrl]);

    // Load branch list
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
                    throw new Error(payload?.error ?? 'Unable to load branches.');
                }

                const payload = (await response.json()) as {
                    branches?: GitHubBranch[];
                };

                if (!isMounted) {
                    return;
                }

                const nextBranches = payload.branches ?? [];
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

    // Load file tree for branch
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

                const nextFiles = payload.files ?? [];
                setFileTree(nextFiles);

                if (nextFiles[0]) {
                    setSelectedFile(nextFiles[0].path);
                }
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setTreeError(error instanceof Error ? error.message : 'Unable to load repository tree.');
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

    // Load selected file content
    useEffect(() => {
        if (!selectedFile || !selectedBranch) {
            setFileContent(null);
            setFilePreviewError(null);
            return;
        }

        let isMounted = true;
        const controller = new AbortController();
        const requestId = ++fileRequestIdRef.current;

        const loadFileContent = async () => {
            setIsLoadingFile(true);
            setFilePreviewError(null);

            try {
                const params = new URLSearchParams({
                    owner: repo.owner.login,
                    repo: repo.name,
                    branch: selectedBranch,
                    path: selectedFile,
                });

                const response = await fetch(`/api/github/file?${params.toString()}`, {
                    method: 'GET',
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                    const message = payload?.error ?? 'Unable to load file content.';
                    if (requestId !== fileRequestIdRef.current || !isMounted) {
                        return;
                    }

                    setFilePreviewError(message);
                    setFileContent(null);
                    return;
                }

                const payload = (await response.json()) as (RepositoryFileContent & {
                    files?: RepositoryFileContent[];
                    file?: RepositoryFileContent;
                });

                if (requestId !== fileRequestIdRef.current || !isMounted) {
                    return;
                }

                const fileObj = (payload.files && payload.files[0]) || payload.file || payload;

                if (fileObj.skipped) {
                    setFilePreviewError(formatReason(fileObj.reason));
                    setFileContent(null);
                    return;
                }

                if (typeof fileObj.content !== 'string') {
                    setFilePreviewError('This file does not contain previewable text content.');
                    setFileContent(null);
                    return;
                }

                const normalizedContent = fileObj.content.length > MAX_PREVIEW_LENGTH
                    ? `${fileObj.content.slice(0, MAX_PREVIEW_LENGTH)}\n\n... content truncated for preview ...`
                    : fileObj.content;

                setFileContent(normalizedContent);
            } catch (error) {
                if (requestId !== fileRequestIdRef.current || !isMounted) {
                    return;
                }

                setFilePreviewError(error instanceof Error ? error.message : 'Unable to load file content.');
                setFileContent(null);
            } finally {
                if (requestId === fileRequestIdRef.current && isMounted) {
                    setIsLoadingFile(false);
                }
            }
        };

        void loadFileContent();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [repo.name, repo.owner.login, selectedBranch, selectedFile]);

    // Load recent executions for this repository on mount
    useEffect(() => {
        const repoIdentifier = repo.databaseId || repo.id;
        if (!repoIdentifier) return;

        const fetchExecutions = async () => {
            try {
                const res = await fetch(`/api/browserbase/playwright-test?repositoryId=${repoIdentifier}`);
                if (res.ok) {
                    const data = (await res.json()) as {
                        executions?: {
                            testCaseId: number;
                            status: 'pending' | 'running' | 'passed' | 'failed';
                            sessionId?: string;
                            sessionUrl?: string;
                            logs?: string | null;
                            error?: string | null;
                            completedAt?: string;
                        }[];
                    };

                    if (Array.isArray(data.executions)) {
                        setExecutions((prev) => {
                            const next = { ...prev };
                            for (const exec of data.executions || []) {
                                if (!next[exec.testCaseId]) {
                                    next[exec.testCaseId] = {
                                        testCaseId: exec.testCaseId,
                                        status: exec.status,
                                        sessionId: exec.sessionId,
                                        sessionUrl: exec.sessionUrl,
                                        logs: typeof exec.logs === 'string' ? exec.logs.split('\n') : [],
                                        error: exec.error || undefined,
                                        completedAt: exec.completedAt,
                                    };
                                }
                            }
                            return next;
                        });
                    }
                }
            } catch {
                // non-blocking
            }
        };

        void fetchExecutions();
    }, [repo.databaseId, repo.id]);

    const handleFileSelection = (filePath: string) => {
        setSelectedFile(filePath);
    };

    const handleSaveTargetEnvUrl = async (overrideUrl?: string) => {
        const urlToSave = (overrideUrl || targetEnvUrl).trim();

        if (!urlToSave) {
            setEnvUrlError('Target environment URL cannot be empty.');
            return;
        }

        try {
            const parsed = new URL(urlToSave);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error();
            }
        } catch {
            setEnvUrlError('Please enter a valid HTTP or HTTPS URL (e.g. http://localhost:3000 or https://preview.myapp.com).');
            return;
        }

        setIsSavingEnvUrl(true);
        setEnvUrlError(null);
        setEnvUrlSavedMessage(null);

        const repoIdentifier = repo.databaseId || repo.id;

        try {
            const response = await fetch(`/api/repositories/${repoIdentifier}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetEnvironmentUrl: urlToSave }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(data?.error || 'Failed to update target environment URL.');
            }

            setTargetEnvUrl(urlToSave);
            setEnvUrlSavedMessage('Target environment URL saved successfully!');
            setTimeout(() => setEnvUrlSavedMessage(null), 4000);
        } catch (err) {
            setEnvUrlError(err instanceof Error ? err.message : 'Failed to update target URL.');
        } finally {
            setIsSavingEnvUrl(false);
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

    const handleRunSingleTest = async (testCase: GeneratedTestCase, index: number) => {
        const testId = testCase.id ?? index;

        setRunningTestIds((prev) => new Set(prev).add(testId));
        setExpandedLogIds((prev) => new Set(prev).add(testId));

        setExecutions((prev) => ({
            ...prev,
            [testId]: {
                testCaseId: testId,
                status: 'running',
                logs: [
                    `[${new Date().toLocaleTimeString()}] 🚀 Initiating cloud test run...`,
                    `[${new Date().toLocaleTimeString()}] 🎯 Target: ${targetEnvUrl}`,
                    `[${new Date().toLocaleTimeString()}] 📍 Route: ${testCase.targetRoute}`,
                ],
            },
        }));

        try {
            const response = await fetch('/api/browserbase/playwright-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testCaseId: testCase.id,
                    repositoryId: repo.databaseId || repo.id,
                    appUrl: targetEnvUrl,
                }),
            });

            const data = (await response.json().catch(() => null)) as {
                success?: boolean;
                execution?: {
                    status: 'pending' | 'running' | 'passed' | 'failed';
                    sessionId?: string;
                    sessionUrl?: string;
                    logs?: string;
                    error?: string;
                    completedAt?: string;
                };
                sessionId?: string;
                sessionUrl?: string;
                logs?: string[];
                error?: string;
                durationMs?: number;
            } | null;

            if (!response.ok || !data) {
                throw new Error(data?.error || 'Execution failed on server.');
            }

            const rawLogs = data.logs || (typeof data.execution?.logs === 'string' ? data.execution.logs.split('\n') : []);

            setExecutions((prev) => ({
                ...prev,
                [testId]: {
                    testCaseId: testId,
                    status: data.execution?.status || (data.success ? 'passed' : 'failed'),
                    sessionId: data.sessionId || data.execution?.sessionId,
                    sessionUrl: data.sessionUrl || data.execution?.sessionUrl,
                    logs: rawLogs.length > 0 ? rawLogs : ['Execution completed.'],
                    error: data.error || data.execution?.error,
                    durationMs: data.durationMs,
                    completedAt: data.execution?.completedAt,
                },
            }));
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Execution failed';
            setExecutions((prev) => ({
                ...prev,
                [testId]: {
                    testCaseId: testId,
                    status: 'failed',
                    error: msg,
                    logs: [`[${new Date().toLocaleTimeString()}] ❌ Failed: ${msg}`],
                },
            }));
        } finally {
            setRunningTestIds((prev) => {
                const next = new Set(prev);
                next.delete(testId);
                return next;
            });
        }
    };

    const handleRunAllTests = async () => {
        if (generatedTestCases.length === 0 || isRunningAll) return;

        setIsRunningAll(true);
        try {
            for (let i = 0; i < generatedTestCases.length; i++) {
                const testCase = generatedTestCases[i];
                await handleRunSingleTest(testCase, i);
            }
        } catch (error) {
            console.error('Failed to run all tests sequentially:', error);
        } finally {
            setIsRunningAll(false);
        }
    };

    const toggleLogs = (testId: number) => {
        setExpandedLogIds((prev) => {
            const next = new Set(prev);
            if (next.has(testId)) {
                next.delete(testId);
            } else {
                next.add(testId);
            }
            return next;
        });
    };

    const previewContent = fileContent ?? '';

    return (
        <section className="space-y-6">
            {/* Top Repository Header Card */}
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

            {/* Target Environment URL Configuration Bar */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm lg:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
                            <Globe className="h-4 w-4" />
                            Target Environment Configuration
                        </div>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-100">
                            Application Deployment / Localhost URL
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Cloud browsers will execute automated Playwright actions against this base environment.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Browserbase Cloud Ready
                        </span>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="url"
                                value={targetEnvUrl}
                                onChange={(e) => setTargetEnvUrl(e.target.value)}
                                placeholder="http://localhost:3000 or https://preview.myapp.com"
                                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-10 pr-4 text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleSaveTargetEnvUrl()}
                            disabled={isSavingEnvUrl}
                            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingEnvUrl ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            Save URL
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500">Quick presets:</span>
                        {['http://localhost:3000', 'http://localhost:5173', 'https://preview.myapp.com'].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                    setTargetEnvUrl(preset);
                                    void handleSaveTargetEnvUrl(preset);
                                }}
                                className="cursor-pointer rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300 font-mono transition hover:border-emerald-500/40 hover:text-emerald-300"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>

                    {envUrlSavedMessage && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {envUrlSavedMessage}
                        </div>
                    )}
                    {envUrlError && (
                        <div className="flex items-center gap-2 text-xs text-rose-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {envUrlError}
                        </div>
                    )}
                </div>
            </div>

            {/* Branch and Repository Inspection Card */}
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

            {/* Repository Overview Card */}
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
                </div>
            </div>

            {/* AI Test Planning & Cloud Execution Section */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 shadow-xl backdrop-blur-sm lg:p-8">
                <div className="flex flex-col gap-5 border-b border-slate-800/80 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
                            <Sparkles className="h-4 w-4" />
                            AI Test Planning & Cloud Execution
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">Test Generation & Playwright Suite</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                            AST-grounded, categorized Playwright test cases executed via Browserbase cloud browsers.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
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
                </div>

                {generationError ? (
                    <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                        {generationError}
                    </div>
                ) : null}

                {generatedTestCases.length > 0 ? (
                    <div className="mt-6">
                        <TestSuiteView
                            tests={generatedTestCases}
                            executions={executions}
                            runningTestIds={runningTestIds}
                            isRunningAll={isRunningAll}
                            isGeneratingTests={isGeneratingTests}
                            onRunSingleTest={handleRunSingleTest}
                            onRunAllTests={handleRunAllTests}
                            onRegenerateTests={handleGenerateTests}
                        />
                    </div>
                ) : (
                    <div className="mt-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
                        No generated test cases yet. Select a branch and click &quot;Generate Test Cases&quot; to synthesize AST-grounded tests.
                    </div>
                )}
            </div>
        </section>
    );
}