CREATE TABLE IF NOT EXISTS "checkout_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_customers" ADD COLUMN IF NOT EXISTS "user_login" text;--> statement-breakpoint
ALTER TABLE "checkout_customers" ADD COLUMN IF NOT EXISTS "user_email" text;--> statement-breakpoint
ALTER TABLE "checkout_customers" ADD COLUMN IF NOT EXISTS "name" text;--> statement-breakpoint
ALTER TABLE "checkout_customers" ADD COLUMN IF NOT EXISTS "tax_id" text;--> statement-breakpoint
ALTER TABLE "checkout_customers" ADD COLUMN IF NOT EXISTS "cellphone" text;--> statement-breakpoint
ALTER TABLE "checkout_products" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_products" ADD COLUMN IF NOT EXISTS "image_key" text;--> statement-breakpoint
ALTER TABLE "checkout_products" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = 'public'
      AND kcu.table_name = 'checkout_subscriptions'
      AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE "checkout_subscriptions" ADD CONSTRAINT "checkout_subscriptions_user_id_checkout_customers_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."checkout_customers"("user_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = 'public'
      AND kcu.table_name = 'checkout_subscriptions'
      AND kcu.column_name = 'product_id'
  ) THEN
    ALTER TABLE "checkout_subscriptions" ADD CONSTRAINT "checkout_subscriptions_product_id_checkout_products_id_fk"
      FOREIGN KEY ("product_id") REFERENCES "public"."checkout_products"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
