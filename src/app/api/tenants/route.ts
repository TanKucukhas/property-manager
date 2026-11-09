import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { tenants, propertyListings } from "@/db/schema";
import { tenantSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const records = await db.select().from(tenants).orderBy(desc(tenants.createdAt)).all();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const body = await request.json();
  const parsed = tenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await db.insert(tenants).values(parsed.data).returning().get();

  if (result.propertyId) {
    const listing = await db
      .select({ id: propertyListings.id })
      .from(propertyListings)
      .where(and(eq(propertyListings.propertyId, result.propertyId), isNull(propertyListings.tenantId)))
      .orderBy(desc(propertyListings.openedAt))
      .get();
    if (listing) {
      await db.update(propertyListings)
        .set({ tenantId: result.id, updatedAt: new Date().toISOString() })
        .where(eq(propertyListings.id, listing.id))
        .run();
    }
  }
  return NextResponse.json(result);
}
