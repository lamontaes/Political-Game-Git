import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import type {
  CharacterAttachmentAnchor,
  CharacterBodyContacts,
  CharacterComponentCandidateDefinition,
  CharacterComponentManifestRecord,
} from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";
import { measureBodyRig, opaqueBounds } from "./pg-modular-intake";

/**
 * Wave A candidate ADMISSION.
 *
 * PR #90 established that fifty-one Wave A body crops already exist and are
 * flagged `usableAsMorphologyEvidenceFor89`, and that the blocker is no longer
 * an absence of art: it is that none of them is registered anywhere a person,
 * a recipe or a review surface can reach. This is that registration, and only
 * that. It admits EVIDENCE, not production art.
 *
 * Three boundaries hold throughout, and each is enforced below rather than
 * promised in prose:
 *
 * 1. **Nothing here is production.** Every emitted record is a
 *    `character-component-candidate` with `runtime_release_status:
 *    "unreleased"`, and the registry is written to its own file so a candidate
 *    cannot reach `PRODUCTION_CHARACTER_LIBRARY` even by mistake.
 * 2. **A filename is not a pose.** The sweep's `apparentPoseCategory` is
 *    carried as the PRIOR CLAIM and is never the answer. The answer is a
 *    reviewed observation authored from the actual pixels
 *    (`WAVE_A_VISUAL_OBSERVATIONS`), and where the two disagree the
 *    disagreement is reported rather than resolved silently.
 * 3. **Missing measurements stay missing.** The rig comes from the accepted
 *    `measureBodyRig` silhouette measurement and nothing else. A landmark the
 *    silhouette cannot carry — a `brow` on a blank face, the interior hip joint
 *    centre — is recorded as unresolved. Nothing is filled in from proportions.
 *
 * The whole file is deterministic: the same rasters produce the same registry
 * and the same report, byte for byte.
 */

export const WAVE_A_ADMISSION_VERSION = "wave-a-candidate-admission-v1";

/** The PR #95 sweep review that flags the fifty-one. Read, never written. */
export const WAVE_A_REVIEW_SOURCE =
  "art/qa/p95-recent-drive-sweep/candidate-component-review.json";

/** Candidate-only registry. Deliberately NOT `art/manifest/asset_manifest.json`. */
export const WAVE_A_REGISTRY_PATH =
  "art/manifest/character_candidate_registry.json";

export const WAVE_A_REPORT_PATH =
  "art/qa/p95-wave-a-morphology/wave-a-admission-report.json";

export const WAVE_A_REGISTRY_SCHEMA = "character-candidate-registry-v1";
export const WAVE_A_REPORT_SCHEMA = "wave-a-candidate-admission-report-v1";

// ---------------------------------------------------------------------------
// The sweep review this admission reads
// ---------------------------------------------------------------------------

export interface SweepComponentRecord {
  readonly family: string;
  readonly sourceFilename: string;
  readonly sourceSha256: string;
  readonly sourceSheetDimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly originalCell: string;
  readonly choppedOutputPath: string;
  readonly choppedDimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly opaqueBoundingDimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly opaquePixels: number;
  readonly outputSha256: string;
  readonly apparentPoseCategory: string;
  readonly bakedPropStatus: string;
  readonly lifecycleDisposition: string;
  readonly usableAsMorphologyEvidenceFor89: boolean;
  readonly eligibleAsProductionCharacterBody: boolean;
  readonly productionEligibilityReason: string;
}

export function readSweepEvidence(
  repositoryRoot: string,
): readonly SweepComponentRecord[] {
  const parsed = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, WAVE_A_REVIEW_SOURCE), "utf8"),
  ) as { readonly components: readonly SweepComponentRecord[] };
  return parsed.components
    .filter((component) => component.usableAsMorphologyEvidenceFor89)
    .slice()
    .sort((a, b) =>
      a.choppedOutputPath < b.choppedOutputPath
        ? -1
        : a.choppedOutputPath > b.choppedOutputPath
          ? 1
          : 0,
    );
}

// ---------------------------------------------------------------------------
// Reviewed pixel observations
// ---------------------------------------------------------------------------

export type ObservedPosture = "standing" | "seated";

