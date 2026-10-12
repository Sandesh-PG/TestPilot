import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
    CheckCircle2,
    Sparkles,
    Zap,
    Shield,
    Server,
    ArrowRight,
    HelpCircle,
} from 'lucide-react';
import WorkspaceHeader from '@/components/custom/WorkspaceHeader';

export const metadata: Metadata = {
    title: 'Pricing — TestPilot',
    description: 'Simple, transparent pricing for autonomous testing and cloud Playwright suites.',
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <WorkspaceHeader />

            <main className="flex-1 px-4 py-12 sm:px-6 md:px-12 lg:py-16">
                <div className="mx-auto max-w-7xl space-y-16">
                    {/* Header Section */}
                    <div className="text-center space-y-4 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Transparent Plans
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                            Simple, transparent pricing for autonomous testing.
                        </h1>
                        <p className="text-base text-slate-400 leading-relaxed sm:text-lg">
                            Scale your automated QA from local prototypes to cloud-grade end-to-end Playwright suites on Browserbase.
                        </p>
                    </div>

                    {/* Pricing Cards Grid */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
                        {/* 1. Free Starter */}
                        <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl backdrop-blur-sm transition hover:border-slate-700">
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Free Starter</h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        For hobbyists and individual developers testing single repos.
                                    </p>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="font-mono text-4xl font-extrabold text-white sm:text-5xl">$0</span>
                                    <span className="text-sm font-medium text-slate-500">/ month</span>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Included Features
                                    </div>
                                    <ul className="space-y-3 text-sm text-slate-300">
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span><strong>10 test credits</strong> monthly</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>1 connected GitHub repository</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>Community AST code analyzer</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>Standard Playwright execution logs</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8 pt-4">
                                <Link
                                    href="/dashboard"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 hover:border-slate-600"
                                >
                                    <span>Get Started Free</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        {/* 2. Pro Developer (Highlighted) */}
                        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 via-slate-900/60 to-slate-900/40 p-8 shadow-2xl backdrop-blur-sm lg:-translate-y-2">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400 bg-emerald-500 px-3.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-950 shadow-md">
                                Most Popular
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-semibold text-white">Pro Developer</h2>
                                        <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        For fast-moving software engineers and teams shipping weekly.
                                    </p>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="font-mono text-4xl font-extrabold text-emerald-300 sm:text-5xl">$29</span>
                                    <span className="text-sm font-medium text-slate-400">/ month</span>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-emerald-900/40">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                        Everything in Starter, plus:
                                    </div>
                                    <ul className="space-y-3 text-sm text-slate-200">
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span><strong>500 test credits</strong> monthly</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>Unlimited connected repositories</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>Cloud Browserbase video recordings & replays</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>Prioritized cloud runner queue</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>Multi-route batch suite runner</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8 pt-4">
                                <Link
                                    href="/dashboard"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400"
                                >
                                    <span>Upgrade to Pro</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        {/* 3. Enterprise */}
                        <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl backdrop-blur-sm transition hover:border-slate-700">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-semibold text-white">Enterprise</h2>
                                        <Shield className="h-4 w-4 text-cyan-400" />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        For organizations requiring custom LLMs, SOC2 compliance, and VPC runners.
                                    </p>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="font-mono text-4xl font-extrabold text-white sm:text-5xl">Custom</span>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Enterprise Capabilities:
                                    </div>
                                    <ul className="space-y-3 text-sm text-slate-300">
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                                            <span>Unlimited credits & concurrent workers</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                                            <span>Self-hosted or on-prem Playwright runners</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                                            <span>Custom LLM fine-tuning on internal repos</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                                            <span>Dedicated Chrome DevTools Protocol capacity</span>
                                        </li>
                                        <li className="flex items-center gap-2.5">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                                            <span>99.9% uptime SLA & dedicated engineer</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8 pt-4">
                                <Link
                                    href="/contact"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 hover:border-slate-600"
                                >
                                    <span>Contact Enterprise</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/30 p-8 sm:p-12 space-y-8 backdrop-blur-sm max-w-4xl mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 text-slate-300">
                                <HelpCircle className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Frequently Asked Questions</h3>
                                <p className="text-xs text-slate-400">Everything you need to know about test runs and credits.</p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-200">What is a Test Credit?</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Each test credit corresponds to one full cloud execution of a Playwright test scenario against your application URL on Browserbase infrastructure.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-200">Can I test local development servers?</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Yes! You can set your target environment URL to a publicly accessible tunneling endpoint (such as ngrok or cloudflare tunnels) or staging/preview URLs.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-200">How does test generation work?</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    TestPilot extracts route handlers, form components, and schema definitions directly from your GitHub repository AST without hallucinating non-existent endpoints.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-200">Can I cancel anytime?</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Yes, subscriptions can be canceled at any time directly through your dashboard with no lock-in or cancellation penalties.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
