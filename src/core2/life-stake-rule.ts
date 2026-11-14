/**
 * The rule of the views engine's life term, pure: what a person's recorded
 * circumstances add to their stance on a policy question, each measured
 * against the nation's average (`src/core2/data/views/stakes.json`) and weighed by how
 * much the person weighs their own stake. The facts are read in
 * `src/core2/life-stakes.ts`; this file holds only the rule, so the campaigns' stance
 * reader can use it without the engines' readers.
 */
import stakesJson from "./data/views/stakes.json" with { type: "json" };

/** The circumstances a stance reads, each a number (a counted household's may be a share). */
export interface LifeFacts {
  readonly rents: number;
  readonly incomeFifth: number;
  readonly noWork: number;
  readonly noPrivatePlan: number;
  readonly youngChild: number;
  readonly publicWorker: number;
}
export type LifeFact = keyof LifeFacts;

/** A person's facts and how much they weigh their own stake (1 at the middle of the traits). */
export interface LifeStake {
  readonly facts: LifeFacts;
  readonly care: number;
}

interface Valued {
  readonly value: number;
}
export const DATA = stakesJson as unknown as {
  careDecision: string;
  ages: Record<"workingFrom" | "workingTo" | "youngChildUnder", Valued>;
  facts: Record<LifeFact, { reference: Valued }>;
  stakes: Record<string, Partial<Record<LifeFact, Valued>>>;
};

const FACTS = Object.keys(DATA.facts) as LifeFact[];
export const reference = (fact: LifeFact): number =>
  DATA.facts[fact].reference.value;

/** The age band whose work and health plan are read (18 to 64); others sit at the nation's average. */
export const WORKING_FROM = DATA.ages.workingFrom.value;
export const WORKING_TO = DATA.ages.workingTo.value;
export const YOUNG_CHILD_UNDER = DATA.ages.youngChildUnder.value;

/** One part of a stance's life term: the fact, where the person stands on it, and what it adds. */
export interface StakeReason {
  readonly fact: LifeFact;
  readonly value: number;
  readonly reference: number;
  readonly size: number;
  readonly adds: number;
}

/** What each of a person's circumstances adds to their stance on a question, for the ones that bear on it. */
export function stakeReasons(
  stake: LifeStake | null | undefined,
  question: string,
): StakeReason[] {
  const row = DATA.stakes[question];
  if (!row || !stake) return [];
  const out: StakeReason[] = [];
  for (const fact of FACTS) {
    const size = row[fact]?.value;
    if (size === undefined) continue;
    const value = stake.facts[fact];
    out.push({
      fact,
      value,
      reference: reference(fact),
      size,
      adds: stake.care * size * (value - reference(fact)),
    });
  }
  return out;
}

/** What a person's circumstances add to their stance on a question, on the views scale. */
export function stakeShift(
  stake: LifeStake | null | undefined,
  question: string,
): number {
  const row = DATA.stakes[question];
  if (!row || !stake) return 0;
  let sum = 0;
  for (const fact of FACTS) {
    const size = row[fact]?.value;
    if (size !== undefined) sum += size * (stake.facts[fact] - reference(fact));
  }
  return stake.care * sum;
}

/** Whether any recorded circumstance bears on a question. */
export function hasStake(question: string): boolean {
  return DATA.stakes[question] !== undefined;
}
