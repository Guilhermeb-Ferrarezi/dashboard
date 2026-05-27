-- Adiciona constraint unique no email de contatos (permite NULL — só rejeita duplicado quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS "corujao_contatos_email_unique" ON "corujao_contatos" ("email") WHERE "email" IS NOT NULL;
