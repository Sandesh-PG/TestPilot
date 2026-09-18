import { chromium } from "playwright-core";

import {
  createBrowserbaseSession,
  getBrowserbaseClient,
} from "@/lib/browserbase/browserbase";

import type { TestCase } from "@/db/schema";

export type TestExecutionResult = {
  status: "passed" | "failed";

  sessionId: string;
  sessionUrl?: string;

  logs: string[];

  error?: string;
};

function buildTargetUrl(
  appUrl: string,
  targetRoute: string
): string {
  const normalizedBase = appUrl.replace(/\/+$/, "");
  const normalizedRoute = targetRoute.startsWith("/")
    ? targetRoute
    : `/${targetRoute}`;

  return `${normalizedBase}${normalizedRoute}`;
}

export async function executeTestCase(
  testCase: TestCase,
  appUrl: string
): Promise<TestExecutionResult> {
  const logs: string[] = [];

  let sessionId: string | undefined;
  let sessionUrl: string | undefined;

  try {
    logs.push(`Starting test: ${testCase.title}`);

    if (!appUrl.trim()) {
      throw new Error("Application URL is required");
    }

    if (testCase.type !== "ui") {
      throw new Error(
        `Browser execution currently supports only ui tests. Received: ${testCase.type}`
      );
    }

    const session = await createBrowserbaseSession();

    sessionId = session.id;
    sessionUrl = session.connectUrl;

    logs.push(`Browserbase session created: ${sessionId}`);

    const browser = await chromium.connectOverCDP(
      session.connectUrl
    );

    try {
      const context = browser.contexts()[0];

      if (!context) {
        throw new Error(
          "Browserbase session did not provide a browser context"
        );
      }

      const page = await context.newPage();

      const targetUrl = buildTargetUrl(
        appUrl,
        testCase.targetRoute
      );

      logs.push(`Navigating to: ${targetUrl}`);

      const response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
      });

      if (!response) {
        throw new Error(
          "Navigation did not return an HTTP response"
        );
      }

      const statusCode = response.status();

      logs.push(
        `Navigation completed with status: ${statusCode}`
      );

      const title = await page.title();
      logs.push(`Page title: ${title}`);

      if (statusCode >= 400) {
        throw new Error(
          `Page returned HTTP ${statusCode}`
        );
      }

      logs.push("Page loaded successfully");

      await page.close();
    } finally {
      await browser.close();
    }

    logs.push("Test passed");

    return {
      status: "passed",
      sessionId,
      sessionUrl,
      logs,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown test execution error";

    logs.push(`Test failed: ${message}`);

    return {
      status: "failed",
      sessionId: sessionId ?? "unknown",
      sessionUrl,
      logs,
      error: message,
    };
  } finally {
    if (sessionId) {
      try {
        const browserbase = getBrowserbaseClient();

        await browserbase.sessions.update(sessionId, {
          status: "REQUEST_RELEASE",
        });

        logs.push("Browserbase session released");
      } catch (releaseError) {
        console.error(
          "[BROWSERBASE RELEASE FAILED]",
          releaseError
        );
      }
    }
  }
}