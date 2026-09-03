/**
 * Production master contract for modular character art.
 *
 * One table, shared by the art validator and the asset-intake command, so a
 * master that would have to be enlarged to reach its normalized canvas is
 * rejected in both places rather than quietly upscaled. Development fixture
 * art is exempt from the dimension minimums and says so through the manifest's
 * `art_class`; it is never promoted into the production library.
 *
 * Numbers come from the 10A size contract. They are pixel requirements on the
 * SOURCE master, not on the normalized runtime raster.
 */

import type { CharacterComponentKind } from "./character-components";
import type { PoseFamilyRegistry } from "./pose-families";

export interface MasterDimensionRequirement {
  /** Minimum source width in pixels, when the class fixes both axes. */
  readonly minimumWidth?: number;
  readonly minimumHeight?: number;
  /** Minimum of the longer edge, for classes authored at any orientation. */
  readonly minimumLongEdge?: number;
  /** Required aspect ratio (width / height), when the class fixes one. */
  readonly requiredAspectRatio?: number;
  /** Transparent background required for this class. */
  readonly requiresAlpha: boolean;
  /** The normalized canvas this master is reduced to. */
  readonly normalized: { readonly width: number; readonly height: number };
  readonly note: string;
}

/**
 * Body minimums differ by pose: a standing figure is authored full height, a
 * seated one is authored to a shorter, wider frame.
 */
export const STANDING_POSE_FAMILY = "standing-neutral";
export const SEATED_POSE_FAMILY = "seated-at-desk";

export const STANDING_BODY_MASTER_MINIMUM: MasterDimensionRequirement = {
  minimumWidth: 1_696,
  minimumHeight: 2_528,
  requiresAlpha: true,
  normalized: { width: 1_080, height: 1_920 },
  note: "Full standing figure, feet included, no chair, desk, scene or baked shadow.",
};

export const SEATED_BODY_MASTER_MINIMUM: MasterDimensionRequirement = {
  minimumWidth: 1_530,
  minimumHeight: 2_048,
  requiresAlpha: true,
  normalized: { width: 1_530, height: 2_048 },
  note: "True seated morphology with a real thigh/torso fold; no furniture in the master.",
};

const HEAD_SPACE = { width: 512, height: 512 } as const;
const BODY_SPACE = { width: 1_080, height: 1_920 } as const;

export const COMPONENT_MASTER_MINIMUMS: Readonly<
  Record<CharacterComponentKind, MasterDimensionRequirement>
> = {
  body: STANDING_BODY_MASTER_MINIMUM,
  head: {
    minimumWidth: 1_024,
    minimumHeight: 1_024,
    requiredAspectRatio: 1,
    requiresAlpha: true,
    normalized: HEAD_SPACE,
    note: "Square, bald or uniform scalp stubble, neutral expression, ears visible, neck present.",
  },
  "hair-front": {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: HEAD_SPACE,
    note: "True alpha, not a painted-white background; shares the head canvas origin.",
  },
  "hair-back": {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: HEAD_SPACE,
    note: "The back layer of a hairstyle, drawn behind the body on the head canvas.",
  },
  "facial-hair": {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: HEAD_SPACE,
    note: "Sits on the head canvas origin; one facing per head orientation.",
  },
  eyewear: {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: HEAD_SPACE,
    note: "One facing per head orientation; no text or insignia.",
  },
  top: {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: BODY_SPACE,
    note: "A region of the body canvas, not an independent picture; closures are handed and never mirrored.",
  },
  bottom: {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: BODY_SPACE,
    note: "A region of the body canvas sharing the body's origin.",
  },
  footwear: {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: BODY_SPACE,
    note: "Required slot. The sole line must sit flat on the body's foot contacts.",
  },
  accessory: {
    minimumLongEdge: 1_024,
    requiresAlpha: true,
    normalized: BODY_SPACE,
    note: "No text or insignia; mirrored lettering is the usual failure.",
  },
};

/**
 * The pose registry, when one is supplied, is the authority for a BODY's
 * minimum master and normalized canvas: a new posture declares its own
 * dimensions there rather than needing a new constant here. The two constants
 * above remain the fallback for callers that have no registry loaded, and the
 * registry's own values for the standing and seated families are exactly them.
 */
export function masterRequirementFor(
  kind: CharacterComponentKind,
  poseFamily?: string,
  poseRegistry?: PoseFamilyRegistry,
): MasterDimensionRequirement {
  if (kind !== "body") return COMPONENT_MASTER_MINIMUMS[kind];

  const registered = poseFamily
    ? poseRegistry?.families.get(poseFamily)
    : undefined;
  if (registered) {
    const seated = registered.posture_class === "seated";
    const base = seated ? SEATED_BODY_MASTER_MINIMUM : STANDING_BODY_MASTER_MINIMUM;
    return {
      minimumWidth: registered.master_minimum.width,
      minimumHeight: registered.master_minimum.height,
      requiresAlpha: true,
      normalized: {
        width: registered.nominal_canvas.width,
        height: registered.nominal_canvas.height,
      },
      note: base.note,
    };
  }
  if (poseFamily === SEATED_POSE_FAMILY) return SEATED_BODY_MASTER_MINIMUM;
  return COMPONENT_MASTER_MINIMUMS[kind];
}

