import path from "node:path";
import { describe, expect, it } from "vitest";

import visual4Registry from "../../art/manifest/character_candidate_visual4_registry.json";
import type { CharacterComponentCandidateDefinition } from "../../src/presentation/character-components";
import { GARMENT_FIT_DEFAULT_BOUNDS } from "../../src/presentation/garment-fit";
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

const REPOSITORY_ROOT = path.resolve(process.cwd());

interface RegistryAsset {
  readonly asset_id: string;
  readonly final_path?: string;
  readonly candidate_component?: CharacterComponentCandidateDefinition;
}

function subject(assetId: string): FitSubject {
  const record = (visual4Registry as { assets: RegistryAsset[] }).assets.find(
    (entry) => entry.asset_id === assetId,
  );
  if (!record?.candidate_component || !record.final_path)
    throw new Error(`No Visual4 record '${assetId}'.`);
  return {
    assetId,
    definition: { ...record.candidate_component, catalog_generation: 1 },
    file: path.join(REPOSITORY_ROOT, record.final_path),
  };
}

/**
 * The self-pair the Visual4 derivation itself treats as its diagnostic control:
 * the garment on the body it was authored against, placed directly.
 */
const BODY = "wave_a_average_man_standing_neutral_front_a_v1_pv4";
const GARMENT = "pv4_wave_a_male_bottom_khaki_shorts_v1";

function measure(translateY: number, scaleX = 1) {
  const body = subject(BODY);
  const garment = subject(GARMENT);
  /*
   * Ease is read ONCE, from the unperturbed pairing.
   *
   * It describes how this garment sits on the body it was authored for, and it
   * is the expectation the error is measured against. Reading it from the
   * PERTURBED projection instead makes the expectation equal the observation by
   * construction — which is exactly what an earlier draft of this file did, and
   * why it reported zero error for a garment scaled to 140% and shifted 8% down
   * the body. The instrument was never the problem there; the call was.
   */
  const baseline = projectForMeasurement(
    body,
    garment,
    "standing-neutral",
    null,
  );
  const projected =
    translateY === 0 && scaleX === 1
      ? baseline
      : projectForMeasurement(body, garment, "standing-neutral", {
          kind: "affine",
          scaleX,
          scaleY: 1,
          translateX: 0,
          translateY,
        });
  const bodySpans = readRasterSpans(body.file);
  const garmentSpans = readRasterSpans(garment.file);
  const reference = measureBodyFitReference(
    body.file,
    body.definition.family,
    "standing-neutral",
    referenceRowsFor("standing-neutral"),
  );
  const ease = measureSourceProportion(
    baseline,
    garmentSpans,
    bodySpans,
    body.definition.canvas,
  );
  const metric = metricFor(
    "bottom",
    reference,
    { topY: projected.top, bottomY: projected.top + projected.height },
    960,
  );
  return measureEdgeError(
    projected,
    garmentSpans,
    bodySpans,
    body.definition.canvas,
    metric,
    ease,
  );
}

/**
 * The instrument has to answer before an answer means anything.
 *
 * A harness I added in #183 reported `insufficient-coverage` for every pair it
 * looked at — including the banked reference pairing, which is the one case
 * that must always measure — and I read those non-answers as rejections. They
 * were not rejections. An unmeasured case is an unmeasured case, and publishing
 * it as a verdict about the source was the error.
 *
 * These two controls are the guard against repeating that. The positive case
 * pins that a known-good pairing yields a real number through the Visual4 line's
 * own path; the negative case pins that the same path still fails when the
 * geometry is deliberately wrong. An instrument that cannot do both is not
 * evidence about any garment.
 */
describe("the Visual4 fit instrument", () => {
  it("returns a measured answer for the banked reference pairing", () => {
    const result = measure(0);
    expect(result.status).toBe("measured");
    expect(result.rowsCompared).toBeGreaterThan(4);
    expect(Number.isFinite(result.worstFractionOfBodySpan)).toBe(true);
    expect(result.worstFractionOfBodySpan).toBeLessThanOrEqual(
      GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
    );
  });

  /*
   * Shifted down the body by 2% of the canvas — a deliberate placement error,
   * kept small enough that the garment still overlaps the body and the measure
   * has rows to compare. Pushed much further the garment leaves the body
   * entirely and the answer becomes `insufficient-coverage`, which is the
   * measure declining rather than failing; a control has to land inside the
   * range where the instrument actually speaks.
   */
  it("fails the same pairing when the garment is deliberately shifted", () => {
    const shifted = measure(0.02);
    expect(shifted.status).toBe("measured");
    expect(shifted.rowsCompared).toBeGreaterThan(4);
    expect(shifted.worstFractionOfBodySpan).toBeGreaterThan(
      GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
    );
  });

  /* A widened garment is the other error it must see, and it responds in
     proportion rather than as a step: 1.05 clears the bound, 1.2 quadruples
     the miss. A measure that answered the same for both would be a detector,
     not a measurement. */
  it("responds in proportion to how wrong the garment is", () => {
    const mild = measure(0, 1.05).worstFractionOfBodySpan;
    const gross = measure(0, 1.2).worstFractionOfBodySpan;
    expect(mild).toBeGreaterThan(
      GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
    );
    expect(gross).toBeGreaterThan(mild * 2);
  });

  /*
   * `insufficient-coverage` is an unmeasured case, not a verdict.
   *
   * This is the distinction #183 got wrong: that status was read as "this
   * source cannot be used", when it means the garment and body did not overlap
   * enough for a number to mean anything. Pinned here so the two can never be
   * conflated again.
   */
  it("declines rather than fails when the garment leaves the body", () => {
    const far = measure(0.12);
    expect(far.status).toBe("insufficient-coverage");
    expect(far.rowsCompared).toBeLessThan(5);
  });
});
