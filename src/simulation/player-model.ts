import type { IsoDate } from "./types";

/**
 * What the game has come to think this player cares about.
 *
 * Three rules govern everything in this file, and they are the reason it is a
 * separate module rather than a few more fields on a person.
 *
 * *It is not about the character.* Nothing here is biography, memory, belief,
 * personality or a value the character holds. It is an estimate the game keeps
 * about the person at the keyboard so it can decide which of several causally
 * plausible situations to put in front of them. A character's canonical mind
 * lives in `mind.ts` and is written by things that actually happened.
 *
 * *It never decides outcomes.* This model chooses what gets offered. What comes
 * of a choice is decided by the domain engines — legislation, incidents, work,
 * relationships, resources — from world state, and by nothing in here. A
 * situation is not more likely to matter because the selector found it
 * interesting.
 *
 * *It holds uncertainty as uncertainty.* A single number per dimension can say
 * "unsure"; it cannot say "either fiscal restraint or a low opinion of what the
 * council can deliver, and I do not yet know which". Those are different
 * states, and collapsing the second into the first is how a game ends up
 * confidently wrong about somebody. So competing explanations are represented
 * as competing explanations, and stay alive until something separates them.
 */

/* -------------------------------------------------------------------------- */
/* Dimensions                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The civic axes, from the questionnaire calibration research.
 *
 * Each is a continuous estimate on [-1, +1] where 0 is "nothing observed".
 * The poles are named in the research and repeated here so a reader of the
 * code does not have to read the research beside it.
 */
export type CivicDimension =
  | "econ-distribution"
  | "social-pluralism"
  | "institutional-trust"
  | "civic-order"
  | "governance-scale"
  | "security-posture"
  | "ecological-priority"
  | "decision-style";

/**
 * The everyday axes.
 *
 * Doc 90 lists these among the mutable dimensions a life simulation needs
 * beside the civic ones, and they are what make a household or a workplace
 * situation legible to the same selector that ranks a civic one. Without them,
 * cross-pressure could only ever be politics against politics.
 */
export type LifeDimension =
  | "personal-ties"
  | "achievement-ambition"
  | "security-stability"
  | "risk-appetite"
  | "care-obligation"
  | "privacy-preference";

export type PlayerModelDimension = CivicDimension | LifeDimension;

export interface DimensionPoles {
  readonly negative: string;
  readonly positive: string;
  /** The tension the axis is actually about, in one line. */
  readonly tension: string;
}

export const CIVIC_DIMENSIONS: readonly CivicDimension[] = [
  "econ-distribution",
  "social-pluralism",
  "institutional-trust",
  "civic-order",
  "governance-scale",
  "security-posture",
  "ecological-priority",
  "decision-style",
];

export const LIFE_DIMENSIONS: readonly LifeDimension[] = [
  "personal-ties",
  "achievement-ambition",
  "security-stability",
  "risk-appetite",
  "care-obligation",
  "privacy-preference",
];

export const PLAYER_MODEL_DIMENSIONS: readonly PlayerModelDimension[] = [
  ...CIVIC_DIMENSIONS,
  ...LIFE_DIMENSIONS,
];

export const DIMENSION_POLES: Readonly<
  Record<PlayerModelDimension, DimensionPoles>
