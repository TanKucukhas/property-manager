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
  rejectReason?: string
  showingDate?: string
  showingTime?: string
  [key: string]: unknown
}

const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  new: { variant: "secondary", className: "bg-blue-100 text-blue-800" },
  review: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
  "pre-approved": { variant: "secondary", className: "bg-green-100 text-green-800" },
  rejected: { variant: "secondary", className: "bg-red-100 text-red-800" },
  "scheduled-for-showing": { variant: "secondary", className: "bg-indigo-100 text-indigo-800" },
  "showing-completed": { variant: "secondary", className: "bg-purple-100 text-purple-800" },
  "tenant-cancelled": { variant: "secondary", className: "bg-gray-100 text-gray-800" },
  "tenant-accepted": { variant: "secondary", className: "bg-emerald-100 text-emerald-800" },
  "credit-check-sent": { variant: "secondary", className: "bg-orange-100 text-orange-800" },
  approved: { variant: "secondary", className: "bg-green-200 text-green-900" },
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

const statusOptions = [
  "new",
  "review",
  "pre-approved",
  "scheduled-for-showing",
  "showing-completed",
  "tenant-cancelled",
  "tenant-accepted",
  "credit-check-sent",
  "approved",
  "rejected",
]

const statusLabels: Record<string, string> = {
  new: "New",
  review: "Review",
  "pre-approved": "Pre-Approved",
  "scheduled-for-showing": "Scheduled for Showing",
  "showing-completed": "Showing Completed",
  "tenant-cancelled": "Tenant Cancelled",
  "tenant-accepted": "Tenant Accepted",
  "credit-check-sent": "Credit Check Sent",
  approved: "Approved",
  rejected: "Rejected",
}

const hiddenFields = new Set(["id", "status", "notes", "createdAt", "updatedAt", "date", "_id", "rejectReason", "adminRating", "adminNotes", "score", "propertyId", "showingDate", "showingTime"])

const fieldLabels: Record<string, string> = {
  fullName: "Full Name",
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  dateOfBirth: "Date of Birth",
  currentAddress: "Current Address",
  desiredMoveIn: "Desired Move-in",
  adultsCount: "Adults",
  childrenCount: "Children",
  occupantNames: "Occupant Names",
  preferredContactMethod: "Preferred Contact",
  showingAvailability: "Showing Availability",
  howHeardAbout: "How They Heard About Us",
  monthlyIncome: "Monthly Income",
  creditScoreRange: "Credit Score Range",
  employmentStatus: "Employment Status",
  employerName: "Employer",
  jobTitle: "Job Title",
  employmentLength: "Employment Length",
  incomeSources: "Income Sources",
  canProvideProofOfIncome: "Can Provide Proof of Income",
  meetsIncomeRequirement: "Meets Income Requirement",
  canPayMoveIn: "Can Pay Move-in Costs",
  latePayments: "Late Payments",
  latePaymentsExplanation: "Late Payments Explanation",
  housingStatus: "Housing Status",
  currentLandlordName: "Current Landlord",
  currentLandlordPhone: "Landlord Phone",
  currentHousingPayment: "Current Housing Payment",
  currentAddressDuration: "Time at Current Address",
  hasRentedBefore: "Has Rented Before",
  priorEviction: "Prior Eviction",
  evictionExplanation: "Eviction Explanation",
  brokenLease: "Broken Lease",
  askedToMoveOut: "Asked to Move Out",
  landlordDebt: "Owes Landlord/Utility Debt",
  propertyDamageHistory: "Property Damage History",
  rentalHistoryExplanation: "Rental History Notes",
  allAdultsWillingToScreen: "All Adults Willing to Screen",
  creditIssuesDisclosure: "Credit Issues Disclosure",
  hasPets: "Has Pets",
  petsJson: "Pet Details",
  smoking: "Smoker/Vaper",
  willingToMaintain: "Willing to Maintain Property",
  willingToHandleUtilities: "Willing to Handle Utilities",
  intentToSublease: "Intent to Sublease",
  intentToAirbnb: "Intent to Airbnb",
  fullTimeResidence: "Full-time Residence",
  backgroundDisclosure: "Background Disclosure",
  screeningConsent: "Screening Consent",
  moveReason: "Reason for Moving",
  additionalNotes: "Additional Notes",
}

