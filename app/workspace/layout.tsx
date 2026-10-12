import WorkspaceHeader from "@/components/custom/WorkspaceHeader";

function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <WorkspaceHeader />
            {children}
        </div>
    );
}

export default WorkspaceLayout;