import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { artDeskDownloadPath } from "../private-controller/artdesk-host.mjs";

const benchOrigin = "http://127.0.0.1:5555";
const downloadsDir = "/tmp/ocd-downloads";

test("bench originals and edits land in the downloads folder", () => {
  assert.equal(
    artDeskDownloadPath({
      filename: "cand-1.png",
      url: `${benchOrigin}/__dev/artbench/original?candidateId=cand-1`,
      benchOrigin,
      downloadsDir,
    }),
    path.join(downloadsDir, "cand-1.png"),
  );
  assert.ok(
    artDeskDownloadPath({
      filename: "edit.JPG",
      url: `blob:${benchOrigin}/abc`,
      benchOrigin,
      downloadsDir,
    }),
  );
});

test("foreign origins, other types and traversal are refused", () => {
  const base = { benchOrigin, downloadsDir };
  for (const [filename, url] of [
    ["a.png", "https://example.invalid/a.png"],
    ["a.png", "blob:http://127.0.0.1:9999/x"],
    ["a.exe", `${benchOrigin}/a.exe`],
    ["../../a.png", `${benchOrigin}/x`],
    ["", `${benchOrigin}/x`],
  ]) {
    const result = artDeskDownloadPath({ ...base, filename, url });
    if (filename === "../../a.png")
      assert.equal(result, path.join(downloadsDir, "a.png"));
    else assert.equal(result, null, `${filename} ${url}`);
  }
  assert.equal(
    artDeskDownloadPath({
      filename: "a.png",
      url: `${benchOrigin}/x`,
      benchOrigin: null,
      downloadsDir,
    }),
    null,
  );
});
