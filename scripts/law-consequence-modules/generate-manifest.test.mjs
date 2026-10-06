import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { format, resolveConfig } from "prettier";
import {
  checkLawConsequenceManifest,
  discoverLawConsequenceModules,
  renderLawConsequenceManifest,
  writeLawConsequenceManifest,
} from "./generate-manifest.mjs";

test("nonempty module manifests satisfy the repository formatter", async () => {
  const rendered = renderLawConsequenceManifest([
    "election-local-landings",
    "election-state-landings",
  ]);
  const options = await resolveConfig(import.meta.filename);
  assert.equal(
    rendered,
    await format(rendered, { ...options, parser: "typescript" }),
  );
});

test("checked-in manifest lists exactly the module folders", () => {
  const keys = discoverLawConsequenceModules();
  const result = checkLawConsequenceManifest();
  assert.deepEqual(
    keys,
    [...keys].sort((left, right) => left.localeCompare(right)),
  );
  assert.equal(
    result.matches,
    true,
    "run npm run generate:law-consequence-modules",
  );
  assert.equal(result.actual, renderLawConsequenceManifest(keys));
});

test("a new module folder makes a stale manifest fail until regenerated", () => {
  const root = mkdtempSync(join(tmpdir(), "law-consequence-manifest-"));
  try {
    const modules = join(root, "src/simulation/law-consequences/modules");
    const modulePath = join(modules, "sample-library");
    mkdirSync(modulePath, { recursive: true });
    writeFileSync(
      join(modulePath, "index.ts"),
      "export const registrations = [];\n",
    );
    const manifestPath = join(
      root,
      "src/simulation/law-consequence-module-manifest.ts",
    );
    mkdirSync(join(root, "src/simulation"), { recursive: true });
    writeFileSync(manifestPath, renderLawConsequenceManifest([]));

    assert.equal(checkLawConsequenceManifest(root).matches, false);
    writeLawConsequenceManifest(root);
    const regenerated = checkLawConsequenceManifest(root);
    assert.equal(regenerated.matches, true);
    assert.match(regenerated.actual, /sample-library/);
    assert.match(
      regenerated.actual,
      /lawConsequenceSampleLibraryRegistrations/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("module directories without an index are rejected instead of silently omitted", () => {
  const root = mkdtempSync(
    join(tmpdir(), "law-consequence-module-missing-index-"),
  );
  try {
    mkdirSync(join(root, "src/simulation/law-consequences/modules/empty"), {
      recursive: true,
    });
    assert.throws(
      () => discoverLawConsequenceModules(root),
      /must contain index\.ts: empty/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
