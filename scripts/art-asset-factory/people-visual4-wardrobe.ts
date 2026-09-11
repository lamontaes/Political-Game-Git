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
 * What it would take to dress the Visual4 bodies from the masters we own.
 *
 * ## The question this answers
 *
 * Measured over two hundred seeded people, `khaki_shorts` is worn by a hundred
 * and sixty-five of them. Nothing weights it. It is the only bottom that
 * reaches more than one body: eleven of the twelve banked bottoms are authored
 * for `average-man` alone, and the Visual4 fit pipeline MEASURED them against
 * the other bodies and rejected them — male joggers miss an average woman's
 * silhouette by 20.2% of body span after the best affine derivable. Shorts pass
 * only because they stop above the knee, above where the leg silhouettes
 * diverge.
 *
 * So the sameness is a pixel shortage. It cannot be fixed by editing
 * compatibility lists, and must not be fixed by re-weighting selection, which
 * would hide missing garments behind a distribution.
 *
 * The obvious next move is the one the pipeline is built for: the project owns
 * body-independent flat-lay garment masters, and `deriveGarment` turns one
 * master into one garment per body by scaling it to that body's own measured
 * hip, shoulder and foot geometry. That is how `wave-a-wardrobe` dressed every
 * morphology it was pointed at.
 *
 * It does not work here, and this module exists to say exactly why and exactly
 * what would fix it.
 *
 * ## Why it does not work, in numbers
 *
 * The masters are small — the bottom flat lays crop to about 110x230 — and a
 * Visual4 body is authored on a 960px canvas. Deriving a bottom for one needs
 * roughly 155-243px of garment width where the master has 108-160, so the
 * derivation would have to ENLARGE the raster by up to 2.25x. The pipeline
 * refuses outright, and the refusal is correct: enlarging invents detail that
 * was never drawn.
 *
 * `wave-a-wardrobe` produced its wardrobe on the `rt960` bodies through exactly
 * this path — and its own code keeps those outputs behind an `enlarges` branch
 * that verifies a retained hash instead of regenerating, noting they are
 * historical outputs, "evidence, not reproducible admissible tiers." So that
 * wardrobe is not a precedent to copy; it is the same wall, already hit once.
 *
 * ## What this module does, and deliberately does not
 *
 * It computes, for every (master, body, pose), the size the master HAS and the
 * size this body NEEDS. That turns "recover a sufficient native source" into a
 * number somebody can act on, per garment and per body.
 *
 * It writes no raster and admits nothing. An earlier draft derived the handful
 * of pairs small enough to escape the enlargement refusal and reported them as
 * rejected; every one came back `insufficient-coverage` — the measurement
 * declining to answer, for the banked reference pairing as much as for the
 * derivative — so those verdicts meant nothing and were withdrawn rather than
 * published. Admission for these bodies belongs to the Visual4 line's own
 * measurement, which already handles the per-foot and per-garment cases this
 * one does not.
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
