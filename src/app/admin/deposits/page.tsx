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

interface Deposit {
  id: string
  tenantId: string
  propertyId: string
  depositRequired: number
  depositPaid: number
  paidDate: string
  refundAmount: number
  refundDate: string
  deductions: string
  notes: string
}

interface Tenant {
  id: string
  fullName: string
}

interface Property {
  id: string
  name: string
}

const emptyDeposit: Omit<Deposit, "id"> = {
  tenantId: "", propertyId: "", depositRequired: 0, depositPaid: 0,
  paidDate: "", refundAmount: 0, refundDate: "", deductions: "", notes: "",
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

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Deposit | null>(null)
  const [form, setForm] = useState(emptyDeposit)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      const [dRes, tRes, pRes] = await Promise.all([
        fetch("/api/deposits"),
        fetch("/api/tenants"),
        fetch("/api/properties"),
      ])
      if (!dRes.ok) throw new Error("Failed to load deposits")
      const dData = await dRes.json()
      setDeposits(Array.isArray(dData) ? dData : dData.data || [])
      if (tRes.ok) {
        const tData = await tRes.json()
        setTenants(Array.isArray(tData) ? tData : tData.data || [])
      }
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
    setForm(emptyDeposit)
    setDialogOpen(true)
  }

  function openEdit(d: Deposit) {
    setEditing(d)
    setForm({
      tenantId: d.tenantId, propertyId: d.propertyId,
      depositRequired: d.depositRequired, depositPaid: d.depositPaid,
      paidDate: d.paidDate?.split("T")[0] || "",
      refundAmount: d.refundAmount || 0,
      refundDate: d.refundDate?.split("T")[0] || "",
      deductions: d.deductions || "", notes: d.notes || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editing ? `/api/deposits/${editing.id}` : "/api/deposits"
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
    if (!confirm("Delete this deposit record?")) return
    try {
      const res = await fetch(`/api/deposits/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function updateForm(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function getTenantName(id: string) {
    return tenants.find((t) => t.id === id)?.fullName || id
  }

  function getPropertyName(id: string) {
    return properties.find((p) => p.id === id)?.name || id
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading deposits...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <Button onClick={openAdd}>
          <PlusIcon className="size-4" />
          Add Deposit
        </Button>
      </div>

      {deposits.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No deposits yet. Add your first deposit record to get started.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="hidden sm:table-cell">Property</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="hidden md:table-cell">Paid Date</TableHead>
                <TableHead className="hidden lg:table-cell">Refund</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d) => {
                const paidPercent = d.depositRequired > 0 ? Math.round((d.depositPaid / d.depositRequired) * 100) : 0
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{getTenantName(d.tenantId)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getPropertyName(d.propertyId)}</TableCell>
                    <TableCell>{formatCurrency(d.depositRequired)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-medium ${paidPercent >= 100 ? "text-green-600" : paidPercent > 0 ? "text-yellow-600" : "text-red-600"}`}>
                          {formatCurrency(d.depositPaid)}
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full ${paidPercent >= 100 ? "bg-green-500" : paidPercent > 0 ? "bg-yellow-500" : "bg-gray-300"}`}
                            style={{ width: `${Math.min(paidPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(d.paidDate)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{d.refundAmount ? formatCurrency(d.refundAmount) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(d)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(d.id)}>
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
            <DialogTitle>{editing ? "Edit Deposit" : "Add Deposit"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Tenant</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.tenantId}
                  onChange={(e) => updateForm("tenantId", e.target.value)}
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
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
              <Label>Paid Date</Label>
              <Input type="date" value={form.paidDate} onChange={(e) => updateForm("paidDate", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Refund Amount</Label>
                <Input type="number" value={form.refundAmount} onChange={(e) => updateForm("refundAmount", Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Refund Date</Label>
                <Input type="date" value={form.refundDate} onChange={(e) => updateForm("refundDate", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Deductions</Label>
              <Textarea value={form.deductions} onChange={(e) => updateForm("deductions", e.target.value)} placeholder="List deductions..." rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
