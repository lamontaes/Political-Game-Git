import type {
  CharacterComponentDefinition,
  CharacterComponentKind,
  CharacterComponentLibrary,
} from "./character-components";

/**
 * Deterministic morphology-aware garment fitting.
 *
 * The problem this exists for is measured, not supposed. Packet 76 (76A §5.2)
 * found that the two adult body families in the bank share a canvas
 * (420x840 / 420x660) and share their attachment anchors, while their PAINTED
 * silhouettes differ by 15–21%. `projectCharacterLayers` sizes a component as
 * `component.canvas / body.canvas` and translates it onto an anchor, so for
 * two families that share a canvas it computes the same rectangle twice. A top
 * authored against the broad silhouette hangs 29 px past the slim one and
 * nothing in the contract could say otherwise, because a component carries one
 * canvas and one origin and no per-family number.
 *
 * This module is that missing number, and only that. It does not composite
 * anything: it answers "what transform does THIS garment need to sit on THIS
 * body family in THIS pose", and `projectCharacterLayers` folds the answer into
 * the rectangle it was already computing. There is still one compositor.
 *
 * Four things it deliberately refuses:
 *
 * - **Runtime deformation of source art.** Nothing here reads or writes a
 *   raster. A fit is geometry applied to a placement, and the PNG on disk is
 *   the PNG on disk.
 * - **Silent substitution.** A garment that needs a fit and has none does not
 *   fall back to the unfitted rectangle and it does not borrow another
 *   family's profile. It fails closed, the same way a missing raster does.
 * - **Cross-viewpoint fitting.** A fit is keyed by pose family. No transform
 *   turns a three-quarter garment front-on; that needs geometry the source does
 *   not contain (76A §5.5), and a transform claiming to do it would be a
 *   generative redraw wearing a transform's name.
 * - **Unbounded warping.** The escape hatch below is a small horizontal band
 *   warp with explicit control points and stated limits. A garment that cannot
 *   be fitted inside those limits is classified `morphology-specific` and the
 *   art is regenerated. Nothing is distorted indefinitely to avoid drawing it.
 *
 * Fit profiles live in their own bank, NOT on `CharacterComponentDefinition`.
 * That is deliberate: a catalog generation's signature hashes the complete
 * component definitions, so putting a fit field there would rewrite the
 * signature of a frozen generation and move every person pinned to it. The
 * same reasoning already put `availability` on the manifest record rather than
 * the definition.
 */

/* -------------------------------------------------------------------------- */
/* Which kinds are inside the fit contract at all                              */
/* -------------------------------------------------------------------------- */

/**
 * Kinds whose placement can be affected by body morphology, and which the fit
 * bank must therefore cover. They are exactly the body-attached kinds: a
 * component that hangs off `torso`, `hips` or `feet` sits against a silhouette
 * that changes shape from family to family.
 */
export const GARMENT_FIT_GOVERNED_KINDS = [
  "top",
  "bottom",
  "footwear",
  "accessory",
] as const;

export type GarmentFitGovernedKind =
  (typeof GARMENT_FIT_GOVERNED_KINDS)[number];

const GOVERNED: ReadonlySet<string> = new Set(GARMENT_FIT_GOVERNED_KINDS);

/**
 * Kinds outside the fit contract, and why.
 *
 * `body` is the thing being fitted TO, so it is never fitted. The head-attached
 * kinds hang off the `head` anchor, above the shoulder line, where no
 * morphology difference is painted — 76A §5.4 measured identical placement
 * outcomes for heads on both families and the identity is geometric, not
 * tolerated. Head FAMILY still constrains hair and eyewear, and complexion
 * still has to match; those are separate rules that already exist.
 */
export function isGarmentFitGoverned(
  kind: CharacterComponentKind,
): kind is GarmentFitGovernedKind {
  return GOVERNED.has(kind);
}

/* -------------------------------------------------------------------------- */
/* Classification                                                              */
/* -------------------------------------------------------------------------- */

/**
 * What a garment family is, with respect to reuse across morphologies. Every
 * governed family declares exactly one of these, and the declaration is
 * checkable against measured pixels rather than taken on trust.
 */
export const GARMENT_FIT_CLASSES = [
  /** Reused with no transform on any compatible family. It never competes with
   *  the part of the silhouette that varies. */
  "safe-direct-reuse",
  /** Reused with one axis-aligned scale and translate per target family. */
  "affine-reusable",
  /** Reused with the bounded horizontal band warp per target family. */
  "bounded-warp-reusable",
  /** Not reusable. The art is authored per body family. */
  "morphology-specific",
] as const;

export type GarmentFitClass = (typeof GARMENT_FIT_CLASSES)[number];

const CLASSES: ReadonlySet<string> = new Set(GARMENT_FIT_CLASSES);

/* -------------------------------------------------------------------------- */
/* The transform vocabulary                                                    */
/* -------------------------------------------------------------------------- */

/**
 * No transform. Placement is exactly what the compositor computed before this
 * module existed, byte for byte.
 */
export interface GarmentFitDirect {
  readonly kind: "direct";
}

/**
 * An axis-aligned scale and translate, in AUTHORING form.
 *
 * Scale is about the component's origin — the point that lands on the body
 * anchor — so a fitted garment stays hung where it was hung. Translation is in
 * body-canvas normalized units, the same units the projected rectangle uses.
 *
 * There is no rotation and no shear, and their absence is a finding rather
 * than an omission. Every measured difference between the morphologies in this
 * project is a WIDTH difference along horizontal rows (76A §5.2); nothing in
 * the evidence rotates. A sheared garment would also stop being an
 * axis-aligned rectangle, which is the one thing every renderer downstream
 * assumes. `validateGarmentFitBank` refuses a profile that tries to smuggle
 * one in through the matrix form.
 */
export interface GarmentFitAffine {
  readonly kind: "affine";
  readonly scaleX: number;
  readonly scaleY: number;
  readonly translateX: number;
  readonly translateY: number;
}

/** One authored control point of a bounded warp. */
export interface GarmentFitWarpControlPoint {
  /** Position down the COMPONENT's own canvas, 0 at its top edge, 1 at its bottom. */
  readonly at: number;
  /** Horizontal scale about the component origin at this row. */
  readonly scaleX: number;
  /** Horizontal shift at this row, in body-canvas normalized units. */
  readonly offsetX: number;
}

