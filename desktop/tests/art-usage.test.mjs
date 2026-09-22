import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hashClientTree } from "../../scripts/client-provenance.mjs";
import { selectedArtUsage } from "../private-controller/art-usage.mjs";

function fixture(t, legacy = false) {
  const root = mkdtempSync(path.join(tmpdir(), "ocd-art-usage-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const client = path.join(root, "Contents/Resources/client");
  const cache = path.join(root, "cache");
  mkdirSync(path.join(client, "assets"), { recursive: true });
  mkdirSync(cache);
  writeFileSync(path.join(client, "index.html"), "fixture");
  const image = "exact approved source pixels";
  const hash = createHash("sha256").update(image).digest("hex");
  writeFileSync(path.join(client, "assets/scene.png"), image);
  const binding = {
    assetId: "scene",
    sourceSha256: hash,
    derivativeSha256: hash,
    derivativePath: "assets/scene.png",
    useLabels: ["National introduction"],
    eligible: ["White House illustration"],
  };
  const revision = "a".repeat(40);
  if (!legacy)
    writeFileSync(
      path.join(client, "art-usage.json"),
      JSON.stringify({
        schema: "ocd-compiled-art-usage-v1",
        sourceRevision: revision,
        bindings: [binding],
      }),
    );
  const tree = hashClientTree(client);
  writeFileSync(
    path.join(client, ".build-provenance.json"),
    JSON.stringify({
      sourceRevision: revision,
      treeSha256: tree,
      dirty: false,
      profile: "internal-art-review",
    }),
  );
  const build = {
    revision,
    appPath: root,
    clientTreeSha256: tree,
    privatePack: { packId: "pack", manifestSha256: "b".repeat(64) },
  };
  const external = {
    schema: "ocd-legacy-art-usage-v1",
    revision,
    clientTreeSha256: tree,
    packId: "pack",
    packManifestSha256: "b".repeat(64),
    bindings: [binding],
  };
  const cacheFile = path.join(cache, `${tree}.json`);
  if (legacy) writeFileSync(cacheFile, JSON.stringify(external));
  return { client, cache, build, binding, external, cacheFile };
}

test("compiled use follows verified bytes and invalidates a changed client", (t) => {
  const f = fixture(t);
  assert.deepEqual(selectedArtUsage(f.build, f.cache).bindings, [f.binding]);
  assert.equal(
    selectedArtUsage({ ...f.build, revision: "c".repeat(40) }, f.cache)
      .bindings,
    undefined,
  );
  writeFileSync(path.join(f.client, "assets/scene.png"), "altered pixels");
  assert.equal(selectedArtUsage(f.build, f.cache).bindings, undefined);
});

test("legacy use is bound to tree, revision and pack; stale receipt or derivative is unknown", (t) => {
  const f = fixture(t, true);
  assert.deepEqual(selectedArtUsage(f.build, f.cache).bindings, [f.binding]);
  assert.equal(
    selectedArtUsage(
      { ...f.build, privatePack: { ...f.build.privatePack, packId: "other" } },
      f.cache,
    ).bindings,
    undefined,
  );
  for (const patch of [
    { revision: "c".repeat(40) },
    { clientTreeSha256: "d".repeat(64) },
    { bindings: [{ ...f.binding, derivativeSha256: "e".repeat(64) }] },
    { bindings: [{ ...f.binding, derivativePath: "../scene.png" }] },
  ]) {
    writeFileSync(f.cacheFile, JSON.stringify({ ...f.external, ...patch }));
    assert.equal(selectedArtUsage(f.build, f.cache).bindings, undefined);
  }
  writeFileSync(f.cacheFile, JSON.stringify(f.external));
  assert.deepEqual(selectedArtUsage(f.build, f.cache).bindings, [f.binding]);
});
