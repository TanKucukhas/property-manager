"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { PlusIcon, PencilIcon, TrashIcon, BuildingIcon, BrainCircuitIcon, CopyIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, Share2Icon } from "lucide-react"

interface Property {
  id: string
  name: string
  address1: string
  city: string
  state: string
  zip: string
  monthlyRent: number
  securityDeposit: number
  leaseType: string
  status: string
  incomeMultiplier: number
  minCreditScore: number | null
  petsPolicy: string
  smokingAllowed: boolean
  subleaseAllowed: boolean
  airbnbAllowed: boolean
  acceptsVouchers: boolean
  customRequirements: string | null
  aiAnalysis: string | null
  aiAnalysisDate: string | null
}

const emptyProperty: Omit<Property, "id" | "aiAnalysis" | "aiAnalysisDate"> = {
  name: "", address1: "", city: "", state: "", zip: "",
  monthlyRent: 0, securityDeposit: 0, leaseType: "fixed", status: "available",
  incomeMultiplier: 2.75, minCreditScore: null, petsPolicy: "case_by_case",
  smokingAllowed: false, subleaseAllowed: false, airbnbAllowed: false,
  acceptsVouchers: false, customRequirements: null,
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-800",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(d: string | null | undefined) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/* ------------------------------------------------------------------ */
/*  AI Analysis Viewer                                                  */
/* ------------------------------------------------------------------ */

function AnalysisSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-3 text-left text-sm font-medium hover:bg-muted/50 transition">
        {title}
        {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
      </button>
      {open && <div className="border-t p-3 text-sm">{children}</div>}
    </div>
  )
}