/**
 * The bounded escape hatch: horizontal-only, piecewise, with explicit control
 * points and stated limits.
 *
 * It exists because a single affine demonstrably does not solve the heavy
 * direction. Between the average and heavy morphologies the waist grows 31%
 * while the shoulder grows 10%, so no single horizontal scale can sit on both
 * — see `art/qa/garment-fit/fit_report.json` for the measured residuals.
 *
 * Vertical stays affine on purpose. Hem length is a uniform difference; the
 * measured non-uniformity is all in the width of a row. Warping vertically as
 * well would add freedom nothing in the evidence asks for.
 */
export interface GarmentFitBoundedWarp {
  readonly kind: "bounded-warp";
  readonly scaleY: number;
  readonly translateY: number;
  /** Ascending, at least two, first at 0 and last at 1. */
  readonly controlPoints: readonly GarmentFitWarpControlPoint[];
}

export type GarmentFitTransform =
  GarmentFitDirect | GarmentFitAffine | GarmentFitBoundedWarp;

export const GARMENT_FIT_DIRECT: GarmentFitDirect = { kind: "direct" };

/* -------------------------------------------------------------------------- */
/* Bounds                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The stated limits every profile is held to. They are data, not constants
 * buried in a function, so a bank can tighten them and a reader can see what
 * "bounded" means without reading the compiler.
 */
export interface GarmentFitBounds {
  /** Smallest and largest horizontal or vertical scale any profile may ask for. */
  readonly minScale: number;
  readonly maxScale: number;
  /** Largest |translateX| or |translateY|, in body-canvas normalized units. */
  readonly maxTranslate: number;
  /** Largest |offsetX| on a warp control point, in the same units. */
  readonly maxWarpOffset: number;
  /** Largest ratio between the scales of two ADJACENT compiled bands. */
  readonly maxWarpBandStep: number;
  /** Largest ratio between the widest and narrowest band of one warp. */
  readonly maxWarpScaleSpread: number;
  /**
   * Acceptance bound for the measured fit, as a fraction of the target body's
   * painted span at the worst row. A garment whose worst per-side edge error
   * exceeds this is not fitted by the transform it declares.
   */
  readonly maxEdgeErrorFraction: number;
}

export const GARMENT_FIT_DEFAULT_BOUNDS: GarmentFitBounds = {
  minScale: 0.7,
  maxScale: 1.45,
  maxTranslate: 0.12,
  maxWarpOffset: 0.08,
  maxWarpBandStep: 1.06,
  maxWarpScaleSpread: 1.6,
  maxEdgeErrorFraction: 0.03,
};

/**
 * The envelope no bank may loosen past, whatever it declares.
 *
 * A bank's `bounds` are data, and data can say anything — the independent
 * audit of the first head set `maxScale` to the string `"unlimited"` and a
 * profile to a million-fold scale, and nothing objected, because the limits a
 * transform was compared against were never themselves examined. So every
 * bound is now checked for type, finiteness, sign, domain and coherence
 * BEFORE it is allowed to take part in a comparison, and the outer envelope
 * here is the widest any of them may be. A bank may tighten; it may not
 * widen past this.
 */
export const GARMENT_FIT_BOUNDS_ENVELOPE = {
  /** minScale must lie in [minScaleFloor, 1); maxScale in (1, maxScaleCeiling]. */
  minScaleFloor: 0.25,
  maxScaleCeiling: 4,
  maxTranslateCeiling: 0.5,
  maxWarpOffsetCeiling: 0.5,
  /** maxWarpBandStep in (1, ceiling]; maxWarpScaleSpread in (1, ceiling]. */
  maxWarpBandStepCeiling: 2,
  maxWarpScaleSpreadCeiling: 4,
  /** maxEdgeErrorFraction in (0, ceiling]. */
  maxEdgeErrorFractionCeiling: 0.5,
} as const;

const BOUND_KEYS: readonly (keyof GarmentFitBounds)[] = [
  "minScale",
  "maxScale",
  "maxTranslate",
  "maxWarpOffset",
  "maxWarpBandStep",
  "maxWarpScaleSpread",
  "maxEdgeErrorFraction",
];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export interface ValidatedGarmentFitBounds {
  /** The bounds to use, or null when any part of them is unusable. */
  readonly bounds: GarmentFitBounds | null;
  readonly errors: readonly string[];
}

/**
 * Structural and semantic validation of a bank's declared bounds.
 *
 * Every field is required to be a finite number of the right sign, inside
 * the envelope, and coherent with its partner. A missing field takes the
 * default; a present-but-wrong field is an error, never silently defaulted,
 * because a bank that says `"maxScale": null` is telling you something is
 * wrong with the bank. Unknown keys are refused for the same reason: a
 * misspelled bound is a bound that does not apply.
 */
export function validateGarmentFitBounds(
  raw: unknown,
): ValidatedGarmentFitBounds {
  const errors: string[] = [];
  if (raw === undefined) {
    return { bounds: GARMENT_FIT_DEFAULT_BOUNDS, errors };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      bounds: null,
      errors: ["Fit bank 'bounds' must be an object when present."],
    };
  }
  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(BOUND_KEYS as readonly string[]).includes(key)) {
      errors.push(
        `Fit bank bounds declare unknown limit '${key}'. A limit the contract does not know is a limit that is not applied.`,
      );
    }
  }
  const merged: Record<string, number> = { ...GARMENT_FIT_DEFAULT_BOUNDS };
  for (const key of BOUND_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (!isFiniteNumber(value)) {
      errors.push(
        `Fit bank bound '${key}' is ${describeValue(value)}; every bound must be a finite number.`,
      );
      continue;
    }
    merged[key] = value;
  }
  if (errors.length > 0) return { bounds: null, errors };

  const env = GARMENT_FIT_BOUNDS_ENVELOPE;
  const inRange = (
    key: keyof GarmentFitBounds,
    low: number,
    high: number,
    lowInclusive: boolean,
  ): void => {
    const value = merged[key]!;
    const aboveLow = lowInclusive ? value >= low : value > low;
    if (!aboveLow || value > high) {
      errors.push(
        `Fit bank bound '${key}' is ${value}; it must lie in ${lowInclusive ? "[" : "("}${low}, ${high}].`,
      );
    }
  };
  inRange("minScale", env.minScaleFloor, 1, true);
  if (merged.minScale! >= 1) {
    errors.push(
      `Fit bank bound 'minScale' is ${merged.minScale}; it must be below 1 so a garment can be narrowed at all.`,
    );
  }
  inRange("maxScale", 1, env.maxScaleCeiling, false);
  inRange("maxTranslate", 0, env.maxTranslateCeiling, false);
  inRange("maxWarpOffset", 0, env.maxWarpOffsetCeiling, false);
  inRange("maxWarpBandStep", 1, env.maxWarpBandStepCeiling, false);
  inRange("maxWarpScaleSpread", 1, env.maxWarpScaleSpreadCeiling, false);
  inRange("maxEdgeErrorFraction", 0, env.maxEdgeErrorFractionCeiling, false);
  if (merged.minScale! >= merged.maxScale!) {
    errors.push(
      `Fit bank bounds are inverted: minScale ${merged.minScale} is not below maxScale ${merged.maxScale}.`,
    );
  }
  if (merged.maxWarpBandStep! > merged.maxWarpScaleSpread!) {
    errors.push(
      `Fit bank bounds are incoherent: one band step (${merged.maxWarpBandStep}) may not exceed the whole warp's permitted spread (${merged.maxWarpScaleSpread}).`,
    );
  }
  if (errors.length > 0) return { bounds: null, errors };
  return { bounds: merged as unknown as GarmentFitBounds, errors };
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `the string ${JSON.stringify(value)}`;
  return `a ${Array.isArray(value) ? "array" : typeof value}`;
}

