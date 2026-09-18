import { NextResponse } from "next/server";
import { chromium } from "playwright-core";
import {
  createBrowserbaseSession,
  getBrowserbaseClient,
} from "@/lib/browserbase/browserbase";

export async function GET() {
  let sessionId: string | undefined;

  try {
    // 1. Create a Browserbase cloud browser
    const session = await createBrowserbaseSession();
    sessionId = session.id;

    // 2. Connect Playwright to the Browserbase browser
    const browser = await chromium.connectOverCDP(session.connectUrl);

    const context = browser.contexts()[0];

    if (!context) {
      throw new Error("Browserbase session did not provide a browser context");
    }

    const page = await context.newPage();

    // 3. Navigate to a safe test page
    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
    });

    // 4. Read something from the real browser
    const title = await page.title();

    await page.close();
    await browser.close();

    // 5. End the Browserbase session
    const browserbase = getBrowserbaseClient();
    await browserbase.sessions.update(sessionId, {
      status: "REQUEST_RELEASE",
    });

    return NextResponse.json({
      success: true,
      sessionId,
      title,
      message: "Playwright successfully connected to Browserbase",
    });
  } catch (error) {
    console.error("[BROWSERBASE PLAYWRIGHT TEST]", error);

    // Try to release the session if something failed.
    if (sessionId) {
      try {
        const browserbase = getBrowserbaseClient();

        await browserbase.sessions.update(sessionId, {
          status: "REQUEST_RELEASE",
        });
      } catch (releaseError) {
        console.error(
          "[BROWSERBASE SESSION RELEASE FAILED]",
          releaseError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Playwright Browserbase test failed",
      },
      { status: 500 }
    );
  }
}