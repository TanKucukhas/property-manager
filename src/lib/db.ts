import * as schema from "@/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _localDb: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDb(): Promise<any> {
  // Try Cloudflare D1 first
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((env as any).DB) {
      const { drizzle } = await import("drizzle-orm/d1");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return drizzle((env as any).DB, { schema });
    }
  } catch {
    // Not on Cloudflare, fall through to local
  }

  // Local dev: use better-sqlite3
  if (_localDb) return _localDb;
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const path = await import("path");
  const dbPath = path.join(process.cwd(), "data", "property-manager.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _localDb = drizzle(sqlite, { schema });
  return _localDb;
}
