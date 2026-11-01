/**
 * Whether a voter turns out (owner, Oct 14, 2026): a sliding propensity from
 * causes, never a coin. One function for every voter the game counts, named
 * or counted, in the town or in a place counted from afar:
 *
 * - readiness apart from the race: their sense of duty and how closely they
 *   follow politics, against what voting costs them that day (their work
 *   hours and the election laws in force, the cycle's lower salience);
 * - the race's stakes for them: how much separates the candidates in their
 *   own eyes, on every race on the ballot that day;
 * - the campaign's reach: how many times a campaign reached them this cycle;
 * - habit: their own record of voting or staying home.
 *
 * The propensity is the logistic of their sum, so it slides: nothing flips a
 * voter from never to always. A counted resident stands for the town's people
 * like them, so their vote counts at their propensity. A named person's act is
 * one vote: they turn out in the share of elections their propensity says, in
 * the order their own record carries (`namedTurnout`), so the same person in
 * the same circumstances does the same thing and nothing is rolled.
 */
import { campaignParameter } from "./campaign-views";

/** The parts of one voter's turnout, as numbers the English engine words. */
export interface TurnoutParts {
  /** Duty, reliability, the trait lean and engagement. */
  readonly duty: number;
  /** How much the day's races matter to them. */
  readonly stakes: number;
  /** What the campaigns' contacts add. */
  readonly reach: number;
  /** Their own record of voting. */
  readonly habit: number;
  /** Work hours and the election laws in force, the cycle's salience. */
  readonly cost: number;
  /** Their own word at a campaign's door that they would vote, as far as it still holds. */
  readonly pledge?: number;
}

/** A voter's reason to vote apart from the race, on the turnout scale. */
export function readinessOf(parts: Omit<TurnoutParts, "stakes">): number {
  return (
    campaignParameter("turnoutBase") +
    parts.duty +
    parts.reach +
    parts.habit +
    (parts.pledge ?? 0) -
    parts.cost
  );
}

/**
 * How much a race matters to a voter: the gap between the candidate they rank
 * first and the next (a lone candidate: how far they are for or against
 * them). Two candidates they like or dislike alike leave nothing at stake.
 */
export function interestOf(
  appeal: Readonly<Record<string, { readonly total: number }>>,
): number {
  let first = -Infinity,
    second = -Infinity;
  for (const a of Object.values(appeal)) {
    if (a.total > first) {
      second = first;
      first = a.total;
    } else if (a.total > second) second = a.total;
  }
  if (first === -Infinity) return 0;
  return second === -Infinity ? Math.abs(first) : first - second;
}

/** What a race's appeal gap adds: the stakes, rising with the gap and leveling off. */
export function stakesOf(interest: number): number {
  return campaignParameter("turnoutStakesWeight") * Math.tanh(interest);
}

/**
 * The share of people like this voter who turn out, from their readiness and
 * how much the day's races matter to them (the gap between the candidates in
 * their own eyes). The one turnout rule for every voter.
 */
export function turnoutShare(readiness: number, interest: number): number {
  const z = readiness + stakesOf(interest);
  return 1 / (1 + Math.exp(-z / campaignParameter("turnoutScale")));
}

/** The propensity from all of a voter's parts. */
export function propensityOf(parts: TurnoutParts): number {
  return 1 / (1 + Math.exp(-zOf(parts) / campaignParameter("turnoutScale")));
}

function zOf(parts: TurnoutParts): number {
  return readinessOf(parts) + parts.stakes;
}

/**
 * What the campaigns' contacts add to a voter's reason to vote: rising with
 * each contact and leveling off (a door, a call, a mailer, a speech heard).
 */
export function reachOf(contacts: number): number {
  return (
    campaignParameter("turnoutReachWeight") *
    (1 - Math.exp(-contacts / campaignParameter("turnoutReachContacts")))
  );
}

/**
 * What a voter's own record adds: the share of their past elections they
 * voted in, against an even record, weighted by how long the record is.
 */
export function habitOf(voted: number, elections: number): number {
  if (elections <= 0) return 0;
  const familiarity = campaignParameter("turnoutHabitFamiliarity");
  return (
    campaignParameter("turnoutHabitWeight") *
    (voted / elections - 0.5) *
    (elections / (elections + familiarity))
  );
}

/**
 * A named person's act on one election day: their carry (what their record
 * owes from earlier elections, starting even) plus their propensity today;
 * they vote when the carry reaches a whole vote, which they then spend. Over
 * their elections they vote in the share their propensities say, the order
 * set by their own record. Returns whether they vote and the carry they keep.
 */
export function namedTurnout(
  carry: number,
  propensity: number,
): { readonly votes: boolean; readonly carry: number } {
  const owed = carry + propensity;
  return owed >= 1
    ? { votes: true, carry: owed - 1 }
    : { votes: false, carry: owed };
}

/** The carry a campaign's door answers start with: even. */
export const OPENING_CARRY = 0.5;

/**
 * The carry a named voter starts with, before any election in play: a point of
 * their own record spread evenly over the electorate, from their id (seeded
 * generation of the starting record, as a person's starting lean is). Every
 * start at the same carry would make a first election turn out only those
 * whose propensity alone reaches a whole vote, so a town whose voters all sit
 * under one half would have no named turnout at all (Troy, Vermont, seed
 * 30d6e503...: 56 voters at 0.006 to 0.16). Spread over zero to one, the share
 * who vote in a first election is the share their propensities say, and each
 * voter's act is still decided by their own propensity and record.
 */
export function openingVoterCarry(voterId: string): number {
  let h = 2166136261;
  for (let i = 0; i < voterId.length; i++) {
    h ^= voterId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Finish with an avalanche so ids that differ in a few characters start far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
