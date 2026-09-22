import { enactedRuleChanges, ruleChangeInForce } from "../enacted-rule-changes";
import type { EnactedRuleChange } from "../enacted-rule-changes";
import type { EntityId, IsoDate, World } from "../types";
import { stateExecutiveIdentity } from "./state-executive-candidacy-packs";
import {
  commencementAfter,
  generalElectionDay,
  isElectionYear,
  stateExecutiveTermRule,
  termDatesAfterElection,
} from "./state-executive-term-rules";
import type {
  PlannedTermDates,
  StateExecutiveTermRule,
} from "./state-executive-term-rules";

/**
 * A chief executive's term rule as THIS World's law has it.
 *
 * `stateExecutiveTermRule` is the compiled rule: what the game read, or its
 * disclosed profile where it read nothing. It never changes. A World can pass
 * a law that does change it, and this is where that law is applied: every
 * enacted `executive.term.years` for the office, statute or amendment, taken
 * from the one shared record of enacted rule changes (`enacted-rule-changes`)
 * and folded over the compiled rule in the order the changes took effect.
 *
 * Two semantic choices, both stated because a law is often silent on them:
 *
 * - **A new length governs terms that BEGIN after it takes effect.** The
 *   sitting term keeps the length it was won under. The first term the change
 *   reaches is the first one whose commencement, under the old rule, falls on
 *   or after the operative date; the election for that term is the first under
 *   the new cycle, so the calendar re-anchors there and elections continue
 *   every new-length years from it.
 * - **NOT MODELLED: a change that lengthens or shortens the SITTING term**
 *   (`appliesTo: "immediately"`). It needs a sitting term's end to move, and
 *   the saved term's expiry is a scheduled due item that nothing reschedules
 *   yet. Blanket rule meanwhile: an "immediately" change is applied as
 *   terms-beginning-after, and `enactedChanges` records that it was.
 */

/** One enacted change this rule carries, as it was applied. */
export interface AppliedExecutiveTermChange {
  readonly field: "executive.term.years";
  readonly value: number;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly instrument: EnactedRuleChange["instrument"];
  /** When the law took effect. */
  readonly operativeAt: IsoDate;
  /** The first term the change reaches begins here. */
  readonly firstTermStartsAt: IsoDate;
  /**
   * True when the law asked to reach the sitting term and the game applied it
   * from the next term instead, because moving a sitting term is not modelled.
   */
  readonly deferredFromImmediate: boolean;
}

export interface StateExecutiveTermRuleInWorld extends StateExecutiveTermRule {
  /** Empty when the World's law has never changed this office's term. */
  readonly enactedChanges: readonly AppliedExecutiveTermChange[];
}

/**
 * The governing term-length change at each point it could differ, in the order
 * the changes take effect. Every ENACTED change counts, including one whose
 * operative date is still ahead: a law already passed fixes the calendar the
 * office will follow, and when it starts to bite is decided by the first term
 * it reaches, not by today's date.
 */
function governingTermYearChanges(
  world: World,
  stateUsps: string,
  officeKey: string,
): readonly EnactedRuleChange[] {
  const all = enactedRuleChanges(world).filter(
    (change) =>
      change.stateUsps === stateUsps &&
      change.officeKey === officeKey &&
      change.field === "executive.term.years",
  );
  // At each operative date the shared precedence (an amendment outranks a
  // statute) picks the change in force; a date whose winner did not change
  // adds nothing.
  const governing: EnactedRuleChange[] = [];
  for (const change of all) {
    const winner = ruleChangeInForce(
      all.filter((row) => row.operativeAt <= change.operativeAt),
    );
    if (winner && governing.at(-1) !== winner) governing.push(winner);
  }
  return governing;
}

/** The first election year, under `rule`, whose term begins on or after `date`. */
function firstElectionYearWithTermFrom(
  rule: StateExecutiveTermRule,
  date: IsoDate,
): number {
  const from = Number(date.slice(0, 4)) - 1;
  for (let year = from; year < from + 40; year += 1) {
    if (!isElectionYear(rule.election, year)) continue;
    const election = generalElectionDay(rule.election, year);
    if (commencementAfter(rule.commencement, election) >= date) return year;
  }
  throw new Error(
    `No regular term for ${rule.stateUsps} begins after ${date}.`,
  );
}

/** One stretch of the office's calendar under one term length. */
interface TermSegment {
  /** Elections from this year on follow `rule`; null for the compiled rule. */
  readonly fromElectionYear: number | null;
  readonly rule: StateExecutiveTermRuleInWorld;
}