/**
 * True only for a bounds object every comparison below can trust. Used at the
 * runtime edge as well as in validation, so malformed data that somehow
 * reached a bank without being validated still cannot widen anything.
 */
export function boundsAreUsable(bounds: unknown): bounds is GarmentFitBounds {
  return validateGarmentFitBounds(bounds).bounds !== null;
}

/**
 * How many uniform bands a warp compiles to.
 *
 * Fixed, so the same control points always produce the same bands on every
 * machine and in every run. Sixteen is enough that the step between adjacent
 * bands stays under the 1.06 limit for every fit this project has measured,
 * and small enough that a reviewer can read the compiled list.
 */
export const GARMENT_FIT_WARP_BAND_COUNT = 16;

/** Decimal places every compiled number is rounded to. */
export const GARMENT_FIT_PRECISION = 6;

export function roundFit(value: number): number {
  const factor = 10 ** GARMENT_FIT_PRECISION;
  // `+ 0` normalizes -0 to 0 so two equal fits never differ by a sign bit.
  return Math.round(value * factor) / factor + 0;
}

/* -------------------------------------------------------------------------- */
/* Compiled forms                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A 2x3 affine matrix `[a, b, c, d, e, f]` in body-canvas normalized
 * coordinates, mapping `(x, y)` to `(a·x + c·y + e, b·x + d·y + f)`.
 *
 * Compiled at projection time because `e` and `f` depend on the body anchor the
 * component hangs from, which the authored profile does not know. The two
 * off-diagonal terms `b` and `c` are always zero here — there is no rotation
 * and no shear — and they are carried anyway so the form is a real affine
 * matrix a reviewer can multiply out, not a four-number shorthand.
 */
export type GarmentFitMatrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

export const GARMENT_FIT_IDENTITY_MATRIX: GarmentFitMatrix = [1, 0, 0, 1, 0, 0];

/**
 * Compiles the authoring values to a matrix about an anchor point.
 *
 * `p' = S·(p - anchor) + anchor + t`, which expands to the matrix below. The
 * anchor-relative form is what makes a fit safe: whatever the scale, the point
 * pinned to the body stays pinned to the body.
 */
export function compileGarmentFitMatrix(
  scaleX: number,
  scaleY: number,
  translateX: number,
  translateY: number,
  anchorX: number,
  anchorY: number,
): GarmentFitMatrix {
  return [
    roundFit(scaleX),
    0,
    0,
    roundFit(scaleY),
    roundFit(anchorX * (1 - scaleX) + translateX),
    roundFit(anchorY * (1 - scaleY) + translateY),
  ];
}

/** One compiled band of a warp: a horizontal slice with its own X transform. */
export interface CompiledWarpBand {
  /** Band index, 0 at the top of the component canvas. */
  readonly index: number;
  /** Fraction of the component canvas this band starts and ends at. */
  readonly fromFraction: number;
  readonly toFraction: number;
  readonly scaleX: number;
  readonly offsetX: number;
}

/**
 * Evaluates the authored control points at each band's midpoint.
 *
 * Piecewise-linear between control points, held flat outside the first and
 * last. Sampling at the midpoint rather than the edge means a band is the
 * average of the taper it covers, so the compiled ladder is symmetric about the
 * curve rather than biased up or down it.
 */
export function compileWarpBands(
  warp: GarmentFitBoundedWarp,
): readonly CompiledWarpBand[] {
  const points = warp.controlPoints;
  const sample = (at: number): { scaleX: number; offsetX: number } => {
    if (at <= points[0]!.at) {
      return { scaleX: points[0]!.scaleX, offsetX: points[0]!.offsetX };
    }
    const last = points[points.length - 1]!;
    if (at >= last.at) return { scaleX: last.scaleX, offsetX: last.offsetX };
    for (let index = 1; index < points.length; index += 1) {
      const upper = points[index]!;
      if (at > upper.at) continue;
      const lower = points[index - 1]!;
      const span = upper.at - lower.at;
      const t = span === 0 ? 0 : (at - lower.at) / span;
      return {
        scaleX: lower.scaleX + t * (upper.scaleX - lower.scaleX),
        offsetX: lower.offsetX + t * (upper.offsetX - lower.offsetX),
      };
    }
    return { scaleX: last.scaleX, offsetX: last.offsetX };
  };

  const bands: CompiledWarpBand[] = [];
  for (let index = 0; index < GARMENT_FIT_WARP_BAND_COUNT; index += 1) {
    const from = index / GARMENT_FIT_WARP_BAND_COUNT;
    const to = (index + 1) / GARMENT_FIT_WARP_BAND_COUNT;
    const sampled = sample((from + to) / 2);
    bands.push({
      index,
      fromFraction: roundFit(from),
      toFraction: roundFit(to),
      scaleX: roundFit(sampled.scaleX),
      offsetX: roundFit(sampled.offsetX),
    });
  }
  return bands;
}

/* -------------------------------------------------------------------------- */
/* The bank                                                                    */
/* -------------------------------------------------------------------------- */

export const GARMENT_FIT_BANK_SCHEMA = "garment-fit-profiles-v1";

/**
 * One authored fit: this garment family, on this body family, in this pose.
 *
 * The key is deliberately three-part. Dropping the pose would let a standing
 * fit be applied to a seated raster, which is the cross-viewpoint substitution
 * 76A §5.5 refused; dropping the body family is the defect this whole module
 * exists to fix.
 */
