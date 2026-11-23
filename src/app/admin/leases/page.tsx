"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"
import { LeaseTermPicker } from "@/components/lease/lease-term-picker"
import { DEFAULT_HOUSE_TERMS, houseTermsFromDefaults, type HouseDefaults } from "@/lib/lease-docs/standard-terms"
import Link from "next/link"

interface Lease {
  id: string
  propertyId: string
  leaseStart: string
  leaseEnd: string
  monthlyRent: number
  lateFeeRule: string
  securityDeposit: number
  petsAllowed: boolean
  petFee: number
  petRent: number
  utilitiesTerms: string
  maintenanceTerms: string
  smokingTerms: string
  showingNoticeTerms: string
  specialTerms: string
}

interface Property {
  id: string
  name: string
  monthlyRent?: number
  securityDeposit?: number
}

const emptyLease: Omit<Lease, "id"> = {
  propertyId: "", leaseStart: "", leaseEnd: "", monthlyRent: 0,
  lateFeeRule: "", securityDeposit: 0, petsAllowed: false, petFee: 0, petRent: 0,
  utilitiesTerms: "", maintenanceTerms: "", smokingTerms: "",
  showingNoticeTerms: "", specialTerms: "",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(d: string | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Lease | null>(null)
  const [form, setForm] = useState(emptyLease)
  const [saving, setSaving] = useState(false)
  const [defaults, setDefaults] = useState<HouseDefaults>(DEFAULT_HOUSE_TERMS)
  const houseDefaults = houseTermsFromDefaults(defaults)

  async function loadData() {
    try {
      const [lRes, pRes, dRes] = await Promise.all([
        fetch("/api/leases"),
        fetch("/api/properties"),
        fetch("/api/lease-defaults"),
      ])
      if (dRes.ok) setDefaults(await dRes.json())
      if (!lRes.ok) throw new Error("Failed to load leases")
      const lData = await lRes.json()
      setLeases(Array.isArray(lData) ? lData : lData.data || [])
      if (pRes.ok) {
        const pData = await pRes.json()
        setProperties(Array.isArray(pData) ? pData : pData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function applyDefaults() {
    const res = await fetch("/api/lease-defaults/apply", { method: "POST" })
    const r = await res.json()
    if (!res.ok) return alert(r.error || "Failed")
    alert(r.created ? `Added default terms to ${r.created} house(s).` : "Every house already has terms.")
    loadData()
  }

  function openAdd() {
    setEditing(null)
    // New leases start from our standard terms; everything stays editable.
    setForm({ ...emptyLease, ...houseDefaults })
    setDialogOpen(true)
  }

  function openEdit(l: Lease) {
    setEditing(l)
    setForm({
      propertyId: l.propertyId,
      leaseStart: l.leaseStart?.split("T")[0] || "",
      leaseEnd: l.leaseEnd?.split("T")[0] || "",
      monthlyRent: l.monthlyRent, lateFeeRule: l.lateFeeRule || "",
      securityDeposit: l.securityDeposit, petsAllowed: l.petsAllowed,
      petFee: l.petFee || 0, petRent: l.petRent || 0,
      utilitiesTerms: l.utilitiesTerms || "", maintenanceTerms: l.maintenanceTerms || "",
      smokingTerms: l.smokingTerms || "", showingNoticeTerms: l.showingNoticeTerms || "",
      specialTerms: l.specialTerms || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editing ? `/api/leases/${editing.id}` : "/api/leases"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lease?")) return
    try {
      const res = await fetch(`/api/leases/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function updateForm(key: string, value: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function getPropertyName(id: string) {
    return properties.find((p) => p.id === id)?.name || id
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading leases...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lease Terms</h1>
          <p className="text-sm text-muted-foreground">Each house’s own terms. New houses start from the default house terms; new leases are filled from here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leases/defaults" className="inline-flex h-9 items-center rounded-lg border px-3 text-sm hover:bg-muted">Default house terms</Link>
          <Button variant="outline" onClick={applyDefaults}>Add defaults to houses without terms</Button>
          <Button onClick={openAdd}>
            <PlusIcon className="size-4" />
            Add Lease
          </Button>
        </div>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No leases yet. Add your first lease to get started.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="hidden sm:table-cell">Rent</TableHead>
                <TableHead className="hidden md:table-cell">Deposit</TableHead>
                <TableHead className="hidden lg:table-cell">Pets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{getPropertyName(l.propertyId)}</TableCell>
                  <TableCell>{formatDate(l.leaseStart)}</TableCell>
                  <TableCell>{formatDate(l.leaseEnd)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatCurrency(l.monthlyRent)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatCurrency(l.securityDeposit)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{l.petsAllowed ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(l)}>
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(l.id)}>
                        <TrashIcon className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Lease" : "Add Lease"}</DialogTitle>
            <button
              type="button"
              className="w-fit text-xs text-primary hover:underline"
              onClick={() => setForm((f) => {
                // Fill only empty fields so nothing typed is overwritten.
                const next = { ...f }
                for (const [k, v] of Object.entries(houseDefaults) as [keyof typeof houseDefaults, string | number][]) {
                  if (!next[k]) (next as Record<string, unknown>)[k] = v
                }
                return next
              })}
            >
              Fill empty fields with the default house terms
            </button>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              <Label>Property</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={form.propertyId}
                onChange={(e) => {
                  // Prefill rent and deposit from the property; keep anything already typed.
                  const p = properties.find((x) => String(x.id) === e.target.value)
                  setForm((f) => ({
                    ...f,
                    propertyId: e.target.value,
                    monthlyRent: f.monthlyRent || p?.monthlyRent || 0,
                    securityDeposit: f.securityDeposit || p?.securityDeposit || 0,
                  }))
                }}
              >
                <option value="">Select property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <LeaseTermPicker
              key={editing?.id ?? "new"}
              start={form.leaseStart}
              end={form.leaseEnd}
              onChange={(s, e) => setForm((f) => ({ ...f, leaseStart: s, leaseEnd: e }))}
            />
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
            <div className="flex flex-col gap-2">
              <Label>Late Fee Rule</Label>
              <Input value={form.lateFeeRule} onChange={(e) => updateForm("lateFeeRule", e.target.value)} placeholder="e.g. $50 after 5 days" />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="petsAllowed"
                checked={form.petsAllowed}
                onChange={(e) => updateForm("petsAllowed", e.target.checked)}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="petsAllowed">Pets Allowed</Label>
            </div>
            {form.petsAllowed && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Pet Fee (one-time)</Label>
                  <Input type="number" value={form.petFee} onChange={(e) => updateForm("petFee", Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Pet Rent (monthly)</Label>
                  <Input type="number" value={form.petRent} onChange={(e) => updateForm("petRent", Number(e.target.value))} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Utilities Terms</Label>
              <Textarea value={form.utilitiesTerms} onChange={(e) => updateForm("utilitiesTerms", e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Maintenance Terms</Label>
              <Textarea value={form.maintenanceTerms} onChange={(e) => updateForm("maintenanceTerms", e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Smoking Terms</Label>
              <Textarea value={form.smokingTerms} onChange={(e) => updateForm("smokingTerms", e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Showing Notice Terms</Label>
              <Textarea value={form.showingNoticeTerms} onChange={(e) => updateForm("showingNoticeTerms", e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Special Terms</Label>
              <Textarea value={form.specialTerms} onChange={(e) => updateForm("specialTerms", e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Lease"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
