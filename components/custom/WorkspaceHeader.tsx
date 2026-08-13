import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

const WorkspaceHeader = () => {
    return (
        <header className='sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-4 md:px-12 flex items-center justify-between'>
            {/* Logo & Brand */}
            <Link href="/" className='flex items-center gap-3 hover:opacity-90 transition-opacity'>
                <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                    TestPilot
                </span>
            </Link>

            {/* Menu */}
            <nav className='hidden md:block'>
                <ul className='flex gap-8 text-sm font-medium text-zinc-400'>
                    <li>
                        <Link href="/workspace" className='hover:text-white transition-colors'>
                            Workspace
                        </Link>
                    </li>
                    <li>
                        <Link href="/pricing" className='hover:text-white transition-colors'>
                            Pricing
                        </Link>
                    </li>
                    <li>
                        <Link href="/support" className='hover:text-white transition-colors'>
                            Contact us
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* User Profile */}
            <div className='flex items-center gap-4'>
                <UserButton />
            </div>
        </header>
    )
}

export default WorkspaceHeader
