import type { Request, Response } from "express";
import multer from "multer";

import {
  deletePublishedSite,
  listPublishedSites,
  normalizePublishedRoute,
  publishStaticSiteZip,
} from "../lib/site-publisher";

const MAX_ARCHIVE_SIZE_BYTES = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ARCHIVE_SIZE_BYTES,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const isZipMime = file.mimetype.includes("zip") || file.mimetype === "application/octet-stream";
    const isZipName = file.originalname.toLowerCase().endsWith(".zip");

    if (!isZipMime && !isZipName) {
      callback(new Error("Envie apenas arquivos ZIP."));
      return;
    }

    callback(null, true);
  },
});

function parseMultipartRequest(req: Request, res: Response) {
  return new Promise<void>((resolve, reject) => {
    upload.single("archive")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function parseRoute(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Informe uma rota valida.");
  }

  return normalizePublishedRoute(value);
}

export async function listAdminPublishedSitesHandler(_req: Request, res: Response) {
  const sites = await listPublishedSites();
  res.json({ sites });
}

export async function publishAdminSiteHandler(req: Request, res: Response) {
  try {
    await parseMultipartRequest(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar o ZIP.";

    if (message.includes("File too large")) {
      res.status(400).json({ ok: false, message: "O ZIP precisa ter no máximo 20 MB." });
      return;
    }

    res.status(400).json({ ok: false, message });
    return;
  }

  const archive = req.file;

  try {
    const route = parseRoute(req.body?.route);

    if (!archive) {
      res.status(400).json({ ok: false, message: "Envie um arquivo ZIP valido." });
      return;
    }

    const published = await publishStaticSiteZip({
      route,
      archiveBuffer: archive.buffer,
      archiveFileName: archive.originalname,
      archiveSizeBytes: archive.size,
    });

    res.status(201).json({ ok: true, site: published });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao publicar o site.";
    res.status(400).json({ ok: false, message });
  }
}

export async function deleteAdminSiteHandler(req: Request, res: Response) {
  try {
    const route = parseRoute(req.body?.route);
    const deleted = await deletePublishedSite(route);
    res.json({ ok: true, site: deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover o site.";
    res.status(400).json({ ok: false, message });
  }
}

