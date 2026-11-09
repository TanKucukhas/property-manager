import { timingSafeEqual } from "node:crypto";

export const AI_PROVIDERS = ["claude", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** A job stuck in "running" longer than this is handed to the next runner. */
export const AI_JOB_STALE_MS = 10 * 60 * 1000;
/** A runner that has not polled within this window is shown as offline. */
export const AI_RUNNER_ONLINE_MS = 2 * 60 * 1000;

export function isAiProvider(v: unknown): v is AiProvider {
  return typeof v === "string" && (AI_PROVIDERS as readonly string[]).includes(v);
}

async function getRunnerToken(): Promise<string | undefined> {
  if (process.env.AI_RUNNER_TOKEN) return process.env.AI_RUNNER_TOKEN;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (env as any).AI_RUNNER_TOKEN;
  } catch {
    return undefined;
  }
}

/** Runner endpoints are machine-to-machine: Bearer AI_RUNNER_TOKEN, never the admin cookie. */
export async function isRunnerAuthorized(request: Request): Promise<boolean> {
  const expected = await getRunnerToken();
  if (!expected || expected.length < 24) return false; // refuse when unset or weak
  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Pulls the first {...} block out of model output and checks it parses. */
export function extractJsonObject(raw: string): string | null {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  const candidate = raw.slice(first, last + 1);
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? candidate : null;
  } catch {
    return null;
  }
}
