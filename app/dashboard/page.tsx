import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import {
    Activity,
    CheckCircle2,
    FolderGit2,
    Layers,
    Plus,
    Sparkles,
} from 'lucide-react';
import { getUserDashboardData, ProjectDashboardItem } from '@/lib/db/queries/dashboard';
import ProjectCard from '@/components/custom/ProjectCard';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const { projects, stats } = await getUserDashboardData(userId);

    return (
        <main className="min-h-[calc(100vh-65px)] bg-slate-950 px-4 py-8 sm:px-6 md:px-12 lg:py-10">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* 1. Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Project Intelligence Hub
                        </div>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Repository Test Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                            Overview of all connected services, test execution health, and coverage metrics.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/workspace"
                            prefetch={true}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-emerald-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Connect Repository</span>
                        </Link>
                    </div>
                </div>

                {/* 2. Global Metrics Overview Strip */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Connected Repositories */}
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-slate-700/80">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                Connected Repositories
                            </span>
                            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-300">
                                <FolderGit2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 font-mono text-2xl font-bold text-slate-100 sm:text-3xl">
                            {stats.totalProjects}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            Active monitored services
                        </div>
                    </div>

                    {/* Total Monitored Tests */}
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-slate-700/80">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                Total Monitored Tests
                            </span>
                            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-300">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 font-mono text-2xl font-bold text-slate-100 sm:text-3xl">
                            {stats.totalTests}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            AST & Playwright scenarios
                        </div>
                    </div>

                    {/* Passing Tests */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 shadow-lg backdrop-blur-sm transition hover:border-emerald-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                                Passing Tests
                            </span>
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 font-mono text-2xl font-bold text-emerald-300 sm:text-3xl">
                            {stats.totalPassed}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                            {stats.totalFailed > 0 ? (
                                <span className="text-rose-400 font-medium">{stats.totalFailed} failing</span>
                            ) : (
                                <span className="text-emerald-400/80">All passing</span>
                            )}
                            {stats.totalTests - stats.totalPassed - stats.totalFailed > 0 && (
                                <span>, {stats.totalTests - stats.totalPassed - stats.totalFailed} pending</span>
                            )}
                        </div>
                    </div>

                    {/* Overall Suite Health % */}
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-cyan-400/90">
                                Overall Suite Health
                            </span>
                            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 font-mono text-2xl font-bold text-cyan-300 sm:text-3xl">
                            {stats.totalTests > 0 ? `${stats.overallPassRate}%` : '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                            Global test pass rate
                        </div>
                    </div>
                </div>

                {/* 3. Projects Grid or Empty State */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-200">
                            Connected Repositories ({projects.length})
                        </h2>
                    </div>

                    {projects.length === 0 ? (
                        /* Empty State Card */
                        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-10 text-center backdrop-blur-sm lg:p-14">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400 shadow-inner">
                                <FolderGit2 className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-white">
                                No repositories connected yet
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                                Connect your first GitHub repository to generate and run Playwright tests against preview environments.
                            </p>
                            <div className="mt-6">
                                <Link
                                    href="/workspace"
                                    prefetch={true}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-emerald-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Connect Your First Repository</span>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Projects Grid */
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project: ProjectDashboardItem) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