/**
 * Facing as OBSERVED, using the pose registry's own vocabulary plus the
 * facings it does not yet have. `three-quarter`, `profile` and `back` are not
 * defects; they are facings no registered family declares, which is a missing
 * contract rather than missing art.
 */
export type ObservedFacing = "front" | "three-quarter" | "profile" | "back";

/** What the crop has painted into it that a modular body must not carry. */
export type ObservedBakedProp = "none" | "chair" | "desk" | "lectern";

/** Whether the crop is a whole figure or only part of one. */
export type ObservedExtent = "complete-figure" | "partial-figure";

export interface WaveAVisualObservation {
  readonly posture: ObservedPosture;
  readonly facing: ObservedFacing;
  readonly bakedProp: ObservedBakedProp;
  readonly extent: ObservedExtent;
  /** `high` when the reading is unambiguous at review scale. */
  readonly confidence: "high" | "ambiguous";
  readonly note?: string;
}

export const WAVE_A_OBSERVATION_METHOD =
  "Direct inspection of each decoded crop at review scale (about 280x620 px per figure) by the PEOPLE1 implementation agent, 2026-09-08. Posture, facing, baked prop and figure extent were read from the pixels; the sweep's apparentPoseCategory was not consulted while reading, and is compared afterwards. This is a reviewable candidate observation, not owner acceptance and not a production pose certification.";

/**
 * The reviewed observation for each of the fifty-one, keyed by output path.
 *
 * The rows for one `apparentPoseCategory` are judged TOGETHER, because the
 * source sheets are a matrix: the same authored pose is drawn once per body
 * family. Reading one tile as `front` and its five siblings as `three-quarter`
 * would be an inconsistency in the reviewer, not a difference in the art.
 */
export const WAVE_A_VISUAL_OBSERVATIONS: Readonly<
  Record<string, WaveAVisualObservation>
