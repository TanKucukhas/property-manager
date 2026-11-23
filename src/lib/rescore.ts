import { eq } from "drizzle-orm";
import { prescreenings, properties } from "@/db/schema";
import { scorePrescreening } from "@/lib/validations";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/**
 * Re-scores every application for a property against its current
 * qualifications (rent × income multiplier, credit minimum, house rules).
 * Run after a property edit so scores never lag behind a corrected rent.
 * Returns how many scores changed.
 */
export async function rescorePropertyApplicants(db: Db, propertyId: number): Promise<number> {
  const property = await db.select().from(properties).where(eq(properties.id, propertyId)).get();
  if (!property) return 0;
  const rows = await db.select().from(prescreenings).where(eq(prescreenings.propertyId, propertyId)).all();
  let changed = 0;
  for (const r of rows) {
    const { score } = scorePrescreening(r as Parameters<typeof scorePrescreening>[0], property);
    if (score === r.score) continue;
    await db.update(prescreenings).set({ score, updatedAt: new Date().toISOString() }).where(eq(prescreenings.id, r.id)).run();
    changed++;
  }
  return changed;
}
