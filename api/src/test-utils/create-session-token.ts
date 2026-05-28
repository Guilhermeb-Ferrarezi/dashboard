/**
 * Utilitário de teste para criar tokens de sessão no mesmo formato que
 * session-token.ts usa. NÃO usar em código de produção.
 */

type SessionPayload = {
  userId: number;
  email: string;
  login: string;
  role: number;
  sessionId?: string;
  exp?: number;
};

const encoder = new TextEncoder();

function base64UrlEncodeBytes(value: Uint8Array): string {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncodeBytes(
    new TextEncoder().encode(JSON.stringify(value)),
  );
}

async function signHmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

export async function createTestSessionToken(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const header = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + 3600;
  const body = base64UrlEncodeJson({ ...payload, exp });
  const unsigned = `${header}.${body}`;
  const signature = await signHmac(unsigned, secret);
  return `${unsigned}.${signature}`;
}
