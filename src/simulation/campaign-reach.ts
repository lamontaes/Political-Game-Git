import { SeededRng } from "./rng";

/**
 * What a piece of campaign work actually does to a contest. PROPOSAL.
 *
 * Nothing in the shipped campaign calls this yet. It is here to be argued
 * with: the shape of the causal chain is the proposal, and every number in
 * PROVISIONAL below is a placeholder awaiting the module-level review that
 * owns campaign response ranges. Reading a constant here as settled balance
 * would be reading it wrong.
 *
 * The model it replaces asked for a share of the contest directly: minutes
 * times participants times a fixed rate, widened by a seeded swing. That
 * function never learns how many people live in the place, so ninety minutes
 * with two people asks for the same 1.62 to 3.78 points of a village and of a
 * city, and measured across four contrasting places at five effort levels the
 * curves are indistinguishable. Lowering the coefficient would move every
 * curve together and leave them identical to each other, which is the actual
 * defect.
 *
 * So the chain here is:
 *
 *   time and people    ->  contact attempts
 *   contact attempts   ->  people actually reached, minus those reached before
 *   people reached     ->  people who changed their minds, which can be none
 *   people changed     ->  a share of the electorate, which is a real divisor
 *
 * Each arrow can fail on its own. Staff competence changes how many attempts
 * become contacts and how good the campaign's information is; it never buys
 * votes. A second afternoon in the same neighbourhood mostly meets people the
 * campaign already met. Persuasion is a draw that can come back at zero, and
 * its low end is slightly below zero because being heard is not the same as
 * being persuaded — a campaign can leave a door worse off than it found it.
 *
 * And the last arrow needs a number the game does not yet have. Where the
 * electorate is unknown the model says so and refuses to convert reach into a
 * share, rather than dividing by a guess: the work is still recorded, and the
 * caller decides what to do with an unknown. Unknown is not zero and it is not
 * permission.
 */

/**
 * Every number here is provisional and none is a finding. They are grouped so
 * a reviewer can change them in one place and re-run the contrasting-situation
 * tests, which assert relationships between situations and never a magnitude.
 */
export const PROVISIONAL = {
  /** Doors or calls one person can attempt in an hour of field work. */
  CONTACT_ATTEMPTS_PER_WORKER_HOUR: 12,
  /** How much of an attempt reaches a person at all: nobody home, no answer. */
  CONTACT_RATE_RANGE: [0.2, 0.45] as const,
  /** What competent staff change: execution, not persuasion. */
  EXECUTION_QUALITY_RANGE: [0.6, 1.15] as const,
  /**
   * Net share of reached people who move toward the campaign. The low end is
   * below zero on purpose: a bad conversation is a real outcome.
   */
  NET_PERSUASION_RANGE: [-0.01, 0.06] as const,
  /** A repeat contact is worth this much of a first one, not nothing. */
  REPEAT_CONTACT_WEIGHT: 0.25,
  /** Money reaches people too, at a worse rate per person than a door. */
  ADVERTISING_IMPRESSIONS_PER_MINOR_UNIT: 0.02,
  /** An advertising impression persuades far less often than a conversation. */
  ADVERTISING_PERSUASION_SCALE: 0.08,
} as const;

import type { PlaceDemographyReadModel } from "./place-demography";

/**
 * The electorate input, read from the world's own demography model. PROPOSAL.
 *
 * This is the one seam that decides unknown-versus-known, and it defers to the
 * reader that already exists: if `readPlaceDemography` has no population — a
 * county headcount standing in for a city, a place with no series, a split
 * geography — the electorate is unknown here too. It never substitutes a
 * county or metro number the demography reader itself refused, and it never
 * treats a population as an electorate: it carries the population through and
 * marks that the eligible share is not recorded.
 */
export function electorateFromDemography(
  demography: PlaceDemographyReadModel,
): ElectorateSize {
  const population = demography.population;
  if (population === null) {
    const reason =
      demography.omissions
        .filter((omission) => omission.field === "population")
        .map((omission) => omission.reason)
        .join(", ") || "no recorded place population";
    return { kind: "unknown", reason };
  }
  return {
    kind: "from-recorded-population",
    people: population.people,
    geographyName: population.geographyName,
    period: population.period,
    eligibleShareIsUnknown: true,
  };
}

/** Support is carried in basis points of one, so ten thousand is everybody. */
const BASIS_POINTS = 10_000;

export type ElectorateSize =
  | {
      readonly kind: "from-recorded-population";
      readonly people: number;
      readonly geographyName: string;
      readonly period: string;
      /**
       * A population is not an electorate. Whoever supplies this has said only
       * how many people live there; how many of them may vote is a separate
       * fact the world does not hold.
       */
      readonly eligibleShareIsUnknown: true;
    }
  | { readonly kind: "unknown"; readonly reason: string };

