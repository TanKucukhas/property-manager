"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentView } from "@/components/lease/document-view"
import type { AuditInfo } from "@/lib/lease-docs/fill"

// Admin print view (outside /admin so the sidebar isn't printed). The API
// still requires the admin session.
export default function LeasePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [html, setHtml] = useState("")
  const [audit, setAudit] = useState<AuditInfo | null>(null)
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/lease-packets/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Please log in as admin." : "Not found")
        return r.json()
      })
      .then((b) => {
        setHtml(b.html)
        setTitle(b.packet.title)
        document.title = b.packet.title
        if (b.packet.status === "completed") {
          setAudit({ title: b.packet.title, contentHash: b.packet.contentHash, sentAt: b.packet.sentAt, completedAt: b.packet.completedAt, signers: b.signers })
        }
        setTimeout(() => window.print(), 400)
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="p-10 text-center text-red-600">{error}</div>
  if (!html) return <div className="p-10 text-center text-muted-foreground">Loading…</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-medium">{title}</div>
        <Button size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print / Save as PDF</Button>
      </div>
      <div className="mx-auto max-w-[850px]">
        <DocumentView html={html} audit={audit} />
      </div>
    </div>
  )
}