> = {
  // --- additional-fat-female-pose ------------------------------------------
  "art/generated/candidates/wave-a-morphology/additional-fat-female-pose/wave_a_additional_fat_female_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
      note: "A dark slab is painted across the lap and forearms.",
    },
  "art/generated/candidates/wave-a-morphology/additional-fat-female-pose/wave_a_additional_fat_female_standing_conversational_hands_clasped_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "ambiguous",
      note: "Shoulders are close to frontal but the hips and both feet are turned; read as three-quarter, and the reading is not confident.",
    },
  "art/generated/candidates/wave-a-morphology/additional-fat-female-pose/wave_a_additional_fat_female_standing_lectern_interaction_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "desk",
      extent: "partial-figure",
      confidence: "high",
      note: "Torso only: the figure is cut off above the hips and a table edge is painted at the hands. Not a body.",
    },

  // --- average-man ---------------------------------------------------------
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_seated_conversational_open_hand_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_seated_front_neutral_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "chair",
      extent: "complete-figure",
      confidence: "high",
      note: "A four-legged chair is painted behind and beneath the figure.",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
      note: "A thin horizontal surface line runs through the forearms.",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_standing_conversational_open_hand_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_standing_interaction_surface_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "lectern",
      extent: "complete-figure",
      confidence: "high",
      note: "A wooden podium top is painted across the hips and hands.",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_standing_neutral_front_a_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_standing_neutral_front_b_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Frontal with a relaxed weight shift; distinct from front_a, not a duplicate.",
    },
  "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_standing_neutral_three_quarter_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },

  // --- average-woman -------------------------------------------------------
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_seated_conversational_open_hand_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_seated_front_neutral_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Seated square to camera, hands on the knees, and nothing is painted under the figure: the seat is absent, which is what a modular seated body needs.",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
      note: "A keyboard and a desk edge are painted at the hands.",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_standing_conversational_open_hand_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_standing_interaction_surface_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_standing_neutral_front_a_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_standing_neutral_front_b_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/average-woman/wave_a_average_woman_standing_neutral_three_quarter_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "ambiguous",
      note: "Only slightly rotated; closer to frontal than the other three-quarter rows.",
    },

  // --- fat-man -------------------------------------------------------------
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_seated_conversational_open_hand_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_seated_front_chair_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "chair",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_standing_conversational_open_hand_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_standing_lectern_interaction_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
      note: "A glass slab is painted across the hands and hips.",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_standing_neutral_back_v1.png":
    {
      posture: "standing",
      facing: "back",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "A clean back view; nothing is painted behind or beside the figure.",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_standing_neutral_front_a_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_standing_neutral_profile_v1.png":
    {
      posture: "standing",
      facing: "profile",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },

  // --- older-woman ---------------------------------------------------------
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_seated_conversational_open_hand_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_seated_front_neutral_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "chair",
      extent: "complete-figure",
      confidence: "high",
      note: "A pale stool with four legs is painted under the figure.",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_standing_conversational_open_hand_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_standing_interaction_surface_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "lectern",
      extent: "complete-figure",
      confidence: "high",
      note: "A black lectern on a stem and base is painted in front of the figure.",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_standing_neutral_front_a_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_standing_neutral_front_b_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_standing_neutral_three_quarter_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },

  // --- skinny-man ----------------------------------------------------------
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_seated_conversational_open_hand_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_seated_front_chair_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "chair",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_standing_conversational_open_hand_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_standing_lectern_interaction_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
      note: "A glass slab is painted across the hands and hips. The sweep recorded NONE here.",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_standing_neutral_back_v1.png":
    {
      posture: "standing",
      facing: "back",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "A clean back view. The sweep recorded a LECTERN here; no prop is painted in this crop.",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_standing_neutral_front_a_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_standing_neutral_three_quarter_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },

  // --- skinny-woman --------------------------------------------------------
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_seated_conversational_open_hand_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_seated_front_neutral_v1.png":
    {
      posture: "seated",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Seated square to camera with nothing painted underneath; the second of only two propless seated figures in the wave.",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_seated_interaction_surface_v1.png":
    {
      posture: "seated",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_standing_conversational_open_hand_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_standing_interaction_surface_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "desk",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_standing_neutral_front_a_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_standing_neutral_front_b_v1.png":
    {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
  "art/generated/candidates/wave-a-morphology/skinny-woman/wave_a_skinny_woman_standing_neutral_three_quarter_v1.png":
    {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
    },
};

// ---------------------------------------------------------------------------
// Pose family admission
// ---------------------------------------------------------------------------

/**
 * The registered pose family a reviewed observation maps onto, or null when
 * the registry has nothing that matches it.
 *
 * Every registered family in `art/manifest/pose_families.json` declares
 * `facing: "front"`, so a three-quarter, profile or back figure has no family
 * to be admitted to. That is a missing pose contract, and saying so is the
 * point: quietly filing a back view under `standing-neutral` would make the
 * registry claim a facing it does not have.
 */
export function registeredPoseFamilyFor(
  observation: WaveAVisualObservation,
  apparentPoseCategory: string,
): string | null {
  if (observation.facing !== "front") return null;
  if (observation.bakedProp !== "none") return null;
  if (observation.extent !== "complete-figure") return null;
  if (observation.posture === "seated") {
    // A propless seated figure sits in a seat the SCENE owns; that is exactly
    // the guest seat contract. `seated-at-desk` additionally implies a working
    // surface, which no propless seated crop in this wave presents.
    return "seated-guest-neutral";
  }
  if (apparentPoseCategory.startsWith("standing_neutral")) {
    return "standing-neutral";
  }
  if (apparentPoseCategory.startsWith("standing_conversational")) {
    return "standing-conversational";
  }
  return null;
}

export type WaveADisposition =
  | "admitted-candidate-body"
  | "retained-baked-prop"
  | "retained-unregistered-facing"
  | "retained-partial-figure"
  | "retained-unmeasurable-rig"
  | "retained-ambiguous-observation";

export function dispositionFor(
  observation: WaveAVisualObservation,
  poseFamily: string | null,
  rigPlausible: boolean,
): WaveADisposition {
  if (observation.extent !== "complete-figure")
    return "retained-partial-figure";
  if (observation.bakedProp !== "none") return "retained-baked-prop";
  if (observation.confidence !== "high")
    return "retained-ambiguous-observation";
  if (poseFamily === null) return "retained-unregistered-facing";
  if (!rigPlausible) return "retained-unmeasurable-rig";
  return "admitted-candidate-body";
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

type Bitmap = ReturnType<typeof PImage.make>;

export interface WaveAMeasurement {
  readonly cropWidth: number;
  readonly cropHeight: number;
  readonly opaqueBounds: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly opaquePixels: number;
  /** Landmark rows as fractions of the crop height; columns of the width. */
  readonly rig: {
    readonly centerXFraction: number;
    readonly crownYFraction: number;
    readonly neckYFraction: number;
    readonly shoulderYFraction: number;
    readonly waistYFraction: number;
    readonly crotchYFraction: number;
    readonly soleYFraction: number;
    readonly headWidthFraction: number;
    readonly shoulderWidthFraction: number;
    readonly waistWidthFraction: number;
    readonly feetSpanFraction: number;
  };
  /**
   * Intersection-over-union of the opaque mask against its own horizontal
   * mirror about the measured midline. High for a square-on figure, lower as
   * the body rotates. Corroborates the reviewed facing; it does not decide it,
   * because a symmetric silhouette cannot tell a front from a back.
   */
  readonly mirrorSymmetryIou: number;
  /** Sole-band opaque runs: two for a figure standing on two feet. */
  readonly soleRunCount: number;
  readonly soleRunCentersFraction: readonly number[];
  /** Widest row as a fraction of crop width, and where it is. */
  readonly widestRowWidthFraction: number;
  readonly widestRowYFraction: number;
}

function alphaAt(bitmap: Bitmap, x: number, y: number): number {
  return bitmap.data[(y * bitmap.width + x) * 4 + 3] ?? 0;
}

function rowRunsOf(bitmap: Bitmap, y: number, threshold = 127): number[][] {
  const runs: number[][] = [];
  let start = -1;
  for (let x = 0; x <= bitmap.width; x += 1) {
    const opaque = x < bitmap.width && alphaAt(bitmap, x, y) > threshold;
    if (opaque && start < 0) start = x;
    if (!opaque && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  return runs;
}

/**
 * Opaque mask as a flat byte array.
 *
 * Every whole-raster pass below reads this rather than the RGBA buffer. These
 * crops run to about 1.2 megapixels each and there are fifty-one of them, so
 * the difference between one indexed read and four is the difference between a
 * measurement run that shares a machine politely and one that does not.
 */
function opaqueMask(bitmap: Bitmap): Uint8Array {
  const { width, height, data } = bitmap;
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = (data[index * 4 + 3] ?? 0) > 127 ? 1 : 0;
  }
  return mask;
}

function mirrorSymmetryIou(
  mask: Uint8Array,
  width: number,
  height: number,
  centerX: number,
): number {
  let intersection = 0;
  let union = 0;
  const center = Math.round(2 * centerX);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const here = mask[row + x] === 1;
      const mirroredX = center - x;
      const there =
        mirroredX >= 0 && mirroredX < width && mask[row + mirroredX] === 1;
      if (here && there) intersection += 1;
      else if (here || there) union += 1;
    }
  }
  union += intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function readPng(filePath: string): Promise<Bitmap> {
  return PImage.decodePNGFromStream(fs.createReadStream(filePath));
}

export function measureWaveACrop(bitmap: Bitmap): WaveAMeasurement {
  const bounds = opaqueBounds(bitmap);
  const rig = measureBodyRig(bitmap);
  const width = bitmap.width;
  const height = bitmap.height;

  const mask = opaqueMask(bitmap);
  let opaquePixels = 0;
  let widestRowWidth = 0;
  let widestRowY = 0;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let rowWidth = 0;
    for (let x = 0; x < width; x += 1) rowWidth += mask[row + x]!;
    opaquePixels += rowWidth;
    if (rowWidth > widestRowWidth) {
      widestRowWidth = rowWidth;
      widestRowY = y;
    }
  }

  const soleBandTop = Math.max(0, rig.soleRow - Math.round(height * 0.02));
  const soleRuns: number[][] = [];
  for (let y = soleBandTop; y <= rig.soleRow; y += 1) {
    for (const run of rowRunsOf(bitmap, y)) soleRuns.push(run);
  }
  const merged: number[][] = [];
  for (const [a, b] of soleRuns.slice().sort((p, q) => p[0]! - q[0]!)) {
    const last = merged[merged.length - 1];
    if (last && a! <= last[1]! + 1) {
      last[1] = Math.max(last[1]!, b!);
    } else {
      merged.push([a!, b!]);
    }
  }

  return {
    cropWidth: width,
    cropHeight: height,
    opaqueBounds: {
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    opaquePixels,
    rig: {
      centerXFraction: round6(rig.centerX / width),
      crownYFraction: round6(rig.headTop / height),
      neckYFraction: round6(rig.neckRow / height),
      shoulderYFraction: round6(rig.shoulderRow / height),
      waistYFraction: round6(rig.waistRow / height),
      crotchYFraction: round6(rig.crotchRow / height),
      soleYFraction: round6(rig.soleRow / height),
      headWidthFraction: round6(rig.headWidth / width),
      shoulderWidthFraction: round6(rig.shoulderWidth / width),
      waistWidthFraction: round6(rig.waistWidth / width),
      feetSpanFraction: round6(rig.feetSpan / width),
    },
    mirrorSymmetryIou: round6(
      mirrorSymmetryIou(mask, width, height, rig.centerX),
    ),
    soleRunCount: merged.length,
    soleRunCentersFraction: merged.map(([a, b]) =>
      round6((a! + b!) / 2 / width),
    ),
    widestRowWidthFraction: round6(widestRowWidth / width),
    widestRowYFraction: round6(widestRowY / height),
  };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Whether the measured landmarks descend the body in the order the semantic
 * anchor vocabulary requires. A rig that fails this is not corrected; the
 * candidate is retained unadmitted and the failure is reported.
 */
export function rigIsPlausible(measurement: WaveAMeasurement): boolean {
  const r = measurement.rig;
  const ordered =
    r.crownYFraction < r.neckYFraction &&
    r.neckYFraction < r.shoulderYFraction &&
    r.shoulderYFraction < r.waistYFraction &&
    r.waistYFraction < r.crotchYFraction &&
    r.crotchYFraction < r.soleYFraction;
  const proportionate =
    r.headWidthFraction > 0 &&
    r.shoulderWidthFraction >= r.headWidthFraction &&
    r.feetSpanFraction > 0;
  return ordered && proportionate;
}

// ---------------------------------------------------------------------------
// Record construction
// ---------------------------------------------------------------------------

export function waveAFamilyId(sweepFamily: string): string {
  return `wave-a-${sweepFamily}`;
}

export function waveAAssetId(outputPath: string): string {
  return path.basename(outputPath, ".png");
}

/**
 * The anchors the silhouette actually carries.
 *
 * `brow` is deliberately ABSENT. Hair attaches to `brow`, and these bodies are
 * drawn with a blank face: there is no brow line in the pixels to measure, so
 * writing one would be the proportion-guessing this admission exists to avoid.
 * `validateProductionBodyAnchors` will therefore reject these bodies for
 * production, which is the correct answer for a candidate.
 */
export function anchorsFromMeasurement(
  measurement: WaveAMeasurement,
): readonly CharacterAttachmentAnchor[] {
  const r = measurement.rig;
  return [
    { id: "crown", x: r.centerXFraction, y: r.crownYFraction },
    { id: "head", x: r.centerXFraction, y: r.neckYFraction },
    { id: "torso", x: r.centerXFraction, y: r.shoulderYFraction },
    { id: "hips", x: r.centerXFraction, y: r.waistYFraction },
    { id: "feet", x: r.centerXFraction, y: r.soleYFraction },
  ];
}

export function contactsFromMeasurement(
  measurement: WaveAMeasurement,
  posture: ObservedPosture,
): CharacterBodyContacts | undefined {
  if (measurement.soleRunCount !== 2) return undefined;
  const [left, right] = measurement.soleRunCentersFraction;
  if (left === undefined || right === undefined) return undefined;
  const soles = {
    leftFoot: { x: left, y: measurement.rig.soleYFraction },
    rightFoot: { x: right, y: measurement.rig.soleYFraction },
  };
  if (posture === "standing") return soles;
  return {
    ...soles,
    seatedPelvis: {
      x: measurement.rig.centerXFraction,
      y: measurement.rig.crotchYFraction,
    },
  };
}

/** Body draw order, matching the banked pg candidates. */
export const WAVE_A_BODY_LAYER = 20;

export function buildCandidateRecord(
  sweep: SweepComponentRecord,
  observation: WaveAVisualObservation,
  measurement: WaveAMeasurement,
  poseFamily: string,
  fileHash: string,
): CharacterComponentManifestRecord {
  const assetId = waveAAssetId(sweep.choppedOutputPath);
  const contacts = contactsFromMeasurement(measurement, observation.posture);
  const candidate: CharacterComponentCandidateDefinition = {
    kind: "body",
    family: waveAFamilyId(sweep.family),
    layer: WAVE_A_BODY_LAYER,
    canvas: { width: measurement.cropWidth, height: measurement.cropHeight },
    pose_family: poseFamily,
    head_orientation: "front",
    root: {
      convention: "pelvis-hip-center",
      x: measurement.rig.centerXFraction,
      y: measurement.rig.waistYFraction,
    },
    attachment_anchors: anchorsFromMeasurement(measurement),
    ...(contacts ? { contacts } : {}),
  };
  return {
    asset_id: assetId,
    asset_type: "character-component-candidate",
    fixed_or_modular: "modular",
    availability: "production-candidate",
    generation_status: "approved",
    qa_status: "pending",
    runtime_release_status: "unreleased",
    final_path: sweep.choppedOutputPath,
    hash: fileHash,
    candidate_component: candidate,
  };
}

// ---------------------------------------------------------------------------
// The admission run
// ---------------------------------------------------------------------------

export interface WaveAAdmissionRow {
  readonly assetId: string;
  readonly family: string;
  readonly outputPath: string;
  readonly sourceSheet: {
    readonly filename: string;
    readonly sha256: string;
    readonly cell: string;
    readonly dimensions: {
      readonly width: number;
      readonly height: number;
    };
  };
  readonly sourceBytesUnchanged: boolean;
  readonly recordedOutputSha256: string;
  readonly observedOutputSha256: string;
  readonly priorClaim: {
    readonly apparentPoseCategory: string;
    readonly bakedPropStatus: string;
    readonly lifecycleDisposition: string;
  };
  readonly observation: WaveAVisualObservation;
  readonly measurement: WaveAMeasurement;
  readonly rigPlausible: boolean;
  readonly registeredPoseFamily: string | null;
  readonly disposition: WaveADisposition;
  readonly priorClaimDisagreements: readonly string[];
  readonly unresolved: readonly string[];
}

export interface WaveAAdmissionResult {
  readonly rows: readonly WaveAAdmissionRow[];
  readonly records: readonly CharacterComponentManifestRecord[];
}

/**
 * Everything a body of this kind cannot say about itself yet.
 *
 * These are not TODOs. They are the fields a promotion decision would need and
 * this evidence cannot supply, written down so nobody has to rediscover which
 * numbers are real.
 */
export function unresolvedFor(
  observation: WaveAVisualObservation,
  measurement: WaveAMeasurement,
): readonly string[] {
  const unresolved: string[] = [
    "brow: no brow line exists in a blank-faced raster, so no hair attachment can be measured.",
    "root: pelvis-hip-center is an interior joint centre and is not observable in a silhouette; the emitted root is the MEASURED waistband row, a measurement-derived visual estimate and non-authoritative (D-068).",
    "complexion: the art complexion band is an art-direction assignment, not a measurement, and is left undeclared.",
    "rights: the source sheets carry unknown external reuse rights.",
    "owner style acceptance: unassessed.",
  ];
  if (measurement.soleRunCount !== 2) {
    unresolved.push(
      `contacts: the sole band resolves ${measurement.soleRunCount} opaque runs rather than two, so no floor line can be declared.`,
    );
  }
  if (observation.posture === "seated") {
    unresolved.push(
      "seat plane: the seated pelvis is placed at the measured crotch row; the true seat plane needs a scene seat to calibrate against.",
    );
  }
  return unresolved;
}

export function disagreementsWithPriorClaim(
  sweep: SweepComponentRecord,
  observation: WaveAVisualObservation,
): readonly string[] {
  const out: string[] = [];
  const priorProp = sweep.bakedPropStatus.toLowerCase();
  const observedProp = observation.bakedProp;
  if (priorProp !== observedProp) {
    out.push(
      `baked prop: the sweep recorded '${sweep.bakedPropStatus}', the reviewed pixels show '${observedProp}'.`,
    );
  }
  const priorSaysFront =
    sweep.apparentPoseCategory.includes("front") ||
    sweep.apparentPoseCategory.includes("neutral");
  if (priorSaysFront && observation.facing !== "front") {
    out.push(
      `facing: the filename category '${sweep.apparentPoseCategory}' reads as frontal, the reviewed pixels show '${observation.facing}'.`,
    );
  }
  if (observation.extent !== "complete-figure") {
    out.push(
      `extent: the sweep treated this as a body; the reviewed pixels show a ${observation.extent}.`,
    );
  }
  return out;
}

export interface WaveAAdmissionOptions {
  /**
   * Measure only these output paths.
   *
   * Decoding fifty-one rasters is the expensive part of this run, so a test
   * that only needs to prove the measurement is reproducible can ask for a
   * handful rather than repeating the whole sweep and slowing every other
   * suite sharing the machine.
   */
  readonly only?: readonly string[];
}

export async function runWaveAAdmission(
  repositoryRoot: string,
  options: WaveAAdmissionOptions = {},
): Promise<WaveAAdmissionResult> {
  const only = options.only ? new Set(options.only) : null;
  const sweeps = readSweepEvidence(repositoryRoot).filter(
    (sweep) => only === null || only.has(sweep.choppedOutputPath),
  );
  const rows: WaveAAdmissionRow[] = [];
  const records: CharacterComponentManifestRecord[] = [];

  for (const sweep of sweeps) {
    const observation = WAVE_A_VISUAL_OBSERVATIONS[sweep.choppedOutputPath];
    if (!observation) {
      throw new Error(
        `Wave A candidate '${sweep.choppedOutputPath}' has no reviewed observation. Every admitted or retained candidate must be looked at; add the row rather than defaulting it.`,
      );
    }
    const absolute = path.join(repositoryRoot, sweep.choppedOutputPath);
    const fileHash = hashArtFile(absolute);
    const bitmap = await readPng(absolute);
    const measurement = measureWaveACrop(bitmap);
    const plausible = rigIsPlausible(measurement);
    const poseFamily = registeredPoseFamilyFor(
      observation,
      sweep.apparentPoseCategory,
    );
    const disposition = dispositionFor(observation, poseFamily, plausible);

    rows.push({
      assetId: waveAAssetId(sweep.choppedOutputPath),
      family: waveAFamilyId(sweep.family),
      outputPath: sweep.choppedOutputPath,
      sourceSheet: {
        filename: sweep.sourceFilename,
        sha256: sweep.sourceSha256,
        cell: sweep.originalCell,
        dimensions: sweep.sourceSheetDimensions,
      },
      sourceBytesUnchanged: fileHash === sweep.outputSha256,
      recordedOutputSha256: sweep.outputSha256,
      observedOutputSha256: fileHash,
      priorClaim: {
        apparentPoseCategory: sweep.apparentPoseCategory,
        bakedPropStatus: sweep.bakedPropStatus,
        lifecycleDisposition: sweep.lifecycleDisposition,
      },
      observation,
      measurement,
      rigPlausible: plausible,
      registeredPoseFamily: poseFamily,
      disposition,
      priorClaimDisagreements: disagreementsWithPriorClaim(sweep, observation),
      unresolved: unresolvedFor(observation, measurement),
    });

    if (disposition === "admitted-candidate-body" && poseFamily) {
      records.push(
        buildCandidateRecord(
          sweep,
          observation,
          measurement,
          poseFamily,
          fileHash,
        ),
      );
    }
  }

  return {
    rows,
    records: records.slice().sort((a, b) => (a.asset_id < b.asset_id ? -1 : 1)),
  };
}
