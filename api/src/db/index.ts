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

export function getCheckoutDb(): Db {
  if (!_db) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL não configurado");
    _db = createDb(url);
  }
  return _db;
}
