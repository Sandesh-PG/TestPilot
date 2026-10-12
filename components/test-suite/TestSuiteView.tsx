'use client';

import React, { useState, useEffect } from 'react';
import { TestMetricsBar } from './TestMetricsBar';
import { TestSidebar } from './TestSidebar';
import { TestDetailViewer } from './TestDetailViewer';
import type { TestCase, ExecutionRecord } from './types';

interface TestSuiteViewProps {
    tests: TestCase[];
    executions: Record<number, ExecutionRecord>;
    runningTestIds: Set<number>;
    isRunningAll: boolean;
    isGeneratingTests: boolean;
    onRunSingleTest: (test: TestCase, index: number) => void;
    onRunAllTests: () => void;
    onRegenerateTests: () => void;
}

export function TestSuiteView({
    tests,
    executions,
    runningTestIds,
    isRunningAll,
    isGeneratingTests,
    onRunSingleTest,
    onRunAllTests,
    onRegenerateTests,
}: TestSuiteViewProps) {
    const [selectedTestIndex, setSelectedTestIndex] = useState<number>(0);

    // Keep selected index within bounds if tests list changes
    useEffect(() => {
        if (selectedTestIndex >= tests.length && tests.length > 0) {
            setSelectedTestIndex(0);
        }
    }, [tests.length, selectedTestIndex]);

    const activeTest = tests[selectedTestIndex] || null;
    const activeTestId = activeTest ? (activeTest.id ?? selectedTestIndex) : 0;
    const activeExecution = executions[activeTestId];
    const isCurrentTestRunning = runningTestIds.has(activeTestId);

    return (
        <div className="space-y-6">
            {/* Top Metrics Dashboard Bar */}
            <TestMetricsBar
                tests={tests}
                executions={executions}
                runningTestIds={runningTestIds}
                isRunningAll={isRunningAll}
                isGeneratingTests={isGeneratingTests}
                onRunAllTests={onRunAllTests}
                onRegenerateTests={onRegenerateTests}
            />

            {/* Split-View Workspace: Directory Sidebar (Left) + Detail Inspector (Right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Column: Searchable Test Directory (~35% - 40% width) */}
                <div className="lg:col-span-5 xl:col-span-4">
                    <TestSidebar
                        tests={tests}
                        selectedTestIndex={selectedTestIndex}
                        onSelectTest={(idx) => setSelectedTestIndex(idx)}
                        executions={executions}
                        runningTestIds={runningTestIds}
                        onRunSingleTest={onRunSingleTest}
                    />
                </div>

                {/* Right Column: Detailed Test Inspector (~60% - 65% width) */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <TestDetailViewer
                        test={activeTest}
                        testIndex={selectedTestIndex}
                        execution={activeExecution}
                        isRunning={isCurrentTestRunning}
                        onRunTest={() => {
                            if (activeTest) {
                                onRunSingleTest(activeTest, selectedTestIndex);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
