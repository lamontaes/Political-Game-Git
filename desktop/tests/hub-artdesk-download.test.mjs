import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { artDeskDownloadPath } from "../private-controller/artdesk-host.mjs";

const benchOrigin = "http://127.0.0.1:5555";
// Resolved once so the expectations match the host's own absolute form
// (Windows adds the drive to a bare "/tmp" path).
const downloadsDir = path.resolve("/tmp/ocd-downloads");

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

test("briefs and edit bundles download under meaningful names", () => {
  assert.equal(
    artDeskDownloadPath({
      filename: "school-corridor-fountain-brief.md",
      url: `${benchOrigin}/__dev/artbench/brief?requestId=x&download=1`,
      benchOrigin,
      downloadsDir,
    }),
    path.join(downloadsDir, "school-corridor-fountain-brief.md"),
  );
  assert.ok(
    artDeskDownloadPath({
      filename: "x-cand-1-edit-bundle.json",
      url: `blob:${benchOrigin}/abc`,
      benchOrigin,
      downloadsDir,
    }),
  );
  assert.equal(
    artDeskDownloadPath({
      filename: "brief.md",
      url: "https://example.invalid/brief.md",
      benchOrigin,
      downloadsDir,
    }),
    null,
  );
});

test("foreign origins, other types and traversal are refused", () => {
  const base = { benchOrigin, downloadsDir };
  for (const [filename, url] of [
    ["a.png", "https://example.invalid/a.png"],
    ["a.png", "blob:http://127.0.0.1:9999/x"],
    ["a.exe", `${benchOrigin}/a.exe`],
    ["a.html", `${benchOrigin}/a.html`],
    ["a.command", `${benchOrigin}/a.command`],
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
