import { eq } from "drizzle-orm";
import { leaseTerms, properties, settings } from "@/db/schema";
import { houseTermsFromDefaults, normalizeHouseDefaults, type HouseDefaults } from "./standard-terms";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const KEY = "house_defaults";

export async function getHouseDefaults(db: Db): Promise<HouseDefaults> {
  const row = await db.select().from(settings).where(eq(settings.key, KEY)).get();
  try {
    return normalizeHouseDefaults(row ? JSON.parse(row.value) : {});
  } catch {
    return normalizeHouseDefaults({});
  }
}

export async function saveHouseDefaults(db: Db, input: unknown): Promise<HouseDefaults> {
  const value = normalizeHouseDefaults(input);
  const now = new Date().toISOString();
  await db.insert(settings)
    .values({ key: KEY, value: JSON.stringify(value), updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value), updatedAt: now } })
    .run();
  return value;
}

/** Gives a property its own copy of the default terms unless it already has terms. */
export async function ensureHouseTerms(db: Db, propertyId: number) {
  const existing = await db.select({ id: leaseTerms.id }).from(leaseTerms).where(eq(leaseTerms.propertyId, propertyId)).get();
  if (existing) return existing;
  const prop = await db.select().from(properties).where(eq(properties.id, propertyId)).get();
  if (!prop) return null;
  const d = await getHouseDefaults(db);
  const now = new Date().toISOString();
  return db.insert(leaseTerms).values({
    propertyId,
    monthlyRent: prop.monthlyRent,
    securityDeposit: prop.securityDeposit,
    petsAllowed: prop.petsPolicy !== "not_allowed",
    ...houseTermsFromDefaults(d),
    createdAt: now,
    updatedAt: now,
  }).returning().get();
}
