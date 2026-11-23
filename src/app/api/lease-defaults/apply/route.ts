import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { properties } from "@/db/schema";
import { ensureHouseTerms } from "@/lib/lease-docs/house-defaults";

/** Gives every property that has no lease terms yet a copy of the defaults. Existing terms are left alone. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const props = await db.select({ id: properties.id }).from(properties).all();
  let created = 0;
  for (const p of props) {
    const row = await ensureHouseTerms(db, p.id);
    if (row && "createdAt" in row) created++; // existing terms come back as { id } only
  }
  return NextResponse.json({ success: true, created });
}
