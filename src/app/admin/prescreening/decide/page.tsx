"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, CircleDashed, ExternalLink, Loader2, RotateCcw, Sparkles, ThumbsDown, ThumbsUp, X,
} from "lucide-react"
import {
  formatCurrency, formatDate, getName, getPetWarning, listingName, looksYearly, statusLabels,
} from "@/lib/prescreening-ui"
import { parseStoredAiAnalysis, type ProviderAnalysis } from "@/lib/ai-analysis"
import type { PrescreeningAIAnalysis } from "@/lib/ai-prescreening-prompt"

type Rec = {
  id: number
  fullName?: string
  firstName?: string
  lastName?: string
  status: string
  score?: number | null
  adminRating?: number | null
  adminNotes?: string | null
  rejectReason?: string | null
  monthlyIncome?: number | null
  propertyId?: number | null
  listingId?: number | null
  listing?: { id: number; label: string | null; openedAt: string; closedAt: string | null } | null
  propertyName?: string | null
  aiAnalysis?: string | null
  aiAnalysisDate?: string | null
  createdAt?: string
  email?: string
  phone?: string
  [key: string]: unknown
}

type Property = { id: number; monthlyRent: number; incomeMultiplier: number; minCreditScore: number | null }
type AiJob = { id: number; prescreeningId: number; provider: string; status: string; error: string | null; completedAt: string | null }
type Runner = { online: boolean; lastSeenAt: string | null }
type AiView = PrescreeningAIAnalysis & { providers?: Record<string, ProviderAnalysis> }

/** The three-step flow: AI analyzes → manager reviews & rates → manager decides. */
type Stage = "ai" | "review" | "decide" | "done"

const REVIEWED = ["review", "with-concerns", "in-progress"]
const PROVIDER_LABEL: Record<string, string> = { claude: "Claude", openai: "OpenAI" }

const STAGES: { key: Stage; step: string; label: string; hint: string }[] = [
  { key: "ai", step: "1", label: "AI analyzing", hint: "Waiting for the AI runner" },
  { key: "review", step: "2", label: "Needs your review", hint: "Check AI findings, set your rating" },
  { key: "decide", step: "3", label: "Ready to decide", hint: "Approve for showing or reject" },
  { key: "done", step: "✓", label: "Decided", hint: "Approved, rejected or further along" },
]

