import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiJobs } from "@/db/schema";
import { extractJsonObject, isRunnerAuthorized } from "@/lib/ai-runner";

/** Runner reports a result: { status: "done", result, model } or { status: "error", error }. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRunnerAuthorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const jobId = parseInt(id);
  if (Number.isNaN(jobId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const model = typeof body.model === "string" ? body.model.slice(0, 100) : null;
  const nowIso = new Date().toISOString();
  const db = await getDb();

  let updates: Record<string, unknown>;
  if (body.status === "done" && typeof body.result === "string") {
    const json = extractJsonObject(body.result.slice(0, 100_000));
    updates = json
      ? { status: "done", result: json, error: null, model, completedAt: nowIso }
      : { status: "error", error: `Model did not return valid JSON: ${body.result.slice(0, 300)}`, model, completedAt: nowIso };
  } else if (body.status === "error") {
    updates = { status: "error", error: String(body.error || "Unknown error").slice(0, 2000), model, completedAt: nowIso };
  } else {
    return NextResponse.json({ error: "status must be done (with result) or error" }, { status: 400 });
  }

  const row = await db
    .update(aiJobs)
    .set(updates)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.status, "running")))
    .returning({ id: aiJobs.id, status: aiJobs.status })
    .get();
  if (!row) return NextResponse.json({ error: "Job is not running (already finished or reclaimed)" }, { status: 409 });
  return NextResponse.json({ success: true, status: row.status });
}
