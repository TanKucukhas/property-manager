import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { leasePackets, leaseSigners } from "@/db/schema";
import { missingForSend, renderPacket, tenantSlot } from "@/lib/lease-docs/templates";
import { sha256Hex } from "@/lib/lease-docs/fill";
import { getSigners, logEvent, newToken, parseData, parseDocs, signingEmail, syncApplicantStatus, type SignerRow } from "@/lib/lease-docs/server";

/**
 * POST { action: "send", emailTenants?: boolean, emailLandlord?: boolean }
 *   Freezes the document, creates one signer per tenant plus the landlord, and emails the links.
 * POST { action: "email", signerId }   Re-sends one signer's link.
 * POST { action: "void", reason? }     Cancels a sent packet; the record is kept.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const packet = await db.select().from(leasePackets).where(eq(leasePackets.id, Number(id))).get();
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const origin = new URL(request.url).origin;
  const data = parseData(packet.data);
  const linkFor = (s: SignerRow) => `${origin}/sign/${s.token}`;

  async function emailSigner(s: SignerRow) {
    if (!s.email) return false;
    const msg = signingEmail({ name: s.name, title: packet.title, address: data.propertyAddress, link: linkFor(s), landlordName: data.landlordName });
    const res = await sendEmail({ to: [{ email: s.email, name: s.name }], ...msg });
    await logEvent(db, packet.id, res ? "emailed" : "email_failed", { signerId: s.id, detail: s.email, request });
    return !!res;
  }

  if (body.action === "send") {
    if (packet.status !== "draft") return NextResponse.json({ error: "Already sent" }, { status: 409 });
    const docs = parseDocs(packet.documents);
    const missing = missingForSend(data, docs);
    if (missing.length) return NextResponse.json({ error: "Missing information", missing }, { status: 400 });

    const snapshot = renderPacket(data, docs);
    const hash = await sha256Hex(snapshot);
    const now = new Date().toISOString();
    const rows = [
      ...data.tenants.map((t, i) => ({ role: "tenant", slot: tenantSlot(i), name: t.name.trim(), title: null as string | null, email: t.email.trim() || null })),
      { role: "landlord", slot: "landlord", name: data.landlordSignerName.trim(), title: `${data.landlordSignerTitle}, ${data.landlordName}`.replace(/^, /, ""), email: data.landlordSignerEmail.trim() || null },
    ];
    for (const r of rows) {
      await db.insert(leaseSigners).values({ ...r, packetId: packet.id, token: newToken(), status: "pending", createdAt: now }).run();
    }
    await db.update(leasePackets)
      .set({ status: "sent", snapshotHtml: snapshot, contentHash: hash, sentAt: now, updatedAt: now })
      .where(eq(leasePackets.id, packet.id))
      .run();
    await logEvent(db, packet.id, "sent", { detail: `by ${session.email}; sha256 ${hash}`, request });
    await syncApplicantStatus(db, packet.prescreeningId, { ...packet, status: "sent" });

    const signers = await getSigners(db, packet.id);
    const emailed: string[] = [];
    for (const s of signers) {
      const want = s.role === "tenant" ? body.emailTenants !== false : body.emailLandlord === true;
      if (want && (await emailSigner(s))) emailed.push(s.name);
    }
    return NextResponse.json({ success: true, emailed, links: signers.map((s) => ({ id: s.id, name: s.name, role: s.role, link: linkFor(s) })) });
  }

  if (body.action === "email") {
    if (packet.status === "void") return NextResponse.json({ error: "Packet is void" }, { status: 409 });
    const s = (await getSigners(db, packet.id)).find((x) => x.id === Number(body.signerId));
    if (!s) return NextResponse.json({ error: "Signer not found" }, { status: 404 });
    if (!s.email) return NextResponse.json({ error: "Signer has no email" }, { status: 400 });
    const ok = await emailSigner(s);
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Email could not be sent" }, { status: 502 });
  }

  if (body.action === "void") {
    if (packet.status === "void") return NextResponse.json({ success: true });
    if (packet.status === "draft") return NextResponse.json({ error: "Delete the draft instead" }, { status: 409 });
    const now = new Date().toISOString();
    await db.update(leasePackets).set({ status: "void", voidedAt: now, updatedAt: now }).where(eq(leasePackets.id, packet.id)).run();
    await syncApplicantStatus(db, packet.prescreeningId, { ...packet, status: "void" });
    await logEvent(db, packet.id, "voided", { detail: `by ${session.email}${body.reason ? `: ${String(body.reason).slice(0, 300)}` : ""}`, request });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
