import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
    const { userId } = await auth();

    if (userId) {
        redirect('/workspace');
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 py-16">
            <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    TestPilot
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                    Sign in or create an account to continue.
                </h1>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                    Use your GitHub-connected workspace to manage repositories and generate test cases.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                        href="/sign-in"
                        className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/sign-up"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-transparent px-5 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800"
                    >
                        Sign up
                    </Link>
                </div>
            </section>
        </main>
    );
}