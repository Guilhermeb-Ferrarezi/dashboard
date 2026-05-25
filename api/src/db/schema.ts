import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const checkoutProducts = pgTable("checkout_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  amountCents: integer("amount_cents").notNull(),
  discountPercent: integer("discount_percent"),
  active: boolean("active").notNull().default(true),
  imageKey: text("image_key"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkoutCoupons = pgTable("checkout_coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkoutCustomers = pgTable("checkout_customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  abacateCustomerId: text("abacate_customer_id").notNull(),
  userLogin: text("user_login"),
  userEmail: text("user_email"),
  name: text("name"),
  taxId: text("tax_id"),
  cellphone: text("cellphone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkoutOrders = pgTable("checkout_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => checkoutCustomers.userId, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  originalAmountCents: integer("original_amount_cents"),
  couponCode: text("coupon_code"),
  discountCents: integer("discount_cents"),
  status: text("status", { enum: ["pending", "paid", "failed", "expired", "refunded"] })
    .notNull()
    .default("pending"),
  abacateBillingId: text("abacate_billing_id"),
  checkoutUrl: text("checkout_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkoutSubscriptions = pgTable("checkout_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => checkoutCustomers.userId, { onDelete: "cascade" }),
  productId: integer("product_id")
    .references(() => checkoutProducts.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  status: text("status", { enum: ["active", "cancelled", "expired", "paused"] })
    .notNull()
    .default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkoutPayments = pgTable("checkout_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => checkoutOrders.id, { onDelete: "cascade" }),
  abacateEventId: text("abacate_event_id"),
  status: text("status").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  rawEvent: jsonb("raw_event"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
