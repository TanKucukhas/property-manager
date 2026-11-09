import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aiJobs, aiRunnerHeartbeat, prescreenings } from "@/db/schema";
import { AI_RUNNER_ONLINE_MS, isAiProvider, type AiProvider } from "@/lib/ai-runner";

/**
 * GET  /api/ai-jobs?prescreeningId=12  → jobs for one application (or the latest 200) + runner status
 * POST /api/ai-jobs { prescreeningIds: number[], providers: ("claude"|"openai")[] } → queue jobs
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const url = new URL(request.url);
  const pid = parseInt(url.searchParams.get("prescreeningId") || "");

  const jobs = await db
    .select()
    .from(aiJobs)
    .where(Number.isNaN(pid) ? undefined : eq(aiJobs.prescreeningId, pid))
    .orderBy(desc(aiJobs.id))
    .limit(200)
    .all();

  const hb = await db.select().from(aiRunnerHeartbeat).where(eq(aiRunnerHeartbeat.id, 1)).get();
  const online = !!hb && Date.now() - new Date(hb.lastSeenAt).getTime() < AI_RUNNER_ONLINE_MS;

  return NextResponse.json({
    jobs,
    runner: hb ? { online, lastSeenAt: hb.lastSeenAt, providers: hb.providers?.split(",").filter(Boolean) ?? [] } : { online: false, lastSeenAt: null, providers: [] },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body.prescreeningIds)
    ? body.prescreeningIds.map((v: unknown) => parseInt(String(v))).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  const providers: AiProvider[] = Array.isArray(body.providers) ? [...new Set(body.providers.filter(isAiProvider))] as AiProvider[] : [];
  if (ids.length === 0 || ids.length > 100) return NextResponse.json({ error: "prescreeningIds: 1-100 ids required" }, { status: 400 });
  if (providers.length === 0) return NextResponse.json({ error: "providers: claude and/or openai required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.select({ id: prescreenings.id }).from(prescreenings).where(inArray(prescreenings.id, ids)).all();
  const validIds = new Set(existing.map((r: { id: number }) => r.id));

  // Don't stack duplicates: skip provider+application pairs already waiting or running.
  const pending = await db
    .select({ prescreeningId: aiJobs.prescreeningId, provider: aiJobs.provider })
    .from(aiJobs)
    .where(and(inArray(aiJobs.prescreeningId, ids), inArray(aiJobs.status, ["queued", "running"])))
    .all();
  const pendingKeys = new Set(pending.map((p: { prescreeningId: number; provider: string }) => `${p.prescreeningId}:${p.provider}`));

  const now = new Date().toISOString();
  const rows = [];
  for (const id of ids) {
    if (!validIds.has(id)) continue;
    for (const provider of providers) {
      if (pendingKeys.has(`${id}:${provider}`)) continue;
      rows.push({ prescreeningId: id, provider, status: "queued", requestedAt: now });
    }
  }
  if (rows.length > 0) await db.insert(aiJobs).values(rows).run();
  return NextResponse.json({ queued: rows.length, skipped: ids.length * providers.length - rows.length });
}
