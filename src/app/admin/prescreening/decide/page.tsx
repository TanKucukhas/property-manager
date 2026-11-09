"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react"
import {
  formatCurrency, formatDate, getName, getPetWarning, listingName, looksYearly, statusColors, statusLabels, totalScore,
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

const UNDECIDED = ["new", "review", "with-concerns", "in-progress"]
const PROVIDER_LABEL: Record<string, string> = { claude: "Claude", openai: "OpenAI" }

const DECISIONS = [
  { status: "pre-approved", label: "Pre-Approve", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { status: "with-concerns", label: "With Concerns", className: "bg-amber-500 hover:bg-amber-600 text-white" },
  { status: "review", label: "Reviewed (hold)", className: "bg-slate-600 hover:bg-slate-700 text-white" },
] as const

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

export default function DecidePage() {
  const [records, setRecords] = useState<Rec[]>([])
  const [properties, setProperties] = useState<Map<number, Property>>(new Map())
  const [jobs, setJobs] = useState<AiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<"current" | "all">("current")
  const [onlyUndecided, setOnlyUndecided] = useState(true)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [saving, setSaving] = useState(false)
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
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // While any job is pending, poll so auto-applied AI ratings show up.
  const pending = jobs.some((j) => j.status === "queued" || j.status === "running")
  useEffect(() => {
    if (!pending) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [pending, load])

  const queue = useMemo(() => {
    return records
      .filter((r) => scope === "all" || !r.listing || !r.listing.closedAt)
      .filter((r) => !onlyUndecided || UNDECIDED.includes(r.status))
      .sort((a, b) => totalScore(b) - totalScore(a) || str(b.createdAt).localeCompare(str(a.createdAt)))
  }, [records, scope, onlyUndecided])

  const current = queue.find((r) => r.id === currentId) ?? queue[0] ?? null
  const index = current ? queue.indexOf(current) : -1

  // Reset the editor whenever the applicant on screen changes.
  const currentKey = current ? `${current.id}:${current.adminRating}:${current.adminNotes}:${current.aiAnalysisDate}` : ""
  useEffect(() => {
    if (!current) return
    const ai = parseStoredAiAnalysis(current.aiAnalysis)
    setRating(current.adminRating ?? ai?.adminRating ?? 0)
    setNotes(current.adminNotes ?? "")
    setRejectReason(current.rejectReason || ai?.rejectReason || "")
    setShowReject(false)
    setFeedback("")
    setMessage("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  const latestJobs = useMemo(() => {
    const m = new Map<string, AiJob>()
    for (const j of jobs) {
      if (!current || j.prescreeningId !== current.id) continue
      const prev = m.get(j.provider)
      if (!prev || j.id > prev.id) m.set(j.provider, j)
    }
    return [...m.values()]
  }, [jobs, current])

  const prior = useMemo(() => {
    if (!current) return []
    const keys = new Set(contactKeys(current))
    return records.filter((o) => o.id !== current.id && (o.listingId ?? null) !== (current.listingId ?? null) && contactKeys(o).some((k) => keys.has(k)))
  }, [records, current])

  function go(delta: number) {
    if (queue.length === 0) return
    const next = queue[(index + delta + queue.length) % queue.length]
    setCurrentId(next.id)
  }

  async function decide(status: string | null) {
    if (!current) return
    if (status === "rejected" && !rejectReason.trim()) {
      setShowReject(true)
      setMessage("Enter a reject reason first.")
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { adminRating: rating, adminNotes: notes }
      if (status) body.status = status
      if (status === "rejected") body.rejectReason = rejectReason.trim()
      const res = await fetch(`/api/prescreening/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed")
      // Advance to the next applicant in the queue (the decided one may drop out of it).
      const next = queue[index + 1] ?? queue[index - 1] ?? null
      setRecords((prev) => prev.map((r) => r.id === current.id ? { ...r, ...body, status: status ?? r.status } as Rec : r))
      if (status) setCurrentId(next?.id ?? null)
      setMessage(status ? `${getName(current)} → ${statusLabels[status] ?? status}` : "Saved")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function queueAi(providers: string[]) {
    if (!current) return
    const res = await fetch("/api/ai-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prescreeningIds: [current.id], providers, ...(feedback.trim() ? { instructions: feedback.trim() } : {}) }),
    })
    const data = await res.json().catch(() => ({}))
    setMessage(res.ok ? `AI queued (${data.queued ?? 0})${data.skipped ? `, ${data.skipped} already pending` : ""}` : data.error || "Queue failed")
    setFeedback("")
    load()
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Decide</h1>
          <p className="text-sm text-muted-foreground">AI fills in rating and notes. Status and rejection are always your call.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button size="sm" variant={scope === "current" ? "default" : "outline"} onClick={() => setScope("current")}>Open listings</Button>
          <Button size="sm" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>All</Button>
          <label className="ml-2 flex items-center gap-1.5">
            <input type="checkbox" checked={onlyUndecided} onChange={(e) => setOnlyUndecided(e.target.checked)} />
            Undecided only
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Queue */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-sm font-medium">{queue.length} applicants · by total score</div>
          <div className="max-h-[75vh] overflow-y-auto">
            {queue.map((r) => {
              const ai = parseStoredAiAnalysis(r.aiAnalysis)
              return (
                <button
                  key={r.id}
                  onClick={() => setCurrentId(r.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted ${current?.id === r.id ? "bg-muted" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{getName(r)}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={`rounded px-1 ${statusColors[r.status]?.className ?? ""}`}>{statusLabels[r.status] ?? r.status}</span>
                      {ai ? <Sparkles className="size-3 text-violet-600" /> : null}
                    </div>
                  </div>
                  <div className="text-right font-semibold tabular-nums">{totalScore(r)}</div>
                </button>
              )
            })}
            {queue.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nothing left to decide 🎉</div>}
          </div>
        </div>

        {/* Detail */}
        {current ? (
          <Detail
            key={current.id}
            r={current}
            property={current.propertyId ? properties.get(current.propertyId) : undefined}
            position={`${index + 1} / ${queue.length}`}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            prior={prior}
            jobs={latestJobs}
          >
            {/* Decision panel */}
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <Label>Your rating: <span className="font-bold">{rating}/10</span> <span className="text-muted-foreground">(+{rating * 2} → total {(current.score ?? 0) + rating * 2})</span></Label>
              </div>
              <input type="range" min={0} max={10} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full" />
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {showReject && (
                <div>
                  <Label htmlFor="reject">Reject reason (sent with rejection)</Label>
                  <Input id="reject" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {DECISIONS.map((d) => (
                  <Button key={d.status} disabled={saving} className={d.className} onClick={() => decide(d.status)}>
                    {d.status === "pre-approved" ? <ThumbsUp className="size-4" /> : null}{d.label}
                  </Button>
                ))}
                {showReject ? (
                  <Button disabled={saving} variant="destructive" onClick={() => decide("rejected")}><ThumbsDown className="size-4" />Confirm reject</Button>
                ) : (
                  <Button disabled={saving} variant="outline" className="border-red-300 text-red-700" onClick={() => setShowReject(true)}><ThumbsDown className="size-4" />Reject…</Button>
                )}
                <Button disabled={saving} variant="ghost" onClick={() => decide(null)}>Save only</Button>
              </div>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}

              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="fb">Re-analyze with AI (optional feedback)</Label>
                <Textarea id="fb" rows={2} placeholder="e.g. Income was corrected to monthly; voucher covers most of the rent." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => queueAi(["claude"])}><Sparkles className="size-3" />Claude</Button>
                  <Button size="sm" variant="outline" onClick={() => queueAi(["openai"])}><Sparkles className="size-3" />OpenAI</Button>
                  <Button size="sm" variant="outline" onClick={() => queueAi(["claude", "openai"])}><Sparkles className="size-3" />Both</Button>
                </div>
              </div>
            </div>
          </Detail>
        ) : (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">No applicant selected.</div>
        )}
      </div>
    </div>
  )
}

function Detail({ r, property, position, onPrev, onNext, prior, jobs, children }: {
  r: Rec
  property?: Property
  position: string
  onPrev: () => void
  onNext: () => void
  prior: Rec[]
  jobs: AiJob[]
  children: React.ReactNode
}) {
  const ai = parseStoredAiAnalysis(r.aiAnalysis)
  const providers: [string, ProviderAnalysis | PrescreeningAIAnalysis][] =
    ai && "providers" in ai && ai.providers ? Object.entries(ai.providers) : ai ? [["ai", ai]] : []
  const threshold = property ? property.monthlyRent * property.incomeMultiplier : null
  const income = r.monthlyIncome ?? null
  const petWarning = getPetWarning(r.petsJson)

  const flags: { label: string; bad: boolean }[] = [
    { label: "Prior eviction", bad: yes(r.priorEviction) },
    { label: "Broken lease", bad: yes(r.brokenLease) },
    { label: "Asked to move out", bad: yes(r.askedToMoveOut) },
    { label: "Owes landlord", bad: yes(r.landlordDebt) },
    { label: "Property damage", bad: yes(r.propertyDamageHistory) },
    { label: "Late payments", bad: yes(r.latePayments) },
    { label: "Smoker", bad: yes(r.smoking) },
    { label: "Sublease intent", bad: yes(r.intentToSublease) },
    { label: "Airbnb intent", bad: yes(r.intentToAirbnb) },
    { label: "Can't pay move-in", bad: !yes(r.canPayMoveIn) },
    { label: "No proof of income", bad: !yes(r.canProvideProofOfIncome) },
  ].filter((f) => f.bad)

  const activeJobs = jobs.filter((j) => j.status === "queued" || j.status === "running" || j.status === "error")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{getName(r)}</h2>
            <Badge variant={statusColors[r.status]?.variant ?? "outline"} className={statusColors[r.status]?.className}>{statusLabels[r.status] ?? r.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {r.propertyName ?? "No property"}{r.listing ? ` · ${listingName(r.listing)}` : ""} · applied {formatDate(r.createdAt)}
          </p>
          <p className="text-sm text-muted-foreground">{str(r.email)} · {str(r.phone)}</p>
        </div>
        <div className="flex items-center gap-4">
          <Score label="Total" value={totalScore(r)} max={100} big />
          <Score label="System" value={r.score ?? 0} max={80} />
          <Score label="Rating" value={r.adminRating ?? 0} max={10} />
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={onPrev}><ChevronLeft className="size-4" /></Button>
            <span className="w-14 text-center text-xs text-muted-foreground">{position}</span>
            <Button size="icon" variant="outline" onClick={onNext}><ChevronRight className="size-4" /></Button>
          </div>
          <Link href={`/admin/prescreening?open=${r.id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Full application <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {activeJobs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeJobs.map((j) => (
            <Badge key={j.id} variant={j.status === "error" ? "destructive" : "secondary"} className={j.status === "running" ? "animate-pulse" : ""} title={j.error ?? ""}>
              <Sparkles className="mr-1 size-3" />{PROVIDER_LABEL[j.provider] ?? j.provider} {j.status}
            </Badge>
          ))}
        </div>
      )}

      {prior.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Applied before: {prior.map((p) => `${formatDate(p.createdAt)} (${statusLabels[p.status] ?? p.status}${p.rejectReason ? `: ${p.rejectReason}` : ""})`).join(" · ")}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Key facts */}
        <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
          <h3 className="font-semibold">Key facts</h3>
          <Fact label="Monthly income">
            {formatCurrency(income ?? undefined)}
            {threshold != null && income != null && (
              <span className={income >= threshold ? "ml-2 text-emerald-700" : "ml-2 text-red-700"}>
                {income >= threshold ? "✓" : "✗"} needs {formatCurrency(threshold)} ({property?.incomeMultiplier}× {formatCurrency(property?.monthlyRent)})
              </span>
            )}
            {looksYearly(income) && <Badge variant="destructive" className="ml-2">yearly?</Badge>}
          </Fact>
          <Fact label="Credit">{str(r.creditScoreRange) || "-"}{property?.minCreditScore ? <span className="ml-2 text-muted-foreground">(min {property.minCreditScore})</span> : null}</Fact>
          <Fact label="Employment">{[str(r.employmentStatus), str(r.employerName), str(r.jobTitle), str(r.employmentLength)].filter(Boolean).join(" · ") || "-"}</Fact>
          <Fact label="Move-in">{str(r.desiredMoveIn) || "-"}</Fact>
          <Fact label="Occupants">{`${str(r.adultsCount) || "?"} adults${r.childrenCount ? `, ${str(r.childrenCount)} children` : ""}`}{r.occupantNames ? ` — ${str(r.occupantNames)}` : ""}</Fact>
          <Fact label="Housing">{[str(r.housingStatus), r.currentHousingPayment ? `pays ${formatCurrency(Number(r.currentHousingPayment))}` : "", str(r.currentAddressDuration)].filter(Boolean).join(" · ") || "-"}</Fact>
          <Fact label="Pets">{yes(r.hasPets) ? "Yes" : "No"}{petWarning && <span className="ml-2 text-red-700">⚠ {petWarning}</span>}</Fact>
          {str(r.usingVoucher) && str(r.usingVoucher) !== "no" && (
            <Fact label="Voucher">
              {[str(r.voucherAgency), str(r.voucherBedroomSize), r.voucherApprovedRent ? `approved ${formatCurrency(Number(r.voucherApprovedRent))}` : "", r.voucherTenantPortion != null ? `tenant pays ${formatCurrency(Number(r.voucherTenantPortion))}` : "", str(r.voucherExpiration) ? `exp ${str(r.voucherExpiration)}` : ""].filter(Boolean).join(" · ") || str(r.usingVoucher)}
            </Fact>
          )}
          {flags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {flags.map((f) => <Badge key={f.label} variant="destructive" className="gap-1"><AlertTriangle className="size-3" />{f.label}</Badge>)}
            </div>
          ) : (
            <p className="text-emerald-700">No rental-history or policy flags.</p>
          )}
          {[r.latePaymentsExplanation, r.evictionExplanation, r.rentalHistoryExplanation, r.creditIssuesDisclosure, r.backgroundDisclosure, r.moveReason, r.additionalNotes]
            .map(str).filter(Boolean).map((t, i) => (
              <p key={i} className="rounded bg-muted p-2 text-xs italic">“{t}”</p>
            ))}
        </div>

        {children}
      </div>

      {/* AI analysis */}
      {providers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No AI analysis yet — queue one from the decision panel.</div>
      ) : (
        <div className={`grid gap-4 ${providers.length > 1 ? "xl:grid-cols-2" : ""}`}>
          {providers.map(([key, a]) => <AiCard key={key} name={PROVIDER_LABEL[key] ?? "AI"} a={a} />)}
        </div>
      )}
    </div>
  )
}

function AiCard({ name, a }: { name: string; a: PrescreeningAIAnalysis & { model?: string | null; completedAt?: string | null } }) {
  return (
    <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-4 text-sm dark:bg-violet-950/20">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-semibold"><Sparkles className="size-4 text-violet-600" />{name}{a.model ? <span className="text-xs font-normal text-muted-foreground">{a.model}</span> : null}</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{a.adminRating}/10</span>
          <Badge variant="outline" title="AI suggestion only — not applied">suggests: {statusLabels[a.recommendedStatus] ?? a.recommendedStatus}</Badge>
        </div>
      </div>
      {a.summary && <p>{a.summary}</p>}
      {a.recommendedStatus === "rejected" && a.rejectReason && <p className="text-red-700">Suggested reject reason: {a.rejectReason}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <FlagList title="Red flags" items={a.redFlags} className="text-red-700" />
        <FlagList title="Green flags" items={a.greenFlags} className="text-emerald-700" />
      </div>
      {a.incomeAnalysis?.comment && <p><span className="font-medium">Income:</span> {a.incomeAnalysis.comment}</p>}
      {a.creditAnalysis?.comment && <p><span className="font-medium">Credit:</span> {a.creditAnalysis.comment}</p>}
      {a.voucherAnalysis && <p><span className="font-medium">Voucher:</span> {a.voucherAnalysis}</p>}
      {a.adminNotes && <p className="text-muted-foreground"><span className="font-medium">Notes:</span> {a.adminNotes}</p>}
      {a.completedAt && <p className="text-xs text-muted-foreground">Analyzed {formatDate(a.completedAt)}</p>}
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

function Score({ label, value, max, big }: { label: string; value: number; max: number; big?: boolean }) {
  return (
    <div className="text-center">
      <div className={big ? "text-3xl font-bold tabular-nums" : "text-lg font-semibold tabular-nums"}>{value}<span className="text-xs text-muted-foreground">/{max}</span></div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