/** The compiled rule, then one segment per enacted change of length. */
function termSegments(
  world: World,
  stateUsps: string,
): readonly TermSegment[] | null {
  const compiled = stateExecutiveTermRule(stateUsps);
  const office = stateExecutiveIdentity(stateUsps);
  if (!compiled || !office) return null;
  let rule: StateExecutiveTermRuleInWorld = { ...compiled, enactedChanges: [] };
  const segments: TermSegment[] = [{ fromElectionYear: null, rule }];
  for (const change of governingTermYearChanges(
    world,
    stateUsps,
    office.officeKey,
  )) {
    if (typeof change.value !== "number" || change.value === rule.termYears)
      continue;
    const year = firstElectionYearWithTermFrom(rule, change.operativeAt);
    const firstTermStartsAt = commencementAfter(
      rule.commencement,
      generalElectionDay(rule.election, year),
    );
    rule = {
      ...rule,
      ruleVersion: `${rule.ruleVersion}+enacted:${change.measureId}:${change.value}y`,
      termYears: change.value,
      election: {
        ...rule.election,
        cycleYears: change.value,
        referenceYear: year,
      },
      enactedChanges: [
        ...rule.enactedChanges,
        {
          field: "executive.term.years",
          value: change.value,
          measureId: change.measureId,
          designation: change.designation,
          instrument: change.instrument,
          operativeAt: change.operativeAt,
          firstTermStartsAt,
          deferredFromImmediate:
            change.applicability.appliesTo === "immediately",
        },
      ],
    };
    // A later change can re-anchor at or before an earlier one's first
    // election; the later law governs from there.
    while (
      segments.length > 1 &&
      (segments.at(-1)!.fromElectionYear ?? -Infinity) >= year
    )
      segments.pop();
    segments.push({ fromElectionYear: year, rule });
  }
  return segments;
}

function segmentForElectionYear(
  segments: readonly TermSegment[],
  year: number,
): TermSegment {
  return (
    [...segments]
      .reverse()
      .find(
        (segment) =>
          segment.fromElectionYear === null || segment.fromElectionYear <= year,
      ) ?? segments[0]!
  );
}

/** Whether `year` holds a regular election for the office under this World's law. */
export function isStateExecutiveElectionYearInWorld(
  world: World,
  stateUsps: string,
  year: number,
): boolean {
  const segments = termSegments(world, stateUsps);
  if (!segments) return false;
  return isElectionYear(
    segmentForElectionYear(segments, year).rule.election,
    year,
  );
}

/** The first regular general election on or after `onDate`, under this World's law. */
export function nextRegularElectionInWorld(
  world: World,
  stateUsps: string,
  onDate: IsoDate,
): IsoDate | null {
  const segments = termSegments(world, stateUsps);
  if (!segments) return null;
  const from = Number(onDate.slice(0, 4));
  for (let year = from; year < from + 40; year += 1) {
    const { rule } = segmentForElectionYear(segments, year);
    if (!isElectionYear(rule.election, year)) continue;
    const day = generalElectionDay(rule.election, year);
    if (day >= onDate) return day;
  }
  return null;
}

/**
 * The rule a term won at the next regular election on or after `onDate` would
 * carry: what "a term here lasts" means today, with every law already passed
 * applied. Null where there is no compiled rule to amend.
 */
export function stateExecutiveTermRuleInWorld(
  world: World,
  stateUsps: string,
  onDate: IsoDate,
): StateExecutiveTermRuleInWorld | null {
  const segments = termSegments(world, stateUsps);
  if (!segments) return null;
  const election = nextRegularElectionInWorld(world, stateUsps, onDate);
  const year = election
    ? Number(election.slice(0, 4))
    : Number(onDate.slice(0, 4));
  return segmentForElectionYear(segments, year).rule;
}

/**
 * The term won at an election on `electionDate`, dated under the law that
 * governs that election's term.
 */
export function termDatesAfterElectionInWorld(
  world: World,
  stateUsps: string,
  electionDate: IsoDate,
):
  | (PlannedTermDates & { readonly rule: StateExecutiveTermRuleInWorld })
  | null {
  const segments = termSegments(world, stateUsps);
  if (!segments) return null;
  const { rule } = segmentForElectionYear(
    segments,
    Number(electionDate.slice(0, 4)),
  );
  return { ...termDatesAfterElection(rule, electionDate), rule };
}
