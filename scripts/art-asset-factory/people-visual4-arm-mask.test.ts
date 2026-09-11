import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import visual4Registry from "../../art/manifest/character_candidate_visual4_registry.json";
import type { CharacterComponentCandidateDefinition } from "../../src/presentation/character-components";
import { GARMENT_FIT_DEFAULT_BOUNDS } from "../../src/presentation/garment-fit";
import {
  ARM_MASK_OUTPUT,
  ARM_MASK_SOURCE,
  isBakedSkin,
} from "./people-visual4-arm-mask";
import {
  measureBodyFitReference,
  measureEdgeError,
  measureSourceProportion,
  metricFor,
  projectForMeasurement,
  readRasterSpans,
  referenceRowsFor,
  type FitSubject,
} from "./garment-fit-measure";

const ROOT = path.resolve(process.cwd());

interface RegistryAsset {
  readonly asset_id: string;
  readonly final_path?: string;
  readonly candidate_component?: CharacterComponentCandidateDefinition;
}

function subject(assetId: string, file?: string): FitSubject {
  const record = (visual4Registry as { assets: RegistryAsset[] }).assets.find(
    (entry) => entry.asset_id === assetId,
  )!;
  return {
    assetId,
    definition: { ...record.candidate_component!, catalog_generation: 1 },
    file: file ?? path.join(ROOT, record.final_path!),
  };
}

/**
 * The masked candidate exists, is additive, and does not move the garment.
 *
 * The block that keeps this polo out of the game is about painted skin, not
 * about fit: measured against the average woman it already scores zero error
 * across every compared row. So the question a mask has to answer is not
 * "does it fit now" but "did masking BREAK the fit that was already perfect" —
 * and the answer has to come from the instrument, with its controls passing.
 */
describe("the arm-masked polo candidate", () => {
  it("is written beside the original, leaving it untouched", () => {
    expect(fs.existsSync(path.join(ROOT, ARM_MASK_OUTPUT))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, ARM_MASK_SOURCE))).toBe(true);
    expect(ARM_MASK_OUTPUT).not.toBe(ARM_MASK_SOURCE);
  });

  /* The classifier has to separate the two populations this source actually
     contains, and reject anything near the fabric. Sampled colours, not a
     description of them. */
  it("classifies the baked skin and never the fabric", () => {
    expect(isBakedSkin(223, 179, 155, 255)).toBe(true);
    expect(isBakedSkin(222, 178, 153, 255)).toBe(true);
    expect(isBakedSkin(113, 53, 61, 255)).toBe(false);
    expect(isBakedSkin(111, 54, 63, 255)).toBe(false);
    /* Fully transparent pixels are nothing, whatever colour is left in them. */
    expect(isBakedSkin(223, 179, 155, 0)).toBe(false);
  });

  /*
   * The fit the block was never about.
   *
   * Masking clears pixels inside the garment's painted bounds — the sleeves are
   * wider than the forearms, so the silhouette the fit measure reads is the
   * same silhouette. This asserts that directly rather than assuming it: the
   * pairing still measures, and still measures clean.
   */
  it("still measures a clean fit on the body it was authored against", () => {
    const body = subject(
      "wave_a_average_woman_standing_neutral_front_a_v1_pv4",
    );
    const garment = subject(
      "pv4_wave_a_female_top_burgundy_short_sleeve_polo_v1",
    );
    const projected = projectForMeasurement(
      body,
      garment,
      "standing-neutral",
      null,
    );
    const bodySpans = readRasterSpans(body.file);
    const garmentSpans = readRasterSpans(garment.file);
    const reference = measureBodyFitReference(
      body.file,
      body.definition.family,
      "standing-neutral",
      referenceRowsFor("standing-neutral"),
    );
    const ease = measureSourceProportion(
      projected,
      garmentSpans,
      bodySpans,
      body.definition.canvas,
    );
    const result = measureEdgeError(
      projected,
      garmentSpans,
      bodySpans,
      body.definition.canvas,
      metricFor(
        "top",
        reference,
        { topY: projected.top, bottomY: projected.top + projected.height },
        960,
      ),
      ease,
    );
    expect(result.status).toBe("measured");
    expect(result.rowsCompared).toBeGreaterThan(100);
    expect(result.worstFractionOfBodySpan).toBeLessThanOrEqual(
      GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
    );
  });

  /*
   * The block stays until somebody looks.
   *
   * Whether this mask is good enough to draw is a visual decision about a
   * garment, and it is not mine to make from a pixel count. Pinning the block's
   * presence here means removing it has to be deliberate.
   */
  it("leaves the derivation's own block in place", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "scripts/art-asset-factory/people-visual4.ts"),
      "utf8",
    );
    expect(source).toContain("female_top_burgundy_short_sleeve_polo");
    expect(source).toContain("source-layer-engineering-required");
  });
});
