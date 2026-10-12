import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { getWorkspaceProjectData } from '@/lib/db/queries/workspace';
import RepoDetails from '@/components/custom/RepoDetails';
import WorkSpaceBody from '@/components/custom/WorkSpaceBody';

export default async function Workspace({
    searchParams,
}: {
    searchParams?: Promise<{ projectId?: string }>;
}) {
    const params = searchParams ? await searchParams : undefined;
    const rawProjectId = params?.projectId?.trim();

    const { userId } = await auth();

    // If projectId is provided, load and hydrate the project workspace directly
    if (rawProjectId) {
        if (!userId) {
            redirect('/sign-in');
        }

        const projectData = await getWorkspaceProjectData(rawProjectId, userId);

        if (!projectData) {
            return (
                <div className="flex min-h-[calc(100vh-4rem)] flex-col">
                    {/* Top Breadcrumb Navigation */}
                    <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 sm:px-6 md:px-12 py-2.5 backdrop-blur-md flex items-center justify-between">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Back to Dashboard</span>
                        </Link>
                    </div>

                    <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
                        <div className="max-w-md w-full rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center shadow-2xl backdrop-blur-md">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                                <AlertTriangle className="h-7 w-7 text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-100">
                                Workspace unavailable
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                The stored workspace project could not be found or you do not have permission to view it.
                            </p>
                            <div className="mt-6">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Return to Dashboard</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col">
                {/* Top Breadcrumb Navigation */}
                <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 sm:px-6 md:px-12 py-2.5 backdrop-blur-md flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to Dashboard</span>
                    </Link>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <span>Project:</span>
                        <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-slate-300 font-semibold">
                            {projectData.project.repoName}
                        </span>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <RepoDetails
                        repo={projectData.repository}
                        initialTestCases={projectData.testCases}
                        initialExecutions={projectData.executions}
                    />
                </div>
            </div>
        );
    }

    // Default flow when no specific projectId query param is provided
    return (
        <div className="flex flex-col">
            <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 sm:px-6 md:px-12 py-2.5 backdrop-blur-md flex items-center justify-between">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Dashboard</span>
                </Link>
            </div>

            <WorkSpaceBody />
        </div>
    );
}
