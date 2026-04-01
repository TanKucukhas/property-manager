import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { maintenanceRequests } from "@/db/schema";
import { maintenanceSchema } from "@/lib/validations";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const parsed = maintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = db.insert(maintenanceRequests).values(parsed.data).returning().get();
    return NextResponse.json({ success: true, id: result.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const records = db.select().from(maintenanceRequests).orderBy(desc(maintenanceRequests.createdAt)).all();
  return NextResponse.json(records);
}
