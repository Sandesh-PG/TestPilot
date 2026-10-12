export type ActionStep = {
    order?: number;
    step?: number;
    action: string;
    target?: string;
    value?: string;
    expected?: string;
    description: string;
};

export type TestCase = {
    id?: number;
    title: string;
    description: string;
    type: string;
    priority: string;
    category?: string;
    targetRoute: string;
    targetFiles: string[];
    expectedResult: string;
    actionSteps?: ActionStep[];
};

export type ExecutionRecord = {
    testCaseId: number;
    status: 'pending' | 'running' | 'passed' | 'failed';
    sessionId?: string;
    sessionUrl?: string;
    logs?: string[];
    error?: string;
    durationMs?: number;
    completedAt?: string;
};

export type TestFilterCategory =
    | 'all'
    | 'ui'
    | 'api'
    | 'form'
    | 'edge-case'
    | 'auth'
    | 'passed'
    | 'failed';
