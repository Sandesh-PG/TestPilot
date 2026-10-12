'use client';

import React, { useState, useMemo } from 'react';
import {
    Search,
    X,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Play,
    Globe,
    Layers,
} from 'lucide-react';
import type { TestCase, ExecutionRecord, TestFilterCategory } from './types';

interface TestSidebarProps {
    tests: TestCase[];
    selectedTestIndex: number;
    onSelectTest: (index: number) => void;
    executions: Record<number, ExecutionRecord>;
    runningTestIds: Set<number>;
    onRunSingleTest: (test: TestCase, index: number) => void;
}

export function TestSidebar({
    tests,
    selectedTestIndex,
    onSelectTest,
    executions,
    runningTestIds,
    onRunSingleTest,
}: TestSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<TestFilterCategory>('all');

    // Filter and search logic
    const filteredTests = useMemo(() => {
        return tests
            .map((test, originalIndex) => ({ test, originalIndex }))
            .filter(({ test, originalIndex }) => {
                const testId = test.id ?? originalIndex;
                const execution = executions[testId];
                const status = execution?.status;

                // Category & status chip filter
                if (activeFilter === 'ui' && test.type.toLowerCase() !== 'ui') return false;
                if (activeFilter === 'api' && test.type.toLowerCase() !== 'api') return false;
                if (activeFilter === 'form' && test.type.toLowerCase() !== 'form') return false;
                if (activeFilter === 'edge-case' && test.type.toLowerCase() !== 'edge-case') return false;
                if (activeFilter === 'auth' && test.type.toLowerCase() !== 'auth') return false;
                if (activeFilter === 'passed' && status !== 'passed') return false;
                if (activeFilter === 'failed' && status !== 'failed') return false;

                // Search query filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchesTitle = test.title.toLowerCase().includes(q);
                    const matchesRoute = test.targetRoute.toLowerCase().includes(q);
                    const matchesDesc = test.description.toLowerCase().includes(q);
                    const matchesCategory = (test.category || '').toLowerCase().includes(q);
                    return matchesTitle || matchesRoute || matchesDesc || matchesCategory;
                }

                return true;
            });
    }, [tests, executions, activeFilter, searchQuery]);

    // Counts for filter chips
    const filterCounts = useMemo(() => {
        const counts: Record<TestFilterCategory, number> = {
            all: tests.length,
            ui: 0,
            api: 0,
            form: 0,
            'edge-case': 0,
            auth: 0,
            passed: 0,
            failed: 0,
        };

        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            const testId = t.id ?? i;
            const tType = t.type.toLowerCase();
            const status = executions[testId]?.status;

            if (tType === 'ui') counts.ui++;
            else if (tType === 'api') counts.api++;
            else if (tType === 'form') counts.form++;
            else if (tType === 'edge-case') counts['edge-case']++;
            else if (tType === 'auth') counts.auth++;

            if (status === 'passed') counts.passed++;
            else if (status === 'failed') counts.failed++;
        }

        return counts;
    }, [tests, executions]);

    const chips: Array<{ id: TestFilterCategory; label: string; count: number }> = [
        { id: 'all', label: 'All', count: filterCounts.all },
        { id: 'ui', label: 'UI', count: filterCounts.ui },
        { id: 'api', label: 'API', count: filterCounts.api },
        { id: 'form', label: 'Form', count: filterCounts.form },
        { id: 'edge-case', label: 'Edge-Case', count: filterCounts['edge-case'] },
        { id: 'passed', label: 'Passed', count: filterCounts.passed },
        { id: 'failed', label: 'Failed', count: filterCounts.failed },
    ];

    const getCategoryBadgeClass = (type: string) => {
        switch (type.toLowerCase()) {
            case 'api':
                return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
            case 'ui':
                return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
            case 'form':
                return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
            case 'edge-case':
                return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
            case 'auth':
                return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
            default:
                return 'border-slate-700 bg-slate-900 text-slate-300';
        }
    };

    return (
        <aside className="flex flex-col h-[700px] rounded-2xl border border-slate-800/90 bg-slate-950/70 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Sticky Header: Search Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/90 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search test cases or routes..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-9 text-xs text-slate-100 placeholder-slate-500 transition focus:border-emerald-500/60 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-200"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {chips.map((chip) => {
                        const isActive = activeFilter === chip.id;
                        return (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => setActiveFilter(chip.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                                    isActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                        : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                }`}
                            >
                                <span>{chip.label}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                                        isActive
                                            ? 'bg-emerald-400/20 text-emerald-200'
                                            : 'bg-slate-800 text-slate-500'
                                    }`}
                                >
                                    {chip.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Test Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 repo-inspection-scrollbar">
                {filteredTests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
                        <Layers className="h-8 w-8 text-slate-600 mb-2" />
                        <span>No test cases match your filter.</span>
                    </div>
                ) : (
                    filteredTests.map(({ test, originalIndex }) => {
                        const isSelected = selectedTestIndex === originalIndex;
                        const testId = test.id ?? originalIndex;
                        const execution = executions[testId];
                        const isRunning = runningTestIds.has(testId);

                        return (
                            <div
                                key={`${test.title}-${originalIndex}`}
                                onClick={() => onSelectTest(originalIndex)}
                                className={`group relative rounded-xl border p-3.5 transition cursor-pointer select-none ${
                                    isSelected
                                        ? 'border-emerald-500/60 bg-slate-900/90 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                                        : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                                }`}
                            >
                                {/* Left Active Bar Indicator */}
                                {isSelected && (
                                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400" />
                                )}

                                <div className="flex items-start justify-between gap-2 pl-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                            #{originalIndex + 1}
                                        </span>
                                        <h4
                                            className={`text-xs font-semibold truncate transition ${
                                                isSelected ? 'text-emerald-200' : 'text-slate-200 group-hover:text-white'
                                            }`}
                                        >
                                            {test.title}
                                        </h4>
                                    </div>

                                    {/* Run Button (visible on hover or when running) */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRunSingleTest(test, originalIndex);
                                        }}
                                        disabled={isRunning}
                                        className="shrink-0 p-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition disabled:opacity-50"
                                        title="Run this test"
                                    >
                                        {isRunning ? (
                                            <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                                        ) : (
                                            <Play className="h-3 w-3 fill-current" />
                                        )}
                                    </button>
                                </div>

                                {/* Target Route Preview */}
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pl-1 truncate">
                                    <Globe className="h-3 w-3 shrink-0 text-slate-500" />
                                    <span className="truncate">{test.targetRoute}</span>
                                </div>

                                {/* Bottom Metadata Tags & Status */}
                                <div className="mt-2.5 flex items-center justify-between gap-2 pl-1">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getCategoryBadgeClass(
                                                test.type
                                            )}`}
                                        >
                                            {test.type}
                                        </span>
                                        {test.priority && (
                                            <span className="rounded-md border border-slate-800 bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-medium text-slate-400 uppercase">
                                                {test.priority}
                                            </span>
                                        )}
                                    </div>

                                    {/* Status Pill */}
                                    <div>
                                        {isRunning && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                                RUNNING
                                            </span>
                                        )}
                                        {!isRunning && execution?.status === 'passed' && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                PASSED
                                            </span>
                                        )}
                                        {!isRunning && execution?.status === 'failed' && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                                                <XCircle className="h-2.5 w-2.5" />
                                                FAILED
                                            </span>
                                        )}
                                        {!isRunning && !execution && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                                IDLE
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}
