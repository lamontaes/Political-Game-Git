import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { describe, expect, it } from "vitest";

import {
  dispositionFor,
  registeredPoseFamilyFor,
  rigIsPlausible,
  runWaveAAdmission,
  WAVE_A_REGISTRY_PATH,
  WAVE_A_REPORT_PATH,
  WAVE_A_VISUAL_OBSERVATIONS,
  type WaveAAdmissionRow,
  type WaveAMeasurement,
} from "../scripts/art-asset-factory/wave-a-candidate-admission";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), "utf8"),
  ) as T;
}

const registry = readJson<{ readonly assets: readonly unknown[] }>(
  WAVE_A_REGISTRY_PATH,
);
const report = readJson<{
  readonly candidates: readonly WaveAAdmissionRow[];
}>(WAVE_A_REPORT_PATH);

/**
 * Full reproduction is gated by `npm run admit:wave-a-candidates -- --check`,
 * which `npm run validate` runs. It is not repeated here: decoding fifty-one
 * megapixel rasters inside a parallel unit suite starves every other file
 * sharing the machine, and this suite already runs alongside a hundred and
 * sixty others.
 *
 * What this file re-measures is a SAMPLE. That is enough to prove the
 * measurement is reproducible and that the checked-in report describes THIS
 * tree rather than an older one; the whole-set claims below then read from the
 * report, which the sample has just shown to be current.
 */
const SAMPLE_PATHS = report.candidates
  .filter((_, index) => index % 9 === 0)
  .map((row) => row.outputPath);

const sample = await runWaveAAdmission(REPOSITORY_ROOT, {
  only: SAMPLE_PATHS,
});

describe("wave A candidate admission", () => {
  it("measures every flagged crop and admits twelve", () => {
    expect(report.candidates).toHaveLength(51);
    expect(registry.assets).toHaveLength(12);
    expect(Object.keys(WAVE_A_VISUAL_OBSERVATIONS)).toHaveLength(51);
  });

  it("re-measures a sample to exactly what the report already claims", () => {
    expect(sample.rows.length).toBeGreaterThanOrEqual(5);
    const claimed = new Map(
      report.candidates.map((row) => [row.outputPath, row]),
    );
    for (const row of sample.rows) {
      const original = claimed.get(row.outputPath);
      expect(original, row.assetId).toBeDefined();
      expect(row.measurement, row.assetId).toEqual(original!.measurement);
      expect(row.disposition, row.assetId).toBe(original!.disposition);
      expect(row.registeredPoseFamily, row.assetId).toBe(
        original!.registeredPoseFamily,
      );
      expect(row.observedOutputSha256, row.assetId).toBe(
        original!.observedOutputSha256,
      );
    }
  });

  it("verifies the crop bytes against the sweep's recorded hashes", () => {
    for (const row of report.candidates) {
      expect(row.sourceBytesUnchanged, row.assetId).toBe(true);
      expect(row.observedOutputSha256, row.assetId).toBe(
        row.recordedOutputSha256,
      );
    }
  });

  it("reports where the filename claim and the reviewed pixels disagree", () => {
    const disagreeing = report.candidates.filter(
      (row) => row.priorClaimDisagreements.length > 0,
    );
    // The sweep's own labels are the thing under review; if they all agreed,
    // authoring an independent observation would have been pointless.
    expect(disagreeing.length).toBeGreaterThan(0);
    // The sweep recorded a LECTERN on a crop that has no prop in it, and NONE
    // on two that do. Both directions are here because a label that is only
    // ever over-cautious would not need independent review.
    const overClaimed = report.candidates.find(
      (row) => row.assetId === "wave_a_skinny_man_standing_neutral_back_v1",
    );
    expect(overClaimed?.priorClaimDisagreements.join(" ")).toContain(
      "the sweep recorded 'LECTERN', the reviewed pixels show 'none'",
    );
    const underClaimed = report.candidates.find(
      (row) =>
        row.assetId === "wave_a_skinny_man_standing_lectern_interaction_v1",
    );
    expect(underClaimed?.priorClaimDisagreements.join(" ")).toContain(
      "the sweep recorded 'NONE', the reviewed pixels show 'desk'",
    );
  });

  it("never admits a crop carrying a baked prop, a partial figure, or an unregistered facing", () => {
    for (const row of report.candidates) {
      // A partial figure is reported as such even when it also carries a prop:
      // "this is not a whole body" is the more fundamental answer.
      if (row.observation.extent !== "complete-figure") {
        expect(row.disposition, row.assetId).toBe("retained-partial-figure");
      } else if (row.observation.bakedProp !== "none") {
        expect(row.disposition, row.assetId).toBe("retained-baked-prop");
      }
      if (
        row.disposition === "admitted-candidate-body" &&
        row.observation.facing !== "front"
      ) {
        throw new Error(`${row.assetId} was admitted with a non-front facing.`);
      }
    }
  });

  it("maps a facing the registry does not declare to no pose family at all", () => {
    for (const facing of ["three-quarter", "profile", "back"] as const) {
      expect(
        registeredPoseFamilyFor(
          {
            posture: "standing",
            facing,
            bakedProp: "none",
            extent: "complete-figure",
            confidence: "high",
          },
          "standing_neutral_front_a_v1",
        ),
      ).toBeNull();
    }
  });

  it("retains a candidate whose rig landmarks do not descend the body", () => {
    const implausible = {
      cropWidth: 100,
      cropHeight: 100,
      opaqueBounds: { left: 0, top: 0, width: 100, height: 100 },
      opaquePixels: 100,
      rig: {
        centerXFraction: 0.5,
        crownYFraction: 0.5,
        neckYFraction: 0.1,
        shoulderYFraction: 0.2,
        waistYFraction: 0.4,
        crotchYFraction: 0.5,
        soleYFraction: 0.9,
        headWidthFraction: 0.2,
        shoulderWidthFraction: 0.4,
        waistWidthFraction: 0.3,
        feetSpanFraction: 0.3,
      },
      mirrorSymmetryIou: 0.9,
      soleRunCount: 2,
      soleRunCentersFraction: [0.3, 0.7],
      widestRowWidthFraction: 0.4,
      widestRowYFraction: 0.2,
    } satisfies WaveAMeasurement;
    expect(rigIsPlausible(implausible)).toBe(false);
    expect(
      dispositionFor(
        {
          posture: "standing",
          facing: "front",
          bakedProp: "none",
          extent: "complete-figure",
          confidence: "high",
        },
        "standing-neutral",
        false,
      ),
    ).toBe("retained-unmeasurable-rig");
  });
});