> = {
  "econ-distribution": {
    negative: "market autonomy",
    positive: "collective provision",
    tension: "private enterprise against pooled economic security",
  },
  "social-pluralism": {
    negative: "cultural continuity",
    positive: "lifestyle self-determination",
    tension: "shared inherited norms against individual difference",
  },
  "institutional-trust": {
    negative: "scepticism of officialdom",
    positive: "confidence in professional process",
    tension: "public accountability against expert and procedural authority",
  },
  "civic-order": {
    negative: "civil liberty",
    positive: "public order",
    tension: "freedom from coercion against safety and stability",
  },
  "governance-scale": {
    negative: "local self-determination",
    positive: "uniform standards",
    tension: "tailored local rule against consistent wider policy",
  },
  "security-posture": {
    negative: "self-reliance and restraint",
    positive: "engagement and interdependence",
    tension: "keeping capability at home against relying on partners",
  },
  "ecological-priority": {
    negative: "immediate material use",
    positive: "long-run stewardship",
    tension:
      "production and jobs now against the long-run condition of a place",
  },
  "decision-style": {
    negative: "holding the line",
    positive: "taking the deal",
    tension: "doctrinal consistency against incremental bargaining",
  },
  "personal-ties": {
    negative: "keeping your own counsel",
    positive: "standing by your people",
    tension: "independence against loyalty to particular people",
  },
  "achievement-ambition": {
    negative: "sufficiency",
    positive: "advancement",
    tension: "having enough against getting further",
  },
  "security-stability": {
    negative: "openness to disruption",
    positive: "protecting what is steady",
    tension: "accepting upheaval against keeping the ground firm",
  },
  "risk-appetite": {
    negative: "caution",
    positive: "willingness to gamble",
    tension: "the safe path against the one that could go further or worse",
  },
  "care-obligation": {
    negative: "naming your own limits",
    positive: "carrying what others cannot",
    tension: "self-preservation against the needs of dependants",
  },
  "privacy-preference": {
    negative: "acting in the open",
    positive: "keeping it out of view",
    tension: "visibility as accountability against visibility as exposure",
  },
};

