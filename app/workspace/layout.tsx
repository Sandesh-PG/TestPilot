import WorkspaceHeader from "@/components/custom/WorkspaceHeader";

function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div>
            <WorkspaceHeader />
            {children}
        </div>
    )
};

export default WorkspaceLayout;