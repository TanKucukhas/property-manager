import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { properties } from "@/db/schema";
import { propertySchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const { id } = await params;
  const record = await db.select().from(properties).where(eq(properties.id, parseInt(id))).get();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const body = await request.json();
  const parsed = propertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  await db.update(properties).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(properties.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const body = await request.json();

  if (body.aiAnalysis !== undefined) {
    await db.update(properties).set({
      aiAnalysis: body.aiAnalysis,
      aiAnalysisDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(properties.id, parseInt(id))).run();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid patch" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const { id } = await params;
  await db.delete(properties).where(eq(properties.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