export interface GarmentFitProfileData {
  readonly target_body_family: string;
  readonly pose_family: string;
  readonly transform: GarmentFitTransform;
  /**
   * How the numbers were arrived at. Free-form, but a derived profile carries
   * the method id and the anchors it read so the derivation can be re-run.
   */
  readonly derivation?: {
    readonly method: string;
    readonly source_body_family: string;
    readonly anchors: readonly string[];
    readonly note?: string;
  };
}

export interface GarmentFitGarmentData {
  readonly component_family: string;
  readonly kind: CharacterComponentKind;
  readonly classification: GarmentFitClass;
  /**
   * The body family this art was drawn against. Null only for
   * `safe-direct-reuse`, where there is no authoring morphology to speak of
   * because the component never meets the varying silhouette.
   */
  readonly authored_for_body_family: string | null;
  /** Why this classification, in words a reviewer can check against pixels. */
  readonly basis: string;
  readonly profiles: readonly GarmentFitProfileData[];
}

export interface GarmentFitBankData {
  readonly schema: string;
  readonly note?: string;
  readonly bounds?: Partial<GarmentFitBounds>;
  readonly garments: readonly GarmentFitGarmentData[];
}

export interface GarmentFitBank {
  /**
   * The validated bounds, or null when the declared bounds are unusable. A
   * bank with null bounds refuses every governed garment; see
   * `resolveGarmentFit`.
   */
  readonly bounds: GarmentFitBounds | null;
  /** Why the bounds are unusable, when they are. */
  readonly boundsErrors: readonly string[];
  /** component family -> record. */
  readonly garments: ReadonlyMap<string, GarmentFitGarmentData>;
  /** `${componentFamily} ${bodyFamily} ${poseFamily}` -> profile. */
  readonly profiles: ReadonlyMap<string, GarmentFitProfileData>;
}

export function garmentFitProfileKey(
  componentFamily: string,
  bodyFamily: string,
  poseFamily: string,
): string {
  return `${componentFamily} ${bodyFamily} ${poseFamily}`;
}

export function createGarmentFitBank(data: GarmentFitBankData): GarmentFitBank {
  const garments = new Map<string, GarmentFitGarmentData>();
  const profiles = new Map<string, GarmentFitProfileData>();
  for (const garment of data.garments ?? []) {
    garments.set(garment.component_family, garment);
    for (const profile of garment.profiles ?? []) {
      profiles.set(
        garmentFitProfileKey(
          garment.component_family,
          profile.target_body_family,
          profile.pose_family,
        ),
        profile,
      );
    }
  }
  const checked = validateGarmentFitBounds(data?.bounds);
  return {
    bounds: checked.bounds,
    boundsErrors: checked.errors,
    garments,
    profiles,
  };
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

/** Why a fit could not be resolved. Every one of these fails the layer closed. */
export type GarmentFitRefusalCode =
  /** The bank does not know this garment family at all. */
  | "fit-garment-unknown"
  /** The garment needs a fit here and no profile is authored for it. */
  | "fit-profile-missing"
  /** The garment is morphology-specific and this is not the family it was drawn for. */
  | "fit-morphology-specific"
  /** The authored profile does not satisfy the bank's own bounds. */
  | "fit-profile-out-of-bounds"
  /**
   * The bank's own declared bounds are malformed, so nothing in it can be
   * shown to be bounded. Every governed garment is refused until the bank is
   * repaired; a limit that is not a number limits nothing.
   */
  | "fit-bank-invalid"
  /**
   * The fit resolved to a bounded warp, and a bounded warp is NOT RENDERABLE
   * in this repository.
   *
   * A warped garment is a set of horizontal slices. No renderer here draws
   * slices, and one that only knows the layer rectangle would paint the
   * garment at its widest band all the way down — worse than the unfitted
   * placement the fit replaced. So the compositor itself withholds the layer,
   * for every consumer, and the bands are kept only as derivation evidence
   * for the measurement harness. The refusal is issued in one place so no
   * consumer can turn a warp into a rectangle by not knowing about it.
   */
  | "fit-warp-not-renderable";

export interface GarmentFitResolved {
  readonly ok: true;
  readonly classification: GarmentFitClass;
  readonly transform: GarmentFitTransform;
  /** True when the resolved transform is the identity and no geometry moves. */
  readonly direct: boolean;
}

export interface GarmentFitRefused {
  readonly ok: false;
  readonly code: GarmentFitRefusalCode;
  readonly message: string;
}

export type GarmentFitResolution = GarmentFitResolved | GarmentFitRefused;

export interface GarmentFitRequest {
  readonly componentAssetId: string;
  readonly componentFamily: string;
  readonly kind: CharacterComponentKind;
  readonly targetBodyFamily: string;
  readonly poseFamily: string;
}

const DIRECT_RESOLUTION: GarmentFitResolved = {
  ok: true,
  classification: "safe-direct-reuse",
  transform: GARMENT_FIT_DIRECT,
  direct: true,
};

/**
 * Answers the one question the compositor asks, and refuses rather than guesses.
 *
 * The ordering matters. A garment the bank has never heard of is refused before
 * anything else, because "no entry" is indistinguishable from "nobody has
 * looked at this yet", and the safe reading of that is not "it probably
 * fits anywhere".
 */
export function resolveGarmentFit(
  request: GarmentFitRequest,
  bank: GarmentFitBank,
): GarmentFitResolution {
  if (!isGarmentFitGoverned(request.kind)) return DIRECT_RESOLUTION;

  // Fail closed on the bank before anything else. Even a safe-share garment
  // is refused here: a bank whose limits are malformed is a bank nobody has
  // read, and its classifications are not evidence of anything.
  if (bank.bounds === null || !boundsAreUsable(bank.bounds)) {
    return {
      ok: false,
      code: "fit-bank-invalid",
      message: `The fit bank's declared bounds are unusable, so no garment can be shown to be bounded: ${bank.boundsErrors.join(" ") || "bounds failed validation."}`,
    };
  }

  const garment = bank.garments.get(request.componentFamily);
  if (!garment) {
    return {
      ok: false,
      code: "fit-garment-unknown",
      message: `Garment family '${request.componentFamily}' (${request.componentAssetId}) is not declared in the fit bank, so nothing is known about whether it fits body family '${request.targetBodyFamily}'.`,
    };
  }

  if (garment.classification === "safe-direct-reuse") {
    return {
      ok: true,
      classification: "safe-direct-reuse",
      transform: GARMENT_FIT_DIRECT,
      direct: true,
    };
  }

  // A garment always fits the morphology it was drawn against, with no
  // transform. That is not an exemption; it is what "authored for" means.
  if (garment.authored_for_body_family === request.targetBodyFamily) {
    return {
      ok: true,
      classification: garment.classification,
      transform: GARMENT_FIT_DIRECT,
      direct: true,
    };
  }

  if (garment.classification === "morphology-specific") {
    return {
      ok: false,
      code: "fit-morphology-specific",
      message: `Garment family '${request.componentFamily}' is classified morphology-specific and was authored for body family '${garment.authored_for_body_family ?? "(none)"}'. It may not be fitted onto '${request.targetBodyFamily}'; that morphology needs its own source art.`,
    };
  }

  const profile = bank.profiles.get(
    garmentFitProfileKey(
      request.componentFamily,
      request.targetBodyFamily,
      request.poseFamily,
    ),
  );
  if (!profile) {
    return {
      ok: false,
      code: "fit-profile-missing",
      message: `Garment family '${request.componentFamily}' declares class '${garment.classification}' but has no fit profile for body family '${request.targetBodyFamily}' in pose '${request.poseFamily}'. A fit is never borrowed from another family or another pose.`,
    };
  }

  const violations = boundsViolations(profile.transform, bank.bounds);
  if (violations.length > 0) {
    return {
      ok: false,
      code: "fit-profile-out-of-bounds",
      message: `Fit profile for '${request.componentFamily}' on '${request.targetBodyFamily}' in pose '${request.poseFamily}' is outside the declared bounds: ${violations.join(" ")}`,
    };
  }

  return {
    ok: true,
    classification: garment.classification,
    transform: profile.transform,
    direct: profile.transform.kind === "direct",
  };
}

/* -------------------------------------------------------------------------- */
/* Bounds checking                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The exact keys each transform kind may carry.
 *
 * Closed on purpose. The first head ignored an extra `shearX` on an affine
 * profile rather than refusing it, which is how an unsupported field ends up
 * in a bank believing it does something. A transform with a key the kind does
 * not declare is malformed, not extended.
 */
const TRANSFORM_KEYS: Readonly<Record<string, readonly string[]>> = {
  direct: ["kind"],
  affine: ["kind", "scaleX", "scaleY", "translateX", "translateY"],
  "bounded-warp": ["kind", "scaleY", "translateY", "controlPoints"],
};
const CONTROL_POINT_KEYS = ["at", "scaleX", "offsetX"] as const;

/**
 * Structural errors in a transform: wrong kind, missing fields, fields the
 * kind does not declare. Separate from bounds so a shape defect is reported as
 * a shape defect rather than as a number being out of range.
 */
export function transformShapeErrors(transform: unknown): readonly string[] {
  if (!transform || typeof transform !== "object" || Array.isArray(transform)) {
    return ["Transform must be an object."];
  }
  const record = transform as Record<string, unknown>;
  const kind = record.kind;
  if (typeof kind !== "string" || !(kind in TRANSFORM_KEYS)) {
    return [
      `Transform kind '${String(kind)}' is not one of direct, affine, bounded-warp.`,
    ];
  }
  const errors: string[] = [];
  const allowed = TRANSFORM_KEYS[kind]!;
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      errors.push(
        `Transform kind '${kind}' does not carry a '${key}' field. Rotation, shear and any other freedom are refused, not ignored.`,
      );
    }
  }
  for (const key of allowed) {
    if (key === "kind") continue;
    if (!(key in record))
      errors.push(`Transform kind '${kind}' is missing '${key}'.`);
  }
  if (kind === "bounded-warp" && Array.isArray(record.controlPoints)) {
    record.controlPoints.forEach((point, index) => {
      if (!point || typeof point !== "object" || Array.isArray(point)) {
        errors.push(`Control point ${index} is not an object.`);
        return;
      }
      for (const key of Object.keys(point as object)) {
        if (!(CONTROL_POINT_KEYS as readonly string[]).includes(key)) {
          errors.push(`Control point ${index} carries unknown field '${key}'.`);
        }
      }
      for (const key of CONTROL_POINT_KEYS) {
        if (!(key in (point as object))) {
          errors.push(`Control point ${index} is missing '${key}'.`);
        }
      }
    });
  }
  return errors;
}

