'use client';

import React from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    Clock,
    Play,
    Sparkles,
    RefreshCw,
    Activity,
    Layers,
} from 'lucide-react';
import type { TestCase, ExecutionRecord } from './types';

interface TestMetricsBarProps {
    tests: TestCase[];
    executions: Record<number, ExecutionRecord>;
    runningTestIds: Set<number>;
    isRunningAll: boolean;
    isGeneratingTests: boolean;
    onRunAllTests: () => void;
    onRegenerateTests: () => void;
}

export function TestMetricsBar({
    tests,
    executions,
    runningTestIds,
    isRunningAll,
    isGeneratingTests,
    onRunAllTests,
    onRegenerateTests,
}: TestMetricsBarProps) {
    const totalTests = tests.length;

    let passedCount = 0;
    let failedCount = 0;
    let runningCount = 0;

    for (let i = 0; i < tests.length; i++) {
        const testId = tests[i].id ?? i;
        const isRunning = runningTestIds.has(testId);
        const execution = executions[testId];

        if (isRunning || execution?.status === 'running') {
            runningCount++;
        } else if (execution?.status === 'passed') {
            passedCount++;
        } else if (execution?.status === 'failed') {
            failedCount++;
        }
    }

    const completedCount = passedCount + failedCount;
    const successRate =
        completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0;
    const pendingCount = totalTests - completedCount - runningCount;

    return (
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Metric Badges */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    {/* Total Tests */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2">
                        <Layers className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-400">Total</span>
                        <span className="font-mono text-sm font-bold text-slate-100">
                            {totalTests}
                        </span>
                    </div>

                    {/* Passed Badge */}
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-300">Passed</span>
                        <span className="font-mono text-sm font-bold text-emerald-300">
                            {passedCount}
                        </span>
                    </div>

                    {/* Failed Badge */}
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2">
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                        <span className="text-xs font-medium text-rose-300">Failed</span>
                        <span className="font-mono text-sm font-bold text-rose-300">
                            {failedCount}
                        </span>
                    </div>

                    {/* Running / Pending Badge */}
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2">
                        {runningCount > 0 ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                        ) : (
                            <Clock className="h-4 w-4 text-amber-400" />
                        )}
                        <span className="text-xs font-medium text-amber-300">
                            {runningCount > 0 ? 'Running' : 'Pending'}
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-300">
                            {runningCount > 0 ? runningCount : pendingCount}
                        </span>
                    </div>

                    {/* Success Rate */}
                    <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-medium text-cyan-300">Success Rate</span>
                        <span className="font-mono text-sm font-bold text-cyan-300">
                            {completedCount > 0 ? `${successRate}%` : '—'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onRunAllTests}
                        disabled={totalTests === 0 || isRunningAll}
                        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isRunningAll ? (
                            <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                                <span>Running Suite ({runningCount}/{totalTests})...</span>
                            </>
                        ) : (
                            <>
                                <Play className="h-3.5 w-3.5 fill-emerald-300" />
                                <span>Run All Tests</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onRegenerateTests}
                        disabled={isGeneratingTests || isRunningAll}
                        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-300 shadow-md transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isGeneratingTests ? (
                            <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Re-generate Suite</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {totalTests > 0 ? (
                <div className="mt-4">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                        {passedCount > 0 && (
                            <div
                                style={{ width: `${(passedCount / totalTests) * 100}%` }}
                                className="bg-emerald-500 transition-all duration-500"
                                title={`Passed: ${passedCount}`}
                            />
                        )}
                        {failedCount > 0 && (
                            <div
                                style={{ width: `${(failedCount / totalTests) * 100}%` }}
                                className="bg-rose-500 transition-all duration-500"
                                title={`Failed: ${failedCount}`}
                            />
                        )}
                        {runningCount > 0 && (
                            <div
                                style={{ width: `${(runningCount / totalTests) * 100}%` }}
                                className="bg-amber-400 animate-pulse transition-all duration-500"
                                title={`Running: ${runningCount}`}
                            />
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