export interface CampaignWorkInput {
  /** What the work was: a conversation, or a buy. */
  readonly kind: "outreach" | "advertising";
  readonly minutes: number;
  readonly workers: number;
  /** 0 to 1, provisional scale; the world's own staff records supply it. */
  readonly staffCompetence: number;
  readonly plannedSpendMinorUnits?: number;
  /** How many distinct people this campaign has already reached here. */
  readonly peopleAlreadyReached: number;
  readonly electorate: ElectorateSize;
  /** Stable per-action seed; the same action always resolves the same way. */
  readonly seed: string;
}

export interface CampaignWorkOutcome {
  readonly contactAttempts: number;
  readonly peopleReached: number;
  readonly peopleReachedForTheFirstTime: number;
  readonly peopleReachedAgain: number;
  readonly netPeoplePersuaded: number;
  /**
   * Null where the electorate is unknown. A null is the model declining to
   * divide by a number nobody has supplied, not an effect of zero.
   */
  readonly supportChangeBasisPoints: number | null;
  /** What the model could not establish, in the words a reviewer needs. */
  readonly unknowns: readonly string[];
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function drawInRange(rng: SeededRng, range: readonly [number, number]): number {
  return range[0] + rng.next() * (range[1] - range[0]);
}

/**
 * One piece of campaign work, resolved.
 *
 * Deterministic in `seed`: the same action resolves the same way however often
 * it is read, so a field memo re-read is not a second sample.
 */
export function resolveCampaignWork(
  input: CampaignWorkInput,
): CampaignWorkOutcome {
  const unknowns: string[] = [];
  const rng = new SeededRng(input.seed);
  const competence = clamp(input.staffCompetence, 0, 1);
  const execution =
    drawInRange(rng, PROVISIONAL.EXECUTION_QUALITY_RANGE) *
    (0.5 + competence / 2);

  const attempts =
    input.kind === "advertising"
      ? Math.floor(
          (input.plannedSpendMinorUnits ?? 0) *
            PROVISIONAL.ADVERTISING_IMPRESSIONS_PER_MINOR_UNIT,
        )
      : Math.floor(
          (Math.max(0, input.minutes) / 60) *
            Math.max(0, input.workers) *
            PROVISIONAL.CONTACT_ATTEMPTS_PER_WORKER_HOUR *
            execution,
        );

  const contactRate =
    input.kind === "advertising"
      ? 1
      : drawInRange(rng, PROVISIONAL.CONTACT_RATE_RANGE);
  let reached = Math.floor(attempts * contactRate);

  if (input.electorate.kind === "unknown") {
    unknowns.push(
      `The electorate for this contest is unknown (${input.electorate.reason}), so the people reached cannot be stated as a share of it.`,
    );
    return {
      contactAttempts: attempts,
      peopleReached: reached,
      peopleReachedForTheFirstTime: reached,
      peopleReachedAgain: 0,
      netPeoplePersuaded: 0,
      supportChangeBasisPoints: null,
      unknowns,
    };
  }

  const electorate = Math.max(1, Math.floor(input.electorate.people));
  unknowns.push(
    `${input.electorate.geographyName} is recorded as ${electorate} people in ${input.electorate.period}. How many of them may vote is not recorded, so this stands in for the electorate and is not one.`,
  );

  const alreadyReached = clamp(input.peopleAlreadyReached, 0, electorate);
  reached = Math.min(reached, electorate);
  // Saturation: work in a place the campaign has already worked mostly meets
  // people it has already met. This is where a second afternoon stops being
  // worth as much as the first, without any explicit diminishing-returns term.
  const freshShare = 1 - alreadyReached / electorate;
  const firstTime = Math.floor(reached * freshShare);
  const again = reached - firstTime;

  const persuasionRate =
    drawInRange(rng, PROVISIONAL.NET_PERSUASION_RANGE) *
    (input.kind === "advertising"
      ? PROVISIONAL.ADVERTISING_PERSUASION_SCALE
      : 1);
  const effectivePeople = firstTime + again * PROVISIONAL.REPEAT_CONTACT_WEIGHT;
  const persuaded = Math.round(effectivePeople * persuasionRate);

  return {
    contactAttempts: attempts,
    peopleReached: reached,
    peopleReachedForTheFirstTime: firstTime,
    peopleReachedAgain: again,
    netPeoplePersuaded: persuaded,
    // The whole point of the chain: the same work is a large share of a small
    // place and a rounding error in a large one.
    supportChangeBasisPoints: Math.round(
      (persuaded * BASIS_POINTS) / electorate,
    ),
    unknowns,
  };
}
