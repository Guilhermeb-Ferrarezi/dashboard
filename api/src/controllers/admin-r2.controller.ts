import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { uploadVctR2Object } from "../lib/vct-r2";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FOLDERS = [
  "admin/uploads",
  "admin/banners",
  "admin/avatars",
  "vct/formacoes",
  "vct/layout",
  "public/assets",
  "checkout/products",
] as const;

function normalizeFolder(value: unknown) {
  if (typeof value !== "string") return "admin/uploads";

  const normalized = value.trim().replace(/^\/+|\/+$/g, "");
  return ALLOWED_FOLDERS.includes(normalized as (typeof ALLOWED_FOLDERS)[number])
    ? normalized
    : normalized || "admin/uploads";
}

export async function uploadAdminR2Image(c: Context<AppEnv>): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ ok: false, message: "Falha ao processar o upload." }, 400);
  }

  const fileValue = body["image"];

  if (!(fileValue instanceof File)) {
    return c.json({ ok: false, message: "Envie uma imagem válida." }, 400);
  }

  if (!fileValue.type.startsWith("image/")) {
    return c.json({ ok: false, message: "Envie apenas imagens." }, 400);
  }

  if (fileValue.size > MAX_IMAGE_SIZE_BYTES) {
    return c.json({ ok: false, message: "A imagem precisa ter no máximo 5 MB." }, 400);
  }

  const folder = normalizeFolder(body["folder"]);
  const buffer = Buffer.from(await fileValue.arrayBuffer());

  try {
    const uploaded = await uploadVctR2Object({
      buffer,
      mimeType: fileValue.type,
      fileName: fileValue.name,
      folder,
    });

    return c.json({
      ok: true,
      image: {
        key: uploaded.key,
        url: uploaded.url,
        folder,
        fileName: fileValue.name,
        mimeType: fileValue.type,
        size: fileValue.size,
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar a imagem.";
    return c.json({ ok: false, message }, 500);
  }
}
