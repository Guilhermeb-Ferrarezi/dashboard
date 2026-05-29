import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // MongoDB
  MONGO_URI: z.string().min(1, "MONGO_URI é obrigatória"),
  MONGO_FALLBACK_HOST: z.string().default("127.0.0.1"),
  MONGO_DB_NAME: z.string().optional(),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().default(5000),

  // PostgreSQL
  POSTGRES_URL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_PREFIX: z.string().default("home:"),

  // JWT
  JWT_SECRET: z.string().min(1, "JWT_SECRET é obrigatória"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),

  // SSO
  SSO_SHARED_SECRET: z.string().optional(),
  ADMIN_PORTAL_SSO_SECRET: z.string().optional(),
  ADMIN_PORTAL_SSO_PATH: z.string().optional(),
  ADMIN_PORTAL_URL: z.string().optional(),
  STUDENT_PORTAL_SSO_SECRET: z.string().optional(),
  PORTAL_URL: z.string().optional(),

  // Cloudflare R2
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),

  // Codex
  CODEX_HOME: z.string().optional(),
  CODEX_WORKSPACE_ROOT: z.string().optional(),
  CODEX_APP_SERVER_PORT: z.coerce.number().optional(),
  CODEX_APP_SERVER_URL: z.string().optional(),
  CODEX_ACCESS_TOKEN: z.string().optional(),
  CODEX_BIN: z.string().optional(),
  CODEX_INTERNAL_API_TOKEN: z.string().optional(),
  CODEX_DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX: z.string().optional(),

  // Logs
  LOGS_MONGO_DB_NAME: z.string().default("logs"),
  LOGS_HTTP_COLLECTION: z.string().optional(),
  LOGS_PROJECTS_COLLECTION: z.string().optional(),
  LOGS_ROUTE_BLACKLIST: z.string().optional(),
  LOGS_GET_ROUTE_BLACKLIST: z.string().optional(),

  // Site Publisher
  SITE_PUBLISHER_STORAGE_DIR: z.string().optional(),

  // Token encryption
  ADMIN_ACCESS_TOKEN_ENCRYPTION_SECRET: z.string().optional(),

  // DB Pool
  DB_POOL_SIZE: z.coerce.number().default(10),

  // Google Analytics
  GA4_PROPERTY_ID: z.string().optional(),
  GA4_CREDENTIALS_JSON: z.string().optional(),

  // Valorant / HenrikDev
  HENRIK_AUTH: z.string().optional(),
  HENRIKDEV_API_KEY: z.string().optional(),
  HENRIKDEV_API_DEV: z.string().optional(),
  VALORANT_LOOKUP_PROXY_URL: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),

  // Corujao
  CORUJAO_INTERNAL_SECRET: z.string().optional(),
  MIX_INTERNAL_SECRET: z.string().optional(),
  MIX_DOTFY_SLUG: z.string().optional(),

  // Misc
  BASIC_AUTH_PASS: z.string().optional(),
  DOTFY_API_KEY: z.string().optional(),
  DOTFY_API_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Variáveis de ambiente inválidas:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  _env = result.data;
  return result.data;
}

export function env(): Env {
  if (!_env) return validateEnv();
  return _env;
}
