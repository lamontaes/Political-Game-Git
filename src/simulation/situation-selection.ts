import type { LifeStakesTier } from "./adult-situations";
import {
  crossPressure,
  type CrossPressureReading,
  type InterestTension,
  type PlayerModel,
} from "./player-model";
import { lowestDigestFirst, sha256Hex } from "./sha256";
import { canonicalPriorEncoding, setupPriorsOf } from "./setup-priors";
import type { LifeSituationBand, LifeSituationKey, World } from "./types";

/**
 * The seed the adaptive layer orders by.
 *
 * World seed and priors together, hashed. Both halves matter and neither may
 * leak into the other: a world built from the same setup is the same world
 * whatever was answered, and two players who built the same world but answered
 * differently should not be walked through the same sequence in the same order.
 * Deriving one ordering seed from both gets that, and because it is derived
 * *here* rather than folded into `world.seed`, it never reaches a generator —
 * so a political answer still cannot change who anybody's family is.
 */
export function adaptiveSelectionSeed(world: World): string {
  return sha256Hex(
    `adaptive-selection ${world.seed} ${canonicalPriorEncoding(setupPriorsOf(world))}`,
  );
}

/**
 * Which of the possible situations comes next.
 *
 * This replaces a uniform pick over the eligible pool. It is a *ranking* layer
 * and nothing else: it does not decide eligibility, which the providers already
 * did; it does not resolve anything, which the domain engines do; and it does
 * not schedule a consequence, which is decided elsewhere from world state and
 * from nothing here.
 *
 * The order of the stages is doc 90's, in its words:
 *
 *   hard eligibility → causal availability → current relevance →
 *   conflict strength → novelty guard → pacing guard →
 *   deterministic seeded selection
 *
 * The first two happen before a candidate reaches this function; a situation
 * that is not eligible and does not have its context in the world is not a
 * candidate at all. What is left is the four stages that need a player model,
 * and a tie-break that needs a seed.
 *
 * The forbidden list is doc 90's too, and worth restating where the code is:
 * no hidden target win rate, no altered rules or geography to create drama, no
 * NPC knowledge that was not earned in world state, no fabricated prerequisite,
 * no lowering anybody's odds because they have been doing well. This layer
 * picks the question. It never touches the answer.
 */

/* -------------------------------------------------------------------------- */
/* What the selector is given                                                  */
/* -------------------------------------------------------------------------- */

export interface SituationCandidate {
  readonly key: LifeSituationKey;
  readonly band: LifeSituationBand;
  /** Internal rationing tier. Never rendered, never a consequence input. */
  readonly stakes: LifeStakesTier;
  /** Which of the player's own priorities this puts against each other. */
  readonly tensions: readonly InterestTension[];
  /** How much this matters to this life now, read from world state. On [0, 1]. */
  readonly relevance: number;
  /** True when this situation only became possible because of something played. */
  readonly followsFromHistory: boolean;
}

export interface SituationSelectionInput {
  /**
   * Deterministic and derived from the world seed and the persisted priors.
   * It decides ordering only; it never reaches a generator, so it cannot
   * change who anybody's family is.
   */
  readonly selectionSeed: string;
  readonly personKey: string;
  /** How many situations this life has already played. */
  readonly ordinal: number;
  readonly model: PlayerModel;
  readonly candidates: readonly SituationCandidate[];
  /** The last few keys, newest last, for the novelty guard. */
  readonly recentKeys: readonly LifeSituationKey[];
  /** The last few tiers, newest last, for the pacing guard. */
  readonly recentStakes: readonly LifeStakesTier[];
}

/**
 * Why the selector chose this one, in its own terms.
 *
 * Recorded for tests, for audits and for the completion report. It is never
 * rendered and — this is the load-bearing part — it is never passed to
 * anything that decides consequence. A situation chosen because it collided
 * two priorities must be no more likely to matter than one chosen because
 * nothing else was available.
 */
export type SituationSelectionReason =
  | "only-candidate"
  | "cross-pressure"
  | "current-relevance"
  | "follows-from-history"
  | "pacing-relief";

