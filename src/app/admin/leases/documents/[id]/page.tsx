"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, Copy, Download, Mail, PenLine, PlusIcon, Save, Send, TrashIcon, Ban, Loader2, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DocumentView } from "@/components/lease/document-view"
import {
  DOC_ORDER, DOC_TITLES, missingForSend, renderPacket, type DocKey, type LeaseData,
} from "@/lib/lease-docs/templates"
import { fillPlaceholders, type AuditInfo } from "@/lib/lease-docs/fill"
import { PACKET_STATUS_STYLE } from "@/lib/lease-docs/ui"
import { LeaseTermPicker } from "@/components/lease/lease-term-picker"

interface Signer {
  id: number
  role: string
  slot: string
  name: string
  title: string | null
  email: string | null
  token: string
  status: string
  viewedAt: string | null
  consentAt: string | null
  signedAt: string | null
  typedName: string | null
  ip: string | null
  userAgent: string | null
  signedHash: string | null
  responses: string | null
}

interface Packet {
  id: number
  title: string
  status: string
  data: LeaseData
  documents: DocKey[]
  contentHash: string | null
  sentAt: string | null
  completedAt: string | null
}

interface EventRow { id: number; event: string; detail: string | null; signerId: number | null; ip: string | null; createdAt: string }

function ts(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default function LeasePacketPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [packet, setPacket] = useState<Packet | null>(null)
  const [signers, setSigners] = useState<Signer[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [html, setHtml] = useState("")
  const [data, setData] = useState<LeaseData | null>(null)
  const [docs, setDocs] = useState<DocKey[]>([])
  const [title, setTitle] = useState("")
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [emailTenants, setEmailTenants] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/lease-packets/${id}`, { cache: "no-store" })
    if (!res.ok) { toast.error("Packet not found"); return }
    const body = await res.json()
    setPacket(body.packet)
    setSigners(body.signers)
    setEvents(body.events)
    setHtml(body.html)
    setData(body.packet.data)
    setDocs(body.packet.documents)
    setTitle(body.packet.title)
    setDirty(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const isDraft = packet?.status === "draft"
  const preview = useMemo(() => (isDraft && data ? fillPlaceholders(renderPacket(data, docs), []) : html), [isDraft, data, docs, html])
  const missing = useMemo(() => (data ? missingForSend(data, docs) : []), [data, docs])

  function set<K extends keyof LeaseData>(key: K, value: LeaseData[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d))
    setDirty(true)
  }

  async function save(quiet = false) {
    if (!data) return false
    setBusy(true)
    try {
      const res = await fetch(`/api/lease-packets/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, documents: docs, title }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Save failed")
      setDirty(false)
      if (!quiet) toast.success("Saved")
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function action(body: Record<string, unknown>, ok: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/lease-packets/${id}/action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.missing ? `Missing: ${r.missing.join(", ")}` : r.error || "Failed")
      toast.success(body.action === "send" && r.emailed ? `${ok}${r.emailed.length ? ` Emailed ${r.emailed.join(", ")}.` : " (no emails sent)"}` : ok)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    if (missing.length) { toast.error(`Missing: ${missing.join(", ")}`); return }
    if (!confirm("Send for signature? The text is frozen once sent — to change terms later you void it and start a new packet.")) return
    if (dirty && !(await save(true))) return
    await action({ action: "send", emailTenants }, "Sent for signature.")
  }

  async function remove() {
    if (!confirm("Delete this draft?")) return
    const res = await fetch(`/api/lease-packets/${id}`, { method: "DELETE" })
    if (res.ok) router.push("/admin/leases/documents")
    else toast.error((await res.json()).error || "Delete failed")
  }

  function copyLink(s: Signer) {
    navigator.clipboard.writeText(`${window.location.origin}/sign/${s.token}`)
    toast.success(`Link for ${s.name} copied`)
  }

  async function printPdf() {
    if (isDraft && dirty && !(await save(true))) return
    window.open(`/lease-print/${id}`, "_blank")
  }

  if (!packet || !data) return <div className="py-20 text-center text-muted-foreground">Loading…</div>

  const audit: AuditInfo | null = packet.status === "completed"
    ? { title: packet.title, contentHash: packet.contentHash, sentAt: packet.sentAt, completedAt: packet.completedAt, signers }
    : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/admin/leases/documents" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        {isDraft ? (
          <Input className="max-w-md font-semibold" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true) }} />
        ) : (
          <h1 className="text-xl font-bold">{packet.title}</h1>
        )}
        <Badge variant="secondary" className={PACKET_STATUS_STYLE[packet.status]}>{packet.status}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={printPdf}><Download className="size-4" /> {packet.status === "completed" ? "Signed PDF" : "PDF (sign on paper)"}</Button>
          {isDraft && (
            <>
              <Button variant="outline" disabled={busy || !dirty} onClick={() => save()}><Save className="size-4" /> Save</Button>
              <Button variant="ghost" className="text-red-700" disabled={busy} onClick={remove}><TrashIcon className="size-4" /></Button>
            </>
          )}
          {packet.status === "sent" && (
            <Button variant="outline" className="text-red-700" disabled={busy} onClick={() => {
              const reason = prompt("Void this packet? Signing links stop working. Reason (optional):")
              if (reason !== null) action({ action: "void", reason }, "Packet voided.")
            }}><Ban className="size-4" /> Void</Button>
          )}
        </div>
      </div>

      {packet.status === "sent" && signers.some((s) => s.role === "tenant") &&
        signers.filter((s) => s.role === "tenant").every((s) => s.status === "signed") &&
        signers.find((s) => s.role === "landlord")?.status === "pending" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
          <div>
            <div className="font-semibold">Tenant signed — your review</div>
            <div className="text-sm">Check the tenant’s answers under Signers, then countersign. Completing creates the tenant record and marks the property occupied.</div>
          </div>
          <Button onClick={() => window.open(`/sign/${signers.find((s) => s.role === "landlord")!.token}`, "_blank")}>
            <PenLine className="size-4" /> Review & countersign
          </Button>
        </div>
      )}
      {packet.status === "completed" && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <b>Lease fully signed.</b> Tenant record created/linked and the property marked occupied. Next: collect the deposit and first month (Deposits / Payments), and do the move-in checklist walkthrough.
        </div>
      )}

      {isDraft ? (
        <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
          <div className="space-y-5">
            <Editor data={data} set={set} docs={docs} setDocs={(d) => { setDocs(d); setDirty(true) }} />

            <div className="sticky bottom-0 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
              {missing.length > 0 ? (
                <div className="text-sm text-amber-700">
                  <div className="font-medium">Before sending, fill in:</div>
                  <ul className="ml-4 list-disc">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> Ready to send</div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={emailTenants} onChange={(e) => setEmailTenants(e.target.checked)} />
                Email the signing link to the tenant(s)
              </label>
              <Button className="w-full" disabled={busy || missing.length > 0} onClick={send}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send for e-signature
              </Button>
              <p className="text-xs text-muted-foreground">Prefer paper? Use “PDF (sign on paper)”, print and sign by hand — no need to send.</p>
            </div>
          </div>
          <div className="min-w-0">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-auto rounded-xl shadow-sm ring-1 ring-black/10">
              <DocumentView html={preview} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <div className="space-y-5">
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-semibold">Signers</h2>
              <div className="space-y-3">
                {signers.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.role}{s.email ? ` · ${s.email}` : ""}</div>
                      </div>
                      <Badge variant="secondary" className={s.status === "signed" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}>
                        {s.status === "signed" ? "signed" : s.viewedAt ? "viewed" : "pending"}
                      </Badge>
                    </div>
                    {s.role === "tenant" && s.status === "signed" && <Answers raw={s.responses} />}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.signedAt ? `Signed ${ts(s.signedAt)}${s.ip ? ` · IP ${s.ip}` : ""}` : s.viewedAt ? `Opened ${ts(s.viewedAt)}` : "Not opened yet"}
                    </div>
                    {packet.status === "sent" && s.status !== "signed" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyLink(s)}><Copy className="size-3" /> Copy link</Button>
                        {s.email && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "email", signerId: s.id }, `Link emailed to ${s.email}`)}>
                            <Mail className="size-3" /> Email link
                          </Button>
                        )}
                        {s.role === "landlord" && (
                          <Button size="sm" onClick={() => window.open(`/sign/${s.token}`, "_blank")}><PenLine className="size-3" /> Sign as landlord</Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {packet.status === "sent" && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={load}>Refresh status</Button>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4 text-sm">
              <h2 className="mb-2 font-semibold">Record</h2>
              <div className="space-y-1 text-xs">
                <div><span className="text-muted-foreground">Sent:</span> {ts(packet.sentAt)}</div>
                <div><span className="text-muted-foreground">Completed:</span> {ts(packet.completedAt)}</div>
                <div className="break-all"><span className="text-muted-foreground">SHA-256:</span> {packet.contentHash}</div>
                <div><span className="text-muted-foreground">Documents:</span> {packet.documents.map((d) => DOC_TITLES[d]).join(", ")}</div>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Activity</h2>
              <ol className="space-y-1 text-xs">
                {events.map((e) => {
                  const who = signers.find((s) => s.id === e.signerId)?.name
                  return (
                    <li key={e.id}>
                      <span className="text-muted-foreground">{ts(e.createdAt)}</span> · <b>{e.event}</b>{who ? ` — ${who}` : ""}
                      {e.detail && <div className="break-all pl-2 text-muted-foreground">{e.detail}</div>}
                    </li>
                  )
                })}
              </ol>
            </section>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/10">
            <DocumentView html={html} audit={audit} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- editor

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

function Editor({ data, set, docs, setDocs }: {
  data: LeaseData
  set: <K extends keyof LeaseData>(k: K, v: LeaseData[K]) => void
  docs: DocKey[]
  setDocs: (d: DocKey[]) => void
}) {
  const text = (k: keyof LeaseData, props: React.ComponentProps<typeof Input> = {}) => (
    <Input value={String(data[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} {...props} />
  )
  const num = (k: keyof LeaseData) => (
    <Input type="number" step="0.01" value={String(data[k] ?? 0)} onChange={(e) => set(k, (parseFloat(e.target.value) || 0) as never)} />
  )
  const prevPets = useRef(data.petsApproved)
  const prevLead = useRef(data.builtBefore1978)

  // Keep the Pet / Lead documents in step with their switches.
  useEffect(() => {
    if (prevPets.current !== data.petsApproved) {
      prevPets.current = data.petsApproved
      setDocs(data.petsApproved ? [...new Set([...docs, "pet" as DocKey])] : docs.filter((d) => d !== "pet"))
    }
    if (prevLead.current !== data.builtBefore1978) {
      prevLead.current = data.builtBefore1978
      setDocs(data.builtBefore1978 ? [...new Set([...docs, "lead" as DocKey])] : docs.filter((d) => d !== "lead"))
    }
  }, [data.petsApproved, data.builtBefore1978, docs, setDocs])

  function setTenant(i: number, key: "name" | "email" | "phone", value: string) {
    set("tenants", data.tenants.map((t, j) => (j === i ? { ...t, [key]: value } : t)))
  }
  function setPet(i: number, key: "species" | "breed" | "weight" | "age", value: string) {
    set("pets", data.pets.map((p, j) => (j === i ? { ...p, [key]: value } : p)))
  }

  return (
    <>
      <Section title="Property & landlord">
        <Field label="Property address">{text("propertyAddress", { placeholder: "1635 6th Street, Portsmouth, OH 45662" })}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Landlord (legal owner)">{text("landlordName")}</Field>
          <Field label="Home type">{text("homeType")}</Field>
        </div>
        <Field label="Landlord mailing address">{text("landlordAddress")}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Landlord email">{text("landlordEmail")}</Field>
          <Field label="Maintenance contact">{text("maintenanceContact")}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Landlord signer name">{text("landlordSignerName", { placeholder: "Who signs for the LLC" })}</Field>
          <Field label="Signer title">{text("landlordSignerTitle")}</Field>
        </div>
        <Field label="Landlord signer email">{text("landlordSignerEmail")}</Field>
      </Section>

      <Section title="Tenants (signers)">
        {data.tenants.map((t, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              Tenant {i + 1}
              {data.tenants.length > 1 && (
                <button className="text-red-700 hover:underline" onClick={() => set("tenants", data.tenants.filter((_, j) => j !== i))}>Remove</button>
              )}
            </div>
            <Input placeholder="Full legal name" value={t.name} onChange={(e) => setTenant(i, "name", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Email" value={t.email} onChange={(e) => setTenant(i, "email", e.target.value)} />
              <Input placeholder="Phone" value={t.phone} onChange={(e) => setTenant(i, "phone", e.target.value)} />
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set("tenants", [...data.tenants, { name: "", email: "", phone: "" }])}>
          <PlusIcon className="size-3" /> Add co-tenant (adult signer)
        </Button>
        <Field label="Permitted occupants who are not signers" hint="e.g. Liam Harrison, Kaylee Robinson, and two minor children">
          <Textarea rows={2} value={data.occupants} onChange={(e) => set("occupants", e.target.value)} />
        </Field>
      </Section>

      <Section title="Term, rent & deposit">
        <LeaseTermPicker
          labelClassName="text-xs"
          start={data.leaseStart}
          end={data.leaseEnd}
          onChange={(s, e) => { set("leaseStart", s); set("leaseEnd", e) }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly rent">{num("monthlyRent")}</Field>
          <Field label="Rent due day">{num("rentDueDay")}</Field>
          <Field label="Security deposit">{num("securityDeposit")}</Field>
        </div>
        <Field label="Payment method and payee" hint="e.g. Zelle or check payable to Halberd LLC — no cash">{text("paymentMethod")}</Field>
        <Field label="Late charge (optional)" hint="Leave empty for no late-fee clause. Ohio requires late fees to be reasonable.">{text("lateFeeTerms")}</Field>
        <Field label="First payment note (optional)" hint="Override, e.g. for a prorated first month">{text("firstPaymentNote")}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tenancy type">
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={data.tenancyType} onChange={(e) => set("tenancyType", e.target.value as LeaseData["tenancyType"])}>
              <option value="unassisted">Unassisted</option>
              <option value="voucher">Housing Choice Voucher</option>
            </select>
          </Field>
          {data.tenancyType === "voucher" && <Field label="Housing agency">{text("voucherAgency")}</Field>}
        </div>
      </Section>

      <Section title="Utilities & house rules">
        <p className="text-xs text-muted-foreground">Filled from this house’s terms (Lease Terms). Changes here apply to this lease only.</p>
        <Field label="Utilities"><Textarea rows={4} value={data.utilitiesTerms} onChange={(e) => set("utilitiesTerms", e.target.value)} /></Field>
        <Field label="Maintenance"><Textarea rows={5} value={data.maintenanceTerms} onChange={(e) => set("maintenanceTerms", e.target.value)} /></Field>
        <Field label="Smoking"><Textarea rows={2} value={data.smokingTerms} onChange={(e) => set("smokingTerms", e.target.value)} /></Field>
        <Field label="Entry & showing notice"><Textarea rows={3} value={data.entryTerms} onChange={(e) => set("entryTerms", e.target.value)} /></Field>
        <Field label="Included appliances">{text("includedAppliances")}</Field>
        <Check checked={data.tenantHandlesYardAndSnow} onChange={(v) => set("tenantHandlesYardAndSnow", v)} label="Tenant handles mowing and snow/ice on the private walk and driveway" />
        <Check checked={data.renterInsuranceRequired} onChange={(v) => set("renterInsuranceRequired", v)} label="Renter’s insurance required (otherwise recommended)" />
      </Section>

      <Section title="Pets">
        <Check checked={data.petsApproved} onChange={(v) => set("petsApproved", v)} label="Pets approved (adds the Pet Addendum)" />
        {data.petsApproved && (
          <>
            {data.pets.map((p, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <Input placeholder="Species" value={p.species} onChange={(e) => setPet(i, "species", e.target.value)} />
                <Input placeholder="Breed" value={p.breed} onChange={(e) => setPet(i, "breed", e.target.value)} />
                <Input placeholder="Weight" value={p.weight} onChange={(e) => setPet(i, "weight", e.target.value)} />
                <div className="flex gap-1">
                  <Input placeholder="Age" value={p.age} onChange={(e) => setPet(i, "age", e.target.value)} />
                  <button className="text-red-700" onClick={() => set("pets", data.pets.filter((_, j) => j !== i))}>×</button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set("pets", [...data.pets, { species: "", breed: "", weight: "", age: "" }])}><PlusIcon className="size-3" /> Add pet</Button>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Non-refundable pet fee">{num("petFee")}</Field>
              <Field label="Monthly pet rent">{num("petRent")}</Field>
            </div>
          </>
        )}
      </Section>

      <Section title="Disclosures">
        <Check checked={data.builtBefore1978} onChange={(v) => set("builtBefore1978", v)} label="Home built before 1978 (lead disclosure required)" />
        {data.builtBefore1978 && (
          <>
            <Field label="Known lead-based paint / hazards" hint="Empty = landlord has no knowledge">{text("leadKnownHazards")}</Field>
            <Field label="Lead records / reports provided" hint="Empty = no records or reports">{text("leadRecords")}</Field>
            <Field label="Leasing agent (optional)">{text("agentName")}</Field>
          </>
        )}
        <Field label="Known mold / moisture conditions" hint="Empty = not aware of active visible mold">{text("moldKnownConditions")}</Field>
        <Field label="Known smoke / CO detector issues" hint="Empty = none known">{text("smokeKnownIssues")}</Field>
      </Section>

      <Section title="Additional terms">
        <Textarea rows={10} value={data.additionalTerms} onChange={(e) => set("additionalTerms", e.target.value)} placeholder="Anything specific to this tenancy. Leave empty if none." />
      </Section>

      <Section title="Documents in this packet">
        {DOC_ORDER.map((k) => (
          <Check
            key={k}
            checked={docs.includes(k)}
            onChange={(v) => { if (k !== "lease") setDocs(v ? [...docs, k] : docs.filter((d) => d !== k)) }}
            label={`${DOC_TITLES[k]}${k === "lease" ? " (always)" : ""}`}
          />
        ))}
      </Section>
    </>
  )
}

function Answers({ raw }: { raw: string | null }) {
  let r: Record<string, unknown> = {}
  try { r = raw ? JSON.parse(raw) : {} } catch { /* ignore */ }
  const acks = (r.acks ?? {}) as Record<string, boolean>
  const ins = String(r.insurance_option ?? "")
  const insLabel = ins === "has" ? `Has insurance — ${r.insurance_company ?? ""} #${r.insurance_policy ?? ""}` : ins === "intends" ? "Will obtain insurance" : ins === "declines" ? "Declined insurance" : ""
  return (
    <div className="mt-2 space-y-0.5 rounded bg-muted/50 p-2 text-xs">
      <div>Acknowledgments confirmed: {Object.values(acks).filter(Boolean).length}/{Object.keys(acks).length}</div>
      {insLabel && <div>{insLabel}</div>}
      {r.mold_notes ? <div>Moisture notes: {String(r.mold_notes)}</div> : null}
    </div>
  )
}
