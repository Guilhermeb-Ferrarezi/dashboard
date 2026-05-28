import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(postgresUrl: string) {
  const poolSize = Number(process.env.DB_POOL_SIZE) || 10;
  const client = postgres(postgresUrl, { max: poolSize });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };

let _db: Db | null = null;
let _raw: ReturnType<typeof postgres> | null = null;
let _migrated = false;

/**
 * @deprecated 2026-05-26 — todas as 5 operações foram cobertas pelas
 * migrations Drizzle 0003/0004/0008. Causava a FK duplicada da dívida #3.
 * Chamada removida em server.ts; função preservada por 1-2 sessões pra
 * rollback emergencial. Pode ser apagada quando o ciclo estabilizar.
 */
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

  await _raw`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkout_orders_user_id_fkey'
      ) THEN
        ALTER TABLE checkout_orders
          ADD CONSTRAINT checkout_orders_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES checkout_customers(user_id)
            ON DELETE CASCADE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkout_payments_order_id_fkey'
      ) THEN
        ALTER TABLE checkout_payments
          DROP CONSTRAINT checkout_payments_order_id_fkey;
      END IF;

      ALTER TABLE checkout_payments
        ADD CONSTRAINT checkout_payments_order_id_fkey
          FOREIGN KEY (order_id) REFERENCES checkout_orders(id)
          ON DELETE CASCADE;
    END;
    $$
  `;

  await _raw`
    ALTER TABLE checkout_products
    ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'
  `;

  await _raw`
    CREATE TABLE IF NOT EXISTS checkout_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES checkout_customers(user_id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES checkout_products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
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
