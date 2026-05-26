DROP TABLE IF EXISTS "corujao_presencas" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "corujao_clientes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "corujao_sessoes" CASCADE;--> statement-breakpoint
CREATE TABLE "colaboradores" (
	"id" serial PRIMARY KEY NOT NULL,
	"mongo_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colaboradores_mongo_id_unique" UNIQUE("mongo_id")
);
--> statement-breakpoint
CREATE TABLE "corujao_contato_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"contato_id" integer NOT NULL,
	"colaborador_id" integer NOT NULL,
	"contatado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"mensagem" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corujao_contatos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"email" text,
	"origem" text DEFAULT 'espontaneo' NOT NULL,
	"ja_participou" boolean DEFAULT false NOT NULL,
	"checkout_user_id" integer,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corujao_contatos_telefone_unique" UNIQUE("telefone")
);
--> statement-breakpoint
CREATE TABLE "corujao_sessoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" date NOT NULL,
	"total_vagas" integer DEFAULT 10 NOT NULL,
	"status" text DEFAULT 'planejado' NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corujao_vendas" (
	"id" serial PRIMARY KEY NOT NULL,
	"contato_id" integer NOT NULL,
	"colaborador_id" integer NOT NULL,
	"visita_id" integer,
	"sessao_id" integer,
	"amount_cents" integer NOT NULL,
	"forma_pagamento" text NOT NULL,
	"vendido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"gateway_payment_id" text,
	"status_pagamento" text DEFAULT 'pago' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corujao_visitas" (
	"id" serial PRIMARY KEY NOT NULL,
	"contato_id" integer NOT NULL,
	"sessao_id" integer,
	"data_visita" date NOT NULL,
	"amount_cents" integer NOT NULL,
	"forma_pagamento" text DEFAULT 'pix' NOT NULL,
	"checkout_order_id" integer,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corujao_contato_log" ADD CONSTRAINT "corujao_contato_log_contato_id_corujao_contatos_id_fk" FOREIGN KEY ("contato_id") REFERENCES "public"."corujao_contatos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_contato_log" ADD CONSTRAINT "corujao_contato_log_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_contatos" ADD CONSTRAINT "corujao_contatos_checkout_user_id_checkout_customers_user_id_fk" FOREIGN KEY ("checkout_user_id") REFERENCES "public"."checkout_customers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_vendas" ADD CONSTRAINT "corujao_vendas_contato_id_corujao_contatos_id_fk" FOREIGN KEY ("contato_id") REFERENCES "public"."corujao_contatos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_vendas" ADD CONSTRAINT "corujao_vendas_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_vendas" ADD CONSTRAINT "corujao_vendas_visita_id_corujao_visitas_id_fk" FOREIGN KEY ("visita_id") REFERENCES "public"."corujao_visitas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_vendas" ADD CONSTRAINT "corujao_vendas_sessao_id_corujao_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."corujao_sessoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_visitas" ADD CONSTRAINT "corujao_visitas_contato_id_corujao_contatos_id_fk" FOREIGN KEY ("contato_id") REFERENCES "public"."corujao_contatos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_visitas" ADD CONSTRAINT "corujao_visitas_sessao_id_corujao_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."corujao_sessoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corujao_visitas" ADD CONSTRAINT "corujao_visitas_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE set null ON UPDATE no action;