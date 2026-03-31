import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leaseTerms } from "@/db/schema";
import { leaseTermsSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = leaseTermsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  db.update(leaseTerms).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(leaseTerms.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  db.delete(leaseTerms).where(eq(leaseTerms.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
