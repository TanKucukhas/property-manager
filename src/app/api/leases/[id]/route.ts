import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leaseTerms } from "@/db/schema";
import { leaseTermsSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const body = await request.json();
  const parsed = leaseTermsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  await db.update(leaseTerms).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(leaseTerms.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const { id } = await params;
  await db.delete(leaseTerms).where(eq(leaseTerms.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
