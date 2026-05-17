import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return "";
}

const accountId = readEnv("CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID");
const accessKeyId = readEnv("CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_ACCESS_KEY_ID");
const secretAccessKey = readEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_SECRET_ACCESS_KEY");
const bucket = readEnv("CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_BUCKET_NAME");
const publicBaseUrl = readEnv("CLOUDFLARE_R2_PUBLIC_URL", "CLOUDFLARE_PUBLIC_URL").replace(/\/$/, "");

const client =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      })
    : null;

function assertR2Configured() {
  if (!client || !bucket) {
    throw new Error("R2 nao configurado.");
  }
}

function getFileExtension(fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".png")) return ".png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return ".jpg";
  if (lowerName.endsWith(".webp")) return ".webp";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return "";
}

function sanitizeObjectName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

export function getVctR2PublicUrl(key: string) {
  return publicBaseUrl ? `${publicBaseUrl}/${key}` : "";
}

export async function uploadVctR2Object({
  buffer,
  mimeType,
  fileName,
  folder,
}: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  folder: string;
}) {
  assertR2Configured();
  const r2Client = client as S3Client;

  const safeName = sanitizeObjectName(fileName || "logo");
  const extension = getFileExtension(fileName, mimeType);
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, "");
  const key = `${normalizedFolder}/${randomUUID()}-${safeName}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return {
    key,
    url: getVctR2PublicUrl(key),
  };
}

export async function uploadVctFormationLogo({
  buffer,
  mimeType,
  fileName,
  formacaoId,
}: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  formacaoId: string;
}) {
  return uploadVctR2Object({
    buffer,
    mimeType,
    fileName,
    folder: `vct/formacoes/${formacaoId}`,
  });
}

export async function deleteVctFormationLogo(key: string) {
  if (!client || !bucket || !key) return;
  const r2Client = client as S3Client;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
