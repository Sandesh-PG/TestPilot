'use client';

import React, { useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Zap } from 'lucide-react';
import GitHubIntegrationButton from './GitHubIntegrationButton';
import { UserDetailContext } from '@/context/userDetail';

const WorkspaceHeader = () => {
    const context = useContext(UserDetailContext);
    const detail = context?.UserDetail || context?.userDetail;
    const credits = detail?.user?.credits ?? detail?.credits;

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 md:px-12 py-3.5 flex items-center justify-between">
            {/* Logo & Brand */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <Image
                    src="/logo.png"
                    alt="TestPilot Logo"
                    width={36}
                    height={36}
                    className="object-contain"
                    priority
                />
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    TestPilot
                </span>
            </Link>

            {/* Menu */}
            <nav className="hidden md:block">
                <ul className="flex gap-8 text-sm font-medium text-slate-400">
                    <li>
                        <Link href="/workspace" className="hover:text-white transition-colors">
                            Workspace
                        </Link>
                    </li>
                    <li>
                        <Link href="/pricing" className="hover:text-white transition-colors">
                            Pricing
                        </Link>
                    </li>
                    <li>
                        <Link href="/support" className="hover:text-white transition-colors">
                            Contact us
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Right Controls: GitHub Connection, Credits & Profile */}
            <div className="flex items-center gap-3">
                {/* GitHub Integration Status & Disconnect Button */}
                <GitHubIntegrationButton />

                {/* Credits Badge */}
                {typeof credits === 'number' && (
                    <Link
                        href="/pricing"
                        title="Available Test Credits — Click to top up"
                        className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-amber-500/40 hover:bg-slate-800 transition-all shadow-sm"
                    >
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>{credits} Credits</span>
                    </Link>
                )}

                {/* Clerk User Profile Button */}
                <div className="flex items-center pl-1">
                    <UserButton />
                </div>
            </div>
        </header>
    );
};

export default WorkspaceHeader;
