import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applicationShares, properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const db = await getDb();
  const row = await db
    .select({
      id: applicationShares.id,
      shareToken: applicationShares.shareToken,
      shareType: applicationShares.shareType,
      propertyId: applicationShares.propertyId,
      propertyName: properties.name,
      leadSource: applicationShares.leadSource,
    })
    .from(applicationShares)
    .leftJoin(properties, eq(applicationShares.propertyId, properties.id))
    .where(eq(applicationShares.shareToken, token))
    .get();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
