import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { validateCharacterComponentCandidates } from "../../src/presentation/character-components";
import {
  WAVE_A_WARDROBE_REGISTRY_PATH,
  WAVE_A_WARDROBE_REGISTRY_SCHEMA,
  WAVE_A_WARDROBE_REPORT_PATH,
  WAVE_A_WARDROBE_REPORT_SCHEMA,
  WAVE_A_WARDROBE_VERSION,
  WARDROBE_PROPORTION_CHECK_BODY,
  WARDROBE_PROPORTION_REFERENCE_BODY,
  runWaveAWardrobeDerivation,
} from "./wave-a-wardrobe";
import { writeFormatted } from "./write-formatted";

/**
 * `npm run derive:wave-a-wardrobe`
 *
 * Resamples the admitted Wave A crops onto the modular runtime canvas, derives
 * a wardrobe for each morphology from the garment masters the project already
 * owns, measures every derivative against the ease the banked pairing carries,
 * and writes the candidate registry and the evidence report.
 *
 * Both outputs are generated and checked in, so re-running on an unchanged tree
 * must produce identical bytes; `--check` asserts that without writing.
 */

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const result = await runWaveAWardrobeDerivation(REPOSITORY_ROOT);

  const records = [...result.bodyRecords, ...result.garmentRecords];
  const candidateErrors = validateCharacterComponentCandidates(records);
  if (candidateErrors.length > 0) {
    throw new Error(
      `Wave A wardrobe registry is not a candidate registry:\n${candidateErrors.join("\n")}`,
    );
  }

  const registry = {
    schema: WAVE_A_WARDROBE_REGISTRY_SCHEMA,
    generator: WAVE_A_WARDROBE_VERSION,
    release_status: "candidate-review-only",
    production_pixels_released: false,
    note: "Runtime-canvas Wave A bodies and the wardrobe derived for them from the banked garment masters. Every record is an unreleased candidate in no catalog generation, reachable only from the development review surface. The admitted registry this is derived from is read, never rewritten, and no source crop is modified.",
    assets: records,
  };

  const withinBound = result.measurements.filter((m) => m.withinBound);
  const report = {
    schema: WAVE_A_WARDROBE_REPORT_SCHEMA,
    generator: WAVE_A_WARDROBE_VERSION,
    max_edge_error_fraction:
      result.measurements[0]?.maxEdgeErrorFraction ?? null,
    proportion_reference_body: WARDROBE_PROPORTION_REFERENCE_BODY,
    proportion_check_body: WARDROBE_PROPORTION_CHECK_BODY,
    authored_proportions: result.proportions,
    summary: {
      runtime_bodies: result.bodies.length,
      derived_garments: result.garments.length,
      measured: result.measurements.length,
      within_bound: withinBound.length,
      outside_bound: result.measurements.length - withinBound.length,
      banked_within_bound: result.measurements.filter(
        (m) => m.bankedWithinBound,
      ).length,
      heads_baked_in: result.bodies.filter((body) => body.headBaked).length,
      refused_by_pose: result.skipped.length,
    },
    bodies: result.bodies.map((body) => ({
      asset_id: body.assetId,
      admitted_asset_id: body.admittedAssetId,
      family: body.family,
      source_family: body.sourceFamily,
      pose_family: body.poseFamily,
      canvas: { width: body.bitmap.width, height: body.bitmap.height },
      resample_scale: body.scale,
      head_baked_in: body.headBaked,
      source_crop: body.sourceCrop,
      landmarks: body.landmarks,
    })),
    garments: result.garments.map((garment) => ({
      asset_id: garment.assetId,
      family: garment.family,
      kind: garment.kind,
      body_family: garment.bodyFamily,
      pose_family: garment.poseFamily,
      canvas: garment.canvas,
      scale_x: garment.scaleX,
      scale_y: garment.scaleY,
      master: garment.master,
    })),
    measurements: result.measurements.map((m) => ({
      garment_asset_id: m.garmentAssetId,
      body_asset_id: m.bodyAssetId,
      kind: m.kind,
      within_bound: m.withinBound,
      worst_landmark_fraction: m.worstLandmarkFraction,
      worst_coverage_fraction: m.worstCoverageFraction,
      landmark_residuals: m.landmarks,
      ease_metric_derived: m.derived,
      banked_unfitted_on_same_body: m.banked,
      banked_within_bound: m.bankedWithinBound,
      note: m.note,
    })),
    refused_by_pose: result.skipped,
  };

  const registryPath = path.join(
    REPOSITORY_ROOT,
    WAVE_A_WARDROBE_REGISTRY_PATH,
  );
  const reportPath = path.join(REPOSITORY_ROOT, WAVE_A_WARDROBE_REPORT_PATH);

  if (check) {
    for (const [file, contents] of [
      [registryPath, registry],
      [reportPath, report],
    ] as const) {
      const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      const next = `${JSON.stringify(contents, null, 2)}\n`;
      if (
        JSON.stringify(JSON.parse(existing || "null")) !==
        JSON.stringify(contents)
      ) {
        void next;
        throw new Error(
          `${path.relative(REPOSITORY_ROOT, file)} is out of date. Run \`npm run derive:wave-a-wardrobe\`.`,
        );
      }
    }
    console.log("Wave A wardrobe outputs are up to date.");
    return;
  }

  await writeFormatted(registryPath, JSON.stringify(registry, null, 2));
  await writeFormatted(reportPath, JSON.stringify(report, null, 2));

  console.log(
    `Wave A wardrobe: ${result.bodies.length} runtime bodies, ${result.garments.length} derived garments, ${withinBound.length}/${result.measurements.length} inside the accepted edge bound.`,
  );
  for (const measurement of result.measurements) {
    console.log(
      `  ${measurement.withinBound ? "OK  " : measurement.worstCoverageFraction === null ? "----" : "MISS"} ${measurement.garmentAssetId.padEnd(58)} coverage ${measurement.worstCoverageFraction === null ? "unmeasured" : `${(measurement.worstCoverageFraction * 100).toFixed(2)}%`} attach ${measurement.worstLandmarkFraction === null ? "-" : `${(measurement.worstLandmarkFraction * 100).toFixed(2)}%`}`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
