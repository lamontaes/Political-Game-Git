import { candidacyPackForJurisdiction } from "./candidacy";
import type { ElectiveOfficeOption } from "./candidacy-packs";
import {
  generalElectionDay,
  isElectionYear,
} from "./nationwide-world/state-executive-term-rules";
import type {
  ElectionTimingRule,
  TermRuleBasis,
  TermRuleSource,
} from "./nationwide-world/state-executive-term-rules";
import type { EntityId, IsoDate } from "./types";

/**
 * When a legislative seat is next contested.
 *
 * Every legislative filing in the game used to land on a date 28 days after
 * the day the player filed — the same in every state, for every chamber, in
 * every month. That was never a calendar; it was a countdown with no rule
 * behind it, and the governorship on the very same screen already refused to
 * do it: `fileForStateExecutiveOffice` comments "Never a fixed number of days
 * after filing." One route was using a calendar the other did not have.
 *
 * This is that calendar for the legislative chambers, in the shape the state
 * executive rules already established and for the same reasons. Two classes of
 * value live here and are never mixed:
 *
 * - `verified`: read from the accepted candidacy pack's own sourced value,
 *   carrying the pack's citation. Nebraska, Alaska and Ohio have sourced term
 *   lengths today; the rest do not.
 * - `game-profile`: the disclosed, versioned simulation rule the game applies
 *   where the real rule is not compiled. It is NOT a claim about that state's
 *   law, it is never copied from a neighbouring state, and it is labelled
 *   wherever a player inspects the office.
 *
 * What is still missing, and is deliberately not invented here: no state's
 * legislative *election calendar* has been read into this repository — not the
 * year a given chamber's cycle falls on, not an off-year November state, not a
 * staggered upper chamber's classes, not a filing deadline.
 * `state-legislative-seat-calendar-and-field` carries that question. When it
 * comes back, the verified table below is what grows, and every value this
 * profile currently supplies is what it replaces.
 */

/**
 * The game's disclosed legislative profile.
 *
 * Two-year terms, a November general election on the first Tuesday after the
 * first Monday, and a cycle anchored on 2026. Two years is the game's own
 * floor rather than an observation: it is the shortest ordinary legislative
 * term, so a seat under this profile is contested at least as often as the
 * real one, which is the safer direction to be wrong in for a game about
 * standing for office. A pack that carries a sourced term length overrides it.
 */
export const LEGISLATIVE_GAME_PROFILE_VERSION =
  "ocd-legislative-election-profile/v1";

export const LEGISLATIVE_GAME_PROFILE = {
  termYears: 2,
  election: {
    cycleYears: 2,
    referenceYear: 2026,
    day: "first-tuesday-after-first-monday-in-november",
  },
} as const satisfies {
  readonly termYears: number;
  readonly election: ElectionTimingRule;
};

export const LEGISLATIVE_GAME_PROFILE_NOTE =
  "The game has not read this chamber's own election calendar, so this seat follows the game's disclosed rule set: a November general election on the first Tuesday after the first Monday, in even-numbered years.";

export const LEGISLATIVE_SOURCED_TERM_NOTE =
  "This chamber's term length is the accepted rule pack's sourced value. The election calendar itself is still the game's own disclosed rule.";

export interface LegislativeElectionRule {
  readonly officeKey: string;
  readonly ruleVersion: string;
  /** Per field, because a chamber may have one sourced fact and not another. */
  readonly basis: {
    readonly termYears: TermRuleBasis;
    readonly election: TermRuleBasis;
  };
  readonly termYears: number;
  readonly election: ElectionTimingRule;
  readonly sources: readonly TermRuleSource[];
}

/**
 * The rule for one offered office.
 *
 * The term length is taken from the pack when the pack has a source for it,
 * and the cycle follows the term, so Ohio's four-year Senate is contested every
 * fourth year rather than every second. Everything else is the profile.
 */
export function legislativeElectionRule(
  option: ElectiveOfficeOption,
): LegislativeElectionRule {
  const recorded = option.qualification.termYears;
  const sourced = recorded.kind === "known" ? recorded : null;
  const termYears = sourced?.value ?? LEGISLATIVE_GAME_PROFILE.termYears;
  return {
    officeKey: option.officeKey,
    ruleVersion: LEGISLATIVE_GAME_PROFILE_VERSION,
    basis: {
      termYears: sourced ? "verified" : "game-profile",
      // No legislative election calendar has been read for any state.
      election: "game-profile",
    },
    termYears,
    election: {
      ...LEGISLATIVE_GAME_PROFILE.election,
      cycleYears: termYears,
    },
    sources: sourced
      ? [
          {
            citation: sourced.source.citation,
            // A pack may carry a citation without a link or a retrieval
            // stamp. Saying so is truthful; inventing either is not.
            url: sourced.source.sourceUrl ?? "",
            excerpt: sourced.source.sourceTitle,
            retrievedAt: isoDay(sourced.source.retrievedAt),
            note: "Term length from the accepted candidacy pack. The election calendar is not from this source.",
          },
        ]
      : [],
  };
}

/**
 * A retrieval stamp may carry a time; a source records the day. A pack that
 * recorded no stamp keeps none here rather than acquiring today's date.
 */
function isoDay(value: string | null): IsoDate {
  return (value?.slice(0, 10) ?? "") as IsoDate;
}

/** The first regular general election on or after `onDate`, under the rule. */
export function nextLegislativeElection(
  rule: LegislativeElectionRule,
  onDate: IsoDate,
): IsoDate {
  let year = Number(onDate.slice(0, 4));
  while (!isElectionYear(rule.election, year)) year += 1;
  const day = generalElectionDay(rule.election, year);
  if (day >= onDate) return day;
  return generalElectionDay(rule.election, year + rule.election.cycleYears);
}

export interface LegislativeOfficeCalendar {
  readonly nextElection: IsoDate;
  readonly termYears: number;
  readonly basis: TermRuleBasis | "mixed";
  readonly note: string;
  readonly sources: readonly TermRuleSource[];
  readonly ruleVersion: string;
}

/**
 * The calendar a player filing for this seat today is filing into.
 *
 * `onDate` is the day the filing happens; the election it stands in is the
 * next regular one after it, never a fixed distance from it.
 */
export function legislativeOfficeCalendar(
  jurisdictionId: EntityId,
  officeKey: string,
  onDate: IsoDate,
): LegislativeOfficeCalendar | null {
  const option = candidacyPackForJurisdiction(jurisdictionId)?.offices.find(
    (offer: ElectiveOfficeOption) => offer.officeKey === officeKey,
  );
  if (!option) return null;
  const rule = legislativeElectionRule(option);
  const bases = Object.values(rule.basis);
  return {
    nextElection: nextLegislativeElection(rule, onDate),
    termYears: rule.termYears,
    basis: bases.every((basis) => basis === "game-profile")
      ? "game-profile"
      : "mixed",
    note: rule.sources.length
      ? LEGISLATIVE_SOURCED_TERM_NOTE
      : LEGISLATIVE_GAME_PROFILE_NOTE,
    sources: rule.sources,
    ruleVersion: rule.ruleVersion,
  };
}
