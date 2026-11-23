"use client"

import { LEASE_DOC_CSS, auditHtml, type AuditInfo } from "@/lib/lease-docs/fill"

/** Renders packet HTML (already escaped server-side / by the templates) as paper. */
export function DocumentView({ html, audit, className }: { html: string; audit?: AuditInfo | null; className?: string }) {
  return (
    <>
      <style>{LEASE_DOC_CSS}</style>
      <div
        className={`lease-doc ${className ?? ""}`}
        dangerouslySetInnerHTML={{ __html: html + (audit ? auditHtml(audit) : "") }}
      />
    </>
  )
}
