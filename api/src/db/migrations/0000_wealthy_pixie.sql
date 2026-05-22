CREATE TABLE "checkout_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"abacate_billing_id" text,
	"checkout_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"abacate_event_id" text,
	"status" text NOT NULL,
	"paid_at" timestamp with time zone,
	"raw_event" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_payments" ADD CONSTRAINT "checkout_payments_order_id_checkout_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE no action ON UPDATE no action;