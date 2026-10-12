import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import {
  repositories,
  testCases,
  testExecutions,
  users
} from "@/db/schema";



import { executeTestCase } from "@/lib/test-execution/testExecutor";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Authenticate
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [currentDbUser] = await db
  .select()
  .from(users)
  .where(eq(users.clerkId, userId))
  .limit(1);

    if (!currentDbUser) {
        return NextResponse.json(
            { error: "User account is not synchronized" },
            { status: 403 }
        );
    }

    const { id } = await params;
    const testCaseId = Number(id);

    if (!Number.isInteger(testCaseId) || testCaseId <= 0) {
      return NextResponse.json(
        { error: "Invalid test case ID" },
        { status: 400 }
      );
    }

    // 2. Load the test case + repository
    const result = await db
      .select({
        testCase: testCases,
        repository: repositories,
      })
      .from(testCases)
      .innerJoin(
        repositories,
        eq(testCases.repositoryId, repositories.id)
      )
      .where(eq(testCases.id, testCaseId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    const { testCase, repository } = result[0];

    if (repository.userId !== currentDbUser.id) {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

   // 3. Get application URL
    const body = await request.json().catch(() => ({}));

    const appUrl =
      typeof body.appUrl === "string"
        ? body.appUrl.trim()
        : "";

    if (!appUrl) {
      return NextResponse.json(
        {
          error:
            "appUrl is required to execute a browser test",
        },
        { status: 400 }
      );
    }

    // 4. Create execution record
    const startedAt = new Date();

    const [execution] = await db
      .insert(testExecutions)
      .values({
        testCaseId: testCase.id,
        status: "running",
        startedAt,
      })
      .returning();

    try {
      // 5. Execute the test in Browserbase
      const result = await executeTestCase(
        testCase,
        appUrl
      );

      const completedAt = new Date();

      // 6. Persist execution result
      const [updatedExecution] = await db
        .update(testExecutions)
        .set({
          status: result.status,
          completedAt,
          sessionId: result.sessionId,
          sessionUrl: result.sessionUrl,
          logs: result.logs.join("\n"),
          error: result.error ?? null,
        })
        .where(eq(testExecutions.id, execution.id))
        .returning();

      return NextResponse.json({
        success: result.status === "passed",
        execution: updatedExecution,
        testCase,
        repository,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Test execution failed";

      const [failedExecution] = await db
        .update(testExecutions)
        .set({
          status: "failed",
          completedAt: new Date(),
          error: message,
        })
        .where(eq(testExecutions.id, execution.id))
        .returning();

      return NextResponse.json(
        {
          success: false,
          execution: failedExecution,
          error: message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[TEST EXECUTION API]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run test case",
      },
      { status: 500 }
    );
  }
}