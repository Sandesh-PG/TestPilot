import { chromium } from "playwright-core";
import {
    createBrowserbaseSession,
    getBrowserbaseClient,
} from "@/lib/browserbase/browserbase";

export type ActionStep = {
    order: number;
    action:
        | "navigate"
        | "click"
        | "fill"
        | "assertVisible"
        | "assertResponse"
        | "pressKey"
        | "waitForTimeout"
        | "screenshot";
    target?: string;
    value?: string;
    expected?: string;
    description: string;
};

export type TestCaseWithSteps = {
    id?: number;
    title: string;
    description?: string;
    type: string;
    priority?: string;
    targetRoute: string;
    targetFiles?: string[] | unknown;
    expectedResult?: string;
    actionSteps?: ActionStep[] | unknown;
};

export type TestExecutionResult = {
    status: "passed" | "failed";
    sessionId: string;
    sessionUrl: string;
    logs: string[];
    error?: string;
    durationMs?: number;
};

function formatLog(message: string): string {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
    return `[${timestamp}] ${message}`;
}

export function resolveTargetUrl(baseUrl: string, routeOrUrl?: string): string {
    if (!routeOrUrl) {
        return baseUrl.replace(/\/+$/, "");
    }

    if (/^https?:\/\//i.test(routeOrUrl)) {
        return routeOrUrl;
    }

    const cleanBase = baseUrl.replace(/\/+$/, "");
    const cleanRoute = routeOrUrl.startsWith("/") ? routeOrUrl : `/${routeOrUrl}`;

    return `${cleanBase}${cleanRoute}`;
}

function parseActionSteps(rawSteps: unknown): ActionStep[] {
    if (!rawSteps) {
        return [];
    }

    if (Array.isArray(rawSteps)) {
        return rawSteps.filter(
            (step): step is ActionStep =>
                typeof step === "object" &&
                step !== null &&
                typeof (step as { action?: unknown }).action === "string"
        );
    }

    if (typeof rawSteps === "string") {
        try {
            const parsed = JSON.parse(rawSteps);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            return [];
        }
    }

    return [];
}

/**
 * Executes a test case against the target environment using Browserbase cloud Playwright.
 * Accepts either (repositoryUrl, testCase) or (testCase, repositoryUrl) for full flexibility.
 */
export async function executeTestCase(
    arg1: string | TestCaseWithSteps,
    arg2: string | TestCaseWithSteps
): Promise<TestExecutionResult> {
    const repositoryUrl = typeof arg1 === "string" ? arg1 : (arg2 as string);
    const testCase = typeof arg1 === "object" ? arg1 : (arg2 as TestCaseWithSteps);

    const startTime = Date.now();
    const logs: string[] = [];
    let sessionId = "unknown";
    let sessionUrl = "";

    logs.push(formatLog(`🚀 Initializing test run for: "${testCase.title}"`));
    logs.push(formatLog(`🎯 Target Environment: ${repositoryUrl}`));
    logs.push(formatLog(`📍 Route: ${testCase.targetRoute} (Type: ${testCase.type.toUpperCase()})`));

    try {
        if (!repositoryUrl || !repositoryUrl.trim()) {
            throw new Error("Target Environment URL is empty. Please set a valid deployment or localhost URL.");
        }

        // 1. Create Browserbase Remote Session
        logs.push(formatLog("☁️ Requesting Browserbase cloud browser session..."));
        let session;
        try {
            session = await createBrowserbaseSession();
        } catch (bbError) {
            const msg = bbError instanceof Error ? bbError.message : "Failed to connect to Browserbase";
            throw new Error(`Browserbase session error: ${msg}. Check BROWSERBASE_API_KEY & BROWSERBASE_PROJECT_ID.`);
        }

        sessionId = session.id;
        sessionUrl = `https://www.browserbase.com/sessions/${sessionId}`;
        logs.push(formatLog(`✅ Session created (ID: ${sessionId})`));
        logs.push(formatLog(`🔗 Live Session Replay: ${sessionUrl}`));

        // 2. Connect Playwright Chromium over CDP
        logs.push(formatLog("🌐 Connecting Playwright CDP to remote browser..."));
        const browser = await chromium.connectOverCDP(session.connectUrl);

        try {
            const context = browser.contexts()[0] || (await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: "TestPilot-Automated-QA/1.0",
            }));

            const page = await context.newPage();
            page.setDefaultTimeout(10000);

            const steps = parseActionSteps(testCase.actionSteps);

            if (steps.length === 0) {
                // If test case has no explicit steps, run a sensible default flow based on type
                logs.push(formatLog("ℹ️ No structured action steps provided. Running default route check..."));
                const targetUrl = resolveTargetUrl(repositoryUrl, testCase.targetRoute);

                if (testCase.type === "api") {
                    logs.push(formatLog(`📡 Executing API GET request to ${targetUrl}...`));
                    const response = await page.request.get(targetUrl, { timeout: 10000 });
                    const status = response.status();
                    logs.push(formatLog(`📥 Response status: ${status}`));
                    if (status >= 500) {
                        throw new Error(`API endpoint responded with server error ${status}`);
                    }
                } else {
                    logs.push(formatLog(`🌐 Navigating to ${targetUrl}...`));
                    const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
                    const status = response?.status() ?? 200;
                    logs.push(formatLog(`📥 Navigation response status: ${status}`));
                    const pageTitle = await page.title();
                    logs.push(formatLog(`📄 Page title: "${pageTitle}"`));
                    if (status >= 500) {
                        throw new Error(`Page returned server error ${status}`);
                    }
                }
            } else {
                // Execute sequential action steps
                logs.push(formatLog(`📋 Executing ${steps.length} sequential action steps...`));

                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const stepNumber = step.order || i + 1;
                    logs.push(formatLog(`▶️ Step ${stepNumber} [${step.action}]: ${step.description}`));

                    switch (step.action) {
                        case "navigate": {
                            const navTarget = resolveTargetUrl(repositoryUrl, step.target || step.value || testCase.targetRoute);
                            logs.push(formatLog(`   Navigating to: ${navTarget}`));
                            try {
                                await page.goto(navTarget, { waitUntil: "networkidle", timeout: 15000 });
                            } catch {
                                // Fallback to domcontentloaded for streaming apps
                                await page.goto(navTarget, { waitUntil: "domcontentloaded", timeout: 15000 });
                            }
                            const currentUrl = page.url();
                            logs.push(formatLog(`   Reached: ${currentUrl}`));
                            break;
                        }

                        case "click": {
                            const selector = step.target || step.value;
                            if (!selector) {
                                throw new Error(`Step ${stepNumber} [click] is missing a target selector.`);
                            }
                            logs.push(formatLog(`   Clicking selector: "${selector}"`));
                            await page.waitForSelector(selector, { state: "visible", timeout: 8000 });
                            await page.click(selector, { timeout: 5000 });
                            break;
                        }

                        case "fill": {
                            const selector = step.target;
                            const fillValue = step.value ?? "";
                            if (!selector) {
                                throw new Error(`Step ${stepNumber} [fill] is missing a target selector.`);
                            }
                            logs.push(formatLog(`   Filling "${selector}" with value: "${fillValue}"`));
                            await page.waitForSelector(selector, { state: "visible", timeout: 8000 });
                            await page.fill(selector, fillValue, { timeout: 5000 });
                            break;
                        }

                        case "assertVisible": {
                            const selector = step.target || step.value;
                            if (!selector) {
                                throw new Error(`Step ${stepNumber} [assertVisible] is missing a target selector.`);
                            }
                            logs.push(formatLog(`   Asserting visibility of selector: "${selector}"`));
                            await page.waitForSelector(selector, { state: "visible", timeout: 8000 });
                            logs.push(formatLog(`   Selector "${selector}" is visible.`));
                            break;
                        }

                        case "assertResponse": {
                            const expected = step.expected || step.value;
                            const target = step.target || testCase.targetRoute;

                            if (testCase.type === "api" || target.startsWith("/api")) {
                                const apiUrl = resolveTargetUrl(repositoryUrl, target);
                                logs.push(formatLog(`   Requesting API endpoint: ${apiUrl}`));
                                const response = await page.request.get(apiUrl, { timeout: 10000 });
                                const status = response.status();
                                const text = await response.text();
                                logs.push(formatLog(`   API status: ${status}, Body length: ${text.length}`));

                                if (expected) {
                                    const matches = text.includes(expected) || String(status) === expected;
                                    if (!matches) {
                                        throw new Error(`API response assertion failed. Expected "${expected}", received status ${status} with body: ${text.slice(0, 200)}`);
                                    }
                                }
                            } else {
                                // UI text assertion
                                if (step.target) {
                                    logs.push(formatLog(`   Asserting text in selector "${step.target}" contains "${expected}"`));
                                    await page.waitForSelector(step.target, { state: "attached", timeout: 8000 });
                                    const elementText = await page.locator(step.target).innerText();
                                    if (expected && !elementText.includes(expected)) {
                                        throw new Error(`Assertion failed: expected "${expected}" in "${step.target}", found "${elementText}"`);
                                    }
                                } else if (expected) {
                                    logs.push(formatLog(`   Asserting page content contains: "${expected}"`));
                                    const pageContent = await page.content();
                                    if (!pageContent.includes(expected)) {
                                        throw new Error(`Assertion failed: expected page to contain "${expected}"`);
                                    }
                                }
                            }
                            logs.push(formatLog(`   Assertion passed.`));
                            break;
                        }

                        case "pressKey": {
                            const key = step.value || step.target || "Enter";
                            logs.push(formatLog(`   Pressing keyboard key: "${key}"`));
                            await page.keyboard.press(key);
                            break;
                        }

                        case "waitForTimeout": {
                            const ms = Math.min(10000, Math.max(200, Number(step.value) || 1000));
                            logs.push(formatLog(`   Waiting for ${ms}ms...`));
                            await page.waitForTimeout(ms);
                            break;
                        }

                        case "screenshot": {
                            logs.push(formatLog("   Capturing viewport state..."));
                            await page.screenshot({ fullPage: false });
                            logs.push(formatLog("   Screenshot captured successfully."));
                            break;
                        }

                        default: {
                            logs.push(formatLog(`   Unknown action verb "${(step as { action: string }).action}", skipping.`));
                        }
                    }
                }
            }

            logs.push(formatLog("✨ All test steps executed successfully!"));
            await page.close();

            const durationMs = Date.now() - startTime;
            logs.push(formatLog(`🏁 Test execution passed in ${durationMs}ms`));

            return {
                status: "passed",
                sessionId,
                sessionUrl,
                logs,
                durationMs,
            };
        } finally {
            await browser.close().catch(() => {});
        }
    } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Test execution failed unexpectedly";
        logs.push(formatLog(`❌ Test failed: ${errorMessage}`));

        return {
            status: "failed",
            sessionId,
            sessionUrl,
            logs,
            error: errorMessage,
            durationMs,
        };
    } finally {
        // Release the Browserbase cloud session
        if (sessionId && sessionId !== "unknown") {
            try {
                const browserbase = getBrowserbaseClient();
                await browserbase.sessions.update(sessionId, {
                    status: "REQUEST_RELEASE",
                });
                logs.push(formatLog("☁️ Browserbase cloud session released."));
            } catch (releaseError) {
                console.warn("[BROWSERBASE SESSION RELEASE WARNING]", releaseError);
            }
        }
    }
}