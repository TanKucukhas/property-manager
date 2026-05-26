import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applicationShares, properties } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq, sql } from "drizzle-orm";

function generateToken(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    shareType,
    propertyId,
    recipientName,
    leadSource,
    sourceProfile,
    notes,
  } = body as Record<string, unknown>;

  if (shareType !== "direct" && shareType !== "public") {
    return NextResponse.json({ error: "shareType must be 'direct' or 'public'" }, { status: 400 });
  }
  if (!leadSource || typeof leadSource !== "string") {
    return NextResponse.json({ error: "leadSource is required" }, { status: 400 });
  }

  const db = await getDb();
  const token = generateToken();

  const inserted = await db.insert(applicationShares).values({
    shareToken: token,
    shareType,
    propertyId: propertyId ? Number(propertyId) : null,
    recipientName: typeof recipientName === "string" && recipientName.trim() ? recipientName.trim() : null,
    leadSource,
    sourceProfile: typeof sourceProfile === "string" && sourceProfile.trim() ? sourceProfile.trim() : null,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  }).returning().get();

  return NextResponse.json({ ...inserted, token: inserted.shareToken });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rows = await db
    .select({
      id: applicationShares.id,
      shareToken: applicationShares.shareToken,
      shareType: applicationShares.shareType,
      propertyId: applicationShares.propertyId,
      propertyName: properties.name,
      recipientName: applicationShares.recipientName,
      leadSource: applicationShares.leadSource,
      sourceProfile: applicationShares.sourceProfile,
      notes: applicationShares.notes,
      archivedAt: applicationShares.archivedAt,
      createdAt: applicationShares.createdAt,
      submissionCount: sql<number>`(SELECT COUNT(*) FROM prescreenings WHERE prescreenings.share_id = ${applicationShares.id})`.as("submissionCount"),
      lastSubmissionAt: sql<string | null>`(SELECT MAX(created_at) FROM prescreenings WHERE prescreenings.share_id = ${applicationShares.id})`.as("lastSubmissionAt"),
      visitorCount: sql<number>`(SELECT COUNT(*) FROM share_visits WHERE share_visits.share_id = ${applicationShares.id})`.as("visitorCount"),
      avgFurthestStep: sql<number | null>`(SELECT AVG(furthest_step) FROM share_visits WHERE share_visits.share_id = ${applicationShares.id})`.as("avgFurthestStep"),
      maxTotalSteps: sql<number | null>`(SELECT MAX(total_steps) FROM share_visits WHERE share_visits.share_id = ${applicationShares.id})`.as("maxTotalSteps"),
      lastVisitAt: sql<string | null>`(SELECT MAX(last_seen_at) FROM share_visits WHERE share_visits.share_id = ${applicationShares.id})`.as("lastVisitAt"),
      latestFurthestStep: sql<number | null>`(SELECT furthest_step FROM share_visits WHERE share_visits.share_id = ${applicationShares.id} ORDER BY last_seen_at DESC LIMIT 1)`.as("latestFurthestStep"),
      latestTotalSteps: sql<number | null>`(SELECT total_steps FROM share_visits WHERE share_visits.share_id = ${applicationShares.id} ORDER BY last_seen_at DESC LIMIT 1)`.as("latestTotalSteps"),
    })
    .from(applicationShares)
    .leftJoin(properties, eq(applicationShares.propertyId, properties.id))
    .orderBy(desc(applicationShares.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { ids, action } = body as { ids?: unknown; action?: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  if (action !== "archive" && action !== "unarchive") {
    return NextResponse.json({ error: "action must be 'archive' or 'unarchive'" }, { status: 400 });
  }

  const numericIds = ids.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (numericIds.length === 0) return NextResponse.json({ error: "no valid ids" }, { status: 400 });

  const db = await getDb();
  const archivedAt = action === "archive" ? new Date().toISOString() : null;
  for (const id of numericIds) {
    await db.update(applicationShares).set({ archivedAt }).where(eq(applicationShares.id, id)).run();
  }
  return NextResponse.json({ ok: true, count: numericIds.length });
}
