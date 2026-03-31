"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { PlusIcon, PencilIcon, TrashIcon, BuildingIcon } from "lucide-react"

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
}

const emptyProperty: Omit<Property, "id"> = {
  name: "", address1: "", city: "", state: "", zip: "",
  monthlyRent: 0, securityDeposit: 0, leaseType: "fixed", status: "available",
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

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [form, setForm] = useState(emptyProperty)
  const [saving, setSaving] = useState(false)

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

  function updateForm(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
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
                  <div className="mt-2 flex gap-2">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
