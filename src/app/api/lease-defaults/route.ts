import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getHouseDefaults, saveHouseDefaults } from "@/lib/lease-docs/house-defaults";

/** Company-wide default house terms. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getHouseDefaults(await getDb()));
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await saveHouseDefaults(await getDb(), body));
}
