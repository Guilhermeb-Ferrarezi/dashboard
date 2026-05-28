import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import {
  deletePublishedSite,
  listPublishedSites,
  normalizePublishedRoute,
  publishStaticSiteZip,
} from "../lib/site-publisher";

const MAX_ARCHIVE_SIZE_BYTES = 20 * 1024 * 1024;

function parseRoute(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Informe uma rota válida.");
  }

  return normalizePublishedRoute(value);
}

export async function listAdminPublishedSitesHandler(c: Context<AppEnv>): Promise<Response> {
  const sites = await listPublishedSites();
  return c.json({ sites });
}

export async function publishAdminSiteHandler(c: Context<AppEnv>): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ ok: false, message: "Falha ao processar o ZIP." }, 400);
  }

  const archiveFile = body["archive"];

  if (!(archiveFile instanceof File)) {
    return c.json({ ok: false, message: "Envie um arquivo ZIP válido." }, 400);
  }

  if (archiveFile.size > MAX_ARCHIVE_SIZE_BYTES) {
    return c.json({ ok: false, message: "O ZIP precisa ter no máximo 20 MB." }, 400);
  }

  const isZipMime = archiveFile.type.includes("zip") || archiveFile.type === "application/octet-stream";
  const isZipName = archiveFile.name.toLowerCase().endsWith(".zip");

  if (!isZipMime && !isZipName) {
    return c.json({ ok: false, message: "Envie apenas arquivos ZIP." }, 400);
  }

  try {
    const route = parseRoute(body["route"]);
    const archiveBuffer = Buffer.from(await archiveFile.arrayBuffer());

    const published = await publishStaticSiteZip({
      route,
      archiveBuffer,
      archiveFileName: archiveFile.name,
      archiveSizeBytes: archiveFile.size,
    });

    return c.json({ ok: true, site: published }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao publicar o site.";
    return c.json({ ok: false, message }, 400);
  }
}

export async function deleteAdminSiteHandler(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const route = parseRoute(body?.route);
    const deleted = await deletePublishedSite(route);
    return c.json({ ok: true, site: deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover o site.";
    return c.json({ ok: false, message }, 400);
  }
}