function yes(v: unknown) {
  return v === true || v === 1 || v === "1" || v === "yes" || v === "true"
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function contactKeys(r: Rec): string[] {
  const keys: string[] = []
  const e = typeof r.email === "string" ? r.email.trim().toLowerCase() : ""
  if (e) keys.push(e)
  const d = typeof r.phone === "string" ? r.phone.replace(/\D/g, "") : ""
  if (d.length >= 10) keys.push(d.slice(-10))
  return keys
}

function creditLow(range: string): number {
  const m = range.match(/\d{3}/)
  return m ? parseInt(m[0]) : -1
}

/** Hard facts that usually decide an application on their own. */
function dealBreakers(r: Rec, property?: Property): string[] {
  const out: string[] = []
  const threshold = property ? property.monthlyRent * property.incomeMultiplier : null
  if (threshold != null && r.monthlyIncome != null && r.monthlyIncome < threshold) {
    out.push(`Income ${formatCurrency(r.monthlyIncome)} below ${formatCurrency(threshold)} requirement`)
  }
  const low = creditLow(str(r.creditScoreRange))
  if (property?.minCreditScore && low >= 0 && low < property.minCreditScore) out.push(`Credit ${str(r.creditScoreRange)} below minimum ${property.minCreditScore}`)
  if (yes(r.priorEviction)) out.push("Prior eviction")
  if (yes(r.landlordDebt)) out.push("Owes a previous landlord")
  if (!yes(r.canPayMoveIn)) out.push("Cannot pay move-in costs")
  if (yes(r.intentToSublease)) out.push("Intends to sublease")
  if (yes(r.intentToAirbnb)) out.push("Intends to Airbnb")
  const pet = getPetWarning(r.petsJson)
  if (pet) out.push(pet)
  return out
}

function cautions(r: Rec): string[] {
  const out: string[] = []
  if (yes(r.brokenLease)) out.push("Broken lease")
  if (yes(r.askedToMoveOut)) out.push("Asked to move out")
  if (yes(r.propertyDamageHistory)) out.push("Property damage")
  if (yes(r.latePayments)) out.push("Late payments")
  if (yes(r.smoking)) out.push("Smoker")
  if (!yes(r.canProvideProofOfIncome)) out.push("No proof of income")
  if (looksYearly(r.monthlyIncome)) out.push("Income looks yearly")
  return out
}

export default function DecidePage() {
  const [records, setRecords] = useState<Rec[]>([])
  const [properties, setProperties] = useState<Map<number, Property>>(new Map())
  const [jobs, setJobs] = useState<AiJob[]>([])
  const [runner, setRunner] = useState<Runner | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<"current" | "all">("current")
  const [stage, setStage] = useState<Stage>("review")
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    const [r, p, j] = await Promise.all([fetch("/api/prescreening"), fetch("/api/properties"), fetch("/api/ai-jobs")])
    if (r.ok) {
      const data = await r.json()
      setRecords(Array.isArray(data) ? data : data.data || [])
    }
    if (p.ok) {
      const data = await p.json()
      const list: Property[] = Array.isArray(data) ? data : data.data || []
      setProperties(new Map(list.map((x) => [x.id, x])))
    }
    if (j.ok) {
      const data = await j.json()
      setJobs(Array.isArray(data.jobs) ? data.jobs : [])
      setRunner(data.runner ?? null)
    }
    setLoading(false)
  }, [])

  // Initial fetch; load() only sets state after its awaits resolve.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const pendingIds = useMemo(
    () => new Set(jobs.filter((j) => j.status === "queued" || j.status === "running").map((j) => j.prescreeningId)),
    [jobs],
  )
  useEffect(() => {
    if (pendingIds.size === 0) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [pendingIds.size, load])

  const stageOf = useCallback((r: Rec): Stage => {
    if (REVIEWED.includes(r.status)) return "decide"
    if (r.status !== "new") return "done"
    if (!r.aiAnalysis && pendingIds.has(r.id)) return "ai"
    return "review"
  }, [pendingIds])

  const inScope = useMemo(
    () => records.filter((r) => scope === "all" || !r.listing || !r.listing.closedAt),
    [records, scope],
  )

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { ai: 0, review: 0, decide: 0, done: 0 }
    for (const r of inScope) c[stageOf(r)]++
    return c
  }, [inScope, stageOf])

  const queue = useMemo(() => {
    const aiRating = (r: Rec) => parseStoredAiAnalysis(r.aiAnalysis)?.adminRating ?? -1
    const finalScore = (r: Rec) => (r.score ?? 0) + (r.adminRating ?? 0) * 2
    return inScope
      .filter((r) => stageOf(r) === stage)
      .sort((a, b) => {
        if (stage === "decide" || stage === "done") return finalScore(b) - finalScore(a)
        if (stage === "review") return aiRating(b) - aiRating(a) || (b.score ?? 0) - (a.score ?? 0)
        return str(a.createdAt).localeCompare(str(b.createdAt))
      })
  }, [inScope, stage, stageOf])

  const current = queue.find((r) => r.id === currentId) ?? queue[0] ?? null
  const index = current ? queue.indexOf(current) : -1

  function go(delta: number) {
    if (queue.length === 0) return
    setCurrentId(queue[(index + delta + queue.length) % queue.length].id)
  }

  async function patch(r: Rec, body: Record<string, unknown>, done: string) {
    const res = await fetch(`/api/prescreening/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed")
    // The applicant leaves this stage's queue; keep the manager moving.
    const next = queue[index + 1] ?? queue[index - 1] ?? null
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, ...body } as Rec : x))
    if (body.status) setCurrentId(next && next.id !== r.id ? next.id : null)
    setMessage(done)
  }

  async function queueAi(r: Rec, providers: string[], instructions: string) {
    const res = await fetch("/api/ai-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prescreeningIds: [r.id], providers, ...(instructions.trim() ? { instructions: instructions.trim() } : {}) }),
    })
    const data = await res.json().catch(() => ({}))
    setMessage(res.ok ? `AI re-analysis queued for ${getName(r)}` : data.error || "Queue failed")
    load()
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Review & Decide</h1>
          <p className="text-sm text-muted-foreground">AI analyzes every new application → you review and set the final rating → you approve for showing or reject.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={scope === "current" ? "default" : "outline"} onClick={() => setScope("current")}>Open listings</Button>
          <Button size="sm" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>All listings</Button>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => { setStage(s.key); setCurrentId(null); setMessage("") }}
            className={`rounded-lg border p-3 text-left transition ${stage === s.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted"}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs">{s.step}</span>
                {s.label}
              </span>
              <span className="text-xl font-bold tabular-nums">{counts[s.key]}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
          </button>
        ))}
      </div>

      {runner && !runner.online && (counts.ai > 0 || pendingIds.size > 0) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="size-4" />
          AI runner is offline{runner.lastSeenAt ? ` (last seen ${formatDate(runner.lastSeenAt)})` : ""} — analyses will start when the Mac is back. You can still review manually.
        </div>
      )}
      {message && <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            {stage === "review" ? "Sorted by AI rating" : stage === "ai" ? "Oldest first" : "Sorted by final score"}
          </div>
          <div className="max-h-[75vh] overflow-y-auto">
            {queue.map((r) => {
              const ai = parseStoredAiAnalysis(r.aiAnalysis)
              const blockers = dealBreakers(r, r.propertyId ? properties.get(r.propertyId) : undefined).length
              return (
                <button
                  key={r.id}
                  onClick={() => { setCurrentId(r.id); setMessage("") }}
                  className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted ${current?.id === r.id ? "bg-muted" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{getName(r)}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Sys {r.score ?? 0}</span>
                      {ai ? <span className="text-violet-700">AI {ai.adminRating}</span> : pendingIds.has(r.id) ? <Loader2 className="size-3 animate-spin" /> : null}
                      {stage !== "review" && r.adminRating != null && <span>You {r.adminRating}</span>}
                      {stage === "done" && <span>{statusLabels[r.status] ?? r.status}</span>}
                    </div>
                  </div>
                  {blockers > 0 && <span className="flex items-center gap-0.5 text-xs text-red-600"><AlertTriangle className="size-3" />{blockers}</span>}
                </button>
              )
            })}
            {queue.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nothing here.</div>}
          </div>
        </div>

        {current ? (
          <Applicant
            key={current.id}
            r={current}
            stage={stageOf(current)}
            property={current.propertyId ? properties.get(current.propertyId) : undefined}
            jobs={jobs.filter((j) => j.prescreeningId === current.id)}
            prior={records.filter((o) => {
              const keys = new Set(contactKeys(current))
              return o.id !== current.id && (o.listingId ?? null) !== (current.listingId ?? null) && contactKeys(o).some((k) => keys.has(k))
            })}
            position={`${index + 1} / ${queue.length}`}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onPatch={patch}
            onQueueAi={queueAi}
          />
        ) : (
          <div className="rounded-lg border p-10 text-center text-muted-foreground">
            {stage === "review" ? "All caught up — nothing to review." : stage === "decide" ? "No reviewed applicants waiting for a decision." : "Nothing here."}
          </div>
        )}
      </div>
    </div>
  )
}

