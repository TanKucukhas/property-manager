"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FileSignature, PlusIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate } from "@/lib/prescreening-ui"
import { PACKET_STATUS_STYLE } from "@/lib/lease-docs/ui"

interface PacketSummary {
  id: number
  title: string
  status: string
  sentAt: string | null
  completedAt: string | null
  createdAt: string
  signers: { name: string; role: string; status: string }[]
}

interface Option { id: number; label: string }

const LEASE_READY = ["approved", "tenant-accepted", "credit-check-sent", "pre-approved", "showing-completed"]

export default function LeaseDocumentsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
      <LeaseDocuments />
    </Suspense>
  )
}

function LeaseDocuments() {
  const router = useRouter()
  const search = useSearchParams()
  const [packets, setPackets] = useState<PacketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [source, setSource] = useState<"prescreening" | "tenant" | "property">("prescreening")
  const [sourceId, setSourceId] = useState("")
  const [applicants, setApplicants] = useState<(Option & { status: string })[]>([])
  const [tenants, setTenants] = useState<Option[]>([])
  const [properties, setProperties] = useState<Option[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch("/api/lease-packets").then((r) => r.json()).then((d) => setPackets(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!open) return
    Promise.all([fetch("/api/prescreening"), fetch("/api/tenants"), fetch("/api/properties")]).then(async ([a, t, p]) => {
      const ad = a.ok ? await a.json() : []
      const td = t.ok ? await t.json() : []
      const pd = p.ok ? await p.json() : []
      setApplicants((Array.isArray(ad) ? ad : []).map((x: { id: number; fullName: string; status: string; propertyName: string | null }) => ({
        id: x.id, status: x.status, label: `${x.fullName} — ${x.propertyName ?? "no property"} (${x.status})`,
      })))
      setTenants((Array.isArray(td) ? td : []).map((x: { id: number; fullName: string }) => ({ id: x.id, label: x.fullName })))
      setProperties((Array.isArray(pd) ? pd : pd.data || []).map((x: { id: number; name: string; address1: string }) => ({ id: x.id, label: `${x.name} — ${x.address1}` })))
    })
  }, [open])

  // Deep link from the Decide screen: /admin/leases/documents?prescreeningId=12
  useEffect(() => {
    const pid = search.get("prescreeningId")
    if (pid) { setSource("prescreening"); setSourceId(pid); setOpen(true) }
  }, [search])

  const applicantOptions = useMemo(
    () => (showAll ? applicants : applicants.filter((a) => LEASE_READY.includes(a.status) || String(a.id) === sourceId)),
    [applicants, showAll, sourceId],
  )

  async function create(blank = false) {
    setCreating(true)
    try {
      const q = blank || !sourceId ? "" : `?${source}Id=${sourceId}`
      const pre = await (await fetch(`/api/lease-packets/prefill${q}`)).json()
      const res = await fetch("/api/lease-packets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pre.title, data: pre.data, documents: pre.documents, propertyId: pre.propertyId,
          prescreeningId: source === "prescreening" && !blank ? sourceId : null,
          tenantId: source === "tenant" && !blank ? sourceId : null,
        }),
      })
      const row = await res.json()
      if (!res.ok) throw new Error(row.error || "Failed")
      if (row.existing) alert("This applicant already has a lease packet — opening it.")
      router.push(`/admin/leases/documents/${row.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create")
      setCreating(false)
    }
  }

  const list = source === "prescreening" ? applicantOptions : source === "tenant" ? tenants : properties

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lease Signing</h1>
          <p className="text-sm text-muted-foreground">Lease + addenda from templates → tenant signs online, or download the PDF and sign on paper.</p>
        </div>
        <Button onClick={() => setOpen(true)}><PlusIcon className="size-4" /> New lease packet</Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : packets.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileSignature className="mx-auto mb-3 size-8" />
          No lease packets yet. Create one from an approved applicant.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Packet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Signers</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="hidden sm:table-cell">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packets.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/admin/leases/documents/${p.id}`)}>
                  <TableCell className="font-medium"><Link href={`/admin/leases/documents/${p.id}`}>{p.title}</Link></TableCell>
                  <TableCell><Badge variant="secondary" className={PACKET_STATUS_STYLE[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    {p.signers.length
                      ? p.signers.map((s) => `${s.name} ${s.status === "signed" ? "✓" : "…"}`).join(" · ")
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(p.createdAt)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.completedAt ? formatDate(p.completedAt) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New lease packet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["prescreening", "tenant", "property"] as const).map((s) => (
                <Button key={s} size="sm" variant={source === s ? "default" : "outline"} onClick={() => { setSource(s); setSourceId("") }}>
                  {s === "prescreening" ? "Applicant" : s === "tenant" ? "Tenant" : "Property"}
                </Button>
              ))}
            </div>
            <div>
              <Label>Start from</Label>
              <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">Select…</option>
                {list.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {source === "prescreening" && (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all applicants (not only approved / in progress)
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Names, contact, move-in date, rent, deposit, occupants, pets and voucher info are copied in. You can edit everything before sending.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={creating} onClick={() => create(true)}>Blank packet</Button>
            <Button disabled={creating || !sourceId} onClick={() => create(false)}>
              {creating && <Loader2 className="size-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
