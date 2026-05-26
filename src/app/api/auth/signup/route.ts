import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { propertyManagers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { pmSignupSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const parsed = pmSignupSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { name, email, company, phone, password, notes } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db
      .select({ id: propertyManagers.id })
      .from(propertyManagers)
      .where(eq(propertyManagers.email, normalizedEmail))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "An account request already exists for this email." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    await db.insert(propertyManagers).values({
      name: name.trim(),
      email: normalizedEmail,
      company: company?.trim() || null,
      phone: phone?.trim() || null,
      passwordHash,
      status: "pending",
      notes: notes?.trim() || null,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
