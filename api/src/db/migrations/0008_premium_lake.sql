-- Adiciona payment_method em checkout_orders.
-- Idempotente: a coluna já existe em todos os bancos atuais (criada
-- via runCheckoutMigrations no boot, antes do Drizzle controlar este
-- schema). Em deploy fresh, esta migration cria a coluna corretamente.
ALTER TABLE "checkout_orders" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'pix' NOT NULL;
