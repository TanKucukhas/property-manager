import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { maintenanceRequests } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const body = await request.json();
  const { status, priority, adminNotes } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;

  await db.update(maintenanceRequests).set(updates).where(eq(maintenanceRequests.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
