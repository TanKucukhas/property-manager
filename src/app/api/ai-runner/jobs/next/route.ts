import { NextResponse } from "next/server";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiJobs, aiRunnerHeartbeat, prescreenings, properties } from "@/db/schema";
import { AI_JOB_STALE_MS, AI_PROVIDERS, isAiProvider, isRunnerAuthorized } from "@/lib/ai-runner";
import { generatePrescreeningPrompt } from "@/lib/ai-prescreening-prompt";

const MAX_ATTEMPTS = 3;

/**
 * Runner poll. Records a heartbeat, recovers stuck jobs, then claims the
 * oldest queued job for one of the runner's providers and returns its prompt.
 * 204 when there is nothing to do.
 */
export async function GET(request: Request) {
  if (!(await isRunnerAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const requested = (url.searchParams.get("providers") || AI_PROVIDERS.join(",")).split(",").map((s) => s.trim()).filter(isAiProvider);
  if (requested.length === 0) return NextResponse.json({ error: "No valid providers" }, { status: 400 });
  const info = (url.searchParams.get("info") || "").slice(0, 200) || null;

  const db = await getDb();
  const now = new Date();
  const nowIso = now.toISOString();

  await db
    .insert(aiRunnerHeartbeat)
    .values({ id: 1, lastSeenAt: nowIso, providers: requested.join(","), info })
    .onConflictDoUpdate({ target: aiRunnerHeartbeat.id, set: { lastSeenAt: nowIso, providers: requested.join(","), info } })
    .run();

  // Jobs whose runner died mid-run go back to the queue (or fail after MAX_ATTEMPTS).
  const staleBefore = new Date(now.getTime() - AI_JOB_STALE_MS).toISOString();
  const stale = await db.select().from(aiJobs).where(and(eq(aiJobs.status, "running"), lt(aiJobs.startedAt, staleBefore))).all();
  for (const job of stale) {
    await db
      .update(aiJobs)
      .set(job.attempts >= MAX_ATTEMPTS
        ? { status: "error", error: "Runner timed out", completedAt: nowIso }
        : { status: "queued", startedAt: null })
      .where(and(eq(aiJobs.id, job.id), eq(aiJobs.status, "running")))
      .run();
  }

  // Claim: pick the oldest candidate, then flip it only if it is still queued.
  for (let tries = 0; tries < 3; tries++) {
    const candidate = await db
      .select()
      .from(aiJobs)
      .where(and(eq(aiJobs.status, "queued"), inArray(aiJobs.provider, requested)))
      .orderBy(asc(aiJobs.requestedAt), asc(aiJobs.id))
      .get();
    if (!candidate) return new NextResponse(null, { status: 204 });

    const claimed = await db
      .update(aiJobs)
      .set({ status: "running", startedAt: nowIso, attempts: candidate.attempts + 1 })
      .where(and(eq(aiJobs.id, candidate.id), eq(aiJobs.status, "queued")))
      .returning()
      .get();
    if (!claimed) continue;

    const applicant = await db.select().from(prescreenings).where(eq(prescreenings.id, claimed.prescreeningId)).get();
    if (!applicant) {
      await db.update(aiJobs).set({ status: "error", error: "Application not found", completedAt: nowIso }).where(eq(aiJobs.id, claimed.id)).run();
      continue;
    }
    const property = applicant.propertyId
      ? await db.select().from(properties).where(eq(properties.id, applicant.propertyId)).get()
      : null;

    const prompt = generatePrescreeningPrompt({
      applicant: applicant as unknown as Record<string, unknown>,
      property: (property ?? null) as unknown as Record<string, unknown> | null,
      computed: typeof applicant.score === "number" ? { score: applicant.score, flags: [], incomeThreshold: 0 } : undefined,
    });

    return NextResponse.json({
      job: { id: claimed.id, provider: claimed.provider, prescreeningId: claimed.prescreeningId, attempt: claimed.attempts },
      prompt,
    });
  }
  return new NextResponse(null, { status: 204 });
}
