import type { PrescreeningAIAnalysis } from "@/lib/ai-prescreening-prompt";

export function stringOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try { return JSON.stringify(v) } catch { return "" }
}

export function coerceToStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>
    if (typeof obj.comment === "string" && obj.comment) return obj.comment
    try { return JSON.stringify(v) } catch { return null }
  }
  return String(v)
}

export function normalizeAnalysisBlock<T extends Record<string, unknown>>(v: unknown, defaults: T): T & { comment: string } {
  if (!v || typeof v !== "object") return { ...defaults, comment: "" } as T & { comment: string }
  const obj = v as Record<string, unknown>
  const out: Record<string, unknown> = { ...defaults, ...obj }
  out.comment = stringOrEmpty(obj.comment)
  return out as T & { comment: string }
}

const RECOMMENDED_STATUSES = ["review", "with-concerns", "in-progress", "pre-approved", "rejected"] as const;

/**
 * Turns model output (raw text, possibly with ``` fences or prose, or an
 * already-parsed object) into a well-formed PrescreeningAIAnalysis.
 * Models often return nested objects where strings are expected, so every
 * field is coerced (React error #31 otherwise).
 */
export function normalizeAiAnalysis(raw: unknown): PrescreeningAIAnalysis | null {
  let parsed: Record<string, unknown> | null = null;
  if (raw && typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first < 0 || last <= first) return null;
    try {
      const value = JSON.parse(trimmed.slice(first, last + 1));
      if (value && typeof value === "object" && !Array.isArray(value)) parsed = value;
    } catch {
      return null;
    }
  }
  if (!parsed) return null;
  const status = String(parsed.recommendedStatus || "review").trim();
  return {
    summary: stringOrEmpty(parsed.summary),
    adminRating: Math.min(Math.max(Math.round(Number(parsed.adminRating) || 0), 0), 10),
    recommendedStatus: (RECOMMENDED_STATUSES as readonly string[]).includes(status)
      ? (status as PrescreeningAIAnalysis["recommendedStatus"])
      : "review",
    rejectReason: typeof parsed.rejectReason === "string" ? parsed.rejectReason : null,
    adminNotes: stringOrEmpty(parsed.adminNotes),
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.map(stringOrEmpty).filter(Boolean) : [],
    greenFlags: Array.isArray(parsed.greenFlags) ? parsed.greenFlags.map(stringOrEmpty).filter(Boolean) : [],
    incomeAnalysis: normalizeAnalysisBlock(parsed.incomeAnalysis, { threshold: null, actual: null, meetsRequirement: null }),
    creditAnalysis: normalizeAnalysisBlock(parsed.creditAnalysis, { range: null, meetsMinimum: null }),
    voucherAnalysis: coerceToStringOrNull(parsed.voucherAnalysis),
  };
}

export type ProviderAnalysis = PrescreeningAIAnalysis & {
  model: string | null;
  completedAt: string | null;
  jobId: number;
};

/**
 * Shape stored in prescreenings.ai_analysis after an automatic run. The
 * top-level fields mirror the primary provider (Claude when present) so the
 * older single-analysis readers keep working; `adminRating` is the average.
 */
export type StoredAiAnalysis = PrescreeningAIAnalysis & {
  auto: true;
  providers: Record<string, ProviderAnalysis>;
  /** What the runner last wrote into admin_notes / admin_rating, so a later run
   * can tell AI-authored values (safe to refresh) from the manager's own edits. */
  autoNotes: string | null;
  autoRating: number | null;
};

export function parseStoredAiAnalysis(raw: unknown): StoredAiAnalysis | (PrescreeningAIAnalysis & { providers?: undefined }) | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const base = normalizeAiAnalysis(value);
    if (!base) return null;
    if (value.providers && typeof value.providers === "object") {
      const providers: Record<string, ProviderAnalysis> = {};
      for (const [key, p] of Object.entries(value.providers as Record<string, Record<string, unknown>>)) {
        const n = normalizeAiAnalysis(p);
        if (n) providers[key] = { ...n, model: typeof p.model === "string" ? p.model : null, completedAt: typeof p.completedAt === "string" ? p.completedAt : null, jobId: Number(p.jobId) || 0 };
      }
      return {
        ...base,
        adminRating: typeof value.adminRating === "number" ? value.adminRating : base.adminRating,
        auto: true,
        providers,
        autoNotes: typeof value.autoNotes === "string" ? value.autoNotes : null,
        autoRating: typeof value.autoRating === "number" ? value.autoRating : null,
      };
    }
    return base;
  } catch {
    return null;
  }
}

