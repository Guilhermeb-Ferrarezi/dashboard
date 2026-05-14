import crypto from "node:crypto";

function resolveEncryptionSecret(secretOverride?: string | null) {
  const secret =
    secretOverride?.trim() ||
    process.env.ADMIN_ACCESS_TOKEN_ENCRYPTION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_ACCESS_TOKEN_ENCRYPTION_SECRET ou JWT_SECRET precisa estar configurado.",
      );
    }

    return "codex-access-token-dev-secret";
  }

  return secret;
}

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

function encodeChunk(buffer: Buffer) {
  return buffer.toString("base64url");
}

function decodeChunk(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptSecret(plaintext: string, secretOverride?: string | null) {
  if (!plaintext) {
    throw new Error("Nao foi possivel criptografar um valor vazio.");
  }

  const key = deriveKey(resolveEncryptionSecret(secretOverride));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    encodeChunk(iv),
    encodeChunk(ciphertext),
    encodeChunk(authTag),
  ].join(":");
}

export function decryptSecret(value: string, secretOverride?: string | null) {
  const [version, ivValue, ciphertextValue, authTagValue] = value.split(":");

  if (version !== "v1" || !ivValue || !ciphertextValue || !authTagValue) {
    throw new Error("Formato de segredo criptografado invalido.");
  }

  const key = deriveKey(resolveEncryptionSecret(secretOverride));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, decodeChunk(ivValue));

  decipher.setAuthTag(decodeChunk(authTagValue));

  return Buffer.concat([
    decipher.update(decodeChunk(ciphertextValue)),
    decipher.final(),
  ]).toString("utf8");
}
