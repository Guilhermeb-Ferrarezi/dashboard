import { relations } from "drizzle-orm";
import { boolean, date, integer, jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

// ── Checkout ──────────────────────────────────────────────────────────────────

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
  isCorujao: boolean("is_corujao").notNull().default(false),
  dotfyProductId: text("dotfy_product_id"),
  dotfySlug: text("dotfy_slug"),
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
  providerCustomerId: text("provider_customer_id").notNull(),
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
  paymentMethod: text("payment_method", { enum: ["pix", "card"] })
    .notNull()
    .default("pix"),
  chargeId: text("charge_id"),
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
  chargeEventId: text("charge_event_id"),
  status: text("status").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  rawEvent: jsonb("raw_event"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

// ── Colaboradores (cache local de Users do Mongo para permitir JOIN em SQL) ───

export const colaboradores = pgTable("colaboradores", {
  id: serial("id").primaryKey(),
  // Nullable agora: colaboradores cadastrados manualmente (sem User no Mongo)
  // ficam com NULL. Sync com Mongo (dívida #5) ainda vem.
  mongoId: text("mongo_id").unique(),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// ── Corujão ───────────────────────────────────────────────────────────────────

export const corujaoSessoes = pgTable("corujao_sessoes", {
  id: serial("id").primaryKey(),
  data: date("data", { mode: "string" }).notNull(),
  totalVagas: integer("total_vagas").notNull().default(10),
  status: text("status", {
    enum: ["planejado", "aberto", "lotado", "realizado", "cancelado"]
  }).notNull().default("planejado"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const corujaoContatos = pgTable("corujao_contatos", {
  id: serial("id").primaryKey(),
  nome: text("nome"),
  telefone: text("telefone"),
  email: text("email"),
  dataNascimento: date("data_nascimento", { mode: "string" }),
  origem: text("origem", {
    enum: ["anuncio", "indicacao", "espontaneo", "outro"]
  }).notNull().default("espontaneo"),
  jaParticipou: boolean("ja_participou").notNull().default(false),
  checkoutUserId: integer("checkout_user_id")
    .references(() => checkoutCustomers.userId, { onDelete: "set null" }),
  observacoes: text("observacoes"),
  ultimoContatoEm: timestamp("ultimo_contato_em", { withTimezone: true }),
  statusConversa: text("status_conversa", {
    enum: ["sem_resposta", "aguardando", "confirmou", "recusou"]
  }),
  statusPagamento: text("status_pagamento", {
    enum: ["pendente", "confirmou_pagou", "confirmou_nao_pagou", "paga_na_hora"]
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [unique().on(t.telefone), unique().on(t.email)]);

export const corujaoVisitas = pgTable("corujao_visitas", {
  id: serial("id").primaryKey(),
  contatoId: integer("contato_id")
    .notNull()
    .references(() => corujaoContatos.id, { onDelete: "cascade" }),
  sessaoId: integer("sessao_id")
    .references(() => corujaoSessoes.id, { onDelete: "set null" }),
  colaboradorId: integer("colaborador_id")
    .references(() => colaboradores.id, { onDelete: "set null" }),
  dataVisita: date("data_visita", { mode: "string" }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  formaPagamento: text("forma_pagamento", {
    enum: ["pix", "dinheiro", "cartao", "gateway", "cortesia", "outro"]
  }).notNull().default("pix"),
  checkoutOrderId: integer("checkout_order_id")
    .references(() => checkoutOrders.id, { onDelete: "set null" }),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const corujaoContatoLog = pgTable("corujao_contato_log", {
  id: serial("id").primaryKey(),
  contatoId: integer("contato_id")
    .notNull()
    .references(() => corujaoContatos.id, { onDelete: "cascade" }),
  colaboradorId: integer("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "restrict" }),
  contatadoEm: timestamp("contatado_em", { withTimezone: true }).defaultNow().notNull(),
  status: text("status", {
    enum: ["sem_resposta", "resposta_positiva", "pronto_para_pagar", "fechado", "recusou"]
  }).notNull(),
  mensagem: text("mensagem"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const corujaoVendas = pgTable("corujao_vendas", {
  id: serial("id").primaryKey(),
  contatoId: integer("contato_id")
    .notNull()
    .references(() => corujaoContatos.id, { onDelete: "restrict" }),
  colaboradorId: integer("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "restrict" }),
  visitaId: integer("visita_id")
    .references(() => corujaoVisitas.id, { onDelete: "set null" }),
  sessaoId: integer("sessao_id")
    .references(() => corujaoSessoes.id, { onDelete: "set null" }),
  amountCents: integer("amount_cents").notNull(),
  formaPagamento: text("forma_pagamento", {
    enum: ["pix", "dinheiro", "cartao", "gateway", "cortesia", "outro"]
  }).notNull(),
  vendidoEm: timestamp("vendido_em", { withTimezone: true }).defaultNow().notNull(),
  gatewayPaymentId: text("gateway_payment_id"),
  statusPagamento: text("status_pagamento", {
    enum: ["pago", "pendente", "estornado", "falhou"]
  }).notNull().default("pago"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const colaboradoresRelations = relations(colaboradores, ({ many }) => ({
  contatoLog: many(corujaoContatoLog),
  vendas: many(corujaoVendas)
}));

export const corujaoSessoesRelations = relations(corujaoSessoes, ({ many }) => ({
  visitas: many(corujaoVisitas),
  vendas: many(corujaoVendas)
}));

export const corujaoContatosRelations = relations(corujaoContatos, ({ one, many }) => ({
  checkoutCustomer: one(checkoutCustomers, {
    fields: [corujaoContatos.checkoutUserId],
    references: [checkoutCustomers.userId]
  }),
  visitas: many(corujaoVisitas),
  contatoLog: many(corujaoContatoLog),
  vendas: many(corujaoVendas)
}));

export const corujaoVisitasRelations = relations(corujaoVisitas, ({ one, many }) => ({
  contato: one(corujaoContatos, {
    fields: [corujaoVisitas.contatoId],
    references: [corujaoContatos.id]
  }),
  sessao: one(corujaoSessoes, {
    fields: [corujaoVisitas.sessaoId],
    references: [corujaoSessoes.id]
  }),
  colaborador: one(colaboradores, {
    fields: [corujaoVisitas.colaboradorId],
    references: [colaboradores.id]
  }),
  checkoutOrder: one(checkoutOrders, {
    fields: [corujaoVisitas.checkoutOrderId],
    references: [checkoutOrders.id]
  }),
  vendas: many(corujaoVendas)
}));

export const corujaoContatoLogRelations = relations(corujaoContatoLog, ({ one }) => ({
  contato: one(corujaoContatos, {
    fields: [corujaoContatoLog.contatoId],
    references: [corujaoContatos.id]
  }),
  colaborador: one(colaboradores, {
    fields: [corujaoContatoLog.colaboradorId],
    references: [colaboradores.id]
  })
}));

export const corujaoVendasRelations = relations(corujaoVendas, ({ one }) => ({
  contato: one(corujaoContatos, {
    fields: [corujaoVendas.contatoId],
    references: [corujaoContatos.id]
  }),
  colaborador: one(colaboradores, {
    fields: [corujaoVendas.colaboradorId],
    references: [colaboradores.id]
  }),
  visita: one(corujaoVisitas, {
    fields: [corujaoVendas.visitaId],
    references: [corujaoVisitas.id]
  }),
  sessao: one(corujaoSessoes, {
    fields: [corujaoVendas.sessaoId],
    references: [corujaoSessoes.id]
  })
}));
