import JSZip from "jszip";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  deleteAdminSiteHandler,
  listAdminPublishedSitesHandler,
} from "./admin-site-publisher.controller";
import { publishStaticSiteZip } from "../lib/site-publisher";
import { createMockContext } from "../test-utils/mock-context";

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
  zip.file("index.html", "<html><head><title>Site Demo</title></head><body>Demo</body></html>");
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("admin-site-publisher controller", () => {
  test("lista e remove rotas publicadas", async () => {
    const storageDir = await mkdtemp(path.join(os.tmpdir(), "site-publisher-controller-"));
    process.env.SITE_PUBLISHER_STORAGE_DIR = storageDir;

    const archiveBuffer = await createArchiveBuffer();
    await publishStaticSiteZip({
      route: "/demo/site",
      archiveBuffer,
      archiveFileName: "demo.zip",
      archiveSizeBytes: archiveBuffer.byteLength,
    });

    const listCtx = createMockContext();
    const listResponse = await listAdminPublishedSitesHandler(listCtx);
    const listData = await listResponse.json();

    expect(listData).toMatchObject({
      sites: expect.arrayContaining([
        expect.objectContaining({ route: "/demo/site", title: "Site Demo" }),
      ]),
    });

    const deleteCtx = createMockContext({
      body: { route: "/demo/site" },
    });
    const deleteResponse = await deleteAdminSiteHandler(deleteCtx);
    const deleteData = await deleteResponse.json();

    expect(deleteData).toMatchObject({
      ok: true,
      site: { route: "/demo/site" },
    });
  });
});
