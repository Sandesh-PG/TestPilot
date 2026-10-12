import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import WorkSpaceBody from '@/components/custom/WorkSpaceBody';

export default async function Workspace({
    searchParams,
}: {
    searchParams?: Promise<{ projectId?: string }>;
}) {
    const params = searchParams ? await searchParams : undefined;
    const projectId = params?.projectId;

    return (
        <div className="flex flex-col">
            {/* Top Breadcrumb Header Strip */}
            <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 sm:px-6 md:px-12 py-2.5 backdrop-blur-md flex items-center justify-between">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Dashboard</span>
                </Link>

                {projectId && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <span>Project:</span>
                        <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-slate-300">
                            {projectId}
                        </span>
                    </div>
                )}
            </div>

            <WorkSpaceBody projectId={projectId} />
        </div>
    );
}
