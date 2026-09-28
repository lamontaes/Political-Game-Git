import type { EntityId, IsoDate, World } from "../types";

/**
 * The outcome web (04 SYSTEM SPECS, part 5): how one area's measures move
 * another's. Laws move levers, levers move their own area's measures (each
 * lane's direct effects), and measures move each other only through the one
 * shared table in `data/research/outcome-web/links.json`.
 *
 * A place's rate is its calibrated base times a factor for each cause. A
 * factor reads the cause "lag" months ago against its baseline and applies the
 * link's shape. Every factor is capped, and so is the product. Sizes are
 * calibration anchors and never reach a player's screen; neither do sources.
 */
export const OUTCOME_WEB_VERSION = "outcome-web/v1" as const;

/** `area.measure`, for example `economy.unemployment-rate`. */
export type OutcomeMeasureKey = string;

export type OutcomeLane = "A" | "B" | "C" | "F" | "G" | "M" | "O";

export type LinkShape =
  | "linear"
  | "threshold"
  | "diminishing"
  | "exposure-years"
  | "acute-decay"
  | "moderated";

export type LinkStrength =
  "strong" | "moderate" | "weak" | "about-zero" | "contested";

export type LinkDirection = "up" | "down" | "none";

/**
 * How a link's size is read.
 * - `relative`: a share change in the affected measure per unit of the cause
 *   (0.03 is 3% more for each unit). Factors multiply.
 * - `points`: points added to the affected measure per unit of the cause.
 *   Points add before the relative factors apply.
 */
export type LinkEffectKind = "relative" | "points";

export interface LinkModerator {
  readonly measure: OutcomeMeasureKey;
  /**
   * `scale`: the effect is multiplied by the moderator's value (a 0 to 1
   * share, such as households with local news).
   * `offset`: the effect is reduced by `share` times the moderator's value
   * (air conditioning removes about 75% of heat's toll where every home has it).
   */
  readonly mode: "scale" | "offset";
  readonly share: number;
}

export interface OutcomeLink {
  readonly id: string;
  readonly from: OutcomeMeasureKey;
  readonly to: OutcomeMeasureKey;
  readonly direction: LinkDirection;
  /**
   * The magnitude per unit of the cause. Null means the link is known to be
   * real but its size is not researched yet: it is carried, listed as
   * provisional, and moves nothing until a size is approved.
   */
  readonly size: number | null;
  readonly effect: LinkEffectKind;
  readonly unit: string;
  readonly shape: LinkShape;
  /** Threshold shape: where the first and optional second slope begin. */
  readonly thresholds?: readonly number[];
  /** Threshold shape: the slope past each threshold, as sizes. */
  readonly slopes?: readonly number[];
  /** Acute-decay shape: months for the hit to fade to about a third. */
  readonly decayMonths?: number;
  /** Exposure-years shape: the most years that count. */
  readonly maxYears?: number;
  readonly moderator?: LinkModerator | null;
  /** Compare the cause with this value instead of the reader's baseline. */
  readonly baseline?: number;
  /** Months before the effect shows. */
  readonly lagMonths: number;
  /** Months until it is fully felt; the cause is averaged over the window. */
  readonly fullMonths: number;
  readonly who: string;
  /** Bounds on this link's own factor (relative) or points. */
  readonly floor?: number | null;
  readonly ceiling?: number | null;
  readonly strength: LinkStrength;
  readonly provenance: "researched" | "provisional";
  /** Dev-only key into the research's source list. Never on screen. */
  readonly sourceKey: string;
  readonly ownerLane: OutcomeLane;
  readonly note?: string;
}

export interface OutcomeLinksFile {
  readonly version: string;
  readonly about: string;
  /**
   * Lever-to-measure pairs a lane already carries as a direct effect (part 5,
   * layer 2). The web may not carry these again.
   */
  readonly directEffects: readonly {
    readonly from: OutcomeMeasureKey;
    readonly to: OutcomeMeasureKey;
    readonly ownerLane: OutcomeLane;
    readonly where: string;
  }[];
  readonly links: readonly OutcomeLink[];
}

/** One reading of a measure in one place on one date. */
export interface MeasureReading {
  readonly value: number;
  /** The calibrated value the place's causes are compared with. */
  readonly baseline: number;
  readonly provenance: "recorded" | "calibrated" | "provisional";
}

export interface OutcomeMeasureDefinition {
  readonly key: OutcomeMeasureKey;
  readonly ownerLane: OutcomeLane;
  readonly unit: string;
  /** Bounds on the measure's combined factor from the web. */
  readonly factorFloor: number;
  readonly factorCeiling: number;
}

export interface OutcomeMeasureReader {
  readonly definition: OutcomeMeasureDefinition;
  /**
   * The measure in a place as of a date, or null when nothing is recorded.
   * Null is unknown, never zero: a link whose cause is unknown moves nothing
   * and is listed as unknown in the chain.
   */
  read(
    world: World,
    jurisdictionId: EntityId,
    asOf: IsoDate,
  ): MeasureReading | null;
}

/** One cause's part in a measure's factor. */
export interface ChainStep {
  readonly linkId: string;
  readonly from: OutcomeMeasureKey;
  readonly status: "counted" | "unknown-cause" | "unsized" | "about-zero";
  /** The cause as read (averaged over the lag window), or null if unknown. */
  readonly causeValue: number | null;
  readonly causeBaseline: number | null;
  /** Relative factor (1 is no change) or points, per the link's effect. */
  readonly effect: LinkEffectKind;
  readonly amount: number;
}

export interface WebFactorReading {
  readonly measure: OutcomeMeasureKey;
  readonly jurisdictionId: EntityId;
  readonly asOf: IsoDate;
  /** Points added to the base before `factor` applies. */
  readonly points: number;
  /** The capped product of every counted relative factor. */
  readonly factor: number;
  readonly chain: readonly ChainStep[];
}
