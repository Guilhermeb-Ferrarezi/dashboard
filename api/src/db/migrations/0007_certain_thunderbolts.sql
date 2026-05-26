ALTER TABLE "colaboradores" ALTER COLUMN "mongo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "corujao_visitas" ADD COLUMN "colaborador_id" integer;--> statement-breakpoint
ALTER TABLE "corujao_visitas" ADD CONSTRAINT "corujao_visitas_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE set null ON UPDATE no action;