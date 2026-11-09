import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { aiJobs, prescreenings, properties, shareVisits } from "@/db/schema";
import { scorePrescreening } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const record = await db.select().from(prescreenings).where(eq(prescreenings.id, parseInt(id))).get();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const body = await request.json();
  const { status, adminNotes, adminRating, rejectReason, showingDate, showingTime, aiAnalysis, listingId, monthlyIncome } = body;
  const incomeCorrectionReason = typeof body.incomeCorrectionReason === "string" ? body.incomeCorrectionReason.slice(0, 200) : "";

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (status) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  if (adminRating !== undefined) updates.adminRating = Math.min(Math.max(parseInt(adminRating) || 0, 0), 10);
  if (rejectReason !== undefined) updates.rejectReason = rejectReason;
  if (status && status !== "rejected") updates.rejectReason = null;
  if (showingDate !== undefined) updates.showingDate = showingDate;
  if (showingTime !== undefined) updates.showingTime = showingTime;
  if (status && status !== "scheduled-for-showing") { updates.showingDate = null; updates.showingTime = null; }
  if (listingId !== undefined) {
    const parsedListingId = listingId === null ? null : parseInt(listingId);
    if (parsedListingId !== null && Number.isNaN(parsedListingId)) {
      return NextResponse.json({ error: "Invalid listingId" }, { status: 400 });
    }
    updates.listingId = parsedListingId;
  }
  if (monthlyIncome !== undefined) {
    const nextIncome = Math.round(Number(monthlyIncome) * 100) / 100;
    if (!Number.isFinite(nextIncome) || nextIncome < 0) {
      return NextResponse.json({ error: "Invalid monthlyIncome" }, { status: 400 });
    }
    const record = await db.select().from(prescreenings).where(eq(prescreenings.id, parseInt(id))).get();
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (record.monthlyIncome !== nextIncome) {
      const property = record.propertyId
        ? await db.select().from(properties).where(eq(properties.id, record.propertyId)).get()
        : null;
      // Re-score with the corrected income; every other answer stays as submitted.
      const { score } = scorePrescreening(
        { ...record, monthlyIncome: nextIncome } as unknown as Parameters<typeof scorePrescreening>[0],
        property,
      );
      updates.monthlyIncome = nextIncome;
      updates.score = score;
      // Keep the originally submitted value visible in the notes.
      const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
      const line = `[${new Date().toISOString().slice(0, 10)}] Monthly income corrected ${fmt(record.monthlyIncome)} → ${fmt(nextIncome)}${incomeCorrectionReason ? ` (${incomeCorrectionReason})` : ""}`;
      const baseNotes = (updates.adminNotes as string | undefined) ?? record.adminNotes ?? "";
      updates.adminNotes = baseNotes ? `${baseNotes}\n${line}` : line;
    }
  }
  if (aiAnalysis !== undefined) {
    updates.aiAnalysis = aiAnalysis === null ? null : (typeof aiAnalysis === "string" ? aiAnalysis : JSON.stringify(aiAnalysis));
    updates.aiAnalysisDate = aiAnalysis === null ? null : new Date().toISOString();
  }

  await db.update(prescreenings).set(updates).where(eq(prescreenings.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const { id } = await params;
    const parsedId = parseInt(id);
    if (Number.isNaN(parsedId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const existing = await db.select().from(prescreenings).where(eq(prescreenings.id, parsedId)).get();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // share_visits.submitted_prescreening_id references prescreenings(id) without ON DELETE,
    // so we must null the reference before the delete or the FK constraint fires.
    await db
      .update(shareVisits)
      .set({ submittedPrescreeningId: null })
      .where(eq(shareVisits.submittedPrescreeningId, parsedId))
      .run();

    await db.delete(aiJobs).where(eq(aiJobs.prescreeningId, parsedId)).run();
    await db.delete(prescreenings).where(eq(prescreenings.id, parsedId)).run();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete prescreening failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