export interface SituationScoreComponents {
  readonly relevance: number;
  readonly crossPressure: number;
  readonly continuity: number;
  readonly noveltyPenalty: number;
  readonly pacingPenalty: number;
  readonly total: number;
}

export interface RankedSituation {
  readonly candidate: SituationCandidate;
  readonly components: SituationScoreComponents;
  readonly pressure: CrossPressureReading;
  readonly tieBreakDigest: string;
}

export interface SituationSelection {
  readonly chosen: RankedSituation;
  readonly reason: SituationSelectionReason;
  readonly ranked: readonly RankedSituation[];
}

/* -------------------------------------------------------------------------- */
/* Weights                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What each stage is worth.
 *
 * Cross-pressure outweighs bare relevance, because a situation that puts two
 * things a player has shown they care about into collision is the thing this
 * wave exists to find. Continuity — a situation only reachable because of
 * something the player did earlier — is worth a little, because a life that
 * refers back to itself reads as a life.
 *
 * These are design weights and are not claims about anything. They are
 * deliberately few and deliberately flat, so that reading a ranking is
 * possible.
 */
export const CROSS_PRESSURE_WEIGHT = 1.4;
export const RELEVANCE_WEIGHT = 1;
export const CONTINUITY_WEIGHT = 0.35;

/** A repeat of something recent is worth much less, and never zero. */
export const NOVELTY_PENALTY = 0.7;
/** How far back the novelty guard looks. */
export const NOVELTY_WINDOW = 3;

/**
 * What the pacing guard is protecting.
 *
 * Two things at once. A run of hard moments makes the next hard moment cost
 * nothing, so a demanding situation is penalised when the recent run has been
 * demanding. And a long run of nothing makes a life feel like it is not
 * happening, so an ordinary situation is penalised — much more gently — when
 * everything recent has already been ordinary.
 *
 * This is why the stakes tier exists at all. It says how much a moment asks of
 * the player, which is a statement about the moment; it says nothing about what
 * will come of it, and the two are allowed to disagree completely.
 */
export const PACING_PENALTY = 1.2;
export const MONOTONY_PENALTY = 0.45;
export const PACING_WINDOW = 3;

const TIE_TOLERANCE = 1e-9;

const STAKES_LOAD: Readonly<Record<LifeStakesTier, number>> = {
  ordinary: 0,
  notable: 0.5,
  pressing: 1,
};

/* -------------------------------------------------------------------------- */
/* Ranking                                                                     */
/* -------------------------------------------------------------------------- */

export function rankSituations(
  input: SituationSelectionInput,
): readonly RankedSituation[] {
  const recentLoad = averageStakesLoad(input.recentStakes);
  const recent = new Set(input.recentKeys.slice(-NOVELTY_WINDOW));
  return input.candidates.map((candidate) => {
    const pressure = crossPressure(input.model, candidate.tensions);
    const relevance = RELEVANCE_WEIGHT * clampUnit(candidate.relevance);
    const collision = CROSS_PRESSURE_WEIGHT * pressure.strength;
    const continuity = candidate.followsFromHistory ? CONTINUITY_WEIGHT : 0;
    const noveltyPenalty = recent.has(candidate.key) ? NOVELTY_PENALTY : 0;
    const pacingPenalty = pacingPenaltyFor(candidate.stakes, recentLoad);
    return {
      candidate,
      pressure,
      components: {
        relevance,
        crossPressure: collision,
        continuity,
        noveltyPenalty,
        pacingPenalty,
        total:
          relevance + collision + continuity - noveltyPenalty - pacingPenalty,
      },
      tieBreakDigest: sha256Hex(
        situationTieBreakMaterial(input, candidate.key),
      ),
    };
  });
}

/**
 * The one to offer, or null when there is nothing to offer — which happens,
 * and is allowed to happen, because a week in which nothing worth deciding
 * comes up is a real week.
 */
