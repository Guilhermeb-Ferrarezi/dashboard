import JSZip from "jszip";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_STORAGE_DIR = "/app/site-routes";
const MANIFEST_FILE_NAME = ".site-publisher-manifest.json";

export type PublishedSiteSummary = {
  route: string;
  title: string;
  archiveFileName: string;
  archiveSizeBytes: number;
  fileCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

type PublishedSiteManifest = {
  sites: PublishedSiteSummary[];
};

type PublishSiteInput = {
  route: string;
  archiveBuffer: Buffer;
  archiveFileName: string;
  archiveSizeBytes: number;
};

function readEnv(key: string) {
  return process.env[key]?.trim() || "";
}

export function getSitePublisherStorageDir() {
  return readEnv("SITE_PUBLISHER_STORAGE_DIR") || DEFAULT_STORAGE_DIR;
}

function getManifestPath(storageDir = getSitePublisherStorageDir()) {
  return path.join(storageDir, MANIFEST_FILE_NAME);
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
}

function sanitizePathSegment(value: string) {
  return stripAccents(value)
    .replace(/[^a-zA-Z0-9._-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

export function normalizePublishedRoute(value: string) {
  const raw = value.trim();
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  const segments = prefixed
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error("Informe uma rota valida.");
  }

  const sanitizedSegments = segments.map((segment) => {
    if (segment === "." || segment === "..") {
      throw new Error("A rota nao pode conter '..' ou '.'.");
    }

    const sanitized = sanitizePathSegment(segment);
    if (!sanitized) {
      throw new Error("A rota nao pode ter segmentos vazios.");
    }

    return sanitized;
  });

  return `/${sanitizedSegments.join("/")}`;
}

function routeToRelativeDirectory(route: string) {
  return route
    .split("/")
    .filter(Boolean)
    .join(path.sep);
}

function getSiteDirectory(storageDir: string, route: string) {
  return path.join(storageDir, routeToRelativeDirectory(route));
}

function getEntryPathForWrite(routeDir: string, entryName: string) {
  const normalizedEntryName = path.posix.normalize(entryName.replace(/\\/gu, "/"));

  if (
    normalizedEntryName === "." ||
    normalizedEntryName.startsWith("../") ||
    normalizedEntryName.includes("/../") ||
    normalizedEntryName.startsWith("/")
  ) {
    throw new Error("O zip contem caminhos invalidos.");
  }

  const targetPath = path.resolve(routeDir, normalizedEntryName);
  const normalizedRouteDir = path.resolve(routeDir);

  if (
    targetPath !== normalizedRouteDir &&
    !targetPath.startsWith(`${normalizedRouteDir}${path.sep}`)
  ) {
    throw new Error("O zip tenta escrever fora da rota destino.");
  }

  return targetPath;
}

function isRootIndexEntry(entry: { name: string; dir?: boolean }) {
  const normalized = path.posix.normalize(entry.name.replace(/\\/gu, "/"));
  return path.posix.basename(normalized).toLowerCase() === "index.html" && path.posix.dirname(normalized) === ".";
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return "";

  return match[1]
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function buildPreviewSnippet(html: string) {
  return html
    .trim()
    .split("\n")
    .slice(0, 18)
    .join("\n")
    .slice(0, 2000);
}

async function readManifest(storageDir = getSitePublisherStorageDir()) {
  try {
    const raw = await readFile(getManifestPath(storageDir), "utf8");
    const parsed = JSON.parse(raw) as PublishedSiteManifest;
    return Array.isArray(parsed?.sites) ? parsed.sites : [];
  } catch {
    return [];
  }
}

async function writeManifest(sites: PublishedSiteSummary[], storageDir = getSitePublisherStorageDir()) {
  await mkdir(storageDir, { recursive: true });
  const nextManifest: PublishedSiteManifest = { sites };
  const manifestPath = getManifestPath(storageDir);
  const nextManifestPath = `${manifestPath}.tmp`;

  await writeFile(nextManifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  await rm(manifestPath, { force: true });
  await rename(nextManifestPath, manifestPath);
}

async function upsertManifestSite(nextSite: PublishedSiteSummary, storageDir = getSitePublisherStorageDir()) {
  const sites = await readManifest(storageDir);
  const filteredSites = sites.filter((site) => site.route !== nextSite.route);
  filteredSites.unshift(nextSite);
  filteredSites.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await writeManifest(filteredSites, storageDir);
}

async function removeManifestSite(route: string, storageDir = getSitePublisherStorageDir()) {
  const sites = await readManifest(storageDir);
  const filteredSites = sites.filter((site) => site.route !== route);
  await writeManifest(filteredSites, storageDir);
}

export async function listPublishedSites(storageDir = getSitePublisherStorageDir()) {
  const sites = await readManifest(storageDir);
  return sites.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function publishStaticSiteZip(input: PublishSiteInput) {
  const route = normalizePublishedRoute(input.route);
  const storageDir = getSitePublisherStorageDir();
  const routeDir = getSiteDirectory(storageDir, route);
  const archive = await JSZip.loadAsync(input.archiveBuffer);

  const rootIndexEntry = Object.values(archive.files).find((entry) => entry && !entry.dir && isRootIndexEntry(entry));

  if (!rootIndexEntry) {
    throw new Error("O zip precisa conter um index.html na raiz.");
  }

  await rm(routeDir, { recursive: true, force: true });
  await mkdir(routeDir, { recursive: true });

  let fileCount = 0;
  for (const entry of Object.values(archive.files)) {
    if (!entry || entry.dir) {
      continue;
    }

    const normalizedName = path.posix.normalize(entry.name.replace(/\\/gu, "/"));
    if (
      normalizedName === "." ||
      normalizedName.startsWith("../") ||
      normalizedName.includes("/../") ||
      normalizedName.startsWith("/")
    ) {
      throw new Error("O zip contem caminhos invalidos.");
    }

    const outputName =
      isRootIndexEntry(entry) ? "index.html" : normalizedName;
    const targetPath = getEntryPathForWrite(routeDir, outputName);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, await entry.async("nodebuffer"));
    fileCount += 1;
  }

  const indexHtml = await rootIndexEntry.async("string");
  const now = new Date().toISOString();
  const existingSites = await readManifest(storageDir);
  const existingSite = existingSites.find((site) => site.route === route);

  const nextSite: PublishedSiteSummary = {
    route,
    title: extractHtmlTitle(indexHtml) || route.split("/").filter(Boolean).at(-1) || "site publicado",
    archiveFileName: input.archiveFileName,
    archiveSizeBytes: input.archiveSizeBytes,
    fileCount,
    preview: buildPreviewSnippet(indexHtml),
    createdAt: existingSite?.createdAt ?? now,
    updatedAt: now,
  };

  await upsertManifestSite(nextSite, storageDir);

  return nextSite;
}

export async function deletePublishedSite(routeInput: string) {
  const route = normalizePublishedRoute(routeInput);
  const storageDir = getSitePublisherStorageDir();
  const routeDir = getSiteDirectory(storageDir, route);

  await rm(routeDir, { recursive: true, force: true });
  await removeManifestSite(route, storageDir);

  return { route };
}

export async function getPublishedSiteDirectory(routeInput: string) {
  const route = normalizePublishedRoute(routeInput);
  return getSiteDirectory(getSitePublisherStorageDir(), route);
}
