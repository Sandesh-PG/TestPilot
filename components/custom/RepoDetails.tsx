'use client';

import React from 'react';
import { CheckCircle2, Clock3, ExternalLink, GitBranch, RefreshCw, Trash2 } from 'lucide-react';

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

export default function RepoDetails({ repo, onDisconnect }: Readonly<RepoDetailsProps>) {
    const branchCount = repo.branchCount ?? 0;
    const testCount = repo.testCount ?? 0;

    return (
        <section className="space-y-6">
            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6 shadow-xl backdrop-blur-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Connected
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-zinc-50">{repo.name}</h2>
                            <p className="mt-1 text-sm text-zinc-400">{repo.full_name}</p>
                        </div>
                        <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200 transition-colors hover:text-white"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open repository
                        </a>
                    </div>

                    <div className="flex gap-3">
                        <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800">
                            <RefreshCw className="h-4 w-4" />
                            Sync
                        </button>
                        <button
                            onClick={onDisconnect}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                        >
                            <Trash2 className="h-4 w-4" />
                            Disconnect
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <GitBranch className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Default branch</span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-200">{repo.default_branch}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Updated</span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-200">{new Date(repo.updated_at).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Scanned tests</span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-200">{testCount > 0 ? String(testCount) : 'Not scanned yet'}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-zinc-100">Repository overview</h3>
                <p className="mt-2 text-sm text-zinc-400">
                    Your repository is connected and ready. The workspace can now generate tests, track syncs, and show repo activity here.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Visibility</div>
                        <div className="mt-2 text-sm font-medium text-zinc-100">{repo.private ? 'Private' : 'Public'}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Language</div>
                        <div className="mt-2 text-sm font-medium text-zinc-100">{repo.language ?? 'Not available'}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Description</div>
                        <div className="mt-2 text-sm font-medium text-zinc-100">{repo.description ?? 'No description available'}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Branches</div>
                        <div className="mt-2 text-sm font-medium text-zinc-100">{branchCount}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Tests</div>
                        <div className="mt-2 text-sm font-medium text-zinc-100">{testCount > 0 ? String(testCount) : 'Not scanned yet'}</div>
                    </div>
                </div>
            </div>
        </section>
    );
}