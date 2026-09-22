/* global Buffer, Request, setInterval, clearInterval */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CONTENT_SCHEMA,
  CONTENT_CAPABILITY,
  contentHash,
  receiveContent,
  loadContent,
  loadContentAsync,
  loadContentManifest,
  serveRuntimeContent,
} from "../runtime-content.mjs";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
  "base64",
);
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "ocd-content-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(root + "/input/art", { recursive: true });
  writeFileSync(root + "/input/art/a.png", png);
  const manifest = {
    schema: CONTENT_SCHEMA,
    capability: CONTENT_CAPABILITY,
    files: [
      {
        path: "art/a.png",
        sha256: contentHash(png),
        bytes: png.length,
        mime: "image/png",
      },
    ],
    metadata: {
      "art/manifest/asset_manifest.json": {
        assets: [
          { asset_id: "a", final_path: "art/a.png", hash: contentHash(png) },
        ],
      },
    },
  };
  const save = () =>
    writeFileSync(root + "/input/manifest.json", JSON.stringify(manifest));
  save();
  return {
    root,
    manifest,
    save,
    args: {
      sourceRoot: root + "/input",
      manifestPath: "manifest.json",
      cacheRoot: root + "/cache",
    },
  };
}
test("content revision reuses unchanged bytes and serves only the frozen snapshot", async (t) => {
  const f = fixture(t),
    first = receiveContent(f.args);
  assert.equal(first.changedBytes, png.length);
  assert.equal(first.cacheHits, 0);
  const again = receiveContent(f.args);
  assert.equal(again.id, first.id);
  assert.equal(again.changedBytes, 0);
  assert.equal(again.cacheHits, 1);
  f.manifest.metadata["art/manifest/asset_manifest.json"].assets[0].label =
    "Revision";
  f.save();
  const next = receiveContent(f.args);
  assert.notEqual(next.id, first.id);
  assert.equal(next.changedBytes, 0);
  const loaded = loadContent(first);
  assert.equal(
    (
      await serveRuntimeContent(
        loaded,
        new Request(`app://game/__content/${first.id}/${contentHash(png)}`),
      ).arrayBuffer()
    ).byteLength,
    png.length,
  );
  assert.equal(
    serveRuntimeContent(
      loaded,
      new Request(`app://game/__content/${next.id}/${contentHash(png)}`),
    ).status,
    404,
  );
  assert.equal(
    serveRuntimeContent(
      loaded,
      new Request("app://game/__content/manifest.json", { method: "POST" }),
    ).status,
    404,
  );
});
test("corrupt or partial incoming revision preserves last usable snapshot", (t) => {
  const f = fixture(t),
    first = receiveContent(f.args);
  f.manifest.files[0].sha256 = "a".repeat(64);
  f.manifest.metadata["art/manifest/asset_manifest.json"].assets[0].hash =
    "a".repeat(64);
  f.save();
  assert.throws(() => receiveContent(f.args), /bytes do not match/);
  assert.equal(loadContent(first).snapshot.id, first.id);
});
test("incompatible schema, script content and traversal refuse", (t) => {
  const f = fixture(t);
  f.manifest.schema = "v99";
  f.save();
  assert.throws(() => receiveContent(f.args), /schema/);
  f.manifest.schema = CONTENT_SCHEMA;
  f.manifest.files[0].path = "art/../outside.png";
  f.save();
  assert.throws(() => receiveContent(f.args), /artwork file/);
});
test("symlink escape refuses before publishing a snapshot", (t) => {
  const f = fixture(t);
  writeFileSync(f.root + "/outside.png", png);
  rmSync(f.root + "/input/art/a.png");
  symlinkSync(f.root + "/outside.png", f.root + "/input/art/a.png");
  assert.throws(() => receiveContent(f.args), /escapes/);
});
test("cache corruption is detected even with matching metadata", (t) => {
  const f = fixture(t),
    first = receiveContent(f.args);
  writeFileSync(f.root + "/cache/blobs/" + contentHash(png), "broken");
  assert.throws(() => loadContent(first), /bytes do not match/);
});
test("embedded PNG SVG allowed, active or external SVG refused", (t) => {
  const f = fixture(t);
  const set = (svg) => {
    const bytes = Buffer.from(svg);
    writeFileSync(f.root + "/input/art/a.svg", bytes);
    f.manifest.files = [
      {
        path: "art/a.svg",
        sha256: contentHash(bytes),
        bytes: bytes.length,
        mime: "image/svg+xml",
      },
    ];
    f.manifest.metadata = {};
    f.save();
  };
  set(
    `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${png.toString("base64")}"/></svg>`,
  );
  assert.ok(receiveContent(f.args).id);
  for (const svg of [
    '<svg onload="alert(1)"/>',
    "<svg><script/></svg>",
    '<svg><image href="https://example.com/x"/></svg>',
  ]) {
    set(svg);
    assert.throws(() => receiveContent(f.args), /SVG/);
  }
});

test("the manifest alone is read without hashing blobs; full loads still verify", async (t) => {
  const f = fixture(t),
    first = receiveContent(f.args);
  const blob = path.join(f.args.cacheRoot, "blobs", contentHash(png));
  writeFileSync(blob, Buffer.concat([png, Buffer.from("tampered")]));
  // Usage lookups need only metadata: a changed blob does not cost them a
  // full pass (it is refused when served instead).
  assert.equal(loadContentManifest(first).manifest.files.length, 1);
  assert.throws(() => loadContent(first), /bytes do not match/);
  await assert.rejects(loadContentAsync(first), /bytes do not match/);
  writeFileSync(blob, png);
  assert.equal((await loadContentAsync(first)).snapshot.id, first.id);
  // The manifest itself is still bound to its content-addressed id.
  writeFileSync(
    path.join(f.args.cacheRoot, "snapshots", first.id + ".json"),
    "{}",
  );
  assert.throws(() => loadContentManifest(first), /manifest changed/);
});

test("asynchronous verification lets the event loop run between blobs", async (t) => {
  const f = fixture(t);
  for (let i = 0; i < 20; i++) {
    const bytes = Buffer.concat([png, Buffer.from([i])]);
    writeFileSync(`${f.root}/input/art/b${i}.png`, bytes);
    f.manifest.files.push({
      path: `art/b${i}.png`,
      sha256: contentHash(bytes),
      bytes: bytes.length,
      mime: "image/png",
    });
  }
  f.save();
  const snapshot = receiveContent(f.args);
  let turns = 0;
  const timer = setInterval(() => turns++, 0);
  await loadContentAsync(snapshot);
  clearInterval(timer);
  assert.ok(turns > 0, "timers ran while blobs were verified");
});