export interface MeasuredMaster {
  readonly width: number;
  readonly height: number;
  /**
   * Whether the raster carries an alpha channel with genuinely varying
   * transparency. Undefined means the measurement was not attempted.
   */
  readonly hasAlpha?: boolean;
}

export interface MasterDimensionVerdict {
  readonly accepted: boolean;
  readonly reasons: readonly string[];
  /**
   * How much the master would have to be enlarged to reach the minimum. 1 or
   * below means no enlargement is needed. The pipeline never applies it; the
   * number exists so a rejection can say how far short the file falls.
   */
  readonly requiredUpscaleFactor: number;
}

/**
 * Judges one measured master against its class contract. Undersized art is
 * rejected rather than accepted-and-enlarged: enlarging a master is what put
 * soft garments next to sharp bodies in the first place.
 */
export function evaluateMasterDimensions(
  kind: CharacterComponentKind,
  measured: MeasuredMaster,
  poseFamily?: string,
  poseRegistry?: PoseFamilyRegistry,
): MasterDimensionVerdict {
  const requirement = masterRequirementFor(kind, poseFamily, poseRegistry);
  const reasons: string[] = [];
  let requiredUpscaleFactor = 1;

  const consider = (factor: number) => {
    if (factor > requiredUpscaleFactor) requiredUpscaleFactor = factor;
  };

  if (requirement.minimumWidth !== undefined) {
    if (measured.width < requirement.minimumWidth) {
      reasons.push(
        `width ${measured.width}px is below the ${requirement.minimumWidth}px minimum for ${kind}${poseFamily ? ` (${poseFamily})` : ""}`,
      );
      consider(requirement.minimumWidth / measured.width);
    }
  }
  if (requirement.minimumHeight !== undefined) {
    if (measured.height < requirement.minimumHeight) {
      reasons.push(
        `height ${measured.height}px is below the ${requirement.minimumHeight}px minimum for ${kind}${poseFamily ? ` (${poseFamily})` : ""}`,
      );
      consider(requirement.minimumHeight / measured.height);
    }
  }
  if (requirement.minimumLongEdge !== undefined) {
    const longEdge = Math.max(measured.width, measured.height);
    if (longEdge < requirement.minimumLongEdge) {
      reasons.push(
        `long edge ${longEdge}px is below the ${requirement.minimumLongEdge}px minimum for ${kind}`,
      );
      consider(requirement.minimumLongEdge / longEdge);
    }
  }
  if (requirement.requiredAspectRatio !== undefined) {
    const aspect = measured.width / measured.height;
    if (Math.abs(aspect - requirement.requiredAspectRatio) > 0.01) {
      reasons.push(
        `aspect ${aspect.toFixed(3)} is not the required ${requirement.requiredAspectRatio} for ${kind}`,
      );
    }
  }
  if (requirement.requiresAlpha && measured.hasAlpha === false) {
    reasons.push(
      `${kind} requires a transparent background and this master has no usable alpha channel`,
    );
  }

  return {
    accepted: reasons.length === 0,
    reasons,
    requiredUpscaleFactor,
  };
}

// ---------------------------------------------------------------------------
// Environment plates
// ---------------------------------------------------------------------------

/** Absolute floor for a background generation master. */
export const ENVIRONMENT_MASTER_MINIMUM_WIDTH = 4_608;
/** Recommended generation width so a 4096 tier survives any crop. */
export const ENVIRONMENT_MASTER_RECOMMENDED_WIDTH = 5_120;

export interface EnvironmentMasterVerdict {
  readonly accepted: boolean;
  readonly meetsRecommendation: boolean;
  readonly reasons: readonly string[];
}

export function evaluateEnvironmentMaster(
  measured: MeasuredMaster,
): EnvironmentMasterVerdict {
  const reasons: string[] = [];
  if (measured.width < ENVIRONMENT_MASTER_MINIMUM_WIDTH) {
    reasons.push(
      `width ${measured.width}px is below the ${ENVIRONMENT_MASTER_MINIMUM_WIDTH}px absolute minimum for an environment master`,
    );
  }
  return {
    accepted: reasons.length === 0,
    meetsRecommendation: measured.width >= ENVIRONMENT_MASTER_RECOMMENDED_WIDTH,
    reasons,
  };
}
