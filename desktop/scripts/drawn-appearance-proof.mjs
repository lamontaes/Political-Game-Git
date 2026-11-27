import assert from "node:assert/strict";

/** Fail closed on a plausible-looking figure with the wrong saved identity. */
export function validateDrawnAppearance(proof, saved, requireMaterial = false) {
  assert.equal(
    proof.personId,
    saved.personId,
    "drawn person differs from save",
  );
  assert.equal(
    proof.seed,
    saved.appearance.seed,
    "drawn seed differs from save",
  );
  assert.equal(proof.catalog, String(saved.appearance.catalogGeneration));
  assert.equal(proof.complete, "true", "outfit is incomplete");
  assert.ok(proof.layers.length > 0, "no decoded image layers");
  assert.equal(proof.layers.length, Number(proof.layerCount));
  for (const layer of proof.layers) {
    assert.ok(layer.assetId && layer.kind, "missing drawn asset identity");
    assert.ok(layer.decoded, "drawn layer did not decode");
  }
  const material = saved.appearance.material;
  const prepared = proof.layers.filter((layer) => layer.materialVersion);
  if (requireMaterial) assert.ok(material, "new material was not saved");
  if (material) {
    assert.equal(material.version, "engine-people29-v1");
    assert.ok(prepared.length > 0, "saved material was not drawn");
    for (const layer of prepared) {
      assert.equal(layer.materialVersion, material.version);
      assert.equal(layer.materialState, "ready");
      assert.deepEqual(
        layer.parameters,
        material,
        "drawn parameters differ from save",
      );
      assert.match(layer.drawnSha256, /^[a-f0-9]{64}$/);
      assert.equal(layer.drawnVisible, true, "prepared layer drew nothing");
    }
  } else {
    assert.equal(prepared.length, 0, "unmarked saved appearance was recolored");
  }
  return proof;
}