export function isPlayerModelDimension(
  value: string,
): value is PlayerModelDimension {
  return (PLAYER_MODEL_DIMENSIONS as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Evidence strength                                                           */
/* -------------------------------------------------------------------------- */

/**
 * How much a piece of evidence is allowed to weigh.
 *
 * The three tiers are doc 90's, and the ratio between them is the whole
 * argument for letting a player answer a questionnaire at all: a setup answer
 * is a hint, a repeated stated intention is more than a hint, and something the
 * player actually did in a world that answered back is the real thing.
 *
 * `enacted` is roughly five times `setup`, so two to three consequential
 * actions in the opposite direction move the estimate past neutral and out the
 * other side — which is exactly the override behaviour the settled semantics
 * require, and it happens without deleting a single setup answer from the
 * audit trail.
 */
export type EvidenceStrength = "setup" | "stated" | "enacted";

export const EVIDENCE_WEIGHT: Readonly<Record<EvidenceStrength, number>> = {
  setup: 0.25,
  stated: 0.6,
  enacted: 1.2,
};

/** The most any single setup answer may weigh, whatever an item asks for. */
export const MAXIMUM_SETUP_OBSERVATION_WEIGHT = 0.35;

export interface DimensionNudge {
  readonly dimension: PlayerModelDimension;
  /** On [-1, +1], toward the pole named in `DIMENSION_POLES`. */
  readonly magnitude: number;
}

/**
 * One explanation that a choice is consistent with.
 *
 * The point of naming these is that a choice usually has more than one. A
 * spending freeze can come from believing the private economy should be left
 * alone, or from doubting that the council can spend the money well. Both
 * predict the same button. They predict different *later* buttons, which is
 * what makes it worth keeping both.
 */
export interface HypothesisSupport {
  readonly hypothesisKey: string;
  /** On [0, 1]: how well this explanation accounts for the choice. */
  readonly support: number;
}

/**
 * A declaration that this choice left more than one explanation standing.
 *
 * Recorded rather than inferred, because whether two readings of a moment are
 * genuinely rival is an authoring judgement about the content, not something
 * a scorer can discover from numbers.
 */
export interface AmbiguityDeclaration {
  readonly key: string;
  readonly hypothesisKeys: readonly string[];
  /** Said in the terms a designer would use, for the audit trail. */
  readonly note: string;
}

export interface PlayerEvidence {
  /** Stable and unique within a model; the audit trail is keyed by it. */
  readonly key: string;
  readonly strength: EvidenceStrength;
  /** Item- or situation-level confidence, on [0, 1]. */
  readonly observationWeight: number;
  readonly nudges: readonly DimensionNudge[];
  readonly hypotheses: readonly HypothesisSupport[];
  readonly ambiguity: AmbiguityDeclaration | null;
  readonly recordedAt: IsoDate | null;
  /** Where it came from, in words, so the trail can be read by a person. */
  readonly source: string;
}

/* -------------------------------------------------------------------------- */
/* The model                                                                   */
/* -------------------------------------------------------------------------- */

export interface DimensionEstimate {
  /** On [-1, +1]. Zero means nothing has been observed, not "moderate". */
  readonly mean: number;
  /** Accumulated observation weight. Zero means unobserved. */
  readonly weight: number;
}

export interface HypothesisEstimate {
  readonly belief: number;
  readonly observations: number;
}

export interface LiveAmbiguity {
  readonly key: string;
  readonly hypothesisKeys: readonly string[];
  readonly note: string;
  /**
   * How evenly the belief is split. One means the rival explanations are
   * indistinguishable; zero means one of them has won.
   */
  readonly openness: number;
}

export interface PlayerModel {
  readonly dimensions: Readonly<
    Record<PlayerModelDimension, DimensionEstimate>
  >;
  readonly hypotheses: Readonly<Record<string, HypothesisEstimate>>;
  /** Every declared ambiguity, whether or not it is still open. */
  readonly ambiguities: readonly LiveAmbiguity[];
  /** Everything that was ever applied, in order, and never removed. */
  readonly trail: readonly PlayerEvidence[];
  readonly observedBy: Readonly<Record<EvidenceStrength, number>>;
}

const EMPTY_ESTIMATE: DimensionEstimate = { mean: 0, weight: 0 };

export function createPlayerModel(): PlayerModel {
  const dimensions = {} as Record<PlayerModelDimension, DimensionEstimate>;
  for (const dimension of PLAYER_MODEL_DIMENSIONS) {
    dimensions[dimension] = EMPTY_ESTIMATE;
  }
  return {
    dimensions,
    hypotheses: {},
    ambiguities: [],
    trail: [],
    observedBy: { setup: 0, stated: 0, enacted: 0 },
  };
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function clampPositiveUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** The weight one piece of evidence actually carries, after its ceiling. */
export function effectiveWeight(evidence: PlayerEvidence): number {
  const base =
    EVIDENCE_WEIGHT[evidence.strength] *
    clampPositiveUnit(evidence.observationWeight);
  return evidence.strength === "setup"
    ? Math.min(base, MAXIMUM_SETUP_OBSERVATION_WEIGHT)
    : base;
}

/**
 * Applies one observation.
 *
 * The estimate is a weighted running mean, which is what makes stronger later
 * evidence able to move an earlier reading without anything having to be
 * deleted: the setup answer keeps its place in the trail and stops being the
 * loudest voice in the room.
 */
export function applyPlayerEvidence(
  model: PlayerModel,
  evidence: PlayerEvidence,
): PlayerModel {
  if (model.trail.some((entry) => entry.key === evidence.key)) return model;
  const weight = effectiveWeight(evidence);
  const dimensions = { ...model.dimensions };
  if (weight > 0) {
    for (const nudge of evidence.nudges) {
      const current = dimensions[nudge.dimension] ?? EMPTY_ESTIMATE;
      const nextWeight = current.weight + weight;
      dimensions[nudge.dimension] = {
        mean:
          nextWeight === 0
            ? 0
            : clampUnit(
                (current.mean * current.weight +
                  clampUnit(nudge.magnitude) * weight) /
                  nextWeight,
              ),
        weight: nextWeight,
      };
    }
  }

  const hypotheses = { ...model.hypotheses };
  if (weight > 0) {
    for (const support of evidence.hypotheses) {
      const current = hypotheses[support.hypothesisKey] ?? {
        belief: 0,
        observations: 0,
      };
      hypotheses[support.hypothesisKey] = {
        belief: current.belief + clampPositiveUnit(support.support) * weight,
        observations: current.observations + 1,
      };
    }
  }

  const declared = evidence.ambiguity;
  const ambiguities =
    declared === null ||
    model.ambiguities.some((entry) => entry.key === declared.key)
      ? model.ambiguities
      : [
          ...model.ambiguities,
          {
            key: declared.key,
            hypothesisKeys: [...declared.hypothesisKeys],
            note: declared.note,
            openness: 1,
          },
        ];

  const observedBy = { ...model.observedBy };
  observedBy[evidence.strength] += 1;

  return refreshAmbiguityOpenness({
    dimensions,
    hypotheses,
    ambiguities,
    // The trail is append-only on purpose. "Gameplay may override a setup
    // prior" and "the setup answer is erased" are different things, and the
    // settled semantics ask for the first and forbid the second.
    trail: [...model.trail, evidence],
    observedBy,
  });
}

export function applyAllPlayerEvidence(
  model: PlayerModel,
  evidence: readonly PlayerEvidence[],
): PlayerModel {
  return evidence.reduce(applyPlayerEvidence, model);
}

/**
 * How evenly a set of rival explanations is still split.
 *
 * One when nothing separates them; zero when one has taken all the belief.
 * Two explanations at 3 and 1 are 0.67 open; at 3 and 3 they are fully open.
 */
function opennessOf(
  hypotheses: Readonly<Record<string, HypothesisEstimate>>,
  keys: readonly string[],
): number {
  const beliefs = keys.map((key) => hypotheses[key]?.belief ?? 0);
  const total = beliefs.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || keys.length < 2) return 1;
  const highest = Math.max(...beliefs);
  const share = highest / total;
  const even = 1 / keys.length;
  // Rescaled so an even split reads as 1 and total dominance as 0.
  return clampPositiveUnit((1 - share) / (1 - even));
}

function refreshAmbiguityOpenness(model: PlayerModel): PlayerModel {
  return {
    ...model,
    ambiguities: model.ambiguities.map((entry) => ({
      ...entry,
      openness: opennessOf(model.hypotheses, entry.hypothesisKeys),
    })),
  };
}

/** An ambiguity is still worth resolving while its explanations are close. */
export const AMBIGUITY_LIVE_THRESHOLD = 0.35;

export function liveAmbiguities(model: PlayerModel): readonly LiveAmbiguity[] {
  return model.ambiguities.filter(
    (entry) => entry.openness >= AMBIGUITY_LIVE_THRESHOLD,
  );
}

/* -------------------------------------------------------------------------- */
/* Reading the model                                                           */
/* -------------------------------------------------------------------------- */

/**
 * How much weight makes an estimate worth acting on.
 *
 * At this much accumulated observation a dimension counts as half-known, so
 * salience rises quickly from the first real evidence and then flattens. It is
 * a smoothing constant, not a claim about anybody.
 */
const SALIENCE_HALF_WEIGHT = 1.2;

/**
 * How much this player appears to care about an axis, on [0, 1].
 *
 * Strength of view and amount of evidence, together. A strong reading from one
 * questionnaire answer is not the same as a strong reading from four things
 * somebody did, and the selector should not treat them alike.
 */
export function dimensionSalience(
  model: PlayerModel,
  dimension: PlayerModelDimension,
): number {
  const estimate = model.dimensions[dimension] ?? EMPTY_ESTIMATE;
  const confidence = estimate.weight / (estimate.weight + SALIENCE_HALF_WEIGHT);
  return clampPositiveUnit(Math.abs(estimate.mean) * confidence);
}

export function dimensionMean(
  model: PlayerModel,
  dimension: PlayerModelDimension,
): number {
  return model.dimensions[dimension]?.mean ?? 0;
}

export function dimensionWeight(
  model: PlayerModel,
  dimension: PlayerModelDimension,
): number {
  return model.dimensions[dimension]?.weight ?? 0;
}

/** Dimensions with the least observation, which is what coverage need means. */
export function coverageNeed(
  model: PlayerModel,
  dimension: PlayerModelDimension,
): number {
  return 1 / (1 + dimensionWeight(model, dimension));
}

/* -------------------------------------------------------------------------- */
/* Cross-pressure                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Two things this situation cannot both have.
 *
 * Authored beside the situation, because whether a moment genuinely opposes two
 * priorities is a fact about what the options are, not something a scorer can
 * work out from a list of dimensions. A situation that merely *mentions* two
 * axes is not cross-pressure; one where taking care of the first costs you the
 * second is.
 */
export interface InterestTension {
  readonly between: readonly [PlayerModelDimension, PlayerModelDimension];
  /** Which pole of each is the one under threat. */
  readonly poles: readonly [number, number];
  readonly note: string;
}

export interface CrossPressureReading {
  readonly strength: number;
  readonly tensions: readonly {
    readonly tension: InterestTension;
    readonly strength: number;
  }[];
}

/**
 * How hard this situation pulls in two directions at once, for this player.
 *
 * A tension only bites when the player has shown they care about both sides,
 * and cares about them in the direction the situation threatens. Somebody with
 * no observed view on either axis is not cross-pressured by it; they are just
 * being asked a question.
 */
export function crossPressure(
  model: PlayerModel,
  tensions: readonly InterestTension[],
): CrossPressureReading {
  const scored = tensions.map((tension) => {
    const [first, second] = tension.between;
    const [firstPole, secondPole] = tension.poles;
    const firstPull = alignedSalience(model, first, firstPole);
    const secondPull = alignedSalience(model, second, secondPole);
    // The weaker side is the score: a collision needs both halves, and one
    // strongly held priority beside an unobserved one is not a dilemma.
    return { tension, strength: Math.min(firstPull, secondPull) };
  });
  return {
    strength: scored.reduce(
      (highest, entry) => Math.max(highest, entry.strength),
      0,
    ),
    tensions: scored,
  };
}

/**
 * Salience, but only counted when the player leans the way the situation
 * threatens. Somebody who does not value keeping the ground firm is not
 * cross-pressured by being asked to give some of it up.
 */
function alignedSalience(
  model: PlayerModel,
  dimension: PlayerModelDimension,
  pole: number,
): number {
  const mean = dimensionMean(model, dimension);
  if (pole === 0 || Math.sign(mean) !== Math.sign(pole)) return 0;
  return dimensionSalience(model, dimension);
}

/**
 * How well a set of options would separate explanations that are still level.
 *
 * The question is not "what do I know least about" — that is coverage — but
 * "what would tell these two apart". An option set separates a pair when one
 * option is well explained by the first and poorly by the second, and another
 * option is the reverse.
 */
export function disambiguationValue(
  model: PlayerModel,
  optionHypotheses: readonly (readonly HypothesisSupport[])[],
): number {
  const open = liveAmbiguities(model);
  if (open.length === 0) return 0;
  let best = 0;
  for (const ambiguity of open) {
    for (const first of ambiguity.hypothesisKeys) {
      for (const second of ambiguity.hypothesisKeys) {
        if (first === second) continue;
        let separation = 0;
        for (const options of optionHypotheses) {
          const forFirst = supportFor(options, first);
          const forSecond = supportFor(options, second);
          separation = Math.max(separation, forFirst - forSecond);
        }
        best = Math.max(best, separation * ambiguity.openness);
      }
    }
  }
  return clampPositiveUnit(best);
}

function supportFor(
  supports: readonly HypothesisSupport[],
  key: string,
): number {
  return supports.find((entry) => entry.hypothesisKey === key)?.support ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Reporting, for tests and audits — never for the player                      */
/* -------------------------------------------------------------------------- */

export interface PlayerModelAudit {
  readonly dimension: PlayerModelDimension;
  readonly mean: number;
  readonly weight: number;
  readonly salience: number;
  readonly fromSetup: number;
  readonly fromGameplay: number;
}

/**
 * The model, written out.
 *
 * This exists for tests, for the completion report and for anybody who has to
 * answer "why did it offer me that". It is deliberately not a screen: the
 * settled semantics forbid telling a player what the game thinks they are, and
 * a diagnostic panel is exactly that with an apology attached.
 */
export function auditPlayerModel(
  model: PlayerModel,
): readonly PlayerModelAudit[] {
  return PLAYER_MODEL_DIMENSIONS.map((dimension) => {
    let fromSetup = 0;
    let fromGameplay = 0;
    for (const entry of model.trail) {
      if (!entry.nudges.some((nudge) => nudge.dimension === dimension)) {
        continue;
      }
      if (entry.strength === "setup") fromSetup += 1;
      else fromGameplay += 1;
    }
    return {
      dimension,
      mean: dimensionMean(model, dimension),
      weight: dimensionWeight(model, dimension),
      salience: dimensionSalience(model, dimension),
      fromSetup,
      fromGameplay,
    };
  });
}
