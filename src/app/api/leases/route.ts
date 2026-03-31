import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leaseTerms } from "@/db/schema";
import { leaseTermsSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const records = db.select().from(leaseTerms).orderBy(desc(leaseTerms.createdAt)).all();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = leaseTermsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = db.insert(leaseTerms).values(parsed.data).returning().get();
  return NextResponse.json(result);
}
