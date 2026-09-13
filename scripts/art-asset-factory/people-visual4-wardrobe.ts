import path from "path";

import visual4Registry from "../../art/manifest/character_candidate_visual4_registry.json";
import assetManifest from "../../art/manifest/asset_manifest.json";
import type { CharacterComponentCandidateDefinition } from "../../src/presentation/character-components";
import {
  PG_COMPONENT_SPECS,
  PG_MASTER_SOURCE_DIRECTORY,
  cropBitmap,
  keyNeutralBackground,
  measureBodyRig,
  opaqueBounds,
  readPng,
  type BodyRigMeasurement,
  type PgComponentSpec,
} from "./pg-modular-intake";
import {
  WARDROBE_DERIVED_KINDS,
  authoredProportion,
  kindsForPose,
  measureCandidateBodyLandmarks,
  type CandidateBodyLandmarks,
} from "./wave-a-wardrobe";

/**
 * LEGACY SET ONLY: what the old pg-modular flat lays would need.
 *
 * ## Read this before quoting a number out of this file
 *
 * This walks exactly one source set — the legacy design masters under
 * `art/references/masters/pg-modular`, whose opaque crops are 108-192px. It
 * does NOT walk the bank the game consumes, and its numbers say nothing about
 * that bank.
 *
 * An earlier version of this file did not say so, and its conclusion was read
 * as a statement about the project's garment sources in general: that they are
 * too small to dress a 960px body and would have to be recovered at higher
 * resolution. That was wrong, and the correction matters more than the report.
 *
 * The current source authority is the p95 recent-drive-sweep bank. Its sheets
 * are 3584x4800 and 4336x5804, verified by hash, already in the repository and
 * already chopped; its garment crops export at 625x1220 (bottoms), 960x1038
 * (male tops), 924x1000 (female tops) and 1425x1017 (front-facing footwear).
 * `people-visual4.ts` already reads them through
 * `people_visual4_top_attachments.json`, `people_visual4_bottom_attachments.json`
 * and the front-facing-footwear directory. Thirty-five of the thirty-six
 * wardrobe crops reach a component a body can wear. There is no resolution
 * shortage there, and nobody should be asked to re-supply those files.
 *
 * `people-visual4-source-lineage.ts` holds that chain — Drive id and label,
 * sheet hash and real dimensions, chop cell, crop bytes, attachment record,
 * registry component, body and pose pairing — and its tests pin it so this
 * mistake cannot be made silently again.
 *
 * ## What this file is still good for
 *
 * The legacy masters are a real set that a real pipeline path still reads, and
 * knowing what they would need is worth recording. So this stays, scoped: for
 * every (legacy master, Visual4 body, pose) it reports the size the master has
 * and the size that body needs.
 *
 * It derives nothing, writes no raster and admits nothing. An earlier draft
 * derived the pairs small enough to escape the enlargement refusal and reported
 * them rejected; every one came back `insufficient-coverage` — the measurement
 * declining to answer, for the banked reference pairing as much as for the
 * derivative — so those verdicts meant nothing and were withdrawn. Repairing
 * that instrument is tracked separately; an unmeasured case is not an unusable
 * source.
 */

export const VISUAL4_WARDROBE_VERSION =
  "people-visual4-wardrobe-requirements-v1";

export const VISUAL4_WARDROBE_REPORT_PATH =
  "art/qa/people-visual4/wardrobe-requirements.json";

export const VISUAL4_WARDROBE_REPORT_SCHEMA =
  "people-visual4-wardrobe-requirements-v1";

/** The banked pairing each master's ease is read from. */
export const VISUAL4_PROPORTION_REFERENCE_BODY = "pg_body_fl_standing_v1";

interface ManifestAsset {
  readonly asset_id: string;
  readonly final_path?: string;
  readonly candidate_component?: CharacterComponentCandidateDefinition;
}

export interface GarmentRequirement {
  readonly master: string;
  readonly masterSet: string;
  readonly garment: string;
  readonly kind: string;
  readonly body: string;
  readonly bodyFamily: string;
  readonly poseFamily: string;
  /** The opaque crop the master actually contains. */
  readonly available: { readonly width: number; readonly height: number };
  /** What this body needs, from its own measured rig. */
  readonly required: { readonly width: number; readonly height: number };
  readonly scale: { readonly x: number; readonly y: number };
  /** True when deriving would enlarge, which the pipeline refuses. */
  readonly needsEnlargement: boolean;
}

function referenceWidthOf(
  rig: BodyRigMeasurement,
  reference: PgComponentSpec["fit"]["reference"],
): number {
  switch (reference) {
    case "headHeight":
      return rig.headHeight;
    case "headWidth":
      return rig.headWidth;
    case "shoulderWidth":
      return rig.shoulderWidth;
    case "waistWidth":
      return rig.waistWidth;
    case "feetSpan":
      return rig.feetSpan;
  }
}

