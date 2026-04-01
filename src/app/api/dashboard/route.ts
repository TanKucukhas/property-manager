import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { properties, tenants, prescreenings, payments, maintenanceRequests } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const propertiesCount = db.select({ count: sql<number>`count(*)` }).from(properties).get()?.count ?? 0;
  const availableCount = db.select({ count: sql<number>`count(*)` }).from(properties).where(eq(properties.status, "available")).get()?.count ?? 0;
  const tenantsCount = db.select({ count: sql<number>`count(*)` }).from(tenants).where(eq(tenants.leaseStatus, "active")).get()?.count ?? 0;
  const newPrescreenings = db.select({ count: sql<number>`count(*)` }).from(prescreenings).where(eq(prescreenings.status, "new")).get()?.count ?? 0;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

  const monthPayments = db.select().from(payments)
    .where(sql`${payments.dueDate} >= ${monthStart} AND ${payments.dueDate} <= ${monthEnd}`)
    .all();

  const rentDue = monthPayments.reduce((sum: number, p: { amountDue: number }) => sum + p.amountDue, 0);
  const rentCollected = monthPayments.reduce((sum: number, p: { amountPaid: number }) => sum + p.amountPaid, 0);
  const unpaidBalance = rentDue - rentCollected;
  const lateCount = monthPayments.filter((p: { status: string }) => p.status === "late").length;

  const openMaintenance = db.select({ count: sql<number>`count(*)` }).from(maintenanceRequests)
    .where(sql`${maintenanceRequests.status} IN ('open', 'in_progress')`)
    .get()?.count ?? 0;

  return NextResponse.json({
    propertiesCount,
    availableCount,
    tenantsCount,
    newPrescreenings,
    rentDue,
    rentCollected,
    unpaidBalance,
    lateCount,
    openMaintenance,
  });
}
