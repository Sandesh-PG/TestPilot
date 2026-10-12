import React from 'react';

export default function WorkspaceLoading() {
    return (
        <div className="flex flex-col min-h-[calc(100vh-65px)] bg-slate-950 text-slate-100">
            {/* 1. Top Breadcrumb Header Strip */}
            <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 sm:px-6 md:px-12 py-2.5 backdrop-blur-md flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-slate-800 animate-pulse" />
                <div className="h-5 w-40 rounded bg-slate-900 border border-slate-800 animate-pulse" />
            </div>

            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-pulse">
                {/* 2. Top Repository Header Card Skeleton */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 lg:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3 flex-1">
                            <div className="h-4 w-28 rounded-full bg-emerald-500/20" />
                            <div className="h-8 w-64 rounded-lg bg-slate-800" />
                            <div className="h-4 w-48 rounded bg-slate-800/60" />
                        </div>
                        <div className="flex gap-3">
                            <div className="h-10 w-28 rounded-lg bg-slate-800" />
                            <div className="h-10 w-28 rounded-lg bg-slate-800/60" />
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <div className="h-20 rounded-xl border border-slate-800/80 bg-slate-950/60" />
                        <div className="h-20 rounded-xl border border-slate-800/80 bg-slate-950/60" />
                        <div className="h-20 rounded-xl border border-slate-800/80 bg-slate-950/60" />
                    </div>
                </div>

                {/* 3. Metrics Top Bar Skeleton */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="h-8 w-24 rounded-lg bg-slate-800" />
                        <div className="h-8 w-24 rounded-lg bg-emerald-950/40 border border-emerald-900/40" />
                        <div className="h-8 w-24 rounded-lg bg-rose-950/40 border border-rose-900/40" />
                        <div className="h-8 w-24 rounded-lg bg-slate-800" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-32 rounded-lg bg-slate-800" />
                        <div className="h-10 w-36 rounded-lg bg-emerald-500/20" />
                    </div>
                </div>

                {/* 4. 1:2 Split-Screen Test Studio Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
                    {/* Left Panel: Test Cases Sidebar Skeleton (4 cols) */}
                    <div className="lg:col-span-4 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 space-y-4">
                        <div className="h-10 w-full rounded-xl bg-slate-950/60 border border-slate-800" />
                        <div className="flex gap-2">
                            <div className="h-7 w-12 rounded-lg bg-slate-800" />
                            <div className="h-7 w-12 rounded-lg bg-slate-800/60" />
                            <div className="h-7 w-12 rounded-lg bg-slate-800/60" />
                            <div className="h-7 w-12 rounded-lg bg-slate-800/60" />
                        </div>
                        <div className="space-y-3 pt-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-xl border border-slate-800/60 bg-slate-950/40 space-y-2"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="h-4 w-32 rounded bg-slate-800" />
                                        <div className="h-4 w-12 rounded-full bg-slate-800/60" />
                                    </div>
                                    <div className="h-3 w-48 rounded bg-slate-800/40" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Detail Inspector Skeleton (8 cols) */}
                    <div className="lg:col-span-8 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="h-6 w-64 rounded bg-slate-800" />
                                <div className="h-4 w-40 rounded bg-slate-800/60" />
                            </div>
                            <div className="h-9 w-28 rounded-lg bg-emerald-500/20" />
                        </div>

                        <div className="space-y-3">
                            <div className="h-4 w-32 rounded bg-slate-800" />
                            <div className="h-20 w-full rounded-xl bg-slate-950/60 border border-slate-800/60" />
                        </div>

                        <div className="space-y-3">
                            <div className="h-4 w-28 rounded bg-slate-800" />
                            <div className="space-y-2">
                                <div className="h-10 w-full rounded-lg bg-slate-950/40 border border-slate-800/40" />
                                <div className="h-10 w-full rounded-lg bg-slate-950/40 border border-slate-800/40" />
                                <div className="h-10 w-full rounded-lg bg-slate-950/40 border border-slate-800/40" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="h-4 w-24 rounded bg-slate-800" />
                            <div className="h-36 w-full rounded-xl bg-slate-950 border border-slate-800/80" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