const VERTICAL_SPAN: Readonly<
  Record<
    string,
    readonly [keyof CandidateBodyLandmarks, keyof CandidateBodyLandmarks]
  >
> = { top: ["shoulder", "hip"], bottom: ["hip", "ankle"] };

export async function measureVisual4WardrobeRequirements(
  repositoryRoot: string,
): Promise<readonly GarmentRequirement[]> {
  const manifest = assetManifest as { assets: ManifestAsset[] };
  const banked = (assetId: string): ManifestAsset | undefined =>
    manifest.assets.find((a) => a.asset_id === assetId);

  const referenceBody = banked(VISUAL4_PROPORTION_REFERENCE_BODY);
  if (!referenceBody)
    throw new Error(
      `Missing banked reference body '${VISUAL4_PROPORTION_REFERENCE_BODY}'.`,
    );
  const referenceBitmap = await readPng(
    path.join(repositoryRoot, referenceBody.final_path!),
  );
  const referenceLandmarks = measureCandidateBodyLandmarks(
    referenceBitmap,
    measureBodyRig(referenceBitmap),
  );

  const specs = PG_COMPONENT_SPECS.filter((spec) =>
    (WARDROBE_DERIVED_KINDS as readonly string[]).includes(spec.kind),
  );

  /*
   * The ease each master carries on the body it was normalized against.
   *
   * A property of the MASTER rather than of any target, so it is read once and
   * reused for every body — which is what makes one master into a wardrobe
   * rather than into one outfit. Footwear declares no vertical span and needs
   * none: a shoe is sized by the foot it holds, in both axes, because a shoe is
   * not lengthened because a shin is long.
   */
  const proportions: Record<string, number> = {};
  for (const spec of specs) {
    const record = banked(`${spec.idStem}_fl_v1`);
    if (!record?.candidate_component) continue;
    const value = authoredProportion(
      record.candidate_component.canvas.height,
      referenceBitmap.height,
      referenceLandmarks,
      spec.kind,
    );
    if (value !== null) proportions[spec.idStem] = value;
  }

  const bodies = (visual4Registry as { assets: ManifestAsset[] }).assets
    .filter((a) => a.candidate_component?.kind === "body")
    .sort((a, b) => (a.asset_id < b.asset_id ? -1 : 1));

  const requirements: GarmentRequirement[] = [];
  for (const record of bodies) {
    const definition = record.candidate_component!;
    const poseFamily = definition.pose_family ?? "standing-neutral";
    const bitmap = await readPng(path.join(repositoryRoot, record.final_path!));
    /*
     * The rig is measured on the Visual4 raster as it stands, at scale 1.
     *
     * `deriveRuntimeBody` is deliberately not used: it crops to the painted
     * bounds and scales that crop to 960px, which is right for a raw admitted
     * crop and wrong here. A Visual4 body is already on the 960 canvas and its
     * painted height is ~817px because the top ~143px are the gap a head
     * component fills, so running it through would scale a headless body up as
     * though the missing head were missing body. Every reference the derived
     * kinds use lies below the neck and is unaffected by the absent head.
     */
    const rig = measureBodyRig(bitmap);
    const landmarks = measureCandidateBodyLandmarks(bitmap, rig);
    const { allowed } = kindsForPose(poseFamily);

    for (const spec of specs) {
      if (!allowed.includes(spec.kind)) continue;
      const keyed = keyNeutralBackground(
        await readPng(
          path.join(
            repositoryRoot,
            `${PG_MASTER_SOURCE_DIRECTORY}/${spec.masterFile}`,
          ),
        ),
        spec.keying,
      );
      const cropped = cropBitmap(keyed, opaqueBounds(keyed));

      const scaleX =
        (referenceWidthOf(rig, spec.fit.reference) * spec.fit.ratio) /
        cropped.width;
      const span = VERTICAL_SPAN[spec.kind];
      const scaleY = span
        ? ((landmarks[span[1]] - landmarks[span[0]]) *
            bitmap.height *
            (proportions[spec.idStem] ?? 1)) /
          cropped.height
        : scaleX;

      const width = Math.max(1, Math.round(cropped.width * scaleX));
      const height = Math.max(1, Math.round(cropped.height * scaleY));
      requirements.push({
        master: spec.masterFile,
        masterSet: spec.masterSet,
        garment: spec.idStem,
        kind: spec.kind,
        body: record.asset_id,
        bodyFamily: definition.family,
        poseFamily,
        available: { width: cropped.width, height: cropped.height },
        required: { width, height },
        scale: { x: Number(scaleX.toFixed(3)), y: Number(scaleY.toFixed(3)) },
        needsEnlargement: width > cropped.width || height > cropped.height,
      });
    }
  }
  return requirements;
}
