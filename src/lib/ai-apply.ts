import { and, desc, eq } from "drizzle-orm";
import { aiJobs, prescreenings } from "@/db/schema";
import type { getDb } from "@/lib/db";
import { normalizeAiAnalysis, type ProviderAnalysis, type StoredAiAnalysis } from "@/lib/ai-analysis";

type Db = Awaited<ReturnType<typeof getDb>>;

/**
 * Step 1 of the review flow. Stores the latest finished AI result of every
 * provider on the applicant (ai_analysis), with the AI rating as the average.
 * The AI never writes the manager's fields — admin_rating, admin_notes,
 * status and reject_reason belong to steps 2 (review) and 3 (decision).
 */
export async function applyAiResults(db: Db, prescreeningId: number): Promise<void> {
  const record = await db.select().from(prescreenings).where(eq(prescreenings.id, prescreeningId)).get();
  if (!record) return;

  const jobs = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.prescreeningId, prescreeningId), eq(aiJobs.status, "done")))
    .orderBy(desc(aiJobs.completedAt))
    .all();

  const providers: Record<string, ProviderAnalysis> = {};
  for (const job of jobs) {
    if (providers[job.provider]) continue; // newest per provider only
    const analysis = normalizeAiAnalysis(job.result);
    if (analysis) providers[job.provider] = { ...analysis, model: job.model, completedAt: job.completedAt, jobId: job.id };
  }
  const list = Object.entries(providers)
    .sort(([a], [b]) => (a === "claude" ? -1 : b === "claude" ? 1 : a.localeCompare(b)))
    .map(([, p]) => p);
  if (list.length === 0) return;

  const primary = providers.claude ?? list[0];
  const rating = Math.round(list.reduce((sum, p) => sum + p.adminRating, 0) / list.length);

  const stored: StoredAiAnalysis = {
    ...primary,
    adminRating: rating,
    auto: true,
    providers,
    autoNotes: null,
    autoRating: null,
  };
  await db
    .update(prescreenings)
    .set({ aiAnalysis: JSON.stringify(stored), aiAnalysisDate: primary.completedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(prescreenings.id, prescreeningId))
    .run();
}
