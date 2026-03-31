import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescreenings } from "@/db/schema";
import { prescreeningSchema, scorePrescreening } from "@/lib/validations";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = prescreeningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { score, status } = scorePrescreening(data);

    const result = db.insert(prescreenings).values({
      ...data,
      petsJson: data.petsJson || null,
      currentRent: data.currentRent ?? null,
      score,
      status,
    }).returning().get();

    return NextResponse.json({ success: true, id: result.id, score, status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = db.select().from(prescreenings).orderBy(desc(prescreenings.createdAt)).all();
  return NextResponse.json(records);
}
