import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { portableDownloadSavePath } from "../download-policy.mjs";

const origin = "app://game";

test("portable download allows a JSON life file from a blob URL", () => {
  assert.equal(
    portableDownloadSavePath(
      "rafael-riggs.ocd-life.json",
      "blob:app://game/abc",
      "/tmp/downloads",
      origin,
    ),
    path.join("/tmp/downloads", "rafael-riggs.ocd-life.json"),
  );
});

test("portable download strips path components from the filename", () => {
  assert.equal(
    portableDownloadSavePath(
      "../secret.json",
      "blob:app://game/abc",
      "/tmp/downloads",
      origin,
    ),
    path.join("/tmp/downloads", "secret.json"),
  );
});

test("portable download refuses non-JSON and off-origin sources", () => {
  assert.equal(
    portableDownloadSavePath(
      "life.exe",
      "blob:app://game/abc",
      "/tmp/downloads",
      origin,
    ),
    null,
  );
  assert.equal(
    portableDownloadSavePath(
      "life.json",
      "https://example.invalid/life.json",
      "/tmp/downloads",
      origin,
    ),
    null,
  );
});
