/* global structuredClone */
import assert from "node:assert/strict";
import test from "node:test";
import { validateDrawnAppearance } from "../scripts/drawn-appearance-proof.mjs";

const material = {
  version: "engine-people29-v1",
  familyId: "prepared-family",
  palettes: { skin: "warm", hair: "dark", top: "blue", bottom: "grey" },
  features: { mouth: { variant: "a", x: 1, y: 2, scaleX: 1, scaleY: 1 } },
};
const saved = {
  personId: "saved-person",
  appearance: { seed: "saved-seed", catalogGeneration: 3, material },
};
const proof = {
  personId: saved.personId,
  seed: saved.appearance.seed,
  catalog: "3",
  complete: "true",
  layerCount: "1",
  layers: [
    {
      assetId: "prepared-head",
      kind: "head",
      decoded: true,
      materialVersion: material.version,
      materialState: "ready",
      parameters: material,
      drawnSha256: "a".repeat(64),
      drawnVisible: true,
    },
  ],
};
test("decoded material proof is grounded in the complete saved parameters", () => {
  assert.deepEqual(
    validateDrawnAppearance(structuredClone(proof), saved, true),
    proof,
  );
});
for (const [label, mutate] of [
  [
    "wrong person",
    (p) => {
      p.personId = "other";
    },
  ],
  [
    "wrong seed",
    (p) => {
      p.seed = "other";
    },
  ],
  [
    "missing layer",
    (p) => {
      p.layers = [];
    },
  ],
  [
    "undecoded layer",
    (p) => {
      p.layers[0].decoded = false;
    },
  ],
  [
    "loading material",
    (p) => {
      p.layers[0].materialState = "loading";
    },
  ],
  [
    "changed palette",
    (p) => {
      p.layers[0].parameters.palettes.skin = "other";
    },
  ],
  [
    "changed feature",
    (p) => {
      p.layers[0].parameters.features.mouth.x = 4;
    },
  ],
  [
    "wrong material version",
    (p) => {
      p.layers[0].materialVersion = "engine-people29-v2";
    },
  ],
  [
    "no drawn identity",
    (p) => {
      p.layers[0].drawnSha256 = null;
    },
  ],
  [
    "blank prepared layer",
    (p) => {
      p.layers[0].drawnVisible = false;
    },
  ],
])
  test(`same recipe key cannot hide ${label}`, () => {
    const changed = structuredClone(proof);
    mutate(changed);
    assert.throws(() => validateDrawnAppearance(changed, saved, true));
  });
test("a missing material is not accepted as new graphics proof", () => {
  assert.throws(() =>
    validateDrawnAppearance(
      proof,
      { ...saved, appearance: { ...saved.appearance, material: undefined } },
      true,
    ),
  );
});
test("old unmarked rendering retains its own decoded asset identity", () => {
  const old = structuredClone(proof);
  Object.assign(old.layers[0], {
    materialVersion: null,
    materialState: null,
    parameters: null,
    drawnSha256: null,
    drawnVisible: null,
  });
  assert.doesNotThrow(() =>
    validateDrawnAppearance(old, {
      ...saved,
      appearance: { ...saved.appearance, material: undefined },
    }),
  );
});
