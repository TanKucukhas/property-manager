import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { leaseEvents, leasePackets, leaseSigners } from "@/db/schema";
import { DOC_ORDER, normalizeLeaseData } from "@/lib/lease-docs/templates";
import { getSigners, packetHtml, syncApplicantStatus, parseData, parseDocs } from "@/lib/lease-docs/server";

async function load(id: string) {
  const db = await getDb();
  const packet = await db.select().from(leasePackets).where(eq(leasePackets.id, Number(id))).get();
  return { db, packet };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { db, packet } = await load(id);
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const signers = await getSigners(db, packet.id);
  const events = await db.select().from(leaseEvents).where(eq(leaseEvents.packetId, packet.id)).orderBy(asc(leaseEvents.createdAt)).all();
  return NextResponse.json({
    packet: { ...packet, snapshotHtml: undefined, data: parseData(packet.data), documents: parseDocs(packet.documents) },
    signers: signers.map((s) => ({ ...s, signatureImage: undefined, hasSignature: !!s.signatureImage })),
    events,
    html: packetHtml(packet, signers),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { db, packet } = await load(id);
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (packet.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be edited. Void this packet and create a new one to change terms." }, { status: 409 });
  }
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.data !== undefined) update.data = JSON.stringify(normalizeLeaseData(body.data));
  if (Array.isArray(body.documents)) {
    const docs = DOC_ORDER.filter((k) => body.documents.includes(k));
    if (!docs.includes("lease")) docs.unshift("lease");
    update.documents = JSON.stringify(docs);
  }
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 200);
  await db.update(leasePackets).set(update).where(eq(leasePackets.id, packet.id)).run();
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { db, packet } = await load(id);
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Sent packets are legal records: they can be voided but never deleted.
  if (packet.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be deleted. Void a sent packet instead." }, { status: 409 });
  }
  await db.delete(leaseEvents).where(eq(leaseEvents.packetId, packet.id)).run();
  await db.delete(leaseSigners).where(eq(leaseSigners.packetId, packet.id)).run();
  await db.delete(leasePackets).where(eq(leasePackets.id, packet.id)).run();
  await syncApplicantStatus(db, packet.prescreeningId, null);
  return NextResponse.json({ success: true });
}
