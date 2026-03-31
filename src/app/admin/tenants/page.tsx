"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { PlusIcon, PencilIcon, TrashIcon, LinkIcon, CopyIcon } from "lucide-react"

interface Tenant {
  id: string
  propertyId: string
  fullName: string
  email: string
  phone: string
  accessToken: string
  moveInDate: string
  moveOutDate: string
  monthlyRent: number
  depositRequired: number
  depositPaid: number
  leaseStatus: string
  notes: string
}

interface Property {
  id: string
  name: string
}

const emptyTenant: Omit<Tenant, "id" | "accessToken"> = {
  propertyId: "", fullName: "", email: "", phone: "",
  moveInDate: "", moveOutDate: "", monthlyRent: 0,
  depositRequired: 0, depositPaid: 0, leaseStatus: "active", notes: "",
}

const leaseStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-800",
  terminated: "bg-red-100 text-red-800",
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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [form, setForm] = useState<Omit<Tenant, "id" | "accessToken">>(emptyTenant)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/properties"),
      ])
      if (!tRes.ok) throw new Error("Failed to load tenants")
      const tData = await tRes.json()
      setTenants(Array.isArray(tData) ? tData : tData.data || [])
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

  function openAdd() {
    setEditing(null)
    setForm(emptyTenant)
    setDialogOpen(true)
  }

  function openEdit(t: Tenant) {
    setEditing(t)
    setForm({
      propertyId: t.propertyId, fullName: t.fullName, email: t.email, phone: t.phone,
      moveInDate: t.moveInDate?.split("T")[0] || "", moveOutDate: t.moveOutDate?.split("T")[0] || "",
      monthlyRent: t.monthlyRent, depositRequired: t.depositRequired,
      depositPaid: t.depositPaid, leaseStatus: t.leaseStatus, notes: t.notes || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editing ? `/api/tenants/${editing.id}` : "/api/tenants"
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
    if (!confirm("Delete this tenant?")) return
    try {
      const res = await fetch(`/api/tenants/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function updateForm(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function getPropertyName(id: string) {
    return properties.find((p) => p.id === id)?.name || id
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading tenants...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button onClick={openAdd}>
          <PlusIcon className="size-4" />
          Add Tenant
        </Button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No tenants yet. Add your first tenant to get started.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Property</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Move In</TableHead>
                <TableHead className="hidden md:table-cell">Rent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Maintenance Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => {
                const depositPercent = t.depositRequired > 0 ? Math.round((t.depositPaid / t.depositRequired) * 100) : 0
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getPropertyName(t.propertyId)}</TableCell>
                    <TableCell className="hidden md:table-cell">{t.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(t.moveInDate)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatCurrency(t.monthlyRent)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs">{formatCurrency(t.depositPaid)} / {formatCurrency(t.depositRequired)}</span>
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full ${depositPercent >= 100 ? "bg-green-500" : depositPercent > 0 ? "bg-yellow-500" : "bg-gray-300"}`}
                            style={{ width: `${Math.min(depositPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={leaseStatusColors[t.leaseStatus] || ""}>
                        {t.leaseStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {t.leaseStatus === "active" && t.accessToken ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            const link = `${window.location.origin}/maintenance/${t.accessToken}`
                            navigator.clipboard.writeText(link)
                            alert("Maintenance link copied!")
                          }}
                        >
                          <CopyIcon className="size-3" />
                          Copy Link
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(t.id)}>
                          <TrashIcon className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
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
            <DialogTitle>{editing ? "Edit Tenant" : "Add Tenant"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label>Property</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={form.propertyId}
                onChange={(e) => updateForm("propertyId", e.target.value)}
              >
                <option value="">Select property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => updateForm("fullName", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Move In Date</Label>
                <Input type="date" value={form.moveInDate} onChange={(e) => updateForm("moveInDate", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Move Out Date</Label>
                <Input type="date" value={form.moveOutDate} onChange={(e) => updateForm("moveOutDate", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Monthly Rent</Label>
              <Input type="number" value={form.monthlyRent} onChange={(e) => updateForm("monthlyRent", Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Deposit Required</Label>
                <Input type="number" value={form.depositRequired} onChange={(e) => updateForm("depositRequired", Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Deposit Paid</Label>
                <Input type="number" value={form.depositPaid} onChange={(e) => updateForm("depositPaid", Number(e.target.value))} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Lease Status</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={form.leaseStatus}
                onChange={(e) => updateForm("leaseStatus", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
