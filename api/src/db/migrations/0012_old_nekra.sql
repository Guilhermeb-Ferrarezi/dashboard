CREATE TABLE "mix_inscricoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessao_id" integer NOT NULL,
	"checkout_user_id" integer NOT NULL,
	"checkout_order_id" integer,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mix_sessoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"jogo" text NOT NULL,
	"data_prevista" date NOT NULL,
	"horario" text NOT NULL,
	"modalidade" text DEFAULT 'presencial' NOT NULL,
	"total_vagas" integer DEFAULT 10 NOT NULL,
	"status" text DEFAULT 'confirmando' NOT NULL,
	"preco_cents" integer DEFAULT 0 NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mix_inscricoes" ADD CONSTRAINT "mix_inscricoes_sessao_id_mix_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."mix_sessoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mix_inscricoes" ADD CONSTRAINT "mix_inscricoes_checkout_user_id_checkout_customers_user_id_fk" FOREIGN KEY ("checkout_user_id") REFERENCES "public"."checkout_customers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mix_inscricoes" ADD CONSTRAINT "mix_inscricoes_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE set null ON UPDATE no action;