function Applicant({ r, stage, property, jobs, prior, position, onPrev, onNext, onPatch, onQueueAi }: {
  r: Rec
  stage: Stage
  property?: Property
  jobs: AiJob[]
  prior: Rec[]
  position: string
  onPrev: () => void
  onNext: () => void
  onPatch: (r: Rec, body: Record<string, unknown>, done: string) => Promise<void>
  onQueueAi: (r: Rec, providers: string[], instructions: string) => Promise<void>
}) {
  const ai = parseStoredAiAnalysis(r.aiAnalysis) as AiView | null
  const providerList: [string, PrescreeningAIAnalysis & { model?: string | null; completedAt?: string | null }][] =
    ai?.providers
      ? Object.entries(ai.providers).sort(([a], [b]) => (a === "claude" ? -1 : b === "claude" ? 1 : a.localeCompare(b)))
      : ai ? [["ai", ai]] : []
  const ratings = providerList.map(([, a]) => a.adminRating)
  const disagree = ratings.length > 1 && Math.max(...ratings) - Math.min(...ratings) >= 3
  const blockers = dealBreakers(r, property)
  const warn = cautions(r)
  const threshold = property ? property.monthlyRent * property.incomeMultiplier : null

  const [rating, setRating] = useState<number>(r.adminRating ?? ai?.adminRating ?? 5)
  const ratingFromAi = r.adminRating == null && ai != null
  const [notes, setNotes] = useState(r.adminNotes ?? "")
  const [concerns, setConcerns] = useState(r.status === "with-concerns")
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState(r.rejectReason || ai?.rejectReason || blockers[0] || "")
  const [feedback, setFeedback] = useState("")
  const [showRerun, setShowRerun] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const finalScore = (r.score ?? 0) + rating * 2
  const activeJobs = jobs.filter((j) => j.status === "queued" || j.status === "running")
  const latestError = !ai && jobs.find((j) => j.status === "error")

  async function run(body: Record<string, unknown>, done: string) {
    setSaving(true)
    setError("")
    try {
      await onPatch(r, body, done)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function reject() {
    if (!rejectReason.trim()) { setError("A reject reason is required."); return }
    run({ status: "rejected", rejectReason: rejectReason.trim(), adminRating: rating, adminNotes: notes }, `${getName(r)} rejected.`)
  }

  const steps = [
    { label: "AI analysis", state: ai ? "done" : activeJobs.length ? "active" : "todo" },
    { label: "Your review", state: stage === "decide" || stage === "done" ? "done" : stage === "review" ? "active" : "todo" },
    { label: "Decision", state: stage === "done" ? "done" : stage === "decide" ? "active" : "todo" },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{getName(r)}</h2>
            <p className="text-sm text-muted-foreground">
              {r.propertyName ?? "No property"}{r.listing ? ` · ${listingName(r.listing)}` : ""} · applied {formatDate(r.createdAt)}
            </p>
            <p className="text-sm text-muted-foreground">{str(r.email)} · {str(r.phone)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous"><ChevronLeft className="size-4" /></Button>
            <span className="w-12 text-center text-xs text-muted-foreground">{position}</span>
            <Button size="icon" variant="outline" onClick={onNext} aria-label="Next"><ChevronRight className="size-4" /></Button>
            <Link href={`/admin/prescreening?open=${r.id}`} className="ml-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
              Full application <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {steps.map((s, i) => (
            <span key={s.label} className="flex items-center gap-2">
              <span className={`flex items-center gap-1 rounded-full px-2 py-1 ${s.state === "done" ? "bg-emerald-100 text-emerald-800" : s.state === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s.state === "done" ? <Check className="size-3" /> : s.state === "active" ? <CircleDashed className="size-3" /> : null}
                {i + 1}. {s.label}
              </span>
              {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
            </span>
          ))}
          {stage === "done" && <Badge className="ml-2">{statusLabels[r.status] ?? r.status}{r.rejectReason ? ` — ${r.rejectReason}` : ""}</Badge>}
        </div>
      </div>

      {prior.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Applied before:</b> {prior.map((p) => `${formatDate(p.createdAt)} (${statusLabels[p.status] ?? p.status}${p.rejectReason ? `: ${p.rejectReason}` : ""})`).join(" · ")}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* LEFT: what matters, most important first */}
        <div className="space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <Tile label="System score" value={`${r.score ?? 0}`} max="/80" sub="from the application answers" />
            <Tile
              label="AI rating"
              value={ai ? `${ai.adminRating}` : activeJobs.length ? "…" : "—"}
              max="/10"
              sub={ai ? `${providerList.map(([k, a]) => `${PROVIDER_LABEL[k] ?? "AI"} ${a.adminRating}`).join(" · ")}${disagree ? " — disagree" : ""}` : activeJobs.length ? "analyzing…" : latestError ? "AI failed" : "not analyzed"}
              tone={disagree ? "warn" : "ai"}
            />
            <Tile label="Final score" value={`${finalScore}`} max="/100" sub={`system + your rating ${rating}×2`} tone="strong" />
          </div>

          {/* Deal-breakers & cautions */}
          {(blockers.length > 0 || warn.length > 0) ? (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/60 p-4 text-sm dark:bg-red-950/20">
              {blockers.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold text-red-800">Deal-breakers</div>
                  <ul className="space-y-0.5">{blockers.map((b) => <li key={b} className="flex items-center gap-1.5 text-red-800"><X className="size-4" />{b}</li>)}</ul>
                </div>
              )}
              {warn.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {warn.map((w) => <Badge key={w} variant="outline" className="gap-1 border-amber-400 text-amber-800"><AlertTriangle className="size-3" />{w}</Badge>)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <Check className="size-4" /> No deal-breakers or rental-history flags.
            </div>
          )}

          {/* AI verdict */}
          {ai ? (
            <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-4 text-sm dark:bg-violet-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 font-semibold"><Sparkles className="size-4 text-violet-600" />AI findings</h3>
                <div className="flex flex-wrap gap-1.5">
                  {providerList.map(([k, a]) => (
                    <Badge key={k} variant="outline" title="AI suggestion only — nothing is applied">
                      {PROVIDER_LABEL[k] ?? "AI"} suggests: {statusLabels[a.recommendedStatus] ?? a.recommendedStatus}
                    </Badge>
                  ))}
                </div>
              </div>
              {ai.summary && <p className="text-base">{ai.summary}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                <FlagList title="Red flags" items={mergeFlags(providerList.map(([, a]) => a.redFlags))} className="text-red-700" />
                <FlagList title="Green flags" items={mergeFlags(providerList.map(([, a]) => a.greenFlags))} className="text-emerald-700" />
              </div>
              {providerList.length > 1 && (
                <details className="rounded border bg-background/60 p-2">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Compare Claude vs OpenAI</summary>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {providerList.map(([k, a]) => <ProviderDetail key={k} name={PROVIDER_LABEL[k] ?? "AI"} a={a} />)}
                  </div>
                </details>
              )}
              {providerList.length === 1 && <ProviderDetail name={PROVIDER_LABEL[providerList[0][0]] ?? "AI"} a={providerList[0][1]} compact />}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {activeJobs.length ? <><Loader2 className="size-4 animate-spin" /> AI is analyzing this application…</> : latestError ? <><AlertTriangle className="size-4 text-red-600" /> AI analysis failed: {latestError.error}</> : "No AI analysis yet."}
            </div>
          )}

          {/* Facts */}
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="mb-2 font-semibold">Application facts</h3>
            <div className="space-y-1.5">
              <Fact label="Monthly income">
                {formatCurrency(r.monthlyIncome ?? undefined)}
                {threshold != null && r.monthlyIncome != null && (
                  <span className={r.monthlyIncome >= threshold ? "ml-2 text-emerald-700" : "ml-2 text-red-700"}>
                    {r.monthlyIncome >= threshold ? "✓" : "✗"} needs {formatCurrency(threshold)} ({property?.incomeMultiplier}× rent {formatCurrency(property?.monthlyRent)})
                  </span>
                )}
              </Fact>
              <Fact label="Credit">{str(r.creditScoreRange) || "-"}{property?.minCreditScore ? <span className="ml-2 text-muted-foreground">(min {property.minCreditScore})</span> : null}</Fact>
              <Fact label="Employment">{[str(r.employmentStatus), str(r.employerName), str(r.jobTitle), str(r.employmentLength)].filter(Boolean).join(" · ") || "-"}</Fact>
              <Fact label="Move-in">{str(r.desiredMoveIn) || "-"}</Fact>
              <Fact label="Occupants">{`${str(r.adultsCount) || "?"} adults${r.childrenCount ? `, ${str(r.childrenCount)} children` : ""}`}{r.occupantNames ? ` — ${str(r.occupantNames)}` : ""}</Fact>
              <Fact label="Housing">{[str(r.housingStatus), r.currentHousingPayment ? `pays ${formatCurrency(Number(r.currentHousingPayment))}` : "", str(r.currentAddressDuration)].filter(Boolean).join(" · ") || "-"}</Fact>
              <Fact label="Pets">{yes(r.hasPets) ? "Yes" : "No"}</Fact>
              {str(r.usingVoucher) && str(r.usingVoucher) !== "no" && (
                <Fact label="Voucher">
                  {[str(r.voucherAgency), str(r.voucherBedroomSize), r.voucherApprovedRent ? `approved ${formatCurrency(Number(r.voucherApprovedRent))}` : "", r.voucherTenantPortion != null ? `tenant pays ${formatCurrency(Number(r.voucherTenantPortion))}` : "", str(r.voucherExpiration) ? `exp ${str(r.voucherExpiration)}` : ""].filter(Boolean).join(" · ") || str(r.usingVoucher)}
                </Fact>
              )}
            </div>
            {[r.latePaymentsExplanation, r.evictionExplanation, r.rentalHistoryExplanation, r.creditIssuesDisclosure, r.backgroundDisclosure, r.moveReason, r.additionalNotes]
              .map(str).filter(Boolean).map((t, i) => (
                <p key={i} className="mt-2 rounded bg-muted p-2 text-xs italic">“{t}”</p>
              ))}
          </div>
        </div>

        {/* RIGHT: the action for the current step */}
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-card p-4">
            <h3 className="font-semibold">
              {stage === "review" || stage === "ai" ? "Step 2 · Your review" : stage === "decide" ? "Step 3 · Final decision" : "Decided"}
            </h3>

            {/* Rating is the manager's — prefilled from AI as a starting point. */}
            <div>
              <div className="flex items-center justify-between text-sm">
                <Label>Your rating</Label>
                <span><b className="text-lg">{rating}</b>/10 {ratingFromAi && <span className="text-xs text-violet-700">(AI suggestion)</span>}</span>
              </div>
              <input type="range" min={0} max={10} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full" />
              <div className="text-xs text-muted-foreground">Final score: {r.score ?? 0} + {rating * 2} = <b>{finalScore}</b>/100</div>
            </div>
            <div>
              <Label htmlFor="notes">Your notes</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you checked, what to ask at the showing…" />
            </div>

            {(stage === "review" || stage === "ai") && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={concerns} onChange={(e) => setConcerns(e.target.checked)} />
                  Mark as “with concerns”
                </label>
                <Button className="w-full" disabled={saving} onClick={() => run({ status: concerns ? "with-concerns" : "review", adminRating: rating, adminNotes: notes }, `${getName(r)} reviewed — now in “Ready to decide”.`)}>
                  <Check className="size-4" /> Complete review ({rating}/10)
                </Button>
              </>
            )}

            {stage === "decide" && (
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving} onClick={() => run({ status: "pre-approved", adminRating: rating, adminNotes: notes }, `${getName(r)} approved for showing.`)}>
                  <ThumbsUp className="size-4" /> Approve for showing
                </Button>
                <Button variant="outline" className="border-red-300 text-red-700" disabled={saving} onClick={() => setRejecting(true)}>
                  <ThumbsDown className="size-4" /> Reject…
                </Button>
              </div>
            )}

            {stage === "done" && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={saving} onClick={() => run({ adminRating: rating, adminNotes: notes }, "Saved.")}>Save rating & notes</Button>
                <Button variant="outline" disabled={saving} onClick={() => run({ status: "review", adminRating: rating, adminNotes: notes }, `${getName(r)} reopened — back in “Ready to decide”.`)}>
                  <RotateCcw className="size-4" /> Reopen
                </Button>
              </div>
            )}

            {/* Clear-cut cases can be rejected straight from review. */}
            {(stage === "review" || stage === "ai") && !rejecting && (
              <button className="w-full text-center text-xs text-red-700 hover:underline" onClick={() => setRejecting(true)}>
                Clear-cut? Reject without the decision step
              </button>
            )}

            {rejecting && stage !== "done" && (
              <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3 dark:bg-red-950/20">
                <Label htmlFor="reject">Reject reason</Label>
                <Input id="reject" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1" disabled={saving} onClick={reject}><ThumbsDown className="size-4" /> Confirm reject</Button>
                  <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {stage === "decide" && (
              <button className="w-full text-center text-xs text-muted-foreground hover:underline" disabled={saving} onClick={() => run({ status: "new", adminRating: rating, adminNotes: notes }, `${getName(r)} moved back to review.`)}>
                ← Back to review
              </button>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="rounded-lg border bg-card p-4 text-sm">
            {!showRerun ? (
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setShowRerun(true)}>
                <Sparkles className="size-4" /> Re-analyze with AI…
              </button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fb">Feedback for the AI (optional)</Label>
                <Textarea id="fb" rows={2} placeholder="e.g. Income corrected to monthly; voucher covers most of the rent." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" disabled={activeJobs.length > 0} onClick={() => { onQueueAi(r, ["claude", "openai"], feedback); setFeedback(""); setShowRerun(false) }}>
                    <Sparkles className="size-3" /> Claude + OpenAI
                  </Button>
                  <Button size="sm" variant="outline" disabled={activeJobs.length > 0} onClick={() => { onQueueAi(r, ["claude"], feedback); setFeedback(""); setShowRerun(false) }}>Claude only</Button>
                </div>
                {activeJobs.length > 0 && <p className="text-xs text-muted-foreground">Analysis already running.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Union of flags across providers, dropping near-duplicates. */
function mergeFlags(lists: string[][]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) for (const f of list) {
    const key = f.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40)
    if (!seen.has(key)) { seen.add(key); out.push(f) }
  }
  return out
}

function ProviderDetail({ name, a, compact }: { name: string; a: PrescreeningAIAnalysis & { model?: string | null; completedAt?: string | null }; compact?: boolean }) {
  return (
    <div className="space-y-1.5 text-sm">
      {!compact && <div className="font-medium">{name} · {a.adminRating}/10{a.model ? <span className="ml-1 text-xs font-normal text-muted-foreground">{a.model}</span> : null}</div>}
      {!compact && a.summary && <p>{a.summary}</p>}
      {a.incomeAnalysis?.comment && <p><span className="font-medium">Income:</span> {a.incomeAnalysis.comment}</p>}
      {a.creditAnalysis?.comment && <p><span className="font-medium">Credit:</span> {a.creditAnalysis.comment}</p>}
      {a.voucherAnalysis && <p><span className="font-medium">Voucher:</span> {a.voucherAnalysis}</p>}
      {a.recommendedStatus === "rejected" && a.rejectReason && <p className="text-red-700"><span className="font-medium">Suggested reject reason:</span> {a.rejectReason}</p>}
      {a.adminNotes && <p className="text-muted-foreground"><span className="font-medium">AI notes:</span> {a.adminNotes}</p>}
      {a.completedAt && <p className="text-xs text-muted-foreground">{compact ? `${name}${a.model ? ` (${a.model})` : ""} · ` : ""}analyzed {formatDate(a.completedAt)}</p>}
    </div>
  )
}

function FlagList({ title, items, className }: { title: string; items: string[]; className: string }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      {items.length === 0 ? <p className="text-muted-foreground">—</p> : (
        <ul className={`list-disc pl-5 ${className}`}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}

function Tile({ label, value, max, sub, tone }: { label: string; value: string; max: string; sub: string; tone?: "ai" | "warn" | "strong" }) {
  const cls = tone === "ai" ? "border-violet-200 bg-violet-50/40 dark:bg-violet-950/20"
    : tone === "warn" ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
    : tone === "strong" ? "border-primary/40 bg-primary/5" : "bg-card"
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}<span className="text-sm font-normal text-muted-foreground">{max}</span></div>
      <div className="truncate text-xs text-muted-foreground" title={sub}>{sub}</div>
    </div>
  )
}
