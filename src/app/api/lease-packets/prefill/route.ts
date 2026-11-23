import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { prefillLeaseData } from "@/lib/lease-docs/server";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const q = new URL(request.url).searchParams;
  const num = (k: string) => (q.get(k) ? Number(q.get(k)) || undefined : undefined);
  const result = await prefillLeaseData(db, {
    prescreeningId: num("prescreeningId"),
    tenantId: num("tenantId"),
    propertyId: num("propertyId"),
  });
  return NextResponse.json(result);
}
