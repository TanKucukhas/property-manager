"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const TERMS = [6, 12, 18, 24] as const

/** Last day of a lease that starts on `start` and runs `months` (Dec 1 + 12 → Nov 30). */
export function leaseEndFor(start: string, months: number): string {
  const s = new Date(start.slice(0, 10) + "T00:00:00Z")
  if (isNaN(+s)) return ""
  const y = s.getUTCFullYear(), m = s.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const d = new Date(Date.UTC(y, m, Math.min(s.getUTCDate(), lastDay)))
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function termOf(start: string, end: string): number | "custom" {
  if (!start || !end) return 12
  return TERMS.find((m) => leaseEndFor(start, m) === end.slice(0, 10)) ?? "custom"
}

function pretty(iso: string) {
  if (!iso) return ""
  return new Date(iso.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

/**
 * Pick a start date and a term (default 1 year); the end date follows.
 * "Custom" unlocks the end date for odd terms.
 */
export function LeaseTermPicker({ start, end, onChange, labelClassName }: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  labelClassName?: string
}) {
  const [term, setTerm] = useState<number | "custom">(() => termOf(start, end))

  function pickStart(s: string) {
    onChange(s, term === "custom" ? end : s ? leaseEndFor(s, term) : "")
  }
  function pickTerm(v: string) {
    const t = v === "custom" ? "custom" : Number(v)
    setTerm(t)
    if (t !== "custom" && start) onChange(start, leaseEndFor(start, t))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className={labelClassName}>Lease start</Label>
          <Input type="date" value={start} onChange={(e) => pickStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className={labelClassName}>Term</Label>
          <select
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            value={String(term)}
            onChange={(e) => pickTerm(e.target.value)}
          >
            <option value="6">6 months</option>
            <option value="12">1 year</option>
            <option value="18">18 months</option>
            <option value="24">2 years</option>
            <option value="custom">Custom end date…</option>
          </select>
        </div>
      </div>
      {term === "custom" ? (
        <div className="flex flex-col gap-1">
          <Label className={labelClassName}>Lease end</Label>
          <Input type="date" value={end} min={start || undefined} onChange={(e) => onChange(start, e.target.value)} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {start ? <>Ends <b>{pretty(end)}</b></> : "Pick a start date — the end date is set automatically."}
        </p>
      )}
    </div>
  )
}
