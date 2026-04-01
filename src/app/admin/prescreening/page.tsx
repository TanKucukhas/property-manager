"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface PrescreeningRecord {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  email: string
  creditScoreRange?: string
  monthlyIncome?: number
  score?: number
  adminRating?: number
  status: string
  createdAt?: string
  date?: string
  adminNotes?: string
  [key: string]: unknown
}

const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  new: { variant: "secondary", className: "bg-blue-100 text-blue-800" },
  review: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
  "pre-approved": { variant: "secondary", className: "bg-green-100 text-green-800" },
  rejected: { variant: "secondary", className: "bg-red-100 text-red-800" },
}

function formatDate(d: string | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}

function formatCurrency(value: number | undefined) {
  if (value == null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0,
  }).format(value)
}

const statusOptions = ["new", "review", "pre-approved", "rejected"]

const hiddenFields = new Set(["id", "status", "notes", "createdAt", "updatedAt", "date", "_id"])

export default function PrescreeningPage() {
  const [records, setRecords] = useState<PrescreeningRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<PrescreeningRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStatus, setEditStatus] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editRating, setEditRating] = useState(0)
  const [saving, setSaving] = useState(false)

  async function loadRecords() {
    try {
      const res = await fetch("/api/prescreening")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecords() }, [])

  function openDetail(record: PrescreeningRecord) {
    setSelected(record)
    setEditStatus(record.status)
    setEditNotes(record.adminNotes || "")
    setEditRating(record.adminRating ?? 0)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/prescreening/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, adminNotes: editNotes, adminRating: editRating }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setDialogOpen(false)
      loadRecords()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function getName(r: PrescreeningRecord) {
    if (r.fullName) return r.fullName
    if (r.firstName || r.lastName) return `${r.firstName || ""} ${r.lastName || ""}`.trim()
    return "-"
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading prescreening records...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Prescreening Applications</h1>

      {records.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No records yet
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Credit</TableHead>
                <TableHead className="hidden md:table-cell">Income</TableHead>
                <TableHead className="hidden lg:table-cell">Total Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => {
                const sc = statusColors[r.status] || statusColors.new
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(r)}
                  >
                    <TableCell className="font-medium">{getName(r)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.creditScoreRange ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatCurrency(r.monthlyIncome)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="font-medium">{(r.score ?? 0) + (r.adminRating ?? 0)}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant} className={sc.className}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(r.createdAt || r.date)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(selected)
                  .filter(([key]) => !hiddenFields.has(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="text-sm">
                        {typeof value === "number" && (key.toLowerCase().includes("income") || key.toLowerCase().includes("rent"))
                          ? formatCurrency(value)
                          : String(value ?? "-")}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Score summary */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Score</span>
                  <span className="text-2xl font-bold">{(selected.score ?? 0) + editRating}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Form: {selected.score ?? 0}/80</span>
                  <span>Your rating: {editRating}/20</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(selected.score ?? 0) + editRating}%` }} />
                </div>
              </div>

              {/* Admin rating */}
              <div className="flex flex-col gap-2">
                <Label>Your Rating (0-20)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={editRating}
                    onChange={(e) => setEditRating(parseInt(e.target.value))}
                    className="flex-1 h-2 accent-primary"
                  />
                  <span className="text-lg font-semibold w-8 text-center">{editRating}</span>
                </div>
                <p className="text-xs text-muted-foreground">Based on your impression from communication, responsiveness, references, etc.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
