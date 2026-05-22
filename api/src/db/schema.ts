import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const checkoutProducts = pgTable("checkout_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
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
  status: text("status", { enum: ["pending", "paid", "failed", "expired"] })
    .notNull()
    .default("pending"),
  abacateBillingId: text("abacate_billing_id"),
  checkoutUrl: text("checkout_url"),
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
