"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { ArrowDown, ArrowUp, ArrowUpDown, BrainCircuit, Copy as CopyIcon, Check as CheckIcon, History, Sparkles } from "lucide-react"
import { generatePrescreeningPrompt, type PrescreeningAIAnalysis } from "@/lib/ai-prescreening-prompt"

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
  phone?: string
  listingId?: number | null
  listing?: ListingRef | null
  propertyName?: string | null
  [key: string]: unknown
}

interface ListingRef {
  id: number
  label: string | null
  openedAt: string
  closedAt: string | null
  placedPrescreeningId: number | null
}

interface ListingSummary extends ListingRef {
  propertyId: number
  propertyName: string | null
  applicationCount: number
}

// "current" = open listing rounds plus applications not tied to any round.
type ListingFilter = "current" | "all" | "none" | `${number}`

type SortKey = "name" | "email" | "credit" | "income" | "score" | "status" | "listing" | "date"
type SortDir = "asc" | "desc"

const CREDIT_RANK: Record<string, number> = {
  "750+": 7, "700-749": 6, "650-699": 5, "600-649": 4, "550-599": 3, "500-549": 2, "below-500": 1, unknown: 0,
}

// Text columns start A→Z; numbers and dates start highest/newest first.
const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  name: "asc", email: "asc", status: "asc",
  credit: "desc", income: "desc", score: "desc", listing: "desc", date: "desc",
}

function listingName(l: { label: string | null; openedAt: string } | null | undefined): string {
  if (!l) return "No listing"
  return l.label || new Date(l.openedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function normalizeEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : ""
}

function normalizePhone(v: unknown): string {
  if (typeof v !== "string") return ""
  const digits = v.replace(/\D/g, "")
  return digits.length >= 10 ? digits.slice(-10) : ""
}

const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  new: { variant: "secondary", className: "bg-blue-100 text-blue-800" },
  review: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
  "with-concerns": { variant: "secondary", className: "bg-orange-100 text-orange-800" },
  "in-progress": { variant: "secondary", className: "bg-amber-100 text-amber-800" },
  "pre-approved": { variant: "secondary", className: "bg-green-100 text-green-800" },
  rejected: { variant: "secondary", className: "bg-red-100 text-red-800" },
  "scheduled-for-showing": { variant: "secondary", className: "bg-indigo-100 text-indigo-800" },
  "showing-completed": { variant: "secondary", className: "bg-purple-100 text-purple-800" },
  "did-not-show-up": { variant: "secondary", className: "bg-rose-100 text-rose-800" },
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

const RESTRICTED_BREED_KEYWORDS = [
  "pit bull", "pitbull", "pit-bull",
  "rottweiler",
  "doberman",
  "german shepherd",
  "mastiff",
  "cane corso",
  "akita",
  "chow chow", "chow-chow",
  "wolf",
  "presa canario",
  "staffordshire", "staffy",
  "bull terrier",
  "great dane",
  "saint bernard", "st bernard", "st. bernard",
  "husky",
  "malamute",
  "boxer",
  "alaskan",
]

function getPetWarning(petsJson: unknown): string | null {
  if (!petsJson || typeof petsJson !== "string") return null
  try {
    const parsed = JSON.parse(petsJson) as { pets?: Array<{ type?: string; breed?: string; weight?: string }> }
    const pets = parsed.pets || []
    for (const pet of pets) {
      const breed = (pet.breed || "").toLowerCase().trim()
      const weight = parseFloat(pet.weight || "")
      const isDog = (pet.type || "").toLowerCase() === "dog"
      if (isDog && Number.isFinite(weight) && weight > 35) {
        return `Large dog (${weight}lbs${breed ? `, ${pet.breed}` : ""})`
      }
      if (breed && RESTRICTED_BREED_KEYWORDS.some((kw) => breed.includes(kw))) {
        return `Restricted breed: ${pet.breed}`
      }
    }
  } catch {
    return null
  }
  return null
}

const statusOptions = [
  "new",
  "review",
  "with-concerns",
  "in-progress",
  "pre-approved",
  "scheduled-for-showing",
  "showing-completed",
  "did-not-show-up",
  "tenant-cancelled",
  "tenant-accepted",
  "credit-check-sent",
  "approved",
  "rejected",
]

const statusLabels: Record<string, string> = {
  new: "New",
  review: "Reviewed",
  "with-concerns": "With Concerns",
  "in-progress": "In Progress",
  "pre-approved": "Pre-Approved",
  "scheduled-for-showing": "Scheduled for Showing",
  "showing-completed": "Showing Completed",
  "did-not-show-up": "Did Not Show Up",
  "tenant-cancelled": "Tenant Cancelled",
  "tenant-accepted": "Tenant Accepted",
  "credit-check-sent": "Credit Check Sent",
  approved: "Approved",
  rejected: "Rejected",
}

const hiddenFields = new Set(["id", "status", "notes", "createdAt", "updatedAt", "date", "_id", "rejectReason", "adminRating", "adminNotes", "score", "propertyId", "showingDate", "showingTime", "aiAnalysis", "aiAnalysisDate", "shareId"])

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
  usingVoucher: "Using Voucher",
  voucherAgency: "Voucher Agency",
  voucherBedroomSize: "Voucher Bedroom Size",
  voucherExpiration: "Voucher Expiration",
  voucherApprovedRent: "Voucher Approved Rent",
  voucherTenantPortion: "Voucher Tenant Portion",
  voucherCaseworkerName: "Caseworker Name",
  voucherCaseworkerPhone: "Caseworker Phone",
  voucherCaseworkerEmail: "Caseworker Email",
  voucherHasRfta: "Has RFTA Paperwork",
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
    title: "Rental Assistance / Voucher",
    fields: [
      "usingVoucher",
      "voucherAgency",
      "voucherBedroomSize",
      "voucherExpiration",
      "voucherApprovedRent",
      "voucherTenantPortion",
      "voucherCaseworkerName",
      "voucherCaseworkerPhone",
      "voucherCaseworkerEmail",
      "voucherHasRfta",
    ],
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

function stringOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try { return JSON.stringify(v) } catch { return "" }
}

