import type { Request, Response } from "express";
import multer from "multer";

import { uploadVctR2Object } from "../lib/vct-r2";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FOLDERS = [
  "admin/uploads",
  "admin/banners",
  "admin/avatars",
  "vct/formacoes",
  "vct/layout",
  "public/assets",
] as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Envie apenas imagens."));
      return;
    }

    callback(null, true);
  },
});

function normalizeFolder(value: unknown) {
  if (typeof value !== "string") return "admin/uploads";

  const normalized = value.trim().replace(/^\/+|\/+$/g, "");
  return ALLOWED_FOLDERS.includes(normalized as (typeof ALLOWED_FOLDERS)[number])
    ? normalized
    : normalized || "admin/uploads";
}

function parseMultipartRequest(req: Request, res: Response) {
  return new Promise<void>((resolve, reject) => {
    upload.single("image")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function isImageFile(file?: Express.Multer.File) {
  return Boolean(file && file.mimetype.startsWith("image/"));
}

export async function uploadAdminR2Image(req: Request, res: Response) {
  try {
    await parseMultipartRequest(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar o upload.";

    if (message.includes("File too large")) {
      res.status(400).json({ ok: false, message: "A imagem precisa ter no máximo 5 MB." });
      return;
    }

    res.status(400).json({ ok: false, message });
    return;
  }

  const image = req.file;
  const folder = normalizeFolder(req.body?.folder);

  if (!image || !isImageFile(image)) {
    res.status(400).json({ ok: false, message: "Envie uma imagem válida." });
    return;
  }

  try {
    const uploaded = await uploadVctR2Object({
      buffer: image.buffer,
      mimeType: image.mimetype,
      fileName: image.originalname,
      folder,
    });

    res.status(201).json({
      ok: true,
      image: {
        key: uploaded.key,
        url: uploaded.url,
        folder,
        fileName: image.originalname,
        mimeType: image.mimetype,
        size: image.size,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar a imagem.";
    res.status(500).json({ ok: false, message });
  }
}
