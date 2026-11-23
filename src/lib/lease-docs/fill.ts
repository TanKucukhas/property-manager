import { esc } from "./templates";

/** Signer data needed to fill placeholders. Safe for the browser. */
export interface FillSigner {
  slot: string;
  name: string;
  status: string;
  signedAt: string | null;
  signatureImage: string | null;
  initials: string | null;
  responses: Record<string, unknown> | null;
}

const BLANK = `<span class="blank">&nbsp;</span>`;
const SMALL_BLANK = `<span class="blank short">&nbsp;</span>`;

function signedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

/**
 * Replaces {{SIG|DATE|NAME|INIT:slot}}, {{ACK:slot:key}}, {{CHK:slot:key=value}}
 * and {{RESP:slot:key}} tokens with what each signer has captured. Unsigned
 * slots render as blank lines, so the same function produces the blank
 * "print and sign by hand" copy and the executed copy.
 */
export function fillPlaceholders(html: string, signers: FillSigner[]): string {
  const bySlot = new Map(signers.map((s) => [s.slot, s]));
  return html.replace(/\{\{(SIG|DATE|NAME|INIT|ACK|CHK|RESP):([a-z0-9]+)(?::([a-z0-9_]+)(?:=([a-z0-9_]+))?)?\}\}/g, (_m, kind: string, slot: string, key?: string, val?: string) => {
    const s = bySlot.get(slot);
    const signed = !!s && s.status === "signed";
    const resp = (s?.responses ?? {}) as Record<string, unknown>;
    switch (kind) {
      case "SIG":
        if (signed && s.signatureImage && s.signatureImage.startsWith("data:image/")) {
          return `<span class="sig-img"><img src="${esc(s.signatureImage)}" alt="Signature of ${esc(s.name)}"><small>Signed electronically</small></span>`;
        }
        return BLANK;
      case "DATE":
        return signed && s.signedAt ? `<span class="filled">${esc(signedDate(s.signedAt))}</span>` : SMALL_BLANK;
      case "NAME":
        return s ? esc(s.name) : BLANK;
      case "INIT":
        return signed && s.initials ? `<span class="filled">${esc(s.initials)}</span>` : SMALL_BLANK;
      case "ACK": {
        const acks = (resp.acks ?? {}) as Record<string, boolean>;
        return signed && key && acks[key] && s.initials ? `<span class="filled">${esc(s.initials)}</span>` : SMALL_BLANK;
      }
      case "CHK":
        return signed && key && String(resp[key] ?? "") === val ? "☒" : "☐";
      case "RESP": {
        const text = key ? String(resp[key] ?? "").trim() : "";
        if (signed) return text ? `<span class="filled">${esc(text)}</span>` : `<span class="filled">—</span>`;
        return BLANK;
      }
      default:
        return "";
    }
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Paper-style CSS for the document, shared by preview, signing page and print. */
export const LEASE_DOC_CSS = `
.lease-doc { background:#fff; color:#1a1a1a; font-family: Georgia, "Times New Roman", serif; font-size:14px; line-height:1.5; }
.lease-doc .doc { padding: 40px 48px; }
.lease-doc .doc + .doc { border-top: 6px solid #f1f1f1; }
.lease-doc h1 { font-size:22px; margin:0 0 4px; text-align:center; letter-spacing:.02em; }
.lease-doc .subtitle { text-align:center; margin:0 0 16px; color:#444; }
.lease-doc h2 { font-size:15px; text-transform:uppercase; letter-spacing:.06em; margin:24px 0 8px; border-bottom:1px solid #ccc; padding-bottom:4px; }
.lease-doc h3 { font-size:14px; margin:16px 0 4px; }
.lease-doc p { margin:0 0 8px; }
.lease-doc ul { margin:0 0 8px 20px; padding:0; }
.lease-doc .kv { margin:0 0 4px; }
.lease-doc .missing { background:#fff3c4; color:#8a5a00; padding:0 4px; border-radius:2px; }
.lease-doc .warning { border:1px solid #333; padding:8px 10px; }
.lease-doc .note { font-size:12px; color:#555; }
.lease-doc .doc-meta { display:grid; grid-template-columns:1fr 1fr; gap:2px 16px; font-size:12px; color:#333; border:1px solid #ddd; padding:8px 10px; margin-bottom:16px; }
.lease-doc .sig-block { margin:12px 0 16px; }
.lease-doc .sig-row { margin:6px 0; display:flex; flex-wrap:wrap; align-items:flex-end; gap:6px; }
.lease-doc .sig-label { color:#333; }
.lease-doc .sig-name { font-weight:bold; }
.lease-doc .blank { display:inline-block; min-width:220px; border-bottom:1px solid #333; height:1.2em; }
.lease-doc .blank.short { min-width:90px; }
.lease-doc .filled { border-bottom:1px solid #333; padding:0 6px; font-family: "Courier New", monospace; }
.lease-doc .sig-img { display:inline-flex; flex-direction:column; border-bottom:1px solid #333; min-width:220px; }
.lease-doc .sig-img img { height:48px; width:auto; max-width:260px; object-fit:contain; }
.lease-doc .sig-img small { font-size:9px; color:#666; font-family: Arial, sans-serif; }
.lease-doc .ack { display:flex; gap:8px; align-items:flex-end; }
.lease-doc .ack-init { flex:none; }
.lease-doc table.grid { width:100%; border-collapse:collapse; margin:8px 0 12px; font-size:13px; }
.lease-doc table.grid th, .lease-doc table.grid td { border:1px solid #999; padding:6px 8px; text-align:left; vertical-align:top; }
.lease-doc table.checklist td { height:34px; }
.lease-doc .audit { font-family: Arial, sans-serif; font-size:12px; }
.lease-doc .audit td, .lease-doc .audit th { font-size:11px; word-break:break-all; }
@media (max-width: 640px) { .lease-doc .doc { padding: 24px 16px; } .lease-doc .doc-meta { grid-template-columns:1fr; } }
@media print {
  @page { size: letter; margin: 0.6in; }
  body { background:#fff !important; }
  .no-print { display:none !important; }
  .lease-doc .doc { padding:0; border:0 !important; break-before: page; }
  .lease-doc .doc:first-child { break-before: auto; }
  .lease-doc .sig-block, .lease-doc tr { break-inside: avoid; }
  .lease-doc .missing { background:none; }
}
`;

export interface AuditInfo {
  title: string;
  contentHash: string | null;
  sentAt: string | null;
  completedAt: string | null;
  signers: {
    name: string; role: string; title?: string | null; email: string | null; status: string;
    viewedAt: string | null; consentAt: string | null; signedAt: string | null;
    typedName: string | null; ip: string | null; userAgent: string | null; signedHash: string | null;
  }[];
}

function ts(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "long" });
}

/** Signature certificate page appended to the executed copy. */
export function auditHtml(a: AuditInfo): string {
  const rows = a.signers
    .map((s) => `<tr>
      <td><b>${esc(s.name)}</b><br>${esc(s.role)}${s.title ? `<br>${esc(s.title)}` : ""}<br>${esc(s.email ?? "")}</td>
      <td>${s.status === "signed" ? "Signed" : "Pending"}<br>Typed name: ${esc(s.typedName ?? "—")}</td>
      <td>Viewed: ${esc(ts(s.viewedAt))}<br>E-sign consent: ${esc(ts(s.consentAt))}<br>Signed: ${esc(ts(s.signedAt))}</td>
      <td>IP: ${esc(s.ip ?? "—")}<br>${esc(s.userAgent ?? "")}</td>
      <td>${esc(s.signedHash ?? "—")}</td>
    </tr>`)
    .join("");
  return `<section class="doc audit">
    <h1>Signature Certificate</h1>
    <p class="subtitle">${esc(a.title)}</p>
    <p><b>Document fingerprint (SHA-256 of the text sent for signature):</b><br>${esc(a.contentHash ?? "—")}</p>
    <p><b>Sent:</b> ${esc(ts(a.sentAt))} &nbsp; <b>Completed:</b> ${esc(ts(a.completedAt))}</p>
    <table class="grid"><thead><tr><th>Signer</th><th>Status</th><th>Timeline (Eastern)</th><th>Device</th><th>Signature record (SHA-256)</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="note">Each signer reviewed the documents through a private link, agreed to use electronic records and signatures, confirmed each acknowledgment, adopted initials, and drew a signature. The document text was frozen when sent; the fingerprint above identifies that exact text. Electronic signatures are valid under the federal ESIGN Act and Ohio’s Uniform Electronic Transactions Act (R.C. Chapter 1306).</p>
  </section>`;
}
