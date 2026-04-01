import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { tenants } from "@/db/schema";
import { tenantSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const records = db.select().from(tenants).orderBy(desc(tenants.createdAt)).all();
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

  const result = db.insert(tenants).values(parsed.data).returning().get();
  return NextResponse.json(result);
}
