import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { properties } from "@/db/schema";
import { propertySchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const records = await db.select().from(properties).orderBy(desc(properties.createdAt)).all();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const body = await request.json();
  const parsed = propertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await db.insert(properties).values(parsed.data).returning().get();
  return NextResponse.json(result);
}
