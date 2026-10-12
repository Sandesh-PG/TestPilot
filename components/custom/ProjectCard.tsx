'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowUpRight,
    CheckCircle2,
    Clock,
    ExternalLink,
    FolderGit2,
    GitBranch,
    Loader2,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { ProjectDashboardItem } from '@/lib/db/queries/dashboard';
import { deleteProject } from '@/actions/projects';

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

type ProjectCardProps = {
    project: ProjectDashboardItem;
    onDeleted?: (projectId: string) => void;
};

export default function ProjectCard({ project, onDeleted }: Readonly<ProjectCardProps>) {
    const router = useRouter();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await deleteProject(project.id);
            if (onDeleted) {
                onDeleted(project.id);
            }
            router.refresh();
        } catch (error) {
            console.error('Failed to delete project:', error);
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete');
            setIsDeleting(false);
            setIsConfirming(false);
        }
    };

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
            className={`group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 shadow-xl backdrop-blur-sm transition hover:border-slate-700 hover:bg-slate-900/50 ${
                isDeleting ? 'pointer-events-none opacity-50' : ''
            }`}
        >
            <div>
                {/* Top Card Row: Repo Name, Branch & Actions */}
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
                                    className="text-slate-500 transition hover:text-slate-300"
                                    title="Open GitHub repository"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Top-Right: Health Pill & Delete Action */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Health Pill */}
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

                        {/* Inline Confirm Delete or Subtle Trash Icon */}
                        {isConfirming ? (
                            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-2 py-1 text-xs shadow-md">
                                <span className="text-[11px] font-medium text-rose-300">
                                    {isDeleting ? 'Deleting...' : 'Delete?'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    aria-label="Confirm delete"
                                    className="inline-flex items-center justify-center rounded bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        'Yes'
                                    )}
                                </button>
                                {!isDeleting && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsConfirming(false);
                                        }}
                                        aria-label="Cancel delete"
                                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-700 hover:text-white"
                                    >
                                        No
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsConfirming(true);
                                }}
                                disabled={isDeleting}
                                title="Delete project"
                                aria-label="Delete project"
                                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {deleteError && (
                    <div className="mt-2 rounded-md border border-red-500/30 bg-red-950/20 px-2 py-1 text-[11px] text-rose-300">
                        {deleteError}
                    </div>
                )}

                {/* Target Environment URL */}
                <div className="mt-3.5 flex items-center gap-1.5 rounded-lg border border-slate-800/60 bg-slate-950/50 px-2.5 py-1.5 font-mono text-xs text-slate-400 truncate">
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
                        <span className="font-medium text-emerald-400">
                            {project.passedTests} passed
                        </span>
                        {project.failedTests > 0 && (
                            <span className="font-medium text-rose-400">
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
                    <span>Last run: {formatRelativeTime(project.lastRunAt)}</span>
                    {project.totalTests > 0 && (
                        <span className="font-mono font-medium text-slate-400">
                            {project.successRate}% rate
                        </span>
                    )}
                </div>
            </div>

            {/* Footer Action: Open Studio */}
            <div className="mt-5 border-t border-slate-800/60 pt-3">
                <Link
                    href={`/workspace?projectId=${project.id}`}
                    prefetch={true}
                    className="flex w-full items-center justify-between rounded-xl border border-transparent bg-slate-800/50 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                    <span>Open Test Studio</span>
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
