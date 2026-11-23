import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { leasePackets, leaseSigners } from "@/db/schema";
import { signerFields } from "@/lib/lease-docs/templates";
import { sha256Hex } from "@/lib/lease-docs/fill";
import {
  auditSigner, completedEmail, countersignEmail, getSigners, logEvent, onPacketCompleted, packetHtml, parseData, parseDocs, requestMeta,
  signingEmail, syncApplicantStatus, tenantBlocked,
} from "@/lib/lease-docs/server";

// Public: the token in the URL is the signer's credential.

async function load(token: string) {
  const db = await getDb();
  if (!/^[a-f0-9]{32,64}$/.test(token)) return { db, signer: null, packet: null };
  const signer = await db.select().from(leaseSigners).where(eq(leaseSigners.token, token)).get();
  if (!signer) return { db, signer: null, packet: null };
  const packet = await db.select().from(leasePackets).where(eq(leasePackets.id, signer.packetId)).get();
  return { db, signer, packet };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { db, signer, packet } = await load(token);
  if (!signer || !packet) return NextResponse.json({ error: "This signing link is not valid." }, { status: 404 });
  if (packet.status === "void") return NextResponse.json({ error: "These documents were cancelled by the landlord." }, { status: 410 });

  if (!signer.viewedAt) {
    const now = new Date().toISOString();
    await db.update(leaseSigners).set({ viewedAt: now }).where(eq(leaseSigners.id, signer.id)).run();
    await logEvent(db, packet.id, "viewed", { signerId: signer.id, request });
  }

  const signers = await getSigners(db, packet.id);
  const data = parseData(packet.data);
  const docs = parseDocs(packet.documents);
  return NextResponse.json({
    waitingForLandlord: packet.status === "sent" && tenantBlocked(packet, signers, signer),
    title: packet.title,
    status: packet.status,
    contentHash: packet.contentHash,
    sentAt: packet.sentAt,
    completedAt: packet.completedAt,
    propertyAddress: data.propertyAddress,
    landlordName: data.landlordName,
    documents: docs,
    signer: { name: signer.name, role: signer.role, slot: signer.slot, status: signer.status, signedAt: signer.signedAt },
    fields: signerFields(data, docs, signer.slot),
    signers: signers.map((s) => ({ name: s.name, role: s.role, status: s.status, signedAt: s.signedAt })),
    audit: packet.status === "completed" ? signers.map(auditSigner) : null,
    html: packetHtml(packet, signers),
  });
}

const MAX_SIGNATURE_CHARS = 400_000;

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { db, signer, packet } = await load(token);
  if (!signer || !packet) return NextResponse.json({ error: "This signing link is not valid." }, { status: 404 });
  if (packet.status !== "sent") return NextResponse.json({ error: packet.status === "void" ? "These documents were cancelled." : "These documents are no longer open for signing." }, { status: 409 });
  if (signer.status === "signed") return NextResponse.json({ error: "You have already signed." }, { status: 409 });
  if (tenantBlocked(packet, await getSigners(db, packet.id), signer)) {
    return NextResponse.json({ error: "The landlord signs first. You'll be able to sign once they have." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const typedName = String(body.typedName ?? "").trim().slice(0, 120);
  const initials = String(body.initials ?? "").trim().toUpperCase().slice(0, 6);
  const signatureImage = String(body.signatureImage ?? "");

  if (body.consent !== true) return NextResponse.json({ error: "Please agree to sign electronically." }, { status: 400 });
  if (typedName.length < 2) return NextResponse.json({ error: "Type your full legal name." }, { status: 400 });
  if (!/^[A-Z.\- ]{1,6}$/.test(initials)) return NextResponse.json({ error: "Enter your initials." }, { status: 400 });
  if (!signatureImage.startsWith("data:image/png;base64,") || signatureImage.length > MAX_SIGNATURE_CHARS) {
    return NextResponse.json({ error: "Draw your signature." }, { status: 400 });
  }

  // Validate answers against the fields this signer was asked for.
  const data = parseData(packet.data);
  const fields = signerFields(data, parseDocs(packet.documents), signer.slot);
  const input = (body.responses && typeof body.responses === "object" ? body.responses : {}) as Record<string, unknown>;
  const inputAcks = (input.acks && typeof input.acks === "object" ? input.acks : {}) as Record<string, unknown>;
  const responses: Record<string, unknown> = { acks: {} as Record<string, boolean> };
  const acks = responses.acks as Record<string, boolean>;
  for (const f of fields) {
    if (f.showIf && String(input[f.showIf.key] ?? "") !== f.showIf.value) continue;
    if (f.type === "ack") {
      const ok = inputAcks[f.key] === true;
      if (f.required && !ok) return NextResponse.json({ error: `Please confirm: ${f.label}` }, { status: 400 });
      acks[f.key] = ok;
    } else if (f.type === "choice") {
      const val = String(input[f.key] ?? "");
      if (!f.options?.some((o) => o.value === val)) {
        if (f.required) return NextResponse.json({ error: `Please choose: ${f.label}` }, { status: 400 });
        continue;
      }
      responses[f.key] = val;
    } else {
      const val = String(input[f.key] ?? "").trim().slice(0, 500);
      if (f.required && !val) return NextResponse.json({ error: `Please fill in: ${f.label}` }, { status: 400 });
      if (val) responses[f.key] = val;
    }
  }

  const now = new Date().toISOString();
  const { ip, userAgent } = requestMeta(request);
  const signatureHash = await sha256Hex(signatureImage);
  const signedHash = await sha256Hex(
    [packet.contentHash, signer.slot, typedName, initials, JSON.stringify(responses), now, signatureHash].join("|"),
  );

  // Conditional update so a double submit can't overwrite a signature.
  const updated = await db.update(leaseSigners)
    .set({
      status: "signed", signedAt: now, consentAt: now, typedName, initials, signatureImage,
      responses: JSON.stringify(responses), ip, userAgent, signedHash,
    })
    .where(and(eq(leaseSigners.id, signer.id), eq(leaseSigners.status, "pending")))
    .returning({ id: leaseSigners.id })
    .all();
  if (!updated.length) return NextResponse.json({ error: "You have already signed." }, { status: 409 });
  await logEvent(db, packet.id, "signed", { signerId: signer.id, detail: `${typedName}; sha256 ${signedHash}`, request });

  const signers = await getSigners(db, packet.id);
  const origin = new URL(request.url).origin;
  if (signers.every((s) => s.status === "signed")) {
    await db.update(leasePackets).set({ status: "completed", completedAt: now, updatedAt: now }).where(eq(leasePackets.id, packet.id)).run();
    await logEvent(db, packet.id, "completed", { request });
    const done = { ...packet, status: "completed", completedAt: now };
    await onPacketCompleted(db, done);
    await syncApplicantStatus(db, packet.prescreeningId, done);
    for (const s of signers) {
      if (!s.email) continue;
      const msg = completedEmail({ name: s.name, title: packet.title, link: `${origin}/sign/${s.token}` });
      await sendEmail({ to: [{ email: s.email, name: s.name }], ...msg });
    }
  } else {
    await db.update(leasePackets).set({ updatedAt: now }).where(eq(leasePackets.id, packet.id)).run();
    await syncApplicantStatus(db, packet.prescreeningId, packet);
    // Landlord-first: once the landlord has signed, hand the packet to the tenants.
    if (signer.role === "landlord" && packet.signOrder === "landlord_first") {
      const data = parseData(packet.data);
      for (const t of signers.filter((s) => s.role === "tenant" && s.status !== "signed")) {
        if (packet.tenantDelivery === "email" && t.email) {
          const msg = signingEmail({ name: t.name, title: packet.title, address: data.propertyAddress, link: `${origin}/sign/${t.token}`, landlordName: data.landlordName });
          const res = await sendEmail({ to: [{ email: t.email, name: t.name }], ...msg });
          await logEvent(db, packet.id, res ? "emailed" : "email_failed", { signerId: t.id, detail: t.email });
        } else {
          await logEvent(db, packet.id, "ready_for_tenant", { signerId: t.id, detail: "in person — open the tenant's link on a device" });
        }
      }
    }
    // Last tenant just signed → ask the landlord signer to review and countersign.
    const landlord = signers.find((s) => s.role === "landlord");
    const tenantsDone = signers.filter((s) => s.role === "tenant").every((s) => s.status === "signed");
    if (signer.role === "tenant" && tenantsDone && landlord?.status === "pending" && landlord.email) {
      const msg = countersignEmail({
        tenantNames: signers.filter((s) => s.role === "tenant").map((s) => s.name).join(", "),
        title: packet.title,
        link: `${origin}/admin/leases/documents/${packet.id}`,
      });
      const res = await sendEmail({ to: [{ email: landlord.email, name: landlord.name }], ...msg });
      await logEvent(db, packet.id, res ? "countersign_requested" : "email_failed", { signerId: landlord.id, detail: landlord.email });
    }
  }

  return NextResponse.json({ success: true });
}
