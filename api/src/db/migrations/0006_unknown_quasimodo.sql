ALTER TABLE "corujao_contatos" ADD COLUMN "ultimo_contato_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "corujao_contatos" ADD COLUMN "status_conversa" text;--> statement-breakpoint
ALTER TABLE "corujao_contatos" ADD COLUMN "status_pagamento" text;