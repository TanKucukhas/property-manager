import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { prescreenings } from "@/db/schema";
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
  const { status, adminNotes, adminRating } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (status) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  if (adminRating !== undefined) updates.adminRating = Math.min(Math.max(parseInt(adminRating) || 0, 0), 20);

  await db.update(prescreenings).set(updates).where(eq(prescreenings.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const parsedId = parseInt(id);
  if (Number.isNaN(parsedId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = await db.select().from(prescreenings).where(eq(prescreenings.id, parsedId)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(prescreenings).where(eq(prescreenings.id, parsedId)).run();
  return NextResponse.json({ success: true });
}
