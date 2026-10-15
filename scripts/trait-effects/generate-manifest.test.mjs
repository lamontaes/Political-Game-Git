import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { format, resolveConfig } from "prettier";
import {
  checkTraitEffectsIndex,
  discoverTraitEffectReaders,
  renderTraitEffectsIndex,
  writeTraitEffectsIndex,
} from "./generate-manifest.mjs";

test("empty, short and long reader lists satisfy the formatter", async () => {
  const options = await resolveConfig(import.meta.filename);
  for (const rows of [
    [],
    [{ module: "a", binding: "aEffects" }],
    [
      { module: "a", binding: "aEffects" },
      {
        module: "outward-emotional-display-and-more",
        binding: "outwardEmotionalDisplayAndMoreEffects",
      },
    ],
  ]) {
    const rendered = renderTraitEffectsIndex(rows);
    assert.equal(
      rendered,
      await format(rendered, { ...options, parser: "typescript" }),
    );
  }
});

test("checked-in index lists exactly the reader files, sorted", () => {
  const readers = discoverTraitEffectReaders();
  const result = checkTraitEffectsIndex();
  assert.ok(readers.length > 0);
  assert.deepEqual(
    readers.map(({ module }) => module),
    readers.map(({ module }) => module).sort((a, b) => a.localeCompare(b)),
  );
  assert.equal(result.matches, true);
});

test("a new reader file is registered by regenerating, with no other edit", () => {
  const root = mkdtempSync(join(tmpdir(), "trait-effects-"));
  try {
    const directory = join(root, "src/simulation/traits/effects");
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "facet-new.ts"),
      "export const facetNewEffects: readonly TraitEffectDeclaration[] = [];\n",
    );
    writeFileSync(join(directory, "facet-new.test.ts"), "// not a reader\n");
    writeFileSync(join(directory, "trait-proof-support.ts"), "export {};\n");
    assert.equal(checkTraitEffectsIndex(root).matches, false);
    writeTraitEffectsIndex(root);
    const result = checkTraitEffectsIndex(root);
    assert.equal(result.matches, true);
    assert.match(result.actual, /\.\.\.facetNewEffects/);
    assert.doesNotMatch(result.actual, /proof-support|\.test/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a file that is not a reader row is left out", () => {
  const root = mkdtempSync(join(tmpdir(), "trait-effects-"));
  try {
    const directory = join(root, "src/simulation/traits/effects");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "facet-pack.ts"), "export const nope = 1;\n");
    assert.deepEqual(discoverTraitEffectReaders(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
