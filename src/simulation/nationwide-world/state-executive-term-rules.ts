import { makeIsoDate } from "../dates";
import type { IsoDate } from "../types";
import { isUsState } from "./state-executive-candidacy-packs";

/**
 * When a governor is elected, when the term begins and how long it runs, for
 * every state, with the basis of each value kept visible.
 *
 * Two classes of rule live here and are never mixed:
 *
 * - `verified`: compiled from an official source with its citation and an
 *   exact excerpt. Only these are real-world law.
 * - `game-profile`: the disclosed, versioned simulation rule the game uses
 *   where the real rule is not compiled. It lets the ordinary campaign-to-office
 *   loop run in every state. It is NOT a claim about that state's law, it is
 *   never copied from a neighboring state, and it is labelled wherever a
 *   player inspects the office.
 *
 * A RULES-admitted legal value, read through the rules-capability port, always
 * wins over both (see `state-executive-terms.ts`).
 */

export type TermCommencementRule =
  /** January 1 of the year after the election. */
  | { readonly kind: "january-first-following-election" }
  /**
   * The `ordinal`-th `weekday` (0 = Sunday) of January in the year after the
   * election, then `offsetDays` later. Washington's "Wednesday after the second
   * Monday of January" is ordinal 2, weekday 1, offset 2.
   */
  | {
      readonly kind: "january-weekday-following-election";
      readonly ordinal: 1 | 2 | 3 | 4;
      readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly offsetDays: number;
    };

export interface ElectionTimingRule {
  /** Regular elections recur every this many years. */
  readonly cycleYears: number;
  /** One year in which a regular election is held. */
  readonly referenceYear: number;
  /** The general election day within an election year. */
  readonly day: "first-tuesday-after-first-monday-in-november";
}

export interface TermRuleSource {
  readonly citation: string;
  readonly url: string;
  readonly excerpt: string;
  readonly retrievedAt: IsoDate;
  readonly note: string;
}

export type TermRuleBasis = "verified" | "game-profile";

export interface StateExecutiveTermRule {
  readonly stateUsps: string;
  readonly ruleVersion: string;
  /** Per field, because a state may have one verified fact and not another. */
  readonly basis: {
    readonly termYears: TermRuleBasis;
    readonly commencement: TermRuleBasis;
    readonly election: TermRuleBasis;
  };
  readonly termYears: number;
  readonly commencement: TermCommencementRule;
  readonly election: ElectionTimingRule;
  readonly sources: readonly TermRuleSource[];
}

/**
 * The game's disclosed state-executive profile.
 *
 * PROPOSED PARAMETERS, pending the director's confirmation: a four-year term,
 * regular elections in the cycle that contains 2026, a November general
 * election on the first Tuesday after the first Monday, and a term that begins
 * on the first Monday of January after the election. Changing any value means
 * a new version; saved terms keep the version they were planned under.
 */
export const STATE_EXECUTIVE_GAME_PROFILE_VERSION =
  "ocd-state-executive-game-profile/v1";

export const STATE_EXECUTIVE_GAME_PROFILE = {
  termYears: 4,
  commencement: {
    kind: "january-weekday-following-election",
    ordinal: 1,
    weekday: 1,
    offsetDays: 0,
  },
  election: {
    cycleYears: 4,
    referenceYear: 2026,
    day: "first-tuesday-after-first-monday-in-november",
  },
} as const satisfies Pick<
  StateExecutiveTermRule,
  "termYears" | "commencement" | "election"
>;

export const STATE_EXECUTIVE_GAME_PROFILE_NOTE =
  "This state's real term and election rules are not compiled into the game yet, so the office follows the game's own disclosed rule set: four-year terms, a November election every four years, and a term that begins on the first Monday of January.";

const WA_RETRIEVED = makeIsoDate("2026-09-16");

/** Verified rules. Each value cites the instrument it came from. */
const VERIFIED: Readonly<Record<string, StateExecutiveTermRule>> = {
  WA: {
    stateUsps: "WA",
    ruleVersion: "wa-governor-term/rcw-43.01.010+rcw-29A.04.321/2026-09-16",
    basis: {
      termYears: "verified",
      commencement: "verified",
      election: "verified",
    },
    termYears: 4,
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 1,
      offsetDays: 2,
    },
    election: {
      cycleYears: 4,
      referenceYear: 2024,
      day: "first-tuesday-after-first-monday-in-november",
    },
    sources: [
      {
        citation: "RCW 43.01.010",
        url: "https://app.leg.wa.gov/RCW/default.aspx?cite=43.01.010",
        excerpt:
          "The governor, … shall hold office for the term of four years, and until their successors are elected and qualified; and the term shall commence on the Wednesday after the second Monday of January following their election.",
        retrievedAt: WA_RETRIEVED,
        note: "History: 1965 c 8 s 43.01.010. Term length and commencement.",
      },
      {
        citation: "RCW 29A.04.321(1)",
        url: "https://app.leg.wa.gov/RCW/default.aspx?cite=29A.04.321",
        excerpt:
          "All state, county, city, town, and district general elections … shall be held on the first Tuesday after the first Monday of November",
        retrievedAt: WA_RETRIEVED,
        note: "History through 2015 c 146 s 1. General election day.",
      },
      {
        citation: "Kitsap County Auditor, 2024 Offices on the Ballot",
        url: "https://www.kitsap.gov/auditor/Pages/2024-Offices-on-the-Ballot.aspx",
        excerpt: "Governor … 4-year term",
        retrievedAt: WA_RETRIEVED,
        note: "County election office listing the governor on the 2024 general-election ballot; with the four-year term, regular elections fall every fourth year from 2024.",
      },
    ],
  },
};

