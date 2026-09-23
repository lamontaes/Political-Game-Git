import { chiefExecutiveElectionCycle } from "./chief-executive-election-cycles";
import { makeIsoDate } from "../dates";
import type { IsoDate } from "../types";
import {
  chiefExecutiveBaseline,
  chiefExecutiveBaselineDisclosure,
} from "./chief-executive-baseline";
import type { ChiefExecutiveBaselineRow } from "./chief-executive-baseline";
import { isDistrictOfColumbia } from "./district-of-columbia-identity";
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
 * A game profile may be CALIBRATED by the NATIONWIDE1 research baseline: the
 * term length comes from research that was actually checked for that
 * jurisdiction, so New Hampshire and Vermont run two years instead of
 * inheriting a four-year default nobody read. Calibration does not promote a
 * rule to `verified`. The basis stays `game-profile`, the research travels with
 * the rule as `calibration`, and the sentence the player reads says which was
 * read and which was not.
 *
 * A RULES-admitted legal value, read through the rules-capability port, always
 * wins over both (see `state-executive-terms.ts`).
 */

export type TermCommencementRule =
  /** January 1 of the year after the election. */
  | { readonly kind: "january-first-following-election" }
  /**
   * A fixed day of January in the year after the election, whatever weekday it
   * falls on. The District's Mayor takes office on January 2nd; a rule that
   * only knew how to count weekdays would have had to round that to something
   * the instrument does not say.
   */
  | {
      readonly kind: "january-fixed-day-following-election";
      readonly day: number;
    }
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

/**
 * The researched value a game profile was calibrated from. Evidence, kept
 * beside the operative rule and never mistaken for it.
 */
export interface TermRuleCalibration {
  readonly field: "termYears";
  readonly row: ChiefExecutiveBaselineRow;
  readonly disclosure: string;
}

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
  /** Present only where research set a parameter of the game profile. */
  readonly calibration: TermRuleCalibration | null;
}

/**
 * The game's disclosed state-executive profile.
 *
 * PROVISIONAL PARAMETERS, awaiting SOURCED RULES rather than anyone's sign-off
 * (filed as executive-terms-and-incumbency-turnover): a four-year term where
 * research checked none (the two states that run two-year terms are
 * calibrated from research through `calibration`, not held to this value),
 * regular elections in the cycle that contains 2026, a November general
 * election on the first Tuesday after the first Monday, and a term that begins
 * on the first Monday of January after the election. Changing any value means
 * a new version; saved terms keep the version they were planned under.
 */
export const STATE_EXECUTIVE_GAME_PROFILE_VERSION =
  "ocd-state-executive-game-profile/v2";

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
  "This jurisdiction's real term and election rules are not compiled into the game yet, so the office follows the game's own disclosed rule set: a November election on the same cycle as the term, and a term that begins on the first Monday of January.";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const ORDINAL_NAMES = ["first", "second", "third", "fourth"] as const;

function dayOfMonth(day: number): string {
  if (day === 1) return "January 1st";
  if (day === 2) return "January 2nd";
  if (day === 3) return "January 3rd";
  return `January ${day}th`;
}

/** When a term begins, said the way a person would say it. */
export function commencementDescription(rule: TermCommencementRule): string {
  if (rule.kind === "january-first-following-election") return "January 1st";
  if (rule.kind === "january-fixed-day-following-election")
    return dayOfMonth(rule.day);
  const anchor = `the ${ORDINAL_NAMES[rule.ordinal - 1]} ${WEEKDAY_NAMES[rule.weekday]} of January`;
  if (rule.offsetDays === 0) return anchor;
  const shifted = WEEKDAY_NAMES[(rule.weekday + rule.offsetDays) % 7];
  return `the ${shifted} after ${anchor}`;
}

/**
 * What a player is told about this office's term.
 *
 * Plainly the information and nothing else. No citation, no instrument name, no
 * observation date, no word about which values were read and which are the
 * game's own: the player is playing, not auditing. Every one of those facts is
 * still recorded — `rule.sources`, `rule.basis` and `rule.calibration` keep
 * them — and `stateExecutiveTermRuleProvenance` is where an internal surface
 * reads them. Do not put provenance back on this string.
 */
export function stateExecutiveTermRuleNote(
  rule: StateExecutiveTermRule,
): string {
  const years = rule.termYears === 1 ? "one year" : `${rule.termYears} years`;
  const cadence =
    rule.election.cycleYears === rule.termYears
      ? `an election every ${rule.election.cycleYears} years in November`
      : `an election every ${rule.election.cycleYears} years in November, out of step with the term`;
  return `The term runs ${years}, beginning ${commencementDescription(rule.commencement)}, with ${cadence}.`;
}

/**
 * The same rule for an internal surface: where each value came from, with the
 * instruments named. This never reaches a player screen.
 */
export function stateExecutiveTermRuleProvenance(
  rule: StateExecutiveTermRule,
): string {
  const read = rule.sources.map((source) => source.citation).join(", ");
  const fields = (["termYears", "commencement", "election"] as const).map(
    (field) => `${field}=${rule.basis[field]}`,
  );
  const parts = [`${rule.ruleVersion} (${fields.join(", ")})`];
  if (read) parts.push(`Read from ${read}.`);
  else parts.push(STATE_EXECUTIVE_GAME_PROFILE_NOTE);
  if (rule.calibration) parts.push(rule.calibration.disclosure);
  return parts.join(" ");
}

const WA_RETRIEVED = makeIsoDate("2026-09-16");
const NATIONWIDE_RETRIEVED = makeIsoDate("2026-09-22");