const detailSections: { title: string; fields: string[] }[] = [
  {
    title: "Personal Information",
    fields: ["fullName", "firstName", "lastName", "email", "phone", "dateOfBirth", "currentAddress"],
  },
  {
    title: "Move-in Details",
    fields: ["desiredMoveIn", "adultsCount", "childrenCount", "occupantNames", "preferredContactMethod", "showingAvailability", "howHeardAbout", "moveReason"],
  },
  {
    title: "Financial",
    fields: ["monthlyIncome", "creditScoreRange", "employmentStatus", "employerName", "jobTitle", "employmentLength", "incomeSources", "canProvideProofOfIncome", "meetsIncomeRequirement", "canPayMoveIn", "latePayments", "latePaymentsExplanation", "creditIssuesDisclosure"],
  },
  {
    title: "Rental History",
    fields: ["housingStatus", "currentLandlordName", "currentLandlordPhone", "currentHousingPayment", "currentAddressDuration", "hasRentedBefore", "priorEviction", "evictionExplanation", "brokenLease", "askedToMoveOut", "landlordDebt", "propertyDamageHistory", "rentalHistoryExplanation"],
  },
  {
    title: "Living Preferences",
    fields: ["hasPets", "petsJson", "smoking", "willingToMaintain", "willingToHandleUtilities", "intentToSublease", "intentToAirbnb", "fullTimeResidence"],
  },
  {
    title: "Other",
    fields: ["allAdultsWillingToScreen", "screeningConsent", "backgroundDisclosure", "additionalNotes"],
  },
]

function formatPetsJson(raw: string): string | null {
  try {
    const data = JSON.parse(raw)
    const pets = data?.pets || (Array.isArray(data) ? data : [data])
    if (!pets || pets.length === 0) return null
    return pets.map((p: Record<string, unknown>, i: number) => {
      const parts: string[] = []
      if (p.type) parts.push(String(p.type))
      if (p.breed) parts.push(String(p.breed))
      if (p.weight) parts.push(`${p.weight} lbs`)
      if (p.age) parts.push(`${p.age} old`)
      const trained = p.houseTrained === true ? "House trained" : p.houseTrained === false ? "Not house trained" : null
      if (trained) parts.push(trained)
      if (p.causedDamage === true) parts.push("Has caused damage")
      return `Pet ${i + 1}: ${parts.length > 0 ? parts.join(", ") : "No details"}`
    }).join("\n")
  } catch {
    return String(raw)
  }
}

function formatFieldValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (key === "petsJson") return formatPetsJson(String(value))
  if (typeof value === "boolean" || value === 0 || value === 1) {
    const boolVal = value === true || value === 1
    return boolVal ? "Yes" : "No"
  }
  if (typeof value === "number") {
    if (key.toLowerCase().includes("income") || key.toLowerCase().includes("rent") || key.toLowerCase().includes("payment") || key.toLowerCase().includes("deposit")) {
      return formatCurrency(value)
    }
    return String(value)
  }
  return String(value)
}