function AIAnalysisView({ data }: { data: Record<string, unknown> }) {
  const subject = data.subjectProperty as Record<string, unknown> | undefined
  const details = data.propertyDetails as Record<string, unknown> | undefined
  const location = data.locationAnalysis as Record<string, unknown> | undefined
  const market = data.rentalMarket as Record<string, unknown> | undefined
  const comps = data.rentalComps as Record<string, unknown>[] | undefined
  const strategy = data.rentStrategy as Record<string, unknown> | undefined
  const risk = data.riskAnalysis as Record<string, unknown> | undefined
  const recs = data.strategyRecommendations as Record<string, unknown> | undefined
  const signals = data.signals as Record<string, unknown>[] | undefined
  const content = data.websiteContent as Record<string, unknown> | undefined

  return (
    <div className="space-y-3">
      {subject && (
        <AnalysisSection title="Property Identity">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Type:</span> {String(subject.propertyType || "—")}</div>
            <div><span className="text-muted-foreground">Beds/Bath:</span> {String(subject.bedrooms || "?")}/{String(subject.bathrooms || "?")}</div>
            <div><span className="text-muted-foreground">Sqft:</span> {String(subject.squareFeet || "—")}</div>
            <div><span className="text-muted-foreground">Year Built:</span> {String(subject.yearBuilt || "—")}</div>
            <div><span className="text-muted-foreground">Parcel:</span> {String(subject.parcelNumber || "—")}</div>
            <div><span className="text-muted-foreground">Zoning:</span> {String(subject.zoning || "—")}</div>
            <div><span className="text-muted-foreground">Owner:</span> {String(subject.ownerName || "—")}</div>
            <div><span className="text-muted-foreground">Assessed:</span> {String(subject.assessedValue || "—")}</div>
            <div><span className="text-muted-foreground">Tax:</span> {String(subject.annualPropertyTax || "—")}</div>
            <div><span className="text-muted-foreground">Last Sale:</span> {String(subject.lastSalePrice || "—")} {subject.lastSaleDate ? `(${subject.lastSaleDate})` : ""}</div>
          </div>
        </AnalysisSection>
      )}

      {details && (
        <AnalysisSection title="Property Details">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Interior:</span> {String(details.interiorCondition || "—")}</div>
            <div><span className="text-muted-foreground">Exterior:</span> {String(details.exteriorCondition || "—")}</div>
            <div><span className="text-muted-foreground">Parking:</span> {String(details.parking || "—")}</div>
            <div><span className="text-muted-foreground">Laundry:</span> {String(details.laundry || "—")}</div>
            <div><span className="text-muted-foreground">Yard:</span> {String(details.yard || "—")}</div>
            <div><span className="text-muted-foreground">Pets:</span> {String(details.petPotential || "—")}</div>
          </div>
          {Array.isArray(details.amenities) && details.amenities.length > 0 && (
            <div className="mt-2"><span className="text-muted-foreground">Amenities:</span> {details.amenities.join(", ")}</div>
          )}
        </AnalysisSection>
      )}

      {location && (
        <AnalysisSection title="Location Analysis">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Neighborhood:</span> {String(location.neighborhood || "—")}</div>
            <div><span className="text-muted-foreground">Street:</span> {String(location.streetContext || "—")}</div>
            <div><span className="text-muted-foreground">Walkability:</span> {String(location.walkability || "—")}</div>
            <div><span className="text-muted-foreground">Transit:</span> {String(location.transitAccess || "—")}</div>
            <div><span className="text-muted-foreground">Parking:</span> {String(location.parkingEase || "—")}</div>
            <div><span className="text-muted-foreground">Noise:</span> {String(location.noiseExposure || "—")}</div>
            <div><span className="text-muted-foreground">Flood:</span> {String(location.floodRisk || "—")}</div>
          </div>
        </AnalysisSection>
      )}

      {strategy && (
        <AnalysisSection title="Rent Strategy">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Conservative:</span> <span className="font-medium">{String(strategy.conservativeRent || "—")}</span></div>
            <div><span className="text-muted-foreground">Target:</span> <span className="font-semibold text-green-700">{String(strategy.targetRent || "—")}</span></div>
            <div><span className="text-muted-foreground">Aspirational:</span> <span className="font-medium">{String(strategy.aspirationalRent || "—")}</span></div>
            <div><span className="text-muted-foreground">Fast Lease:</span> {String(strategy.fastLeasePrice || "—")}</div>
            <div><span className="text-muted-foreground">Confidence:</span> {String(strategy.confidence || "—")}</div>
          </div>
          {strategy.pricingLogic ? <p className="mt-2 text-muted-foreground">{String(strategy.pricingLogic)}</p> : null}
        </AnalysisSection>
      )}

      {market && (
        <AnalysisSection title="Rental Market">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Type:</span> {String(market.marketType || "—")}</div>
            <div><span className="text-muted-foreground">Demand:</span> {String(market.demandStrength || "—")}</div>
            <div><span className="text-muted-foreground">Lease-up:</span> {String(market.leaseUpDifficulty || "—")}</div>
            <div><span className="text-muted-foreground">Active Comps:</span> {String(market.activeCompCount || 0)}</div>
          </div>
          {market.compSummary ? <p className="mt-2 text-muted-foreground">{String(market.compSummary)}</p> : null}
        </AnalysisSection>
      )}

      {comps && comps.length > 0 && (
        <AnalysisSection title={`Rental Comps (${comps.length})`}>
          <div className="space-y-2">
            {comps.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                <div className="flex-1 truncate">{String(c.address || "—")}</div>
                <div className="font-medium whitespace-nowrap">{String(c.askingRent || "—")}</div>
                <div className="text-muted-foreground whitespace-nowrap">{String(c.bedrooms || "?")}bd/{String(c.bathrooms || "?")}ba</div>
                <Badge variant="secondary" className="text-[10px]">{String(c.similarity || "—")}</Badge>
              </div>
            ))}
          </div>
        </AnalysisSection>
      )}

      {risk && (
        <AnalysisSection title="Risk Analysis">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Overall:</span> <span className="font-medium">{String(risk.overallRisk || "—")}</span></div>
            <div><span className="text-muted-foreground">Maintenance:</span> {String(risk.maintenanceRisk || "—")}</div>
            <div><span className="text-muted-foreground">Regulatory:</span> {String(risk.regulatoryRisk || "—")}</div>
            <div><span className="text-muted-foreground">Leasing:</span> {String(risk.leasingRisk || "—")}</div>
            <div><span className="text-muted-foreground">Turnover:</span> {String(risk.turnoverRisk || "—")}</div>
          </div>
        </AnalysisSection>
      )}

      {recs && (
        <AnalysisSection title="Strategy Recommendations">
          <div className="space-y-2">
            <div><span className="text-muted-foreground">Best Use:</span> <span className="font-medium">{String(recs.bestUse || "—")}</span></div>
            <div><span className="text-muted-foreground">Positioning:</span> {String(recs.positioningAngle || "—")}</div>
            {Array.isArray(recs.rentReadyPriorities) && recs.rentReadyPriorities.length > 0 && (
              <div><span className="text-muted-foreground">Rent-Ready:</span> {recs.rentReadyPriorities.join(" / ")}</div>
            )}
            {Array.isArray(recs.topROIUpgrades) && recs.topROIUpgrades.length > 0 && (
              <div><span className="text-muted-foreground">Top ROI Upgrades:</span> {recs.topROIUpgrades.join(" / ")}</div>
            )}
          </div>
        </AnalysisSection>
      )}

      {signals && signals.length > 0 && (
        <AnalysisSection title={`Signals (${signals.length})`}>
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div key={i} className="rounded border p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`text-[10px] ${s.opportunityOrRisk === "opportunity" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {String(s.opportunityOrRisk || "—")}
                  </Badge>
                  <span className="text-muted-foreground">{String(s.confidence || "—")} confidence</span>
                </div>
                <p className="mt-1 font-medium">{String(s.observation || "")}</p>
                <p className="text-muted-foreground">{String(s.whyItMatters || "")}</p>
              </div>
            ))}
          </div>
        </AnalysisSection>
      )}

      {content && (
        <AnalysisSection title="Website Content">
          {content.seoTitle ? <div><span className="text-muted-foreground">SEO Title:</span> {String(content.seoTitle)}</div> : null}
          {content.metaDescription ? <div className="mt-1"><span className="text-muted-foreground">Meta:</span> {String(content.metaDescription)}</div> : null}
          {content.shortListingSummary ? <div className="mt-1"><span className="text-muted-foreground">Summary:</span> {String(content.shortListingSummary)}</div> : null}
          {Array.isArray(content.localKeywords) && content.localKeywords.length > 0 && (
            <div className="mt-1"><span className="text-muted-foreground">Keywords:</span> {content.localKeywords.join(", ")}</div>
          )}
        </AnalysisSection>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [form, setForm] = useState(emptyProperty)
  const [saving, setSaving] = useState(false)

  // AI Intelligence state
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiProperty, setAiProperty] = useState<Property | null>(null)
  const [aiStep, setAiStep] = useState<"prompt" | "paste" | "view">("prompt")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiPasteValue, setAiPasteValue] = useState("")
  const [aiSaving, setAiSaving] = useState(false)
  const [aiCopied, setAiCopied] = useState(false)
  const [aiParsed, setAiParsed] = useState<Record<string, unknown> | null>(null)

  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareProperty, setShareProperty] = useState<Property | null>(null)
  const [shareType, setShareType] = useState<"direct" | "public">("direct")
  const [shareLeadSource, setShareLeadSource] = useState("Facebook DM")
  const [shareRecipientName, setShareRecipientName] = useState("")
  const [shareSourceProfile, setShareSourceProfile] = useState("")
  const [shareNotes, setShareNotes] = useState("")
  const [shareSaving, setShareSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const LEAD_SOURCES_DIRECT = ["Facebook DM", "Instagram DM", "Text/SMS", "WhatsApp", "Email", "Referral", "Other"]
  const LEAD_SOURCES_PUBLIC = ["Facebook Marketplace", "Facebook Group", "Zillow", "Craigslist", "Instagram Post", "Roomies", "Other"]

  function openShareDialog(p: Property | null) {
    setShareProperty(p)
    setShareType("direct")
    setShareLeadSource("Facebook DM")
    setShareRecipientName("")
    setShareSourceProfile("")
    setShareNotes("")
    setShareUrl(null)
    setShareCopied(false)
    setShareDialogOpen(true)
  }

  async function handleCreateShare() {
    setShareSaving(true)
    try {
      const res = await fetch("/api/admin/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareType,
          propertyId: shareProperty ? parseInt(shareProperty.id) : null,
          leadSource: shareLeadSource,
          recipientName: shareType === "direct" ? shareRecipientName : null,
          sourceProfile: shareSourceProfile,
          notes: shareNotes,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to create share")
      const data = await res.json()
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      setShareUrl(`${origin}/apply?ref=${data.token}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create share")
    } finally {
      setShareSaving(false)
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  async function loadProperties() {
    try {
      const res = await fetch("/api/properties")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setProperties(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProperties() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyProperty)
    setDialogOpen(true)
  }

  function openEdit(p: Property) {
    setEditing(p)
    setForm({
      name: p.name, address1: p.address1, city: p.city, state: p.state, zip: p.zip,
      monthlyRent: p.monthlyRent, securityDeposit: p.securityDeposit,
      leaseType: p.leaseType, status: p.status,
      incomeMultiplier: p.incomeMultiplier ?? 2.75,
      minCreditScore: p.minCreditScore ?? null,
      petsPolicy: p.petsPolicy ?? "case_by_case",
      smokingAllowed: !!p.smokingAllowed,
      subleaseAllowed: !!p.subleaseAllowed,
      airbnbAllowed: !!p.airbnbAllowed,
      acceptsVouchers: !!p.acceptsVouchers,
      customRequirements: p.customRequirements ?? null,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editing ? `/api/properties/${editing.id}` : "/api/properties"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      loadProperties()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this property?")) return
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      loadProperties()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function updateForm(key: string, value: string | number | boolean | null) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // AI Intelligence functions
  async function openAiDialog(p: Property) {
    setAiProperty(p)
    setAiCopied(false)
    setAiPasteValue("")
    setAiParsed(null)

    if (p.aiAnalysis) {
      try {
        setAiParsed(JSON.parse(p.aiAnalysis))
        setAiStep("view")
      } catch {
        setAiStep("prompt")
      }
    } else {
      setAiStep("prompt")
    }

    // Generate prompt dynamically
    const { generatePropertyAnalysisPrompt } = await import("@/lib/ai-prompt")
    setAiPrompt(generatePropertyAnalysisPrompt({
      address: p.address1,
      city: p.city,
      state: p.state,
      zip: p.zip,
      name: p.name,
      monthlyRent: p.monthlyRent,
    }))

    setAiDialogOpen(true)
  }

  function copyPrompt() {
    navigator.clipboard.writeText(aiPrompt)
    setAiCopied(true)
    setTimeout(() => setAiCopied(false), 2000)
  }

  async function saveAiAnalysis() {
    if (!aiProperty || !aiPasteValue.trim()) return

    // Validate JSON
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(aiPasteValue.trim())
    } catch {
      alert("Invalid JSON. Make sure you copied the complete AI response.")
      return
    }

    setAiSaving(true)
    try {
      const res = await fetch(`/api/properties/${aiProperty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiAnalysis: JSON.stringify(parsed) }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setAiParsed(parsed)
      setAiStep("view")
      loadProperties()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed")
    } finally {
      setAiSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading properties...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Button onClick={openAdd}>
          <PlusIcon className="size-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No properties yet. Add your first property to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-2">
                  <BuildingIcon className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </div>
                <Badge variant="secondary" className={statusColors[p.status] || ""}>
                  {p.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-sm">
                  <p className="text-muted-foreground">{p.address1}, {p.city}, {p.state} {p.zip}</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rent</span>
                    <span className="font-medium">{formatCurrency(p.monthlyRent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit</span>
                    <span className="font-medium">{formatCurrency(p.securityDeposit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lease Type</span>
                    <span className="font-medium capitalize">{p.leaseType}</span>
                  </div>

                  {p.aiAnalysisDate && (
                    <div className="flex items-center gap-1 mt-1">
                      <BrainCircuitIcon className="size-3 text-violet-600" />
                      <span className="text-xs text-violet-600">AI Report: {formatDate(p.aiAnalysisDate)}</span>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openShareDialog(p)} className="gap-1">
                      <Share2Icon className="size-3" /> Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openAiDialog(p)} className="gap-1">
                      <BrainCircuitIcon className="size-3" />
                      {p.aiAnalysis ? "View Report" : "AI Intel"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <PencilIcon className="size-3" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                      <TrashIcon className="size-3" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Property Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Property" : "Add Property"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label>Property Name</Label>
              <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. Oak Street Apartment" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Address</Label>
              <Input value={form.address1} onChange={(e) => updateForm("address1", e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => updateForm("state", e.target.value)} maxLength={2} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={(e) => updateForm("zip", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Monthly Rent</Label>
                <Input type="number" value={form.monthlyRent} onChange={(e) => updateForm("monthlyRent", Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Security Deposit</Label>
                <Input type="number" value={form.securityDeposit} onChange={(e) => updateForm("securityDeposit", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Lease Type</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.leaseType}
                  onChange={(e) => updateForm("leaseType", e.target.value)}
                >
                  <option value="fixed">Fixed</option>
                  <option value="month-to-month">Month-to-Month</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-1">Qualification requirements</h3>
              <p className="text-xs text-muted-foreground mb-3">
                These are shown to applicants on the apply page and used to score new applications.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Income multiplier</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    value={form.incomeMultiplier}
                    onChange={(e) => updateForm("incomeMultiplier", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Min monthly income = rent × this. Default 2.75.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Minimum credit score</Label>
                  <Input
                    type="number"
                    min="300"
                    max="850"
                    placeholder="No minimum"
                    value={form.minCreditScore ?? ""}
                    onChange={(e) =>
                      updateForm("minCreditScore", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for no minimum.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex flex-col gap-2">
                  <Label>Pets</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={form.petsPolicy}
                    onChange={(e) => updateForm("petsPolicy", e.target.value)}
                  >
                    <option value="allowed">Allowed</option>
                    <option value="case_by_case">Case-by-case</option>
                    <option value="not_allowed">Not allowed</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={!!form.smokingAllowed}
                      onChange={(e) => updateForm("smokingAllowed", e.target.checked)}
                    />
                    Smoking allowed
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={!!form.subleaseAllowed}
                      onChange={(e) => updateForm("subleaseAllowed", e.target.checked)}
                    />
                    Subleasing allowed
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={!!form.airbnbAllowed}
                      onChange={(e) => updateForm("airbnbAllowed", e.target.checked)}
                    />
                    Short-term rental / Airbnb allowed
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm mt-4 rounded-lg border p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  checked={!!form.acceptsVouchers}
                  onChange={(e) => updateForm("acceptsVouchers", e.target.checked)}
                />
                <span>
                  <span className="font-medium">Accept Housing Choice Voucher / Section 8 / PMHA</span>
                  <span className="block text-xs text-muted-foreground">
                    When on, applicants see a voucher information section on the apply page.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-2 mt-3">
                <Label>Custom requirements</Label>
                <Textarea
                  value={form.customRequirements ?? ""}
                  onChange={(e) => updateForm("customRequirements", e.target.value || null)}
                  placeholder={"One per line, e.g.\nNo more than 2 cats\nRenter's insurance required\nGarage parking only"}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  One requirement per line. Shown as a bullet list on the apply page.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Intelligence Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuitIcon className="size-5 text-violet-600" />
              Property Intelligence {aiProperty ? `— ${aiProperty.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Step: Prompt */}
            {aiStep === "prompt" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Copy this prompt and paste it into ChatGPT, Claude, or any AI. Then come back and paste the JSON result.
                </p>

                <div className="relative">
                  <pre className="max-h-60 overflow-y-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap break-words">
                    {aiPrompt.slice(0, 800)}...
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 gap-1"
                    onClick={copyPrompt}
                  >
                    {aiCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                    {aiCopied ? "Copied!" : "Copy Prompt"}
                  </Button>
                </div>

                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                  <p className="font-medium">How to use:</p>
                  <ol className="mt-1 list-inside list-decimal space-y-1 text-xs">
                    <li>Click &quot;Copy Prompt&quot; above</li>
                    <li>Open ChatGPT, Claude, or Perplexity</li>
                    <li>Paste the prompt and run it</li>
                    <li>Copy the entire JSON response</li>
                    <li>Come back here and click &quot;Paste Result&quot;</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Step: Paste */}
            {aiStep === "paste" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste the full JSON response from the AI below.
                </p>
                <textarea
                  className="w-full min-h-[300px] rounded-lg border border-input bg-transparent p-4 text-xs font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder='Paste the JSON here... should start with {'
                  value={aiPasteValue}
                  onChange={(e) => setAiPasteValue(e.target.value)}
                />
              </div>
            )}

            {/* Step: View */}
            {aiStep === "view" && aiParsed && (
              <div className="space-y-4">
                {aiProperty?.aiAnalysisDate && (
                  <p className="text-xs text-muted-foreground">
                    Report generated: {formatDate(aiProperty.aiAnalysisDate)}
                  </p>
                )}
                <AIAnalysisView data={aiParsed} />
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            {aiStep === "prompt" && (
              <>
                <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Close</Button>
                <Button onClick={() => setAiStep("paste")}>Paste Result</Button>
              </>
            )}
            {aiStep === "paste" && (
              <>
                <Button variant="outline" onClick={() => setAiStep("prompt")}>Back</Button>
                <Button onClick={saveAiAnalysis} disabled={aiSaving || !aiPasteValue.trim()}>
                  {aiSaving ? "Saving..." : "Save Analysis"}
                </Button>
              </>
            )}
            {aiStep === "view" && (
              <>
                <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Close</Button>
                <Button variant="outline" onClick={() => setAiStep("prompt")}>
                  Re-run Analysis
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2Icon className="size-4" /> Share Application{shareProperty ? ` — ${shareProperty.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          {!shareUrl ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Share Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setShareType("direct"); setShareLeadSource(LEAD_SOURCES_DIRECT[0]) }}
                    className={`rounded-lg border-2 p-3 text-sm transition ${shareType === "direct" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"}`}
                  >
                    <div className="font-medium">Direct (DM)</div>
                    <div className="text-xs text-muted-foreground mt-1">Tied to one specific person</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShareType("public"); setShareLeadSource(LEAD_SOURCES_PUBLIC[0]) }}
                    className={`rounded-lg border-2 p-3 text-sm transition ${shareType === "public" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"}`}
                  >
                    <div className="font-medium">Public Post</div>
                    <div className="text-xs text-muted-foreground mt-1">Posted on Marketplace, Zillow, etc.</div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Lead Source</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={shareLeadSource}
                  onChange={(e) => setShareLeadSource(e.target.value)}
                >
                  {(shareType === "direct" ? LEAD_SOURCES_DIRECT : LEAD_SOURCES_PUBLIC).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {shareType === "direct" && (
                <div className="flex flex-col gap-2">
                  <Label>Recipient Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={shareRecipientName}
                    onChange={(e) => setShareRecipientName(e.target.value)}
                    placeholder="e.g. John Smith"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>{shareType === "direct" ? "Profile URL or handle" : "Listing URL"} <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={shareSourceProfile}
                  onChange={(e) => setShareSourceProfile(e.target.value)}
                  placeholder={shareType === "direct" ? "https://facebook.com/john.smith" : "https://facebook.com/marketplace/item/..."}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                <textarea
                  className="min-h-[60px] rounded-md border border-input bg-background p-2 text-sm"
                  value={shareNotes}
                  onChange={(e) => setShareNotes(e.target.value)}
                  placeholder="Anything you want to remember about this lead"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Unique application link created. Copy and share it:</p>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button onClick={copyShareUrl} variant="outline" className="gap-1">
                  {shareCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                  {shareCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Submissions through this link will be tagged with the lead info you entered.
              </p>
            </div>
          )}

          <DialogFooter>
            {!shareUrl ? (
              <>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)} disabled={shareSaving}>Cancel</Button>
                <Button onClick={handleCreateShare} disabled={shareSaving}>
                  {shareSaving ? "Creating..." : "Create Link"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setShareDialogOpen(false)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
