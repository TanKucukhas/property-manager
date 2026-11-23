"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_HOUSE_TERMS, type HouseDefaults } from "@/lib/lease-docs/standard-terms"

type TextKey = Exclude<keyof HouseDefaults, "petFee" | "petRent">

const LANDLORD: { key: TextKey; label: string; hint?: string }[] = [
  { key: "landlordName", label: "Landlord (legal owner)" },
  { key: "landlordAddress", label: "Mailing address for notices" },
  { key: "landlordEmail", label: "Email for routine correspondence" },
  { key: "maintenanceContact", label: "Property manager (maintenance & rent collection)" },
  { key: "landlordSignerName", label: "Who signs for the landlord", hint: "Leave empty to choose per lease" },
  { key: "landlordSignerTitle", label: "Signer title" },
  { key: "landlordSignerEmail", label: "Signer email", hint: "Gets the “tenant signed — countersign” email" },
  { key: "paymentMethod", label: "Payment method and payee", hint: "e.g. Zelle to info@halberd.co or check payable to Halberd LLC — no cash" },
]

const TERMS: { key: TextKey; label: string; rows: number }[] = [
  { key: "lateFeeRule", label: "Late charge", rows: 3 },
  { key: "utilitiesTerms", label: "Utilities", rows: 4 },
  { key: "maintenanceTerms", label: "Maintenance", rows: 6 },
  { key: "smokingTerms", label: "Smoking", rows: 2 },
  { key: "showingNoticeTerms", label: "Entry & showing notice", rows: 3 },
  { key: "specialTerms", label: "Additional terms (renewal, returned payments, early termination…)", rows: 14 },
]

export default function DefaultHouseTermsPage() {
  const [d, setD] = useState<HouseDefaults | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch("/api/lease-defaults").then((r) => r.json()).then(setD)
  }, [])

  function set<K extends keyof HouseDefaults>(k: K, v: HouseDefaults[K]) {
    setD((x) => (x ? { ...x, [k]: v } : x))
    setDirty(true)
  }

  async function save() {
    if (!d) return
    setSaving(true)
    try {
      const res = await fetch("/api/lease-defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
      if (!res.ok) throw new Error("Save failed")
      setD(await res.json())
      setDirty(false)
      toast.success("Default house terms saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (!d) return <div className="py-20 text-center text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/leases" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Default house terms</h1>
          <p className="text-sm text-muted-foreground">
            Every new house starts with a copy of these; change a single house on the Lease Terms page. Editing here does not change houses that already have terms or leases already sent.
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Landlord & payment</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LANDLORD.map((f) => (
            <div key={f.key} className={f.key === "paymentMethod" || f.key === "landlordAddress" ? "sm:col-span-2" : ""}>
              <Label className="mb-1 block text-xs">{f.label}</Label>
              <Input value={d[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Terms</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-xs">Pet fee (one-time, non-refundable)</Label>
            <Input type="number" value={d.petFee} onChange={(e) => set("petFee", Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Monthly pet rent</Label>
            <Input type="number" value={d.petRent} onChange={(e) => set("petRent", Number(e.target.value) || 0)} />
          </div>
        </div>
        {TERMS.map((f) => (
          <div key={f.key}>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs">{f.label}</Label>
              {d[f.key] !== DEFAULT_HOUSE_TERMS[f.key] && (
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:underline" onClick={() => set(f.key, DEFAULT_HOUSE_TERMS[f.key])}>
                  <RotateCcw className="size-3" /> Built-in text
                </button>
              )}
            </div>
            <Textarea rows={f.rows} value={d[f.key]} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Separate paragraphs with a blank line. In additional terms, start a paragraph with “Heading.” to bold it in the lease.</p>
      </section>

      <div className="sticky bottom-0 flex justify-end rounded-xl border bg-card p-3 shadow-sm">
        <Button disabled={saving || !dirty} onClick={save}><Save className="size-4" /> Save defaults</Button>
      </div>
    </div>
  )
}
