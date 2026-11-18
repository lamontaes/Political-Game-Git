/**
 * The rule of the views engine's life term, pure: what a person's recorded
 * circumstances add to their stance on a policy question, each measured
 * against the world's own share over the same people (`stakeReferences` in
 * `src/core2/life-stakes.ts`, carried on the stake) and weighed by how much
 * the person weighs their own stake; the sizes are
 * `src/core2/data/views/stakes.json`. The facts are read in
 * `src/core2/life-stakes.ts`; this file holds only the rule, so the campaigns'
 * stance reader can use it without the engines' readers.
 */
import stakesJson from "./data/views/stakes.json" with { type: "json" };

/**
 * The circumstances a stance reads, each a number (a counted household's may
 * be a share), or null where the records do not hold it (a life the engines
 * keep no records for, or an age the fact is not read at): a null fact adds
 * nothing.
 */
export interface LifeFacts {
  readonly rents: number | null;
  readonly incomeFifth: number | null;
  readonly noWork: number | null;
  readonly noPrivatePlan: number | null;
  readonly youngChild: number | null;
  readonly publicWorker: number | null;
}
export type LifeFact = keyof LifeFacts;

/** Each fact's world share (or mean) over the people the stance counts: what a person's own fact is measured against. */
export type StakeReference = Readonly<Record<LifeFact, number>>;

/** A person's facts, how much they weigh their own stake (1 at the middle of the traits), and the world's reference they are measured against. */
export interface LifeStake {
  readonly facts: LifeFacts;
  readonly care: number;
  readonly reference: StakeReference;
}

interface Valued {
  readonly value: number;
}
export const DATA = stakesJson as unknown as {
  careDecision: string;
  lifeEvents: { kinds: readonly string[] };
  ages: Record<"workingFrom" | "workingTo" | "youngChildUnder", Valued>;
  facts: Record<LifeFact, { about: string }>;
  stakes: Record<string, Partial<Record<LifeFact, Valued>>>;
};

/** The events on which a full person's changed circumstances are told the same day. */
export const LIFE_EVENT_KINDS: ReadonlySet<string> = new Set(
  DATA.lifeEvents.kinds,
);

export const LIFE_FACTS = Object.keys(DATA.facts) as LifeFact[];
const FACTS = LIFE_FACTS;

/** The age band whose work and health plan are read (18 to 64); others hold no such fact. */
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
    const value = stake.facts[fact];
    if (size === undefined || value === null) continue;
    const reference = stake.reference[fact];
    out.push({
      fact,
      value,
      reference,
      size,
      adds: stake.care * size * (value - reference),
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
    const value = stake.facts[fact];
    if (size !== undefined && value !== null)
      sum += size * (value - stake.reference[fact]);
  }
  return stake.care * sum;
}

/** Whether any recorded circumstance bears on a question. */
export function hasStake(question: string): boolean {
  return DATA.stakes[question] !== undefined;
}

/** The facts in which two readings of a person's circumstances differ. */
export function changedFacts(before: LifeFacts, after: LifeFacts): LifeFact[] {
  return FACTS.filter((fact) => before[fact] !== after[fact]);
}

/** The questions any of these facts bears on, in the table's order. */
export function questionsReading(facts: readonly LifeFact[]): string[] {
  if (!facts.length) return [];
  return Object.keys(DATA.stakes).filter((question) =>
    facts.some((fact) => DATA.stakes[question]![fact] !== undefined),
  );
}
