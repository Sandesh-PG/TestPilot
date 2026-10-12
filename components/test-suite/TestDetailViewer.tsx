'use client';

import React, { useState } from 'react';
import {
    Play,
    RefreshCw,
    ExternalLink,
    Terminal,
    Copy,
    Check,
    AlertCircle,
    CheckCircle2,
    Globe,
    FileText,
    Shield,
    Video,
    ChevronDown,
    ChevronUp,
    Layers,
} from 'lucide-react';
import type { TestCase, ExecutionRecord } from './types';

interface TestDetailViewerProps {
    test: TestCase | null;
    testIndex: number;
    execution?: ExecutionRecord;
    isRunning: boolean;
    onRunTest: () => void;
}

export function TestDetailViewer({
    test,
    testIndex,
    execution,
    isRunning,
    onRunTest,
}: TestDetailViewerProps) {
    const [copiedLogs, setCopiedLogs] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(true);

    if (!test) {
        return (
            <div className="flex h-[700px] flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/70 p-8 text-center text-slate-500 shadow-2xl backdrop-blur-md">
                <Layers className="h-12 w-12 text-slate-700 mb-3" />
                <h3 className="text-sm font-semibold text-slate-400">No Test Selected</h3>
                <p className="mt-1 text-xs text-slate-600 max-w-sm">
                    Select a test case from the directory on the left to inspect its execution steps, target route, and cloud replay logs.
                </p>
            </div>
        );
    }

    const handleCopyLogs = () => {
        if (!execution?.logs || execution.logs.length === 0) return;
        void navigator.clipboard.writeText(execution.logs.join('\n'));
        setCopiedLogs(true);
        setTimeout(() => setCopiedLogs(false), 2000);
    };

    const getActionBadgeColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'navigate':
                return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
            case 'click':
                return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
            case 'fill':
                return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
            case 'submit':
                return 'bg-purple-500/15 border-purple-500/40 text-purple-300';
            case 'assertvisible':
                return 'bg-teal-500/15 border-teal-500/40 text-teal-300';
            case 'asserttext':
                return 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300';
            case 'assertresponse':
                return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
            case 'wait':
            case 'waitfortimeout':
                return 'bg-slate-800 border-slate-700 text-slate-300';
            default:
                return 'bg-slate-800 border-slate-700 text-slate-300';
        }
    };

    const priorityBadgeClass = () => {
        switch (test.priority?.toLowerCase()) {
            case 'high':
                return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
            case 'medium':
                return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
            default:
                return 'border-slate-700 bg-slate-900 text-slate-300';
        }
    };

    return (
        <section className="flex flex-col h-[700px] rounded-2xl border border-slate-800/90 bg-slate-950/70 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Header: Test Information & Actions */}
            <header className="p-6 border-b border-slate-800/80 bg-slate-950/90 shrink-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                                Test #{testIndex + 1}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                                {test.type}
                            </span>
                        </div>
                        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-100">
                            {test.title}
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 max-w-2xl">
                            {test.description}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={onRunTest}
                            disabled={isRunning}
                            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-md transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isRunning ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                                    <span>Running...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="h-3.5 w-3.5 fill-emerald-300" />
                                    <span>Run Test</span>
                                </>
                            )}
                        </button>

                        {execution?.sessionUrl && (
                            <a
                                href={execution.sessionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-md transition hover:bg-cyan-500/20"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Watch Replay</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Metadata Badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300 font-mono">
                        <Globe className="h-3 w-3 text-slate-400" />
                        <span>{test.targetRoute}</span>
                    </div>

                    <div
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${priorityBadgeClass()}`}
                    >
                        {test.priority} Priority
                    </div>

                    {test.targetFiles && test.targetFiles.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-400 text-[11px]">
                            <FileText className="h-3 w-3 text-slate-500" />
                            <span>{test.targetFiles.join(', ')}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 repo-inspection-scrollbar">
                {/* Expected Result Callout */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Expected Result</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-200 leading-relaxed">
                        {test.expectedResult}
                    </p>
                </div>

                {/* Cloud Session Replay Card */}
                {execution?.sessionUrl && (
                    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 to-slate-900/40 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                                    <Video className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-cyan-200">
                                            Browserbase Session Active
                                        </span>
                                        {execution.durationMs && (
                                            <span className="text-[11px] font-mono text-cyan-400/80">
                                                ({execution.durationMs}ms)
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                        Session ID: {execution.sessionId || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <a
                                href={execution.sessionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 shadow-sm transition hover:bg-cyan-500/30"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Launch Video Replay
                            </a>
                        </div>
                    </div>
                )}

                {/* Steps Timeline */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Playwright Step Timeline ({test.actionSteps?.length || 0})
                    </h3>

                    {test.actionSteps && test.actionSteps.length > 0 ? (
                        <div className="space-y-2.5">
                            {test.actionSteps.map((step, idx) => (
                                <div
                                    key={`step-${idx}-${step.order ?? idx + 1}`}
                                    className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 transition hover:border-slate-700/80"
                                >
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-mono text-[11px] font-bold text-slate-300">
                                        {step.order ?? step.step ?? idx + 1}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getActionBadgeColor(
                                                    step.action
                                                )}`}
                                            >
                                                {step.action}
                                            </span>

                                            {step.target && (
                                                <code className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-slate-200 border border-slate-800">
                                                    {step.target}
                                                </code>
                                            )}

                                            {step.value && (
                                                <span className="text-slate-400 text-xs">
                                                    =&gt; <code className="text-amber-300 font-mono">{step.value}</code>
                                                </span>
                                            )}

                                            {step.expected && (
                                                <span className="text-slate-400 text-xs">
                                                    (expect: <code className="text-emerald-400 font-mono">{step.expected}</code>)
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-300 font-normal">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-800 p-4 text-xs text-slate-500 text-center">
                            No discrete action steps defined.
                        </div>
                    )}
                </div>

                {/* Execution Output Console Drawer */}
                {execution ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-semibold text-slate-200">
                                    Execution Console Output
                                </span>
                                {execution.status === 'passed' && (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3" /> Passed
                                    </span>
                                )}
                                {execution.status === 'failed' && (
                                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                                        <AlertCircle className="h-3 w-3" /> Failed
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopyLogs}
                                    className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition"
                                >
                                    {copiedLogs ? (
                                        <>
                                            <Check className="h-3 w-3 text-emerald-400" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                                    className="rounded p-1 text-slate-400 hover:text-slate-200 transition"
                                >
                                    {isLogsExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Callout Banner */}
                        {execution.error && (
                            <div className="border-b border-rose-900/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                                <div className="space-y-1">
                                    <div className="font-semibold text-rose-200">
                                        Execution Failure
                                    </div>
                                    <div className="font-mono text-[11px] leading-relaxed text-rose-300/90 whitespace-pre-wrap">
                                        {execution.error}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Monospace Log Viewer */}
                        {isLogsExpanded && (
                            <div className="bg-black/95 p-4 font-mono text-[11px] leading-relaxed text-slate-300 max-h-72 overflow-y-auto repo-inspection-scrollbar">
                                {execution.logs && execution.logs.length > 0 ? (
                                    execution.logs.map((logLine, idx) => {
                                        const isErr =
                                            logLine.includes('❌') ||
                                            logLine.includes('failed') ||
                                            logLine.includes('Assertion failed');
                                        const isPass =
                                            logLine.includes('✅') ||
                                            logLine.includes('passed') ||
                                            logLine.includes('✨');
                                        const isStep =
                                            logLine.includes('▶️') ||
                                            logLine.includes('Navigating') ||
                                            logLine.includes('Clicking');

                                        return (
                                            <div
                                                key={idx}
                                                className={
                                                    isErr
                                                        ? 'text-rose-400'
                                                        : isPass
                                                        ? 'text-emerald-400'
                                                        : isStep
                                                        ? 'text-cyan-300'
                                                        : 'text-slate-300'
                                                }
                                            >
                                                {logLine}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-slate-600">No console logs available.</div>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