export function selectSituation(
  input: SituationSelectionInput,
): SituationSelection | null {
  const ranked = rankSituations(input);
  if (ranked.length === 0) return null;
  const chosen = pickBest(ranked, (entry) => entry.components.total);
  return { chosen, reason: reasonFor(chosen, ranked, input), ranked };
}

function pickBest(
  ranked: readonly RankedSituation[],
  score: (entry: RankedSituation) => number,
): RankedSituation {
  return ranked.reduce((leader, candidate) => {
    const difference = score(candidate) - score(leader);
    if (difference > TIE_TOLERANCE) return candidate;
    if (difference < -TIE_TOLERANCE) return leader;
    return lowestDigestFirst(candidate.tieBreakDigest, leader.tieBreakDigest) <
      0
      ? candidate
      : leader;
  });
}

/**
 * Which stage actually decided it.
 *
 * Asked by removing a term and seeing whether the winner changes, rather than
 * by comparing magnitudes. Comparing magnitudes answers a different and much
 * less useful question: relevance is numerically larger than cross-pressure
 * for most of a life, and the interesting fact is not "which number is bigger"
 * but "would this have been chosen without it".
 */
function reasonFor(
  chosen: RankedSituation,
  ranked: readonly RankedSituation[],
  input: SituationSelectionInput,
): SituationSelectionReason {
  if (ranked.length === 1) return "only-candidate";
  if (
    chosen.components.crossPressure > 0 &&
    !winsWithout(ranked, chosen, (entry) => entry.components.crossPressure)
  ) {
    return "cross-pressure";
  }
  if (
    chosen.components.continuity > 0 &&
    !winsWithout(ranked, chosen, (entry) => entry.components.continuity)
  ) {
    return "follows-from-history";
  }
  if (
    chosen.components.pacingPenalty === 0 &&
    averageStakesLoad(input.recentStakes) >= 0.75
  ) {
    return "pacing-relief";
  }
  return "current-relevance";
}

/**
 * Whether this candidate would still have won outright without one term.
 *
 * "Outright" rather than "at all", because a tie broken by the digest is not a
 * win on the merits: if removing cross-pressure leaves the chosen situation
 * merely level with another, then cross-pressure is what actually decided it,
 * and saying otherwise would understate the term every time the field is flat.
 */
function winsWithout(
  ranked: readonly RankedSituation[],
  chosen: RankedSituation,
  term: (entry: RankedSituation) => number,
): boolean {
  const chosenScore = chosen.components.total - term(chosen);
  return ranked.every(
    (entry) =>
      entry.candidate.key === chosen.candidate.key ||
      entry.components.total - term(entry) < chosenScore - TIE_TOLERANCE,
  );
}

function pacingPenaltyFor(stakes: LifeStakesTier, recentLoad: number): number {
  const load = STAKES_LOAD[stakes];
  if (recentLoad >= 0.6) {
    // Recently demanding. A demanding candidate pays for it.
    return PACING_PENALTY * load * recentLoad;
  }
  if (recentLoad <= 0.15) {
    // Recently quiet. An ordinary candidate pays a smaller price, so a life
    // does not settle permanently into the undemanding end.
    return MONOTONY_PENALTY * (1 - load);
  }
  return 0;
}

function averageStakesLoad(recent: readonly LifeStakesTier[]): number {
  const recentWindow = recent.slice(-PACING_WINDOW);
  if (recentWindow.length === 0) return 0.3;
  return (
    recentWindow.reduce((sum, tier) => sum + STAKES_LOAD[tier], 0) /
    recentWindow.length
  );
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The exact material the situation tie-break hashes.
 *
 * Named, like the questionnaire's, because it is a contract: change it and
 * every existing world tells a different story in a different order.
 */
export function situationTieBreakMaterial(
  input: Pick<
    SituationSelectionInput,
    "selectionSeed" | "personKey" | "ordinal"
  >,
  key: LifeSituationKey,
): string {
  return [
    "situation-tie-break",
    input.selectionSeed,
    input.personKey,
    String(input.ordinal),
    key,
  ].join(" ");
}
