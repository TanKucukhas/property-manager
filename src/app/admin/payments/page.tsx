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
import { PlusIcon, PencilIcon, CheckCircleIcon } from "lucide-react"

interface Payment {
  id: string
  tenantId: string
  propertyId: string
  dueDate: string
  amountDue: number
  amountPaid: number
  paymentDate: string
  paymentMethod: string
  status: string
  lateFee: number
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

const emptyPayment: Omit<Payment, "id"> = {
  tenantId: "", propertyId: "", dueDate: "", amountDue: 0, amountPaid: 0,
  paymentDate: "", paymentMethod: "zelle", status: "unpaid", lateFee: 0, notes: "",
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  unpaid: "bg-gray-100 text-gray-800",
  late: "bg-red-100 text-red-800",
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [form, setForm] = useState(emptyPayment)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      const [payRes, tenRes, propRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/tenants"),
        fetch("/api/properties"),
      ])
      if (!payRes.ok) throw new Error("Failed to load payments")
      const payData = await payRes.json()
      setPayments(Array.isArray(payData) ? payData : payData.data || [])
      if (tenRes.ok) {
        const tenData = await tenRes.json()
        setTenants(Array.isArray(tenData) ? tenData : tenData.data || [])
      }
      if (propRes.ok) {
        const propData = await propRes.json()
        setProperties(Array.isArray(propData) ? propData : propData.data || [])
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
    setForm(emptyPayment)
    setDialogOpen(true)
  }

  function openEdit(p: Payment) {
    setEditing(p)
    setForm({
      tenantId: p.tenantId, propertyId: p.propertyId,
      dueDate: p.dueDate?.split("T")[0] || "",
      amountDue: p.amountDue, amountPaid: p.amountPaid,
      paymentDate: p.paymentDate?.split("T")[0] || "",
      paymentMethod: p.paymentMethod, status: p.status,
      lateFee: p.lateFee || 0, notes: p.notes || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editing ? `/api/payments/${editing.id}` : "/api/payments"
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

  async function markAsPaid(payment: Payment) {
    try {
      const today = new Date().toISOString().split("T")[0]
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payment,
          status: "paid",
          amountPaid: payment.amountDue,
          paymentDate: today,
        }),
      })
      if (!res.ok) throw new Error("Failed to update")
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed")
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
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading payments...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center py-20 text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button onClick={openAdd}>
          <PlusIcon className="size-4" />
          Add Payment
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No payments yet. Add your first payment to get started.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="hidden sm:table-cell">Property</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="hidden md:table-cell">Due</TableHead>
                <TableHead className="hidden md:table-cell">Paid</TableHead>
                <TableHead className="hidden lg:table-cell">Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{getTenantName(p.tenantId)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{getPropertyName(p.propertyId)}</TableCell>
                  <TableCell>{formatDate(p.dueDate)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatCurrency(p.amountDue)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatCurrency(p.amountPaid)}</TableCell>
                  <TableCell className="hidden lg:table-cell capitalize">{p.paymentMethod}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[p.status] || ""}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status !== "paid" && (
                        <Button variant="ghost" size="icon-sm" onClick={() => markAsPaid(p)} title="Mark as paid">
                          <CheckCircleIcon className="size-3.5 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}>
                        <PencilIcon className="size-3.5" />
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
            <DialogTitle>{editing ? "Edit Payment" : "Add Payment"}</DialogTitle>
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
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => updateForm("dueDate", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Payment Date</Label>
                <Input type="date" value={form.paymentDate} onChange={(e) => updateForm("paymentDate", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Amount Due</Label>
                <Input type="number" value={form.amountDue} onChange={(e) => updateForm("amountDue", Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Amount Paid</Label>
                <Input type="number" value={form.amountPaid} onChange={(e) => updateForm("amountPaid", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Payment Method</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.paymentMethod}
                  onChange={(e) => updateForm("paymentMethod", e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="money-order">Money Order</option>
                  <option value="zelle">Zelle</option>
                  <option value="venmo">Venmo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Late Fee</Label>
              <Input type="number" value={form.lateFee} onChange={(e) => updateForm("lateFee", Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Payment notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