export default function PrescreeningPage() {
  const [records, setRecords] = useState<PrescreeningRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<PrescreeningRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStatus, setEditStatus] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editRating, setEditRating] = useState(0)
  const [editRejectReason, setEditRejectReason] = useState("")
  const [editShowingDate, setEditShowingDate] = useState("")
  const [editShowingTime, setEditShowingTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMinScore, setFilterMinScore] = useState("")
  const [filterMinIncome, setFilterMinIncome] = useState("")
  const [filterCredit, setFilterCredit] = useState("all")

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
    setEditRejectReason(record.rejectReason || "")
    setEditShowingDate(record.showingDate || "")
    setEditShowingTime(record.showingTime || "")
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Delete application from ${getName(selected)}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/prescreening/${selected.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDialogOpen(false)
      loadRecords()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/prescreening/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          adminNotes: editNotes,
          adminRating: editRating,
          rejectReason: editStatus === "rejected" ? editRejectReason : "",
          showingDate: editStatus === "scheduled-for-showing" ? editShowingDate : "",
          showingTime: editStatus === "scheduled-for-showing" ? editShowingTime : "",
        }),
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

  function buildSummaryText(r: PrescreeningRecord): string {
    const effScore = (r.score ?? 0) + (r.adminRating ?? 0) * 2
    const lines: string[] = [
      `APPLICANT SUMMARY`,
      ``,
      `Name: ${getName(r)}`,
      `Phone: ${r.phone || (r as Record<string, unknown>).phone || "N/A"}`,
      `Email: ${r.email}`,
      `Status: ${statusLabels[r.status] || r.status}`,
      `Score: ${effScore}/100`,
      `Applied: ${formatDate(r.createdAt || r.date)}`,
    ]

    if (r.desiredMoveIn) lines.push(`Desired Move-in: ${r.desiredMoveIn as string}`)
    if (r.adultsCount) lines.push(`Adults: ${r.adultsCount as number}${r.childrenCount ? `, Children: ${r.childrenCount as number}` : ""}`)
    if (r.occupantNames) lines.push(`Occupants: ${r.occupantNames as string}`)

    lines.push(``)
    lines.push(`FINANCIAL`)
    if (r.monthlyIncome) lines.push(`Income: ${formatCurrency(r.monthlyIncome)}`)
    if (r.creditScoreRange) lines.push(`Credit: ${r.creditScoreRange}`)
    if (r.employmentStatus) lines.push(`Employment: ${(r.employmentStatus as string)}${r.employerName ? ` at ${r.employerName as string}` : ""}${r.jobTitle ? ` (${r.jobTitle as string})` : ""}`)

    const flags: string[] = []
    if (r.priorEviction) flags.push("Prior eviction")
    if (r.brokenLease) flags.push("Broken lease")
    if (r.landlordDebt) flags.push("Owes landlord debt")
    if (r.latePayments) flags.push("Late payments")
    if (r.smoking) flags.push("Smoker")
    if (r.hasPets) flags.push("Has pets")
    if (flags.length > 0) {
      lines.push(``)
      lines.push(`FLAGS: ${flags.join(", ")}`)
    }

    if (r.preferredContactMethod) {
      lines.push(``)
      lines.push(`Preferred Contact: ${r.preferredContactMethod as string}`)
    }
    if (r.showingAvailability) lines.push(`Showing Availability: ${(r as Record<string, unknown>).showingAvailability as string}`)

    if (r.showingDate) {
      lines.push(``)
      lines.push(`Showing: ${r.showingDate}${r.showingTime ? ` at ${r.showingTime}` : ""}`)
    }

    if (editNotes) {
      lines.push(``)
      lines.push(`Admin Notes: ${editNotes}`)
    }

    return lines.join("\n")
  }

  async function handleCopySummary() {
    if (!selected) return
    const text = buildSummaryText(selected)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <>
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{statusLabels[s] || s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Min Score</span>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="0"
              className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm"
              value={filterMinScore}
              onChange={(e) => setFilterMinScore(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Min Income</span>
            <input
              type="number"
              min={0}
              placeholder="$0"
              className="h-8 w-28 rounded-md border border-input bg-transparent px-2 text-sm"
              value={filterMinIncome}
              onChange={(e) => setFilterMinIncome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Credit</span>
            <select
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              value={filterCredit}
              onChange={(e) => setFilterCredit(e.target.value)}
            >
              <option value="all">All</option>
              <option value="750+">750+</option>
              <option value="700-749">700-749</option>
              <option value="650-699">650-699</option>
              <option value="600-649">600-649</option>
              <option value="550-599">550-599</option>
              <option value="500-549">500-549</option>
              <option value="below-500">Below 500</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          {(filterStatus !== "all" || filterMinScore || filterMinIncome || filterCredit !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setFilterStatus("all"); setFilterMinScore(""); setFilterMinIncome(""); setFilterCredit("all") }}
            >
              Clear filters
            </Button>
          )}
        </div>
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
              {[...records]
                .filter((r) => {
                  if (filterStatus !== "all" && r.status !== filterStatus) return false
                  if (filterMinScore) {
                    const eff = (r.score ?? 0) + (r.adminRating ?? 0) * 2
                    if (eff < parseInt(filterMinScore)) return false
                  }
                  if (filterMinIncome && (r.monthlyIncome ?? 0) < parseInt(filterMinIncome)) return false
                  if (filterCredit !== "all" && r.creditScoreRange !== filterCredit) return false
                  return true
                })
                .sort((a, b) => {
                  const aEff = a.adminRating == null ? (a.score ?? 0) : (a.score ?? 0) + a.adminRating * 2
                  const bEff = b.adminRating == null ? (b.score ?? 0) : (b.score ?? 0) + b.adminRating * 2
                  return bEff - aEff
                })
                .map((r) => {
                const sc = statusColors[r.status] || statusColors.new
                const unscored = r.adminRating == null
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
                      {unscored ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Unscored</Badge>
                      ) : (
                        <>
                          <span className="font-medium">{(r.score ?? 0) + (r.adminRating ?? 0) * 2}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant} className={sc.className}>
                        {statusLabels[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(r.createdAt || r.date)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{selected ? getName(selected) : "Application Detail"}</span>
              {selected && (() => {
                const sc = statusColors[selected.status] || statusColors.new
                return <Badge variant={sc.variant} className={sc.className}>{statusLabels[selected.status] || selected.status}</Badge>
              })()}
            </DialogTitle>
            {selected && (
              <p className="text-sm text-muted-foreground">{selected.email} &middot; Applied {formatDate(selected.createdAt || selected.date)}</p>
            )}
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Admin controls */}
              <div className="rounded-lg border bg-muted/20 p-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Score summary */}
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Score</span>
                      <span className="text-2xl font-bold">{(selected.score ?? 0) + editRating * 2}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>System: {selected.score ?? 0}/80</span>
                      <span>Your rating: {editRating}/10</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(selected.score ?? 0) + editRating * 2}%` }} />
                    </div>
                  </div>

                  {/* Rating slider */}
                  <div className="flex flex-col gap-2">
                    <Label>Your Rating (0-10)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={editRating}
                        onChange={(e) => setEditRating(parseInt(e.target.value))}
                        className="flex-1 h-2 accent-primary outline-none focus:outline-none [&::-webkit-slider-thumb]:ring-0"
                      />
                      <span className="text-lg font-semibold w-8 text-center">{editRating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Communication, responsiveness, references, etc.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Status</Label>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{statusLabels[s] || s}</option>
                      ))}
                    </select>
                  </div>

                  {editStatus === "rejected" && (
                    <div className="flex flex-col gap-2">
                      <Label>Reject Reason</Label>
                      <Textarea
                        value={editRejectReason}
                        onChange={(e) => setEditRejectReason(e.target.value)}
                        placeholder="Why is this application being rejected?"
                        rows={2}
                        className="border-red-200 focus-visible:ring-red-500/30"
                      />
                    </div>
                  )}

                  {editStatus === "scheduled-for-showing" && (
                    <div className="flex flex-col gap-2">
                      <Label>Showing Date & Time</Label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={editShowingDate}
                          onChange={(e) => setEditShowingDate(e.target.value)}
                          className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                        <input
                          type="time"
                          value={editShowingTime}
                          onChange={(e) => setEditShowingTime(e.target.value)}
                          className="h-9 w-32 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Application details - grouped sections */}
              {detailSections.map((section) => {
                const visibleFields = section.fields.filter((key) => {
                  if (hiddenFields.has(key)) return false
                  const val = selected[key]
                  return val !== null && val !== undefined && val !== ""
                })
                if (visibleFields.length === 0) return null
                return (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">{section.title}</h3>
                    <div className="rounded-lg border divide-y">
                      {visibleFields.map((key) => {
                        const value = selected[key]
                        const formatted = formatFieldValue(key, value)
                        if (!formatted) return null
                        const isBool = typeof value === "boolean" || value === 0 || value === 1
                        const boolVal = value === true || value === 1
                        const isNegative = isBool && (
                          (boolVal && ["priorEviction", "brokenLease", "askedToMoveOut", "landlordDebt", "propertyDamageHistory", "latePayments", "smoking", "intentToSublease", "intentToAirbnb"].includes(key)) ||
                          (!boolVal && ["canProvideProofOfIncome", "meetsIncomeRequirement", "canPayMoveIn", "willingToMaintain", "willingToHandleUtilities", "fullTimeResidence", "allAdultsWillingToScreen", "screeningConsent", "hasRentedBefore"].includes(key))
                        )
                        return (
                          <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-muted-foreground">{fieldLabels[key] || key.replace(/([A-Z])/g, " $1").trim()}</span>
                            {isBool ? (
                              <span className={`font-medium ${isNegative ? "text-red-600" : "text-green-600"}`}>
                                {formatted}
                              </span>
                            ) : (
                              <span className="font-medium text-right max-w-[60%] whitespace-pre-wrap">{formatted}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCopySummary}
              >
                {copied ? "Copied!" : "Copy Summary"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || deleting}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
