import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const records = await db
    .select({
      id: properties.id,
      name: properties.name,
      address1: properties.address1,
      city: properties.city,
      state: properties.state,
      zip: properties.zip,
      monthlyRent: properties.monthlyRent,
      securityDeposit: properties.securityDeposit,
    })
    .from(properties)
    .where(eq(properties.status, "available"))
    .all();
  return NextResponse.json(records);
}
