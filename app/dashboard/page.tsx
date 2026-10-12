import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    ExternalLink,
    FolderGit2,
    GitBranch,
    Layers,
    Plus,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import { getUserDashboardData, ProjectDashboardItem } from '@/lib/db/queries/dashboard';

function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never executed';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    if (diffMs < 0) return 'Just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin === 1) return '1m ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour === 1) return '1h ago';
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return '1d ago';
    if (diffDay < 30) return `${diffDay}d ago`;
    return new Date(date).toLocaleDateString();
}

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
                            {projects.map((project: ProjectDashboardItem) => {
                                const passWidth =
                                    project.totalTests > 0
                                        ? (project.passedTests / project.totalTests) * 100
                                        : 0;
                                const failWidth =
                                    project.totalTests > 0
                                        ? (project.failedTests / project.totalTests) * 100
                                        : 0;

                                return (
                                    <div
                                        key={project.id}
                                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 shadow-xl backdrop-blur-sm transition hover:border-slate-700 hover:bg-slate-900/50"
                                    >
                                        <div>
                                            {/* Top Card Row: Repo Name, Branch & Health Pill */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <FolderGit2 className="h-4 w-4 shrink-0 text-slate-400" />
                                                        <h3 className="truncate font-semibold text-slate-100 transition group-hover:text-emerald-300">
                                                            {project.repoName}
                                                        </h3>
                                                    </div>

                                                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                                                        <span className="inline-flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                                                            <GitBranch className="h-3 w-3 text-slate-400" />
                                                            {project.defaultBranch || 'main'}
                                                        </span>
                                                        {project.repoUrl && (
                                                            <a
                                                                href={project.repoUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-slate-500 hover:text-slate-300 transition"
                                                                title="Open GitHub repository"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Health Pill */}
                                                <div>
                                                    {project.health === 'healthy' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-emerald-400">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            HEALTHY
                                                        </span>
                                                    )}
                                                    {project.health === 'failing' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-rose-400">
                                                            <ShieldAlert className="h-3 w-3" />
                                                            FAILING
                                                        </span>
                                                    )}
                                                    {project.health === 'idle' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase text-slate-400">
                                                            <Clock className="h-3 w-3" />
                                                            IDLE
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Target Environment URL */}
                                            <div className="mt-3.5 flex items-center gap-1.5 rounded-lg border border-slate-800/60 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-400 font-mono truncate">
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="truncate">
                                                    {project.environmentUrl || 'http://localhost:3000'}
                                                </span>
                                            </div>

                                            {/* Mini Metrics Bar */}
                                            <div className="mt-4 flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-300">
                                                    {project.totalTests} {project.totalTests === 1 ? 'Test' : 'Tests'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-emerald-400 font-medium">
                                                        {project.passedTests} passed
                                                    </span>
                                                    {project.failedTests > 0 && (
                                                        <span className="text-rose-400 font-medium">
                                                            • {project.failedTests} failed
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress Bar Visualizing Pass Rate */}
                                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                                {project.totalTests > 0 ? (
                                                    <div className="flex h-full w-full">
                                                        <div
                                                            style={{ width: `${passWidth}%` }}
                                                            className="bg-emerald-500 transition-all duration-300"
                                                        />
                                                        <div
                                                            style={{ width: `${failWidth}%` }}
                                                            className="bg-rose-500 transition-all duration-300"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full bg-slate-800" />
                                                )}
                                            </div>

                                            {/* Relative Timestamp */}
                                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                                                <span>
                                                    Last run: {formatRelativeTime(project.lastRunAt)}
                                                </span>
                                                {project.totalTests > 0 && (
                                                    <span className="font-mono font-medium text-slate-400">
                                                        {project.successRate}% rate
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Action: Open Studio */}
                                        <div className="mt-5 pt-3 border-t border-slate-800/60">
                                            <Link
                                                href={`/workspace?projectId=${project.id}`}
                                                className="flex w-full items-center justify-between rounded-xl bg-slate-800/50 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/30 border border-transparent"
                                            >
                                                <span>Open Test Studio</span>
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
