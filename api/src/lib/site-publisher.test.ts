import JSZip from "jszip";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  deletePublishedSite,
  listPublishedSites,
  normalizePublishedRoute,
  publishStaticSiteZip,
} from "./site-publisher";

const originalStorageDir = process.env.SITE_PUBLISHER_STORAGE_DIR;

afterEach(() => {
  if (originalStorageDir === undefined) {
    delete process.env.SITE_PUBLISHER_STORAGE_DIR;
    return;
  }

  process.env.SITE_PUBLISHER_STORAGE_DIR = originalStorageDir;
});

async function createArchiveBuffer() {
  const zip = new JSZip();
  zip.file(
    "index.html",
    "<html><head><title>Site Mizake</title></head><body><h1>Home</h1></body></html>",
  );
  zip.file("assets/app.css", "body { color: red; }");
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("site-publisher", () => {
  test("normaliza rotas publicadas com seguranca", () => {
    expect(normalizePublishedRoute(" Mizake / Site Novo ")).toBe("/cursos/abc");
    expect(() => normalizePublishedRoute("../admin")).toThrow("A rota nao pode conter");
  });

  test("publica, lista e remove um site estatico", async () => {
    const storageDir = await mkdtemp(path.join(os.tmpdir(), "site-publisher-"));
    process.env.SITE_PUBLISHER_STORAGE_DIR = storageDir;

    const archiveBuffer = await createArchiveBuffer();
    const published = await publishStaticSiteZip({
      route: "/Mizake/Site Novo",
      archiveBuffer,
      archiveFileName: "site-novo.zip",
      archiveSizeBytes: archiveBuffer.byteLength,
    });

    expect(published.route).toBe("/cursos/abc");
    expect(published.title).toBe("Site Mizake");
    expect(published.fileCount).toBe(2);

    const indexHtml = await readFile(
      path.join(storageDir, "mizake", "site-novo", "index.html"),
      "utf8",
    );
    expect(indexHtml).toContain("<h1>Home</h1>");

    const sites = await listPublishedSites(storageDir);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.route).toBe("/cursos/abc");

    await deletePublishedSite("/cursos/abc");
    expect(await listPublishedSites(storageDir)).toHaveLength(0);
  });
});

