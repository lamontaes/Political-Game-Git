/* global fetch */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

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
      assert.match(layer.svgSha256, /^[a-f0-9]{64}$/);
    }
  } else {
    assert.equal(
      prepared.length,
      0,
      "unmarked saved appearance was recoloured",
    );
  }
  return proof;
}

/** Read existing DOM images only: no renderer bridge, save writes or URL identity. */
export async function readDrawnAppearance(
  figure,
  saved,
  requireMaterial = false,
) {
  await figure.locator('[data-material-state="loading"]').first().waitFor({
    state: "detached",
    timeout: 15000,
  });
  const proof = await figure.evaluate(async (element) => ({
    personId: element.dataset.personId,
    seed: element.dataset.appearanceSeed,
    catalog: element.dataset.catalogGeneration,
    complete: element.dataset.complete,
    layerCount: element.dataset.layerCount,
    layers: await Promise.all(
      Array.from(element.querySelectorAll("img"), async (img) => {
        await img.decode();
        const materialVersion = img.dataset.materialVersion || null;
        let svg = null;
        if (materialVersion) {
          if (!img.src.startsWith("blob:"))
            throw new Error("prepared image is not a native blob");
          const response = await fetch(img.src);
          if (!response.ok) throw new Error("prepared SVG could not be read");
          svg = await response.text();
          if (!svg.includes("<svg"))
            throw new Error("prepared image is not SVG");
        }
        return {
          assetId: img.dataset.assetId,
          kind: img.dataset.kind,
          decoded:
            img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
          materialVersion,
          materialState: img.dataset.materialState || null,
          parameters: img.dataset.materialParameters
            ? JSON.parse(img.dataset.materialParameters)
            : null,
          svg,
        };
      }),
    ),
  }));
  for (const layer of proof.layers) {
    layer.svgSha256 =
      layer.svg === null
        ? null
        : createHash("sha256").update(layer.svg).digest("hex");
    delete layer.svg;
  }
  return validateDrawnAppearance(proof, saved, requireMaterial);
}
