import React from 'react';
import WorkspaceHeader from '@/components/custom/WorkspaceHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <WorkspaceHeader />
            {children}
        </div>
    );
}
