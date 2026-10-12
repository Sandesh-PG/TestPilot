import Browserbase from "@browserbasehq/sdk";

export const BROWSERBASE_CONFIG = {
  projectId: process.env.BROWSERBASE_PROJECT_ID,
} as const;

export function getBrowserbaseApiKey(): string {
  const apiKey = process.env.BROWSERBASE_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error("BROWSERBASE_API_KEY is not configured");
  }

  return apiKey.trim();
}

export function getBrowserbaseProjectId(): string {
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!projectId || !projectId.trim()) {
    throw new Error("BROWSERBASE_PROJECT_ID is not configured");
  }

  return projectId.trim();
}

export function getBrowserbaseClient(): Browserbase {
  return new Browserbase({
    apiKey: getBrowserbaseApiKey(),
  });
}

export async function createBrowserbaseSession() {
  const browserbase = getBrowserbaseClient();

  const session = await browserbase.sessions.create({
    projectId: getBrowserbaseProjectId(),
  });

  return session;
}