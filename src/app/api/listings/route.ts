import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { prescreenings, properties, propertyListings } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rows = await db
    .select({
      id: propertyListings.id,
      propertyId: propertyListings.propertyId,
      propertyName: properties.name,
      label: propertyListings.label,
      openedAt: propertyListings.openedAt,
      closedAt: propertyListings.closedAt,
      placedPrescreeningId: propertyListings.placedPrescreeningId,
      tenantId: propertyListings.tenantId,
      applicationCount: sql<number>`(SELECT COUNT(*) FROM ${prescreenings} WHERE ${prescreenings.listingId} = ${propertyListings.id})`,
    })
    .from(propertyListings)
    .leftJoin(properties, eq(propertyListings.propertyId, properties.id))
    .orderBy(desc(propertyListings.openedAt))
    .all();
  return NextResponse.json(rows);
}
