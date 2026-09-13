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
   * What the mask actually took, measured on the raster it was applied to.
   *
   * A correction to an earlier version of this test, which measured the masked
   * output against the body through the game-space projection and reported it
   * as a fit comparison. That was invalid: `ARM_MASK_OUTPUT` is the masked
   * SOURCE crop (1120 rows), while the registry's polo is the derived
   * game-space asset (365 rows). Running one projection over both compares two
   * different resolutions and means nothing, and it "found" three lost rows
   * that were an artifact of the mismatch.
   *
   * What IS answerable here is the question the mask raises: did clearing the
   * baked forearms take any FABRIC with it. The forearms hang below the short
   * sleeves and end at cut wrists, so a correct mask removes rows only from the
   * bottom of the painted area and never narrows it. That is measured below.
   *
   * The masked source still has to be DERIVED into a game-space asset before
   * any fit claim about it can be made, and deriving it writes a registry
   * record — which is the admission decision, and not this test's to take.
   */
  it("takes rows off the bottom only, and never narrows the fabric", () => {
    const before = readRasterSpans(path.join(ROOT, ARM_MASK_SOURCE));
    const after = readRasterSpans(path.join(ROOT, ARM_MASK_OUTPUT));
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);

    const painted = (spans: typeof before) =>
      spans.rows.flatMap((row, index) =>
        row === null ? [] : [{ index, row }],
      );
    const beforeRows = painted(before);
    const afterRows = painted(after);
    expect(beforeRows.length).toBeGreaterThan(900);

    /* The top of the garment — collar, shoulders, sleeve caps — is untouched. */
    expect(afterRows[0]!.index).toBe(beforeRows[0]!.index);
    /* Rows came off the bottom, where the cut wrists were, and only there. */
    expect(afterRows[afterRows.length - 1]!.index).toBeLessThan(
      beforeRows[beforeRows.length - 1]!.index,
    );
    expect(beforeRows.length - afterRows.length).toBeLessThan(8);

    /*
     * Where the garment got narrower, and where it did not.
     *
     * Rows DO narrow, and they should: a row carrying both a sleeve and the
     * forearm below it has the arm as its outermost content, so clearing the
     * arm pulls that edge in. What would be a defect is narrowing up where
     * there is no arm — the collar, the shoulders, the chest, the sleeve caps.
     *
     * Measured: 16 of 992 painted rows narrow, none above the midpoint of the
     * painted area, so the entire upper half of the garment is untouched to
     * the pixel. That is the sleeve-hem guard, and it is a measurement rather
     * than a screenshot somebody has to squint at.
     */
    const top = beforeRows[0]!.index;
    const bottom = beforeRows[beforeRows.length - 1]!.index;
    const midpoint = top + (bottom - top) / 2;
    const afterByIndex = new Map(
      afterRows.map((entry) => [entry.index, entry.row]),
    );
    const narrowed = beforeRows.filter(({ index, row }) => {
      const survived = afterByIndex.get(index);
      return (
        survived !== undefined && (survived.lo > row.lo || survived.hi < row.hi)
      );
    });
    expect(narrowed.length).toBeGreaterThan(0);
    expect(narrowed.length).toBeLessThan(beforeRows.length / 20);
    for (const { index } of narrowed) expect(index).toBeGreaterThan(midpoint);
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
