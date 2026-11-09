import { and, desc, eq } from "drizzle-orm";
import { aiJobs, prescreenings } from "@/db/schema";
import type { getDb } from "@/lib/db";
import { normalizeAiAnalysis, parseStoredAiAnalysis, type ProviderAnalysis, type StoredAiAnalysis } from "@/lib/ai-analysis";

type Db = Awaited<ReturnType<typeof getDb>>;

/**
 * Applies the latest finished AI result of every provider to the applicant:
 * rating (average), analysis and — only when the manager has not written
 * their own — notes. Status and reject reason are NEVER touched: the final
 * decision stays with the manager.
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

  const previous = parseStoredAiAnalysis(record.aiAnalysis);
  const prevAuto = previous && "auto" in previous ? previous : null;

  const notes = list.length > 1
    ? list.map((p) => `[AI · ${p === providers.claude ? "Claude" : p === providers.openai ? "OpenAI" : "AI"}] ${p.adminNotes}`).join("\n")
    : `[AI] ${primary.adminNotes}`;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  // Refresh notes/rating only while they are still the AI's own values.
  const currentNotes = record.adminNotes ?? "";
  const notesAreAi = !currentNotes.trim() || (prevAuto?.autoNotes != null && currentNotes === prevAuto.autoNotes);
  if (notesAreAi && primary.adminNotes) updates.adminNotes = notes;

  const ratingIsAi = record.adminRating == null || (prevAuto?.autoRating != null && record.adminRating === prevAuto.autoRating);
  if (ratingIsAi) updates.adminRating = rating;

  const stored: StoredAiAnalysis = {
    ...primary,
    adminRating: rating,
    auto: true,
    providers,
    autoNotes: notesAreAi && primary.adminNotes ? notes : prevAuto?.autoNotes ?? null,
    autoRating: ratingIsAi ? rating : prevAuto?.autoRating ?? null,
  };
  updates.aiAnalysis = JSON.stringify(stored);
  updates.aiAnalysisDate = primary.completedAt ?? new Date().toISOString();

  await db.update(prescreenings).set(updates).where(eq(prescreenings.id, prescreeningId)).run();
}
