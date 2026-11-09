import { and, desc, eq, isNull } from "drizzle-orm";
import { prescreenings, propertyListings } from "@/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export function listingLabel(openedAt: string): string {
  return new Date(openedAt).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export async function getOpenListing(db: Db, propertyId: number) {
  return db
    .select()
    .from(propertyListings)
    .where(and(eq(propertyListings.propertyId, propertyId), isNull(propertyListings.closedAt)))
    .orderBy(desc(propertyListings.openedAt))
    .get();
}

/** Opens a new listing round for the property unless one is already open. */
export async function ensureOpenListing(db: Db, propertyId: number) {
  const existing = await getOpenListing(db, propertyId);
  if (existing) return existing;
  const now = new Date().toISOString();
  return db
    .insert(propertyListings)
    .values({ propertyId, label: listingLabel(now), openedAt: now, createdAt: now, updatedAt: now })
    .returning()
    .get();
}

/**
 * Closes the open listing round. If exactly one applicant in that round is
 * "approved", they are recorded as the placed applicant.
 */
export async function closeOpenListing(db: Db, propertyId: number) {
  const open = await getOpenListing(db, propertyId);
  if (!open) return null;
  const now = new Date().toISOString();
  let placedPrescreeningId = open.placedPrescreeningId;
  if (placedPrescreeningId == null) {
    const approved = await db
      .select({ id: prescreenings.id })
      .from(prescreenings)
      .where(and(eq(prescreenings.listingId, open.id), eq(prescreenings.status, "approved")))
      .all();
    if (approved.length === 1) placedPrescreeningId = approved[0].id;
  }
  await db
    .update(propertyListings)
    .set({ closedAt: now, placedPrescreeningId, updatedAt: now })
    .where(eq(propertyListings.id, open.id))
    .run();
  return { ...open, closedAt: now, placedPrescreeningId };
}

/** Keeps listing rounds in step with a property's status change. */
export async function syncListingWithStatus(db: Db, propertyId: number, prevStatus: string | null, nextStatus: string) {
  if (nextStatus === "available" && prevStatus !== "available") {
    await ensureOpenListing(db, propertyId);
  } else if (prevStatus === "available" && nextStatus !== "available") {
    await closeOpenListing(db, propertyId);
  }
}
