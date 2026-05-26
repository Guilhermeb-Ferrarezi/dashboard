ALTER TABLE "checkout_customers" RENAME COLUMN "abacate_customer_id" TO "provider_customer_id";--> statement-breakpoint
ALTER TABLE "checkout_orders" RENAME COLUMN "abacate_billing_id" TO "charge_id";--> statement-breakpoint
ALTER TABLE "checkout_payments" RENAME COLUMN "abacate_event_id" TO "charge_event_id";
