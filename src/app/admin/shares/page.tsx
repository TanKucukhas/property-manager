"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { CopyIcon, CheckIcon, ExternalLinkIcon, ArchiveIcon, ArchiveRestoreIcon } from "lucide-react"

interface ShareRow {
  id: number
  shareToken: string
  shareType: string
  propertyId: number | null
  propertyName: string | null
  recipientName: string | null
  leadSource: string | null
  sourceProfile: string | null
  notes: string | null
  archivedAt: string | null
  createdAt: string
  submissionCount: number
  lastSubmissionAt: string | null
  visitorCount: number
  avgFurthestStep: number | null
  maxTotalSteps: number | null
  lastVisitAt: string | null
  latestFurthestStep: number | null
  latestTotalSteps: number | null
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatRelative(d: string | null | undefined): string {
  if (!d) return "—"
  const ms = Date.now() - new Date(d).getTime()
  if (ms < 0) return "just now"
  const m = Math.floor(ms / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const dys = Math.floor(h / 24)
  if (dys < 7) return `${dys}d ago`
  return formatDate(d)
}

function appUrl(token: string): string {
  if (typeof window === "undefined") return `/apply?ref=${token}`
  return `${window.location.origin}/apply?ref=${token}`
}

function ProgressCell({ s }: { s: ShareRow }) {
  if (s.submissionCount > 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">Submitted</Badge>
        {s.shareType === "public" && s.visitorCount > 1 && (
          <span className="text-[11px] text-muted-foreground">{s.submissionCount} of {s.visitorCount} visitors</span>
        )}
      </div>
    )
  }
  if (s.shareType === "direct") {
    if (!s.lastVisitAt) {
      return <span className="text-muted-foreground text-sm">Not opened</span>
    }
    const step = s.latestFurthestStep ?? 0
    const total = s.latestTotalSteps ?? 0
    const pct = total > 0 ? Math.round((step / total) * 100) : 0
    return (
      <div className="flex flex-col gap-1 min-w-[120px]">
        <div className="flex items-center justify-between text-xs">
          <span>Step {step}/{total || "?"}</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground">Last seen {formatRelative(s.lastVisitAt)}</span>
      </div>
    )
  }
  // public, no submissions
  if (s.visitorCount === 0) {
    return <span className="text-muted-foreground text-sm">No visits</span>
  }
  const avg = s.avgFurthestStep ?? 0
  const total = s.maxTotalSteps ?? 0
  const avgPct = total > 0 ? Math.round((avg / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <div className="flex items-center justify-between text-xs">
        <span>{s.visitorCount} visitor{s.visitorCount !== 1 ? "s" : ""}</span>
        <span className="font-medium">avg {avgPct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${avgPct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground">Last visit {formatRelative(s.lastVisitAt)}</span>
    </div>
  )
}

export default function SharesPage() {
  const [shares, setShares] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [showArchived, setShowArchived] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  async function load() {
    try {
      const res = await fetch("/api/admin/shares")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setShares(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(appUrl(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function bulkArchive(action: "archive" | "unarchive") {
    if (selected.size === 0) return
    if (action === "archive" && !confirm(`Archive ${selected.size} share${selected.size !== 1 ? "s" : ""}?`)) return
    setBulkBusy(true)
    try {
      const res = await fetch("/api/admin/shares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      })
      if (!res.ok) throw new Error("Failed")
      setSelected(new Set())
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk action failed")
    } finally {
      setBulkBusy(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading shares...</div>
  if (error) return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>

  const sources = Array.from(new Set(shares.map((s) => s.leadSource).filter((x): x is string => Boolean(x)))).sort()

  const filtered = shares.filter((s) => {
    if (!showArchived && s.archivedAt) return false
    if (showArchived && !s.archivedAt) return false
    if (filterSource !== "all" && s.leadSource !== filterSource) return false
    if (filterType !== "all" && s.shareType !== filterType) return false
    return true
  })

  const totalShares = filtered.length
  const totalSubmissions = filtered.reduce((acc, s) => acc + s.submissionCount, 0)
  const sharesWithAtLeastOne = filtered.filter((s) => s.submissionCount > 0).length
  const conversion = totalShares > 0 ? Math.round((sharesWithAtLeastOne / totalShares) * 100) : 0
  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Application Shares</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => { setShowArchived(e.target.checked); setSelected(new Set()) }}
              className="size-4"
            />
            Show archived
          </label>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total Shares</div>
          <div className="mt-1 text-2xl font-bold">{totalShares}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Submissions</div>
          <div className="mt-1 text-2xl font-bold">{totalSubmissions}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Shares w/ Submission</div>
          <div className="mt-1 text-2xl font-bold">{sharesWithAtLeastOne}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Conversion</div>
          <div className="mt-1 text-2xl font-bold">{conversion}%</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="direct">Direct</option>
            <option value="public">Public Link</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Source</span>
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All</option>
            {sources.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        {(filterSource !== "all" || filterType !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterSource("all"); setFilterType("all") }}>
            Clear filters
          </Button>
        )}
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            {showArchived ? (
              <Button variant="outline" size="sm" onClick={() => bulkArchive("unarchive")} disabled={bulkBusy} className="gap-1">
                <ArchiveRestoreIcon className="size-3" /> Unarchive
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => bulkArchive("archive")} disabled={bulkBusy} className="gap-1">
                <ArchiveIcon className="size-3" /> Archive
              </Button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          {showArchived
            ? "No archived shares."
            : <>No shares yet. Open <span className="font-mono">/admin/properties</span> and click <strong>Share</strong> on a listing to create one.</>}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(filtered.map((s) => s.id)))
                      else setSelected(new Set())
                    }}
                    className="size-4"
                  />
                </TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="hidden md:table-cell">Property</TableHead>
                <TableHead className="hidden lg:table-cell">Profile / Listing</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className={s.archivedAt ? "opacity-60" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="size-4"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{s.leadSource || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={s.shareType === "direct" ? "bg-purple-100 text-purple-800" : "bg-cyan-100 text-cyan-800"}>
                      {s.shareType === "direct" ? "Direct" : "Public"}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.recipientName || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="hidden md:table-cell">{s.propertyName || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {s.sourceProfile ? (
                      <a
                        href={s.sourceProfile.startsWith("http") ? s.sourceProfile : `https://${s.sourceProfile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                      >
                        <span className="truncate">{s.sourceProfile}</span>
                        <ExternalLinkIcon className="size-3 shrink-0" />
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><ProgressCell s={s} /></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => copyLink(s.shareToken)} className="gap-1">
                      {copiedToken === s.shareToken ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                      {copiedToken === s.shareToken ? "Copied" : "Copy"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
