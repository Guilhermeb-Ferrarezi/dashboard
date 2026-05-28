-- Adiciona colunas de tags (jogos livres + serviços enum) em corujao_contatos
-- com GIN index pra filtros eficientes via ANY(jogos)/ANY(servicos).
ALTER TABLE "corujao_contatos" ADD COLUMN IF NOT EXISTS "jogos" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "corujao_contatos" ADD COLUMN IF NOT EXISTS "servicos" text[] DEFAULT '{}' NOT NULL;
CREATE INDEX IF NOT EXISTS "corujao_contatos_jogos_gin" ON "corujao_contatos" USING gin ("jogos");
CREATE INDEX IF NOT EXISTS "corujao_contatos_servicos_gin" ON "corujao_contatos" USING gin ("servicos");
