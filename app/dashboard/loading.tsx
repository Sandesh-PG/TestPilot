import React from 'react';

export default function DashboardLoading() {
    return (
        <main className="min-h-[calc(100vh-65px)] bg-slate-950 px-4 py-8 sm:px-6 md:px-12 lg:py-10">
            <div className="mx-auto max-w-7xl space-y-8 animate-pulse">
                {/* 1. Header Skeleton */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <div className="h-4 w-40 rounded-full bg-emerald-500/20" />
                        <div className="h-8 w-72 rounded-lg bg-slate-800" />
                        <div className="h-4 w-96 max-w-full rounded-md bg-slate-850 bg-slate-900" />
                    </div>
                    <div className="h-10 w-44 rounded-xl bg-slate-800" />
                </div>

                {/* 2. Metrics Strip Skeleton */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div className="h-3 w-32 rounded bg-slate-800" />
                                <div className="h-8 w-8 rounded-xl bg-slate-800/60" />
                            </div>
                            <div className="mt-4 h-8 w-20 rounded bg-slate-800" />
                            <div className="mt-2 h-3 w-28 rounded bg-slate-850 bg-slate-800/60" />
                        </div>
                    ))}
                </div>

                {/* 3. Connected Repositories Grid Skeleton */}
                <div>
                    <div className="mb-4 h-6 w-52 rounded bg-slate-800" />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 shadow-xl backdrop-blur-sm"
                            >
                                <div className="space-y-4">
                                    {/* Top Row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2 flex-1">
                                            <div className="h-5 w-44 rounded bg-slate-800" />
                                            <div className="h-4 w-24 rounded bg-slate-800/60" />
                                        </div>
                                        <div className="h-5 w-16 rounded-full bg-slate-800" />
                                    </div>

                                    {/* Environment URL */}
                                    <div className="h-8 w-full rounded-lg bg-slate-950/60 border border-slate-800/40" />

                                    {/* Mini Metrics */}
                                    <div className="flex justify-between">
                                        <div className="h-3 w-16 rounded bg-slate-800" />
                                        <div className="h-3 w-24 rounded bg-slate-800" />
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-1.5 w-full rounded-full bg-slate-800/80" />

                                    {/* Timestamp */}
                                    <div className="flex justify-between">
                                        <div className="h-3 w-24 rounded bg-slate-850 bg-slate-800/60" />
                                        <div className="h-3 w-14 rounded bg-slate-850 bg-slate-800/60" />
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="mt-6 pt-3 border-t border-slate-800/60">
                                    <div className="h-9 w-full rounded-xl bg-slate-800/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