export function stateExecutiveTermRule(
  stateUsps: string,
): StateExecutiveTermRule | null {
  if (!isUsState(stateUsps)) return null;
  return (
    VERIFIED[stateUsps] ?? {
      stateUsps,
      ruleVersion: STATE_EXECUTIVE_GAME_PROFILE_VERSION,
      basis: {
        termYears: "game-profile",
        commencement: "game-profile",
        election: "game-profile",
      },
      ...STATE_EXECUTIVE_GAME_PROFILE,
      sources: [],
    }
  );
}

export function isFullyVerified(rule: StateExecutiveTermRule): boolean {
  return Object.values(rule.basis).every((basis) => basis === "verified");
}

export function termRuleBasis(rule: StateExecutiveTermRule): TermRuleBasis {
  return rule.basis.termYears === "verified" &&
    rule.basis.commencement === "verified"
    ? "verified"
    : "game-profile";
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function iso(date: Date): IsoDate {
  return makeIsoDate(date.toISOString().slice(0, 10));
}

/**
 * The general election day in a given year: the Tuesday after the first
 * Monday of November. The rule's `day` names this; it is the only shape.
 */
export function generalElectionDay(
  _rule: ElectionTimingRule,
  year: number,
): IsoDate {
  const first = utcDate(year, 10, 1);
  const toMonday = (8 - first.getUTCDay()) % 7;
  return iso(utcDate(year, 10, 1 + toMonday + 1));
}

export function isElectionYear(
  rule: ElectionTimingRule,
  year: number,
): boolean {
  return (
    (((year - rule.referenceYear) % rule.cycleYears) + rule.cycleYears) %
      rule.cycleYears ===
    0
  );
}

/** The first regular general election on or after `onDate`. */
export function nextRegularElection(
  rule: StateExecutiveTermRule,
  onDate: IsoDate,
): IsoDate {
  let year = Number(onDate.slice(0, 4));
  while (!isElectionYear(rule.election, year)) year += 1;
  const day = generalElectionDay(rule.election, year);
  if (day >= onDate) return day;
  return generalElectionDay(rule.election, year + rule.election.cycleYears);
}

/** The commencement in the year after an election held on `electionDate`. */
export function commencementAfter(
  rule: TermCommencementRule,
  electionDate: IsoDate,
): IsoDate {
  const year = Number(electionDate.slice(0, 4)) + 1;
  if (rule.kind === "january-first-following-election")
    return makeIsoDate(`${year}-01-01`);
  const first = utcDate(year, 0, 1);
  const toWeekday = (rule.weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + toWeekday + (rule.ordinal - 1) * 7 + rule.offsetDays;
  return iso(utcDate(year, 0, day));
}

/** The commencement that falls in `year` under the rule. */
export function commencementInYear(
  rule: TermCommencementRule,
  year: number,
): IsoDate {
  return commencementAfter(rule, makeIsoDate(`${year - 1}-12-31`));
}

export interface PlannedTermDates {
  readonly startsAt: IsoDate;
  /** Exclusive: the next term's commencement under the same rule. */
  readonly endsAt: IsoDate;
}

/**
 * The term won at an election on `electionDate`: it begins at the first
 * commencement after the election and ends when the term `termYears` later
 * begins, under the same rule. Weekday rules therefore give real dates, not a
 * copied month and day.
 */
export function termDatesAfterElection(
  rule: StateExecutiveTermRule,
  electionDate: IsoDate,
): PlannedTermDates {
  const startsAt = commencementAfter(rule.commencement, electionDate);
  const startYear = Number(startsAt.slice(0, 4));
  return {
    startsAt,
    endsAt: commencementInYear(rule.commencement, startYear + rule.termYears),
  };
}

/**
 * The regular term in progress on a date, for an office whose holder did not
 * come from a recorded election (an opening incumbent).
 */
export function regularTermWindowOn(
  rule: StateExecutiveTermRule,
  onDate: IsoDate,
): PlannedTermDates {
  let year = Number(onDate.slice(0, 4));
  for (let guard = 0; guard < 16; guard += 1, year -= 1) {
    if (!isElectionYear(rule.election, year)) continue;
    const election = generalElectionDay(rule.election, year);
    const dates = termDatesAfterElection(rule, election);
    if (dates.startsAt <= onDate) return dates;
  }
  throw new Error(`No regular term found for ${rule.stateUsps} on ${onDate}.`);
}