/** Verified rules. Each value cites the instrument it came from. */
const VERIFIED: Readonly<Record<string, StateExecutiveTermRule>> = {
  /**
   * The District's own Code fixes all three values, so nothing here is the
   * game's guess. It was research-calibrated before the section was read; the
   * reading changed the commencement, because § 1-204.21(b) names January 2nd
   * and the game profile would have started the Mayor on the first Monday.
   */
  DC: {
    stateUsps: "DC",
    ruleVersion: "dc-mayor-term/dc-code-1-204.21/2026-09-22",
    basis: {
      termYears: "verified",
      commencement: "verified",
      election: "verified",
    },
    termYears: 4,
    commencement: { kind: "january-fixed-day-following-election", day: 2 },
    election: {
      cycleYears: 4,
      referenceYear: 2026,
      day: "first-tuesday-after-first-monday-in-november",
    },
    sources: [
      {
        citation: "D.C. Code § 1-204.21(b)",
        url: "https://code.dccouncil.gov/us/dc/council/code/sections/1-204.21",
        excerpt:
          "The Mayor, established by subsection (a) of this section, shall be elected, on a partisan basis, for a term of 4 years beginning at noon on January 2nd of the year following his election.",
        retrievedAt: NATIONWIDE_RETRIEVED,
        note: "Term length and commencement. Enacted Dec. 24, 1973 (87 Stat. 789, Pub. L. 93-198); amended through D.C. Law 19-124A.",
      },
    ],
    calibration: null,
  },
  /**
   * Vermont is the case the per-field basis exists for. Chapter II, § 49 fixes
   * the two-year term in the constitution's own words, and § 47 puts the
   * choosing on the same day as the General Assembly election. Neither fixes a
   * commencement DATE — the term runs from when the Governor is "chosen and
   * qualified" — so that one field stays the game's profile rather than a day
   * invented to fill the gap.
   */
  VT: {
    stateUsps: "VT",
    ruleVersion: "vt-governor-term/vt-const-ch-ii-47-49/2026-09-22",
    basis: {
      termYears: "verified",
      commencement: "game-profile",
      election: "verified",
    },
    termYears: 2,
    commencement: STATE_EXECUTIVE_GAME_PROFILE.commencement,
    election: {
      cycleYears: 2,
      referenceYear: 2026,
      day: "first-tuesday-after-first-monday-in-november",
    },
    sources: [
      {
        citation: "Vt. Const. ch. II, § 49",
        url: "https://legislature.vermont.gov/statutes/constitution-of-the-state-of-vermont/",
        excerpt:
          "The term of office of the Governor, Lieutenant-Governor and Treasurer of the State, respectively, shall commence when they shall be chosen and qualified, and shall continue for the term of two years",
        retrievedAt: NATIONWIDE_RETRIEVED,
        note: "Two-year term. Fixes no calendar date for commencement, so the commencement field stays on the game profile.",
      },
      {
        citation: "Vt. Const. ch. II, § 47",
        url: "https://legislature.vermont.gov/statutes/constitution-of-the-state-of-vermont/",
        excerpt:
          "The voters of each town shall, on the day of election for choosing Representatives to attend the General Assembly, bring in their votes for Governor, with the name fairly written",
        retrievedAt: NATIONWIDE_RETRIEVED,
        note: "Governor chosen at the general election, which with the two-year term falls every second November.",
      },
    ],
    calibration: null,
  },
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
    calibration: null,
  },
};

/**
 * The rule that dates this jurisdiction's chief-executive terms: the fifty
 * states and, separately, the District of Columbia.
 *
 * A verified rule wins. Otherwise the game profile applies, with its term
 * length calibrated by the research baseline where that jurisdiction has a row,
 * and the election cycle following the term so an office is not left electing
 * on a cycle longer than the term it fills.
 */
export function stateExecutiveTermRule(
  stateUsps: string,
): StateExecutiveTermRule | null {
  if (!isUsState(stateUsps) && !isDistrictOfColumbia(stateUsps)) return null;
  const verified = VERIFIED[stateUsps];
  if (verified) return verified;
  const row = chiefExecutiveBaseline(stateUsps);
  const termYears =
    row?.ordinaryTermYears ?? STATE_EXECUTIVE_GAME_PROFILE.termYears;
  // Which years hold the election, from the researched calendar where the
  // office is not on the cycle containing 2026 (Kentucky, New Jersey and
  // Virginia among them); see chief-executive-election-cycles.ts.
  const cycle = chiefExecutiveElectionCycle(stateUsps);
  const version = row
    ? `${STATE_EXECUTIVE_GAME_PROFILE_VERSION}+calibrated:${row.key}:${termYears}y`
    : STATE_EXECUTIVE_GAME_PROFILE_VERSION;
  return {
    stateUsps,
    ruleVersion: cycle ? `${version}+cycle:${cycle.referenceYear}` : version,
    basis: {
      termYears: "game-profile",
      commencement: "game-profile",
      election: "game-profile",
    },
    ...STATE_EXECUTIVE_GAME_PROFILE,
    termYears,
    election: {
      ...STATE_EXECUTIVE_GAME_PROFILE.election,
      // An office cannot be elected less often than its term ends.
      cycleYears: termYears,
      referenceYear:
        cycle?.referenceYear ??
        STATE_EXECUTIVE_GAME_PROFILE.election.referenceYear,
    },
    sources: [],
    calibration: row
      ? {
          field: "termYears",
          row,
          disclosure: chiefExecutiveBaselineDisclosure(row),
        }
      : null,
  };
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
  if (rule.kind === "january-fixed-day-following-election")
    return iso(utcDate(year, 0, rule.day));
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
