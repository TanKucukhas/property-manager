import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { leasePackets, leaseSigners } from "@/db/schema";
import { DOC_ORDER, normalizeLeaseData } from "@/lib/lease-docs/templates";
import { logEvent, syncApplicantStatus } from "@/lib/lease-docs/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const packets = await db
    .select({
      id: leasePackets.id, title: leasePackets.title, status: leasePackets.status,
      propertyId: leasePackets.propertyId, tenantId: leasePackets.tenantId, prescreeningId: leasePackets.prescreeningId,
      sentAt: leasePackets.sentAt, completedAt: leasePackets.completedAt, createdAt: leasePackets.createdAt, updatedAt: leasePackets.updatedAt,
    })
    .from(leasePackets)
    .orderBy(desc(leasePackets.createdAt))
    .all();
  const signers = await db
    .select({ packetId: leaseSigners.packetId, name: leaseSigners.name, role: leaseSigners.role, status: leaseSigners.status, signedAt: leaseSigners.signedAt })
    .from(leaseSigners)
    .all();
  return NextResponse.json(
    packets.map((p: { id: number }) => ({ ...p, signers: signers.filter((s: { packetId: number }) => s.packetId === p.id) })),
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const body = await request.json().catch(() => ({}));
  const data = normalizeLeaseData(body.data);
  const docs = Array.isArray(body.documents) ? DOC_ORDER.filter((k) => body.documents.includes(k)) : [];
  if (!docs.includes("lease")) docs.unshift("lease");
  const now = new Date().toISOString();
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v) || null);

  // One live lease per applicant: reopen the existing one instead of duplicating.
  const prescreeningId = num(body.prescreeningId);
  if (prescreeningId) {
    const existing = await db.select({ id: leasePackets.id }).from(leasePackets)
      .where(and(eq(leasePackets.prescreeningId, prescreeningId), inArray(leasePackets.status, ["draft", "sent", "completed"])))
      .get();
    if (existing) return NextResponse.json({ ...existing, existing: true });
  }

  const row = await db
    .insert(leasePackets)
    .values({
      title: String(body.title || `${data.propertyAddress.split(",")[0] || "Lease"} — ${data.tenants[0]?.name || "Tenant"}`).slice(0, 200),
      status: "draft",
      data: JSON.stringify(data),
      documents: JSON.stringify(docs),
      propertyId: num(body.propertyId),
      tenantId: num(body.tenantId),
      prescreeningId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  await logEvent(db, row.id, "created", { detail: `by ${session.email}`, request });
  await syncApplicantStatus(db, row.prescreeningId, row);
  return NextResponse.json(row);
}