/**
 * Every way a transform can exceed the stated limits, as sentences.
 *
 * Returned rather than thrown so both the validator (which aggregates) and the
 * resolver (which refuses one layer) can use the same rules. There is exactly
 * one implementation of "bounded" in this file.
 */
export function boundsViolations(
  transform: GarmentFitTransform,
  bounds: GarmentFitBounds,
): readonly string[] {
  // The limits are checked before anything is compared against them. A
  // malformed limit is a violation of every transform, because nothing can be
  // shown to be inside a bound that is not a number.
  const checkedBounds = validateGarmentFitBounds(bounds);
  if (checkedBounds.bounds === null) {
    return checkedBounds.errors.map(
      (error) => `Cannot check this transform: ${error}`,
    );
  }
  bounds = checkedBounds.bounds;
  const shape = transformShapeErrors(transform);
  if (shape.length > 0) return shape;

  const errors: string[] = [];
  const checkScale = (value: number, label: string): void => {
    if (!isFiniteNumber(value)) {
      errors.push(`${label} is not a finite number.`);
      return;
    }
    if (value < bounds.minScale || value > bounds.maxScale) {
      errors.push(
        `${label} is ${value}, outside the permitted ${bounds.minScale}..${bounds.maxScale}.`,
      );
    }
  };
  const checkTranslate = (value: number, label: string, max: number): void => {
    if (!isFiniteNumber(value)) {
      errors.push(`${label} is not a finite number.`);
      return;
    }
    if (Math.abs(value) > max) {
      errors.push(`${label} is ${value}, beyond the permitted +/-${max}.`);
    }
  };

  if (transform.kind === "direct") return errors;

  if (transform.kind === "affine") {
    checkScale(transform.scaleX, "scaleX");
    checkScale(transform.scaleY, "scaleY");
    checkTranslate(transform.translateX, "translateX", bounds.maxTranslate);
    checkTranslate(transform.translateY, "translateY", bounds.maxTranslate);
    return errors;
  }

  checkScale(transform.scaleY, "scaleY");
  checkTranslate(transform.translateY, "translateY", bounds.maxTranslate);

  const points = transform.controlPoints;
  if (!Array.isArray(points) || points.length < 2) {
    errors.push("A bounded warp needs at least two control points.");
    return errors;
  }
  if (points.length > 8) {
    errors.push(
      `A bounded warp may declare at most 8 control points; this one declares ${points.length}. More points is a mesh, and a mesh is the arbitrary runtime deformation this contract refuses.`,
    );
  }
  if (points[0]!.at !== 0 || points[points.length - 1]!.at !== 1) {
    errors.push(
      "A bounded warp's control points must start at 0 and end at 1 so every row of the component is covered by an authored value rather than by an assumption.",
    );
  }
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    if (!isFiniteNumber(point.at) || point.at < 0 || point.at > 1) {
      errors.push(`Control point ${index} has 'at' outside 0..1.`);
    }
    if (index > 0 && point.at <= points[index - 1]!.at) {
      errors.push(
        `Control point ${index} is at ${point.at}, not strictly below the one before it.`,
      );
    }
    checkScale(point.scaleX, `control point ${index} scaleX`);
    checkTranslate(
      point.offsetX,
      `control point ${index} offsetX`,
      bounds.maxWarpOffset,
    );
  }
  if (errors.length > 0) return errors;

  const bands = compileWarpBands(transform);
  const scales = bands.map((band) => band.scaleX);
  const spread = Math.max(...scales) / Math.min(...scales);
  if (spread > bounds.maxWarpScaleSpread) {
    errors.push(
      `Compiled bands span ${spread.toFixed(4)}x from narrowest to widest, beyond the permitted ${bounds.maxWarpScaleSpread}x. A garment that needs more than this is a different garment.`,
    );
  }
  for (let index = 1; index < scales.length; index += 1) {
    const a = scales[index - 1]!;
    const b = scales[index]!;
    const step = Math.max(a / b, b / a);
    if (step > bounds.maxWarpBandStep) {
      errors.push(
        `Bands ${index - 1} and ${index} step by ${step.toFixed(4)}x, beyond the permitted ${bounds.maxWarpBandStep}x; that seam would be visible in the artwork.`,
      );
    }
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Bank validation                                                             */
/* -------------------------------------------------------------------------- */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Structural and coverage validation, shared by `validate:art` and the tests.
 *
 * Coverage is the half that matters. A schema check proves the numbers are
 * numbers; the coverage check proves that every (garment, body family, pose)
 * combination the COMPONENT LIBRARY says is reachable has an authored answer,
 * so a person cannot resolve to a pairing nobody has looked at.
 */
export function validateGarmentFitBank(
  data: GarmentFitBankData,
  library: CharacterComponentLibrary,
): readonly string[] {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return ["Garment fit bank is missing or not an object."];
  }
  if (data.schema !== GARMENT_FIT_BANK_SCHEMA) {
    errors.push(
      `Garment fit bank declares schema '${String(data.schema)}'; this build reads '${GARMENT_FIT_BANK_SCHEMA}'.`,
    );
  }
  if (!Array.isArray(data.garments)) {
    errors.push("Garment fit bank 'garments' must be an array.");
    return errors;
  }

  const checkedBounds = validateGarmentFitBounds(data.bounds);
  errors.push(...checkedBounds.errors);
  if (checkedBounds.bounds === null) {
    errors.push(
      "Garment fit bank bounds are unusable; no profile in this bank can be shown to be bounded, and the runtime will refuse every governed garment until they are repaired.",
    );
    return errors;
  }
  const bounds = checkedBounds.bounds;

  // What the component library actually offers ---------------------------
  const bodyFamilies = new Set<string>();
  const posesByBodyFamily = new Map<string, Set<string>>();
  const garmentFamilies = new Map<
    string,
    {
      kind: CharacterComponentKind;
      definitions: CharacterComponentDefinition[];
    }
  >();
  for (const component of library.components.values()) {
    const definition = component.definition;
    if (definition.kind === "body") {
      bodyFamilies.add(definition.family);
      const poses =
        posesByBodyFamily.get(definition.family) ?? new Set<string>();
      if (definition.pose_family) poses.add(definition.pose_family);
      posesByBodyFamily.set(definition.family, poses);
      continue;
    }
    if (!isGarmentFitGoverned(definition.kind)) continue;
    const entry = garmentFamilies.get(definition.family) ?? {
      kind: definition.kind,
      definitions: [],
    };
    entry.definitions.push(definition);
    garmentFamilies.set(definition.family, entry);
  }

  const seen = new Set<string>();
  for (const garment of data.garments) {
    const label = `Fit bank entry '${String(garment.component_family)}'`;
    if (!isNonEmptyString(garment.component_family)) {
      errors.push("A fit bank entry declares no 'component_family'.");
      continue;
    }
    if (seen.has(garment.component_family)) {
      errors.push(`${label} is declared twice.`);
      continue;
    }
    seen.add(garment.component_family);

    if (!CLASSES.has(garment.classification)) {
      errors.push(
        `${label} declares classification '${String(garment.classification)}', which is not one of ${GARMENT_FIT_CLASSES.join(", ")}.`,
      );
      continue;
    }
    if (!isNonEmptyString(garment.basis)) {
      errors.push(
        `${label} declares no 'basis'. A classification with no stated reason cannot be checked against the art.`,
      );
    }

    const known = garmentFamilies.get(garment.component_family);
    if (!known) {
      errors.push(
        `${label} names a component family the library does not carry as a fit-governed kind.`,
      );
      continue;
    }
    if (known.kind !== garment.kind) {
      errors.push(
        `${label} declares kind '${String(garment.kind)}' but the library's components of that family are '${known.kind}'.`,
      );
    }

    const authoredFor = garment.authored_for_body_family;
    if (garment.classification === "safe-direct-reuse") {
      if (authoredFor !== null) {
        errors.push(
          `${label} is classified safe-direct-reuse but names an authoring body family. Direct reuse means the component never meets the varying silhouette, so there is no authoring morphology to name.`,
        );
      }
      if ((garment.profiles ?? []).length > 0) {
        errors.push(
          `${label} is classified safe-direct-reuse but carries fit profiles. Requirement 7 is that a genuinely safe component keeps rendering with no transform at all.`,
        );
      }
    } else if (!isNonEmptyString(authoredFor)) {
      errors.push(
        `${label} is classified '${garment.classification}' but names no 'authored_for_body_family'. A fit is a transform FROM one measured morphology TO another; without the source there is nothing to transform from.`,
      );
    } else if (!bodyFamilies.has(authoredFor)) {
      errors.push(
        `${label} was authored for body family '${authoredFor}', which the library does not carry.`,
      );
    }

    // Which pairings the library says are reachable ----------------------
    const required = new Set<string>();
    for (const definition of known.definitions) {
      const targets = definition.compatible_body_families ?? [];
      for (const bodyFamily of targets) {
        if (!bodyFamilies.has(bodyFamily)) continue;
        const poses = definition.compatible_pose_families ?? [
          ...(posesByBodyFamily.get(bodyFamily) ?? []),
        ];
        for (const pose of poses) {
          if (!(posesByBodyFamily.get(bodyFamily) ?? new Set()).has(pose)) {
            continue;
          }
          required.add(`${bodyFamily} ${pose}`);
        }
      }
    }

    const declared = new Set<string>();
    for (const profile of garment.profiles ?? []) {
      const profileLabel = `${label} profile for '${String(profile.target_body_family)}' in pose '${String(profile.pose_family)}'`;
      if (
        !isNonEmptyString(profile.target_body_family) ||
        !isNonEmptyString(profile.pose_family)
      ) {
        errors.push(
          `${label} carries a profile with no target body family or no pose family.`,
        );
        continue;
      }
      const key = `${profile.target_body_family} ${profile.pose_family}`;
      if (declared.has(key)) {
        errors.push(`${profileLabel} is declared twice.`);
      }
      declared.add(key);
      if (!bodyFamilies.has(profile.target_body_family)) {
        errors.push(
          `${profileLabel} names a body family the library does not carry.`,
        );
      }
      if (profile.target_body_family === authoredFor) {
        errors.push(
          `${profileLabel} fits the garment onto the family it was authored for. That pairing is the identity by definition, and writing a transform for it invites the two to disagree.`,
        );
      }
      if (!required.has(key)) {
        errors.push(
          `${profileLabel} is not a pairing the component library declares as compatible. A fit profile may not create a compatibility the components themselves refuse.`,
        );
      }
      const transform = profile.transform;
      const shape = transformShapeErrors(transform);
      if (shape.length > 0) {
        for (const error of shape) errors.push(`${profileLabel} ${error}`);
        continue;
      }
      if (transform.kind === "bounded-warp") {
        errors.push(
          `${profileLabel} carries a bounded warp, and a bounded warp is NOT RENDERABLE: no renderer in this repository draws bands, and the compositor withholds the layer for every consumer. A production bank may not depend on one. Regenerate the art for this morphology, or withdraw the declared compatibility.`,
        );
      }
      if (
        garment.classification === "affine-reusable" &&
        transform.kind === "bounded-warp"
      ) {
        errors.push(
          `${profileLabel} carries a bounded warp under an 'affine-reusable' classification. The class is the claim about the art; a warp here means the claim is wrong.`,
        );
      }
      for (const violation of boundsViolations(transform, bounds)) {
        errors.push(`${profileLabel} ${violation}`);
      }
    }

    if (garment.classification === "morphology-specific") {
      for (const key of required) {
        const [bodyFamily] = key.split(" ");
        if (bodyFamily !== authoredFor) {
          errors.push(
            `${label} is classified morphology-specific but its components still declare compatibility with body family '${bodyFamily}'. Withdraw the declared compatibility or author the art for that morphology; the fit layer will refuse to draw it either way.`,
          );
          break;
        }
      }
      continue;
    }
    if (garment.classification === "safe-direct-reuse") continue;

    for (const key of required) {
      const [bodyFamily, pose] = key.split(" ");
      if (bodyFamily === authoredFor) continue;
      if (declared.has(key)) continue;
      errors.push(
        `${label} declares compatibility with body family '${bodyFamily}' in pose '${pose}' but authors no fit profile for it. This pairing would fail closed at render time.`,
      );
    }
  }

  // Coverage the other way: a governed family with no entry at all.
  for (const [family, entry] of garmentFamilies) {
    if (seen.has(family)) continue;
    errors.push(
      `Component family '${family}' (${entry.kind}) is fit-governed but absent from the fit bank. Every garment must say what it is, even if the answer is that it shares safely.`,
    );
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Deriving a fit from measured anchors                                        */
/* -------------------------------------------------------------------------- */

/**
 * The anchors each category is fitted against.
 *
 * These are the rows where a garment of that category actually meets the body.
 * Fitting a top against the ankle row would be arithmetic on an irrelevance;
 * fitting a bottom without the waist would miss the row a waistband sits on,
 * which D-068 already records as the most visible anchor error in the project.
 */
export const GARMENT_FIT_CATEGORY_ANCHORS: Readonly<
  Record<GarmentFitGovernedKind, readonly string[]>
> = {
  /**
   * Tops and outerwear. There is no separate `outerwear` component kind — a
   * coat is a `top` that covers more of the silhouette — so it is fitted
   * against the same rows over a longer span.
   */
  top: ["shoulder", "waist", "hip", "hem", "cuff"],
  bottom: ["waist", "hip", "crotch", "knee", "ankle"],
  footwear: ["ankle", "heel", "toe", "sole"],
  accessory: ["torso"],
};

/**
 * A body's painted silhouette, read at the rows a garment cares about.
 *
 * `spans` are painted widths normalized to the body canvas width, and `rows`
 * are the normalized y each span was read at. Both come from measuring the
 * raster — this is Packet 76's Measurement Card work applied to the body that
 * actually ships, not a number anyone typed.
 *
 * A span is the distance between the LEFT and RIGHT painted edges at that row,
 * so one span carries the left and right anchor of a symmetric pair. Splitting
 * them would be the right move for an asymmetric pose, and would need a body
 * whose left and right edges were measured separately; nothing in the bank is
 * measured that way yet, and inventing the asymmetry would be worse than
 * declaring the symmetry.
 */
export interface BodyFitReference {
  readonly bodyFamily: string;
  readonly poseFamily: string;
  readonly spans: Readonly<Record<string, number>>;
  readonly rows: Readonly<Record<string, number>>;
}

export interface DerivedFit<T> {
  readonly transform: T;
  readonly anchors: readonly string[];
  /** Per-anchor target/source span ratio the derivation read. */
  readonly ratios: Readonly<Record<string, number>>;
}

/**
 * The component's own vertical extent in body-canvas normalized units.
 *
 * Anchors outside it are dropped from every derivation: fitting a waistband
 * against a shoulder row the garment does not reach is arithmetic on a row
 * nobody will ever see, and it drags the fit away from the rows that are
 * actually covered.
 */
export interface ComponentExtent {
  readonly topY: number;
  readonly bottomY: number;
}

function sharedAnchors(
  source: BodyFitReference,
  target: BodyFitReference,
  kind: GarmentFitGovernedKind,
  extent?: ComponentExtent,
): readonly string[] {
  return GARMENT_FIT_CATEGORY_ANCHORS[kind].filter((anchor) => {
    if (
      !isFiniteNumber(source.spans[anchor]) ||
      !isFiniteNumber(target.spans[anchor]) ||
      !(source.spans[anchor]! > 0)
    ) {
      return false;
    }
    if (!extent) return true;
    const row = source.rows[anchor];
    return isFiniteNumber(row) && row >= extent.topY && row <= extent.bottomY;
  });
}

function ratiosFor(
  source: BodyFitReference,
  target: BodyFitReference,
  anchors: readonly string[],
): Record<string, number> {
  const ratios: Record<string, number> = {};
  for (const anchor of anchors) {
    ratios[anchor] = roundFit(target.spans[anchor]! / source.spans[anchor]!);
  }
  return ratios;
}

export const GARMENT_FIT_AFFINE_DERIVATION = "anchor-span-minimax-v1";
export const GARMENT_FIT_WARP_DERIVATION = "anchor-span-piecewise-v1";

/**
 * Derives one axis-aligned scale from the measured spans at the category's
 * anchors.
 *
 * The scale is the geometric mean of the smallest and largest required ratio,
 * which is the choice that minimises the WORST proportional error rather than
 * the average one. Averaging would let a fit be dominated by whichever anchor
 * happened to be listed twice; the worst row is the one a viewer sees.
 *
 * `scaleY` stays 1 and translation stays 0 unless a hem row is measured on both
 * bodies, in which case the garment is lengthened or shortened to reach it. No
 * horizontal translation is derived: the anchors are all centred on the body's
 * midline, so a symmetric scale about the origin already lands them.
 */
export function deriveAffineFit(
  source: BodyFitReference,
  target: BodyFitReference,
  kind: GarmentFitGovernedKind,
  extent?: ComponentExtent,
): DerivedFit<GarmentFitAffine> {
  const anchors = sharedAnchors(source, target, kind, extent);
  if (anchors.length === 0) {
    throw new Error(
      `Cannot derive an affine fit from '${source.bodyFamily}' to '${target.bodyFamily}' for a ${kind}: the two references share none of the ${GARMENT_FIT_CATEGORY_ANCHORS[kind].join(", ")} spans this category is fitted against.`,
    );
  }
  if (source.poseFamily !== target.poseFamily) {
    throw new Error(
      `Cannot derive a fit from pose '${source.poseFamily}' to pose '${target.poseFamily}'. A fit adapts a garment to a body, never one viewpoint to another.`,
    );
  }
  const ratios = ratiosFor(source, target, anchors);
  const values = anchors.map((anchor) => ratios[anchor]!);
  const scaleX = roundFit(Math.sqrt(Math.min(...values) * Math.max(...values)));

  let scaleY = 1;
  const sourceHem = source.rows.hem;
  const targetHem = target.rows.hem;
  const sourceTop = source.rows.shoulder ?? source.rows.waist;
  const targetTop = target.rows.shoulder ?? target.rows.waist;
  if (
    isFiniteNumber(sourceHem) &&
    isFiniteNumber(targetHem) &&
    isFiniteNumber(sourceTop) &&
    isFiniteNumber(targetTop) &&
    sourceHem - sourceTop > 0
  ) {
    scaleY = roundFit((targetHem - targetTop) / (sourceHem - sourceTop));
  }

  return {
    transform: {
      kind: "affine",
      scaleX,
      scaleY,
      translateX: 0,
      translateY: 0,
    },
    anchors,
    ratios,
  };
}

/**
 * Derives a bounded warp: one control point per measured anchor row, placed
 * where that row falls inside the COMPONENT's own canvas.
 *
 * The caller supplies the component's vertical extent in body-canvas normalized
 * units, because the same anchor row sits at a different fraction of a cropped
 * top than of a full-length coat. Anchors outside the component are dropped —
 * a fit for a hip row the garment does not reach would be extrapolation.
 *
 * The first and last control points are pinned to 0 and 1 by holding the
 * nearest measured value flat, so no row is fitted by a number nobody measured.
 */
export function deriveBoundedWarpFit(
  source: BodyFitReference,
  target: BodyFitReference,
  kind: GarmentFitGovernedKind,
  component: ComponentExtent,
): DerivedFit<GarmentFitBoundedWarp> {
  if (source.poseFamily !== target.poseFamily) {
    throw new Error(
      `Cannot derive a fit from pose '${source.poseFamily}' to pose '${target.poseFamily}'. A fit adapts a garment to a body, never one viewpoint to another.`,
    );
  }
  const height = component.bottomY - component.topY;
  if (!(height > 0)) {
    throw new Error(
      "Cannot derive a bounded warp for a component with no vertical extent.",
    );
  }
  const usable = sharedAnchors(source, target, kind, component);
  if (usable.length < 2) {
    throw new Error(
      `Cannot derive a bounded warp from '${source.bodyFamily}' to '${target.bodyFamily}' for a ${kind}: only ${usable.length} of the category's anchors fall inside the component. A warp needs at least two measured rows; with one, an affine fit is the honest answer.`,
    );
  }
  const ratios = ratiosFor(source, target, usable);
  const ordered = [...usable].sort((a, b) => source.rows[a]! - source.rows[b]!);

  const interior = ordered.map((anchor) => ({
    at: roundFit((source.rows[anchor]! - component.topY) / height),
    scaleX: ratios[anchor]!,
    offsetX: 0,
  }));

  const points: GarmentFitWarpControlPoint[] = [];
  if (interior[0]!.at > 0) {
    points.push({ at: 0, scaleX: interior[0]!.scaleX, offsetX: 0 });
  }
  for (const point of interior) {
    if (points.length > 0 && points[points.length - 1]!.at === point.at) {
      continue;
    }
    points.push(point);
  }
  const last = points[points.length - 1]!;
  if (last.at < 1) points.push({ at: 1, scaleX: last.scaleX, offsetX: 0 });
  else if (last.at > 1) {
    throw new Error(
      "A derived control point landed below the component's own canvas; the measured rows and the component extent disagree.",
    );
  }

  return {
    transform: {
      kind: "bounded-warp",
      scaleY: 1,
      translateY: 0,
      controlPoints: points,
    },
    anchors: ordered,
    ratios,
  };
}
