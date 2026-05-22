import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(postgresUrl: string) {
  const client = postgres(postgresUrl, { max: 10 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };

let _db: Db | null = null;
let _raw: ReturnType<typeof postgres> | null = null;
let _migrated = false;

export async function runCheckoutMigrations(): Promise<void> {
  if (_migrated) return;
  const url = process.env.POSTGRES_URL;
  if (!url) return;
  if (!_raw) _raw = postgres(url, { max: 1 });
  await _raw`
    ALTER TABLE checkout_customers
    ADD COLUMN IF NOT EXISTS user_login TEXT,
    ADD COLUMN IF NOT EXISTS user_email TEXT
  `;
  _migrated = true;
}

export function getCheckoutDb(): Db {
  if (!_db) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL não configurado");
    _db = createDb(url);
  }
  return _db;
}
