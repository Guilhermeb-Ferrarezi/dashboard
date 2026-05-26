ALTER TABLE "corujao_contatos" ALTER COLUMN "nome" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "corujao_contatos" ADD COLUMN "data_nascimento" date;