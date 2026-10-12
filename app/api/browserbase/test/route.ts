import { NextResponse } from "next/server";
import { createBrowserbaseSession } from "@/lib/browserbase/browserbase";

export async function GET() {
  try {
    const session = await createBrowserbaseSession();

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      connectUrl: session.connectUrl,
    });
  } catch (error) {
    console.error("[BROWSERBASE TEST]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Browserbase session",
      },
      { status: 500 }
    );
  }
}