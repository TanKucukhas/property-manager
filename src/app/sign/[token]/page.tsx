"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Download, FileSignature, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DocumentView } from "@/components/lease/document-view"
import { SignaturePad } from "@/components/lease/signature-pad"
import { DOC_TITLES, type DocKey, type SignerField } from "@/lib/lease-docs/templates"
import type { AuditInfo } from "@/lib/lease-docs/fill"

interface SignView {
  title: string
  status: string
  contentHash: string | null
  sentAt: string | null
  completedAt: string | null
  propertyAddress: string
  landlordName: string
  documents: DocKey[]
  signer: { name: string; role: string; slot: string; status: string; signedAt: string | null }
  fields: SignerField[]
  signers: { name: string; role: string; status: string; signedAt: string | null }[]
  audit: AuditInfo["signers"] | null
  html: string
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]!.toUpperCase()).join("").slice(0, 4)
}

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<SignView | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const [acks, setAcks] = useState<Record<string, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [consent, setConsent] = useState(false)
  const [typedName, setTypedName] = useState("")
  const [initials, setInitials] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sign/${token}`, { cache: "no-store" })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "This link is not valid.")
      setView(body)
      setTypedName((v) => v || body.signer.name)
      setInitials((v) => v || initialsOf(body.signer.name))
    } catch (e) {
      setError(e instanceof Error ? e.message : "This link is not valid.")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const visibleFields = useMemo(
    () => (view?.fields ?? []).filter((f) => !f.showIf || answers[f.showIf.key] === f.showIf.value),
    [view, answers],
  )

  const missing = useMemo(() => {
    const m: string[] = []
    for (const f of visibleFields) {
      if (!f.required) continue
      if (f.type === "ack" && !acks[f.key]) m.push(f.label)
      if (f.type !== "ack" && !String(answers[f.key] ?? "").trim()) m.push(f.label)
    }
    if (!consent) m.push("Agree to sign electronically")
    if (typedName.trim().length < 2) m.push("Type your full name")
    if (!initials.trim()) m.push("Initials")
    if (!signature) m.push("Draw your signature")
    return m
  }, [visibleFields, acks, answers, consent, typedName, initials, signature])

  async function submit() {
    setSubmitError("")
    if (missing.length) {
      setSubmitError(`Still needed: ${missing.join(" · ")}`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent, typedName, initials, signatureImage: signature, responses: { ...answers, acks } }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Signing failed")
      await load()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Signing failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Loading documents…</div>
  }
  if (error || !view) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-amber-500" />
          <p className="font-medium">{error || "This link is not valid."}</p>
          <p className="mt-2 text-sm text-muted-foreground">Please contact your landlord for a new link.</p>
        </div>
      </div>
    )
  }

  const iSigned = view.signer.status === "signed"
  const completed = view.status === "completed"
  const canSign = view.status === "sent" && !iSigned
  const audit: AuditInfo | null = view.audit
    ? { title: view.title, contentHash: view.contentHash, sentAt: view.sentAt, completedAt: view.completedAt, signers: view.audit }
    : null
  const byDoc = view.documents
    .map((d) => ({ doc: d, fields: visibleFields.filter((f) => f.doc === d) }))
    .filter((g) => g.fields.length)

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <header className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{view.title}</div>
            <div className="truncate text-xs text-muted-foreground">{view.propertyAddress} · {view.landlordName}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="size-4" /> PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 print:p-0">
        <div className="no-print mb-4 space-y-3">
          {completed ? (
            <Banner tone="green" icon={<CheckCircle2 className="size-5" />} title="All parties have signed">
              Use the PDF button to save or print your copy. A link to this page was also emailed to you.
            </Banner>
          ) : iSigned ? (
            <Banner tone="green" icon={<CheckCircle2 className="size-5" />} title="Thank you — you have signed">
              Waiting for: {view.signers.filter((s) => s.status !== "signed").map((s) => s.name).join(", ")}. You’ll get an email when everyone has signed.
            </Banner>
          ) : view.status === "sent" ? (
            <Banner tone="blue" icon={<FileSignature className="size-5" />} title={`Hi ${view.signer.name}, please review and sign`}>
              Read the documents below, then complete the signing section at the bottom. Documents:{" "}
              {view.documents.map((d) => DOC_TITLES[d]).join(", ")}.
            </Banner>
          ) : (
            <Banner tone="amber" icon={<AlertTriangle className="size-5" />} title="Not open for signing">This packet is no longer open for signing.</Banner>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {view.signers.map((s) => (
              <span key={s.name + s.role} className={`rounded-full px-2 py-1 ${s.status === "signed" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                {s.name} ({s.role}) — {s.status === "signed" ? "signed" : "pending"}
              </span>
            ))}
          </div>
          {view.documents.length > 1 && (
            <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {view.documents.map((d) => <a key={d} href={`#doc-${d}`} className="text-primary hover:underline">{DOC_TITLES[d]}</a>)}
            </nav>
          )}
        </div>

        <div className="overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 print:rounded-none print:shadow-none print:ring-0">
          <DocumentView html={view.html} audit={completed ? audit : null} />
        </div>

        {canSign && (
          <section className="no-print mt-6 space-y-6 rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Sign</h2>

            {byDoc.map((g) => (
              <div key={g.doc} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{DOC_TITLES[g.doc]}</h3>
                {g.fields.map((f) => (
                  <FieldInput key={f.key} f={f} acks={acks} answers={answers} setAcks={setAcks} setAnswers={setAnswers} />
                ))}
              </div>
            ))}

            <div className="space-y-3 border-t pt-5">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 size-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  I agree to use electronic records and signatures for these documents. My electronic signature and initials have the same legal effect as handwritten ones. I can download a copy at any time and may ask {view.landlordName} for a paper copy.
                </span>
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <div>
                  <Label htmlFor="typed">Full legal name</Label>
                  <Input id="typed" value={typedName} onChange={(e) => setTypedName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="init">Initials</Label>
                  <Input id="init" value={initials} maxLength={6} onChange={(e) => setInitials(e.target.value.toUpperCase())} />
                </div>
              </div>
              <div>
                <Label>Signature</Label>
                <SignaturePad onChange={setSignature} />
              </div>
              <p className="text-xs text-muted-foreground">
                Your initials are applied to each acknowledgment you confirmed above, and your signature to each signature line for you in these documents.
              </p>
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <Button className="w-full" size="lg" disabled={submitting} onClick={submit}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} Sign all documents
            </Button>
          </section>
        )}
      </main>
    </div>
  )
}

function Banner({ tone, icon, title, children }: { tone: "green" | "blue" | "amber"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const cls = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    blue: "border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  }[tone]
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${cls}`}>
      <div className="mt-0.5">{icon}</div>
      <div><div className="font-semibold">{title}</div><div className="text-sm opacity-90">{children}</div></div>
    </div>
  )
}

function FieldInput({ f, acks, answers, setAcks, setAnswers }: {
  f: SignerField
  acks: Record<string, boolean>
  answers: Record<string, string>
  setAcks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  if (f.type === "ack") {
    return (
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={!!acks[f.key]} onChange={(e) => setAcks((a) => ({ ...a, [f.key]: e.target.checked }))} />
        <span>
          {f.label}
          {f.link && <> {" "}<a href={f.link.href} target="_blank" rel="noreferrer" className="text-primary underline">{f.link.label}</a></>}
        </span>
      </label>
    )
  }
  if (f.type === "choice") {
    return (
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium">{f.label}</legend>
        {f.options?.map((o) => (
          <label key={o.value} className="flex items-center gap-3">
            <input type="radio" name={f.key} className="size-4" checked={answers[f.key] === o.value} onChange={() => setAnswers((a) => ({ ...a, [f.key]: o.value }))} />
            {o.label}
          </label>
        ))}
      </fieldset>
    )
  }
  const long = f.key.endsWith("_notes")
  return (
    <div>
      <Label htmlFor={f.key}>{f.label}{f.required ? " *" : ""}</Label>
      {long ? (
        <Textarea id={f.key} rows={2} value={answers[f.key] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))} />
      ) : (
        <Input id={f.key} value={answers[f.key] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))} />
      )}
    </div>
  )
}