function coerceToStringOrNull(v: unknown): string | null {
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

function normalizeAnalysisBlock<T extends Record<string, unknown>>(v: unknown, defaults: T): T & { comment: string } {
  if (!v || typeof v !== "object") return { ...defaults, comment: "" } as T & { comment: string }
  const obj = v as Record<string, unknown>
  const out: Record<string, unknown> = { ...defaults, ...obj }
  out.comment = stringOrEmpty(obj.comment)
  return out as T & { comment: string }
}

function formatFieldValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (key === "petsJson") return formatPetsJson(String(value))
  if (key === "usingVoucher" || key === "voucherHasRfta") {
    const map: Record<string, string> = { yes: "Yes", no: "No", not_sure: "Not sure" }
    return map[String(value)] ?? String(value)
  }
  if (typeof value === "boolean" || value === 0 || value === 1) {
    const boolVal = value === true || value === 1
    return boolVal ? "Yes" : "No"
  }
  if (typeof value === "number") {
    if (
      key.toLowerCase().includes("income") ||
      key.toLowerCase().includes("rent") ||
      key.toLowerCase().includes("payment") ||
      key.toLowerCase().includes("deposit") ||
      key === "voucherTenantPortion"
    ) {
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
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [filterMinScore, setFilterMinScore] = useState("")
  const [filterMinIncome, setFilterMinIncome] = useState("")
  const [filterCredit, setFilterCredit] = useState("all")
  const [listings, setListings] = useState<ListingSummary[]>([])
  const [filterListing, setFilterListing] = useState<ListingFilter>("current")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [editListingId, setEditListingId] = useState<string>("")

  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiStep, setAiStep] = useState<"input" | "review">("input")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiCopied, setAiCopied] = useState(false)
  const [aiPasteValue, setAiPasteValue] = useState("")
  const [aiParseError, setAiParseError] = useState("")
  const [aiParsed, setAiParsed] = useState<PrescreeningAIAnalysis | null>(null)
  const [aiSaving, setAiSaving] = useState(false)
  const [aiLoadingPrompt, setAiLoadingPrompt] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin-prescreening-status-filter")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setFilterStatuses(parsed.filter((s) => typeof s === "string"))
      }
      const savedListing = localStorage.getItem("admin-prescreening-listing-filter")
      if (savedListing && /^(current|all|none|\d+)$/.test(savedListing)) setFilterListing(savedListing as ListingFilter)
      const savedSort = localStorage.getItem("admin-prescreening-sort")
      if (savedSort) {
        const parsed = JSON.parse(savedSort) as { key?: string; dir?: string }
        if (parsed.key && parsed.key in DEFAULT_SORT_DIR) setSortKey(parsed.key as SortKey)
        if (parsed.dir === "asc" || parsed.dir === "desc") setSortDir(parsed.dir)
      }
    } catch {}
    setFiltersLoaded(true)
  }, [])

  useEffect(() => {
    if (!filtersLoaded) return
    try {
      localStorage.setItem("admin-prescreening-status-filter", JSON.stringify(filterStatuses))
      localStorage.setItem("admin-prescreening-listing-filter", filterListing)
      localStorage.setItem("admin-prescreening-sort", JSON.stringify({ key: sortKey, dir: sortDir }))
    } catch {}
  }, [filterStatuses, filterListing, sortKey, sortDir, filtersLoaded])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(DEFAULT_SORT_DIR[key])
    }
  }

  function toggleStatusFilter(s: string) {
    setFilterStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function loadRecords() {
    try {
      const [res, listingsRes] = await Promise.all([fetch("/api/prescreening"), fetch("/api/listings")])
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : data.data || [])
      if (listingsRes.ok) {
        const listingData = await listingsRes.json()
        setListings(Array.isArray(listingData) ? listingData : [])
      }
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
    setEditListingId(record.listingId != null ? String(record.listingId) : "")
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
    const nextStatus = editStatus === "new" && editRating > 0 ? "review" : editStatus
    try {
      const res = await fetch(`/api/prescreening/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          adminNotes: editNotes,
          adminRating: editRating,
          rejectReason: nextStatus === "rejected" ? editRejectReason : "",
          showingDate: nextStatus === "scheduled-for-showing" ? editShowingDate : "",
          showingTime: nextStatus === "scheduled-for-showing" ? editShowingTime : "",
          ...(editListingId !== (selected.listingId != null ? String(selected.listingId) : "")
            ? { listingId: editListingId === "" ? null : parseInt(editListingId) }
            : {}),
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

  async function openAiDialog() {
    if (!selected) return
    setAiDialogOpen(true)
    setAiStep("input")
    setAiCopied(false)
    setAiPasteValue("")
    setAiParseError("")
    setAiParsed(null)
    setAiLoadingPrompt(true)
    try {
      const propertyId = selected.propertyId as number | undefined
      let property: Record<string, unknown> | null = null
      if (propertyId) {
        try {
          const res = await fetch(`/api/properties/${propertyId}`)
          if (res.ok) property = await res.json()
        } catch {
          property = null
        }
      }
      const prompt = generatePrescreeningPrompt({
        applicant: selected as unknown as Record<string, unknown>,
        property,
        computed:
          typeof selected.score === "number"
            ? { score: selected.score, flags: [], incomeThreshold: 0 }
            : undefined,
      })
      setAiPrompt(prompt)
    } finally {
      setAiLoadingPrompt(false)
    }
  }

  async function handleAiCopyPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt)
      setAiCopied(true)
      setTimeout(() => setAiCopied(false), 2000)
    } catch {
      // Clipboard API can fail in non-secure contexts — let the admin select manually.
    }
  }

  function tryParseAi(raw: string): PrescreeningAIAnalysis | null {
    const trimmed = raw.trim()
    if (!trimmed) return null
    // Extract the first {...} block, tolerating ``` fences or prose around it.
    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")
    if (firstBrace < 0 || lastBrace <= firstBrace) return null
    const cleaned = trimmed.slice(firstBrace, lastBrace + 1)
    try {
      const parsed = JSON.parse(cleaned)
      if (typeof parsed !== "object" || parsed === null) return null
      return {
        summary: stringOrEmpty(parsed.summary),
        adminRating: Math.min(Math.max(Number(parsed.adminRating) || 0, 0), 10),
        recommendedStatus: (function () {
          const allowed = ["review", "with-concerns", "in-progress", "pre-approved", "rejected"] as const
          const s = String(parsed.recommendedStatus || "review").trim()
          return (allowed as readonly string[]).includes(s) ? (s as PrescreeningAIAnalysis["recommendedStatus"]) : "review"
        })(),
        rejectReason: typeof parsed.rejectReason === "string" ? parsed.rejectReason : null,
        adminNotes: stringOrEmpty(parsed.adminNotes),
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.map(stringOrEmpty).filter(Boolean) : [],
        greenFlags: Array.isArray(parsed.greenFlags) ? parsed.greenFlags.map(stringOrEmpty).filter(Boolean) : [],
        incomeAnalysis: normalizeAnalysisBlock(parsed.incomeAnalysis, { threshold: null, actual: null, meetsRequirement: null }),
        creditAnalysis: normalizeAnalysisBlock(parsed.creditAnalysis, { range: null, meetsMinimum: null }),
        voucherAnalysis: coerceToStringOrNull(parsed.voucherAnalysis),
      }
    } catch {
      return null
    }
  }

  function handleAiPasteChange(value: string) {
    setAiPasteValue(value)
    const parsed = tryParseAi(value)
    if (parsed) {
      setAiParsed(parsed)
      setAiParseError("")
      setAiStep("review")
      return
    }
    // Only surface an error if it really looks like the user meant to paste JSON.
    const trimmed = value.trim()
    if (trimmed.length > 20 && trimmed.startsWith("{") && trimmed.endsWith("}")) {
      setAiParseError("That doesn't parse as JSON yet. Check for missing quotes or commas.")
    } else {
      setAiParseError("")
    }
  }

  function updateAiParsed<K extends keyof PrescreeningAIAnalysis>(key: K, value: PrescreeningAIAnalysis[K]) {
    setAiParsed((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleAiSave() {
    if (!selected || !aiParsed) return
    setAiSaving(true)
    try {
      const status = aiParsed.recommendedStatus
      const res = await fetch(`/api/prescreening/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminRating: aiParsed.adminRating,
          adminNotes: aiParsed.adminNotes,
          rejectReason: status === "rejected" ? (aiParsed.rejectReason || "") : "",
          aiAnalysis: aiParsed,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      // Reflect the new values in the open detail dialog so admin sees them immediately.
      setEditStatus(status)
      setEditRating(aiParsed.adminRating)
      setEditNotes(aiParsed.adminNotes)
      if (status === "rejected") setEditRejectReason(aiParsed.rejectReason || "")
      setAiDialogOpen(false)
      loadRecords()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed")
    } finally {
      setAiSaving(false)
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

    if (r.hasPets && r.petsJson) {
      const petsFormatted = formatPetsJson(String(r.petsJson))
      if (petsFormatted) {
        lines.push(``)
        lines.push(`PETS`)
        lines.push(petsFormatted)
      }
    }

    if (r.usingVoucher) {
      const usingVoucherMap: Record<string, string> = { yes: "Yes", no: "No", not_sure: "Not sure" }
      const usingVoucherStr = usingVoucherMap[String(r.usingVoucher)] ?? String(r.usingVoucher)
      lines.push(``)
      lines.push(`RENTAL ASSISTANCE / VOUCHER`)
      lines.push(`Using voucher: ${usingVoucherStr}`)
      if (r.usingVoucher === "yes") {
        if (r.voucherAgency) lines.push(`Agency: ${r.voucherAgency as string}`)
        if (r.voucherBedroomSize) lines.push(`Bedroom size: ${r.voucherBedroomSize as string}`)
        if (r.voucherExpiration) lines.push(`Expires: ${r.voucherExpiration as string}`)
        if (r.voucherApprovedRent) lines.push(`Approved rent: ${formatCurrency(r.voucherApprovedRent as number)}`)
        if (r.voucherTenantPortion) lines.push(`Tenant portion: ${formatCurrency(r.voucherTenantPortion as number)}`)
        const caseworkerBits: string[] = []
        if (r.voucherCaseworkerName) caseworkerBits.push(String(r.voucherCaseworkerName))
        if (r.voucherCaseworkerPhone) caseworkerBits.push(String(r.voucherCaseworkerPhone))
        if (r.voucherCaseworkerEmail) caseworkerBits.push(String(r.voucherCaseworkerEmail))
        if (caseworkerBits.length > 0) lines.push(`Caseworker: ${caseworkerBits.join(" · ")}`)
        if (r.voucherHasRfta) {
          const rftaMap: Record<string, string> = { yes: "Yes", no: "No", not_sure: "Not sure" }
          lines.push(`Has RFTA paperwork: ${rftaMap[String(r.voucherHasRfta)] ?? String(r.voucherHasRfta)}`)
        }
      }
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

  // Earlier applications by the same person (email or phone) in a different listing round.
  const priorApplications = new Map<string, PrescreeningRecord[]>()
  {
    const byContact = new Map<string, PrescreeningRecord[]>()
    for (const r of records) {
      for (const k of [normalizeEmail(r.email), normalizePhone(r.phone)]) {
        if (!k) continue
        const list = byContact.get(k) ?? []
        list.push(r)
        byContact.set(k, list)
      }
    }
    for (const r of records) {
      const seen = new Set<string>()
      const prior: PrescreeningRecord[] = []
      for (const k of [normalizeEmail(r.email), normalizePhone(r.phone)]) {
        if (!k) continue
        for (const o of byContact.get(k) ?? []) {
          if (o.id === r.id || seen.has(String(o.id))) continue
          if ((o.listingId ?? null) === (r.listingId ?? null)) continue
          if ((o.createdAt ?? "") >= (r.createdAt ?? "")) continue
          seen.add(String(o.id))
          prior.push(o)
        }
      }
      if (prior.length > 0) {
        prior.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        priorApplications.set(String(r.id), prior)
      }
    }
  }

  const hasListings = listings.length > 0
  const visibleRecords = records
    .filter((r) => {
      if (!hasListings || filterListing === "all") return true
      if (filterListing === "current") return !r.listing || r.listing.closedAt == null
      if (filterListing === "none") return r.listingId == null
      return String(r.listingId) === filterListing
    })
    .filter((r) => {
      if (filterStatuses.length > 0 && !filterStatuses.includes(r.status)) return false
      if (filterMinScore) {
        const eff = (r.score ?? 0) + (r.adminRating ?? 0) * 2
        if (eff < parseInt(filterMinScore)) return false
      }
      if (filterMinIncome && (r.monthlyIncome ?? 0) < parseInt(filterMinIncome)) return false
      if (filterCredit !== "all" && r.creditScoreRange !== filterCredit) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": cmp = getName(a).localeCompare(getName(b), undefined, { sensitivity: "base" }); break
        case "email": cmp = (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" }); break
        case "credit": cmp = (CREDIT_RANK[a.creditScoreRange ?? ""] ?? -1) - (CREDIT_RANK[b.creditScoreRange ?? ""] ?? -1); break
        case "income": cmp = (a.monthlyIncome ?? 0) - (b.monthlyIncome ?? 0); break
        case "score": cmp = ((a.score ?? 0) + (a.adminRating ?? 0) * 2) - ((b.score ?? 0) + (b.adminRating ?? 0) * 2); break
        case "status": cmp = statusOptions.indexOf(a.status) - statusOptions.indexOf(b.status); break
        case "listing": cmp = (a.listing?.openedAt ?? "").localeCompare(b.listing?.openedAt ?? ""); break
        case "date": cmp = (a.createdAt || a.date || "").localeCompare(b.createdAt || b.date || ""); break
      }
      // Ties fall back to newest first so the order is stable.
      if (cmp === 0) cmp = sortDir === "asc"
        ? (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
        : (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
      return sortDir === "asc" ? cmp : -cmp
    })

  function sortableHead(column: SortKey, label: string, className?: string) {
    const active = sortKey === column
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown
    return (
      <TableHead key={column} className={className} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground font-semibold" : ""}`}
        >
          {label}
          <Icon className={`size-3.5 ${active ? "" : "opacity-40"}`} />
        </button>
      </TableHead>
    )
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
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Status {filterStatuses.length > 0 && `(${filterStatuses.length})`}</span>
              {filterStatuses.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setFilterStatuses([])}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((s) => {
                const active = filterStatuses.includes(s)
                const sc = statusColors[s] || statusColors.new
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatusFilter(s)}
                    className={`h-7 rounded-full border px-2.5 text-xs transition ${
                      active
                        ? `${sc.className} border-current font-medium`
                        : "border-input bg-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {statusLabels[s] || s}
                  </button>
                )
              })}
            </div>
          </div>
          {hasListings && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Listing</span>
              <select
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                value={filterListing}
                onChange={(e) => setFilterListing(e.target.value as ListingFilter)}
              >
                <option value="current">Current listings</option>
                <option value="all">All listings</option>
                {listings.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.propertyName ? `${l.propertyName} · ` : ""}{listingName(l)} {l.closedAt ? "(closed)" : "(open)"} · {l.applicationCount}
                  </option>
                ))}
                <option value="none">No listing</option>
              </select>
            </div>
          )}
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
          {(filterStatuses.length > 0 || filterMinScore || filterMinIncome || filterCredit !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setFilterStatuses([]); setFilterMinScore(""); setFilterMinIncome(""); setFilterCredit("all") }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {sortableHead("name", "Name")}
                {sortableHead("email", "Email", "hidden sm:table-cell")}
                {sortableHead("credit", "Credit", "hidden md:table-cell")}
                {sortableHead("income", "Income", "hidden md:table-cell")}
                {sortableHead("score", "Total Score", "hidden lg:table-cell")}
                {sortableHead("status", "Status")}
                {hasListings && sortableHead("listing", "Listing", "hidden lg:table-cell")}
                {sortableHead("date", "Date", "hidden lg:table-cell")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRecords
                .map((r) => {
                const sc = statusColors[r.status] || statusColors.new
                const unscored = r.adminRating == null
                const petWarning = getPetWarning(r.petsJson)
                const prior = priorApplications.get(String(r.id))
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(r)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{getName(r)}</span>
                        {petWarning && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 border border-red-200"
                            title={petWarning}
                          >
                            {petWarning}
                          </Badge>
                        )}
                        {prior && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 border border-slate-200 gap-1"
                            title={prior.map((o) => `${listingName(o.listing)}: ${statusLabels[o.status] || o.status} (${formatDate(o.createdAt)})`).join("\n")}
                          >
                            <History className="size-3" />
                            Applied before · {listingName(prior[0].listing)} ({statusLabels[prior[0].status] || prior[0].status})
                          </Badge>
                        )}
                      </div>
                    </TableCell>
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
                    {hasListings && (
                      <TableCell className="hidden lg:table-cell">
                        <span className={r.listing && r.listing.closedAt == null ? "" : "text-muted-foreground"}>
                          {listingName(r.listing)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell">{formatDate(r.createdAt || r.date)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {visibleRecords.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No applications match these filters</div>
          )}
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
              <p className="text-sm text-muted-foreground">
                {selected.email} &middot; Applied {formatDate(selected.createdAt || selected.date)}
                {hasListings && <> &middot; {selected.propertyName ? `${selected.propertyName} · ` : ""}{listingName(selected.listing)}{selected.listing?.closedAt ? " (closed)" : ""}</>}
              </p>
            )}
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
              {(() => {
                const share = (selected as Record<string, unknown>).share as {
                  shareType?: string
                  leadSource?: string | null
                  recipientName?: string | null
                  sourceProfile?: string | null
                  notes?: string | null
                  createdAt?: string
                } | null
                if (!share) return null
                return (
                  <div className="rounded-lg border-2 border-blue-200 bg-blue-50/60 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-blue-900">Lead Details</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">
                        {share.shareType === "direct" ? "Direct" : "Public Link"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground sm:block sm:text-xs">Source</span>
                        <span className="font-medium">{share.leadSource || "—"}</span>
                      </div>
                      {share.recipientName && (
                        <div className="flex justify-between sm:block">
                          <span className="text-muted-foreground sm:block sm:text-xs">Shared with</span>
                          <span className="font-medium">{share.recipientName}</span>
                        </div>
                      )}
                      {share.sourceProfile && (
                        <div className="flex justify-between sm:block sm:col-span-2">
                          <span className="text-muted-foreground sm:block sm:text-xs">Profile / Listing</span>
                          <a
                            href={share.sourceProfile.startsWith("http") ? share.sourceProfile : `https://${share.sourceProfile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-700 hover:underline break-all"
                          >
                            {share.sourceProfile}
                          </a>
                        </div>
                      )}
                      {share.createdAt && (
                        <div className="flex justify-between sm:block">
                          <span className="text-muted-foreground sm:block sm:text-xs">Shared on</span>
                          <span className="font-medium">{formatDate(share.createdAt)}</span>
                        </div>
                      )}
                      {share.notes && (
                        <div className="sm:col-span-2 mt-1">
                          <span className="text-muted-foreground text-xs block mb-1">Notes</span>
                          <p className="font-medium whitespace-pre-wrap">{share.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
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

                  {hasListings && (
                    <div className="flex flex-col gap-2">
                      <Label>Listing round</Label>
                      <select
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        value={editListingId}
                        onChange={(e) => setEditListingId(e.target.value)}
                      >
                        <option value="">No listing</option>
                        {listings
                          .filter((l) => selected.propertyId == null || l.propertyId === selected.propertyId)
                          .map((l) => (
                            <option key={l.id} value={String(l.id)}>
                              {listingName(l)} {l.closedAt ? "(closed)" : "(open)"}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

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
              <Button
                variant="outline"
                onClick={openAiDialog}
                className="gap-1"
              >
                <Sparkles className="size-4" />
                Rate with AI
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

      {/* Rate with AI dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-violet-600" />
              Rate with AI {selected ? `— ${getName(selected)}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {aiStep === "input" && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">1. Copy this prompt → paste into Claude / ChatGPT</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={handleAiCopyPrompt}
                      disabled={aiLoadingPrompt || !aiPrompt}
                    >
                      {aiCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                      {aiCopied ? "Copied" : "Copy prompt"}
                    </Button>
                  </div>
                  {aiLoadingPrompt ? (
                    <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      Building prompt…
                    </div>
                  ) : (
                    <pre className="max-h-56 overflow-y-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-words">
                      {aiPrompt}
                    </pre>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">2. Paste the JSON response below — we&apos;ll detect it automatically</p>
                  <Textarea
                    rows={10}
                    value={aiPasteValue}
                    onChange={(e) => handleAiPasteChange(e.target.value)}
                    placeholder='{"summary":"…","adminRating":7,"recommendedStatus":"review", …}'
                    className="font-mono text-xs"
                  />
                  {aiParseError && (
                    <p className="mt-2 text-sm text-destructive">{aiParseError}</p>
                  )}
                </div>
              </div>
            )}

            {aiStep === "review" && aiParsed && (
              <div className="space-y-5">
                <div className="rounded-lg border bg-violet-50/50 p-3 text-sm">
                  <p className="font-medium text-violet-900">AI summary</p>
                  <p className="mt-1 text-violet-900/90">{aiParsed.summary || "—"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ai-rating">Admin rating (0–10)</Label>
                    <Input
                      id="ai-rating"
                      type="number"
                      min={0}
                      max={10}
                      value={aiParsed.adminRating}
                      onChange={(e) => updateAiParsed("adminRating", Math.min(Math.max(Number(e.target.value) || 0, 0), 10))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ai-status">Recommended status</Label>
                    <select
                      id="ai-status"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={aiParsed.recommendedStatus}
                      onChange={(e) => updateAiParsed("recommendedStatus", e.target.value as PrescreeningAIAnalysis["recommendedStatus"])}
                    >
                      <option value="review">Review</option>
                      <option value="with-concerns">With concerns</option>
                      <option value="in-progress">In progress</option>
                      <option value="pre-approved">Pre-approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {aiParsed.recommendedStatus === "rejected" && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ai-reject">Reject reason</Label>
                    <Input
                      id="ai-reject"
                      value={aiParsed.rejectReason ?? ""}
                      onChange={(e) => updateAiParsed("rejectReason", e.target.value)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <Label htmlFor="ai-notes">Admin notes</Label>
                  <Textarea
                    id="ai-notes"
                    rows={5}
                    value={aiParsed.adminNotes}
                    onChange={(e) => updateAiParsed("adminNotes", e.target.value)}
                  />
                </div>

                {(aiParsed.redFlags.length > 0 || aiParsed.greenFlags.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiParsed.redFlags.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                        <p className="text-sm font-medium text-red-900">Red flags</p>
                        <ul className="mt-1 list-disc pl-5 text-sm text-red-900/90 space-y-0.5">
                          {aiParsed.redFlags.map((f, i) => (<li key={i}>{f}</li>))}
                        </ul>
                      </div>
                    )}
                    {aiParsed.greenFlags.length > 0 && (
                      <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
                        <p className="text-sm font-medium text-green-900">Strengths</p>
                        <ul className="mt-1 list-disc pl-5 text-sm text-green-900/90 space-y-0.5">
                          {aiParsed.greenFlags.map((f, i) => (<li key={i}>{f}</li>))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {(aiParsed.incomeAnalysis?.comment || aiParsed.creditAnalysis?.comment || aiParsed.voucherAnalysis) && (
                  <div className="rounded-lg border p-3 text-sm space-y-2">
                    {aiParsed.incomeAnalysis?.comment && (
                      <p><span className="font-medium">Income:</span> {aiParsed.incomeAnalysis.comment}</p>
                    )}
                    {aiParsed.creditAnalysis?.comment && (
                      <p><span className="font-medium">Credit:</span> {aiParsed.creditAnalysis.comment}</p>
                    )}
                    {aiParsed.voucherAnalysis && (
                      <p><span className="font-medium">Voucher:</span> {coerceToStringOrNull(aiParsed.voucherAnalysis) ?? ""}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <div>
              {aiStep === "review" && (
                <Button variant="ghost" onClick={() => setAiStep("input")}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                Cancel
              </Button>
              {aiStep === "review" && (
                <Button onClick={handleAiSave} disabled={aiSaving}>
                  {aiSaving ? "Saving…" : "Save to application"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
