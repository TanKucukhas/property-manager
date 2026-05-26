import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applicationShares, shareVisits } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const incomingVisitorId = typeof body.visitorId === "string" ? body.visitorId : null;
  const step = Number.isFinite(body.step) ? Math.max(0, Math.floor(body.step)) : 0;
  const totalSteps = Number.isFinite(body.totalSteps) ? Math.max(0, Math.floor(body.totalSteps)) : 0;

  const db = await getDb();
  const share = await db.select().from(applicationShares).where(eq(applicationShares.shareToken, token)).get();
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Direct shares: single row per share (overwrite). Public: per-visitor.
  const visitorId = share.shareType === "direct" ? "direct" : (incomingVisitorId || "anon");
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(shareVisits)
    .where(and(eq(shareVisits.shareId, share.id), eq(shareVisits.visitorId, visitorId)))
    .get();

  if (existing) {
    await db
      .update(shareVisits)
      .set({
        furthestStep: Math.max(existing.furthestStep, step),
        totalSteps: totalSteps || existing.totalSteps,
        lastSeenAt: now,
      })
      .where(eq(shareVisits.id, existing.id))
      .run();
  } else {
    await db.insert(shareVisits).values({
      shareId: share.id,
      visitorId,
      furthestStep: step,
      totalSteps,
      firstOpenedAt: now,
      lastSeenAt: now,
    }).run();
  }

  return NextResponse.json({ ok: true });
}
