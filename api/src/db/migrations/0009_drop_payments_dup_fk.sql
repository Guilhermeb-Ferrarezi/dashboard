-- Dropa FK duplicada em checkout_payments.order_id (dívida #3).
--
-- Cenário herdado: runCheckoutMigrations criou checkout_payments_order_id_fkey
-- com ON DELETE CASCADE; depois o Drizzle gerou
-- checkout_payments_order_id_checkout_orders_id_fk com ON DELETE NO ACTION.
-- Banco ficou com 2 FKs pra mesma coluna — inconsistência detectada em
-- inspect-checkout-fks.mjs.
--
-- Mantém a NO ACTION (Drizzle) — protege histórico financeiro contra
-- DELETE silencioso de checkout_orders com payments pendurados.
-- Idempotente: IF EXISTS evita falhar em banco fresh onde ela nunca foi
-- criada.
ALTER TABLE "checkout_payments"
  DROP CONSTRAINT IF EXISTS "checkout_payments_order_id_fkey";
