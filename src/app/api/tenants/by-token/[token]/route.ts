import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const tenant = db.select({
    id: tenants.id,
    fullName: tenants.fullName,
    email: tenants.email,
    phone: tenants.phone,
    propertyId: tenants.propertyId,
    leaseStatus: tenants.leaseStatus,
  }).from(tenants).where(eq(tenants.accessToken, token)).get();

  if (!tenant || tenant.leaseStatus !== "active") {
    return NextResponse.json({ error: "Invalid or inactive tenant link" }, { status: 404 });
  }

  const property = tenant.propertyId
    ? db.select({ name: properties.name, address1: properties.address1 }).from(properties).where(eq(properties.id, tenant.propertyId)).get()
    : null;

  return NextResponse.json({
    tenantId: tenant.id,
    fullName: tenant.fullName,
    email: tenant.email,
    phone: tenant.phone,
    propertyId: tenant.propertyId,
    propertyName: property?.name ?? "",
    propertyAddress: property?.address1 ?? "",
  });
}
