import type { EntityId } from "../../simulation/types";
import type { EnactedRuleChange } from "../../simulation/enacted-rule-changes";
import type { StateExecutiveTermRule } from "../../simulation/nationwide-world/state-executive-term-rules";
import type { IsoDate } from "./calendar";
import type { PlannedTermDates } from "./executive-calendar";
import {
  commencementAfter,
  generalElectionDay,
  isElectionYear,
  termDatesAfterElection,
} from "../offices/executive-calendar";
export type LawLevel =
  | "federal-constitution"
  | "federal-statute"
  | "federal-regulation"
  | "federal-executive-order"
  | "state-constitution"
  | "state-statute"
  | "state-regulation"
  | "state-executive-order"
  | "local-charter"
  | "local-ordinance"
  | "local-regulation"
  | "local-executive-order";

export const LAW_LEVELS: readonly LawLevel[] = [
  "federal-constitution",
  "federal-statute",
  "federal-regulation",
  "federal-executive-order",
  "state-constitution",
  "state-statute",
  "state-regulation",
  "state-executive-order",
  "local-charter",
  "local-ordinance",
  "local-regulation",
  "local-executive-order",
];

export function lawLevelRank(level: LawLevel): number {
  return LAW_LEVELS.length - LAW_LEVELS.indexOf(level);
}
export function ruleChangeInForce(
  inForce: readonly EnactedRuleChange[],
): EnactedRuleChange | null {
  if (inForce.length === 0) return null;
  const top = Math.max(...inForce.map((change) => lawLevelRank(change.level)));
  return (
    inForce.filter((change) => lawLevelRank(change.level) === top).at(-1) ??
    null
  );
}
export interface ExecutiveTermFacts {
  readonly changes: readonly EnactedRuleChange[];
  readonly compiled: StateExecutiveTermRule | null;
  readonly office: { readonly officeKey: string } | null;
}
export interface AppliedExecutiveTermChange {
  readonly field: "executive.term.years";
  readonly value: number;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly instrument: EnactedRuleChange["instrument"];
  readonly operativeAt: IsoDate;
  readonly firstTermStartsAt: IsoDate;
  readonly deferredFromImmediate: boolean;
}

export interface StateExecutiveTermRuleInWorld extends StateExecutiveTermRule {
  readonly enactedChanges: readonly AppliedExecutiveTermChange[];
}

function governingTermYearChanges(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  officeKey: string,
): readonly EnactedRuleChange[] {
  const all = facts.changes.filter(
    (change) =>
      change.stateUsps === stateUsps &&
      change.officeKey === officeKey &&
      change.field === "executive.term.years",
  );
  const governing: EnactedRuleChange[] = [];
  for (const change of all) {
    const winner = ruleChangeInForce(
      all.filter((row) => row.operativeAt <= change.operativeAt),
    );
    if (winner && governing.at(-1) !== winner) governing.push(winner);
  }
  return governing;
}

function firstElectionYearWithTermFrom(
  segments: readonly TermSegment[],
  date: IsoDate,
): number {
  const from = Number(date.slice(0, 4)) - 1;
  for (let year = from; year < from + 40; year += 1) {
    const { rule } = segmentForElectionYear(segments, year);
    if (!isElectionYear(rule.election, year)) continue;
    const election = generalElectionDay(rule.election, year);
    if (commencementAfter(rule.commencement, election) >= date) return year;
  }
  throw new Error(
    `No regular term for ${segments[0]!.rule.stateUsps} begins after ${date}.`,
  );
}

interface TermSegment {
  readonly fromElectionYear: number | null;
  readonly rule: StateExecutiveTermRuleInWorld;
}

function termSegments(
  facts: ExecutiveTermFacts,
  stateUsps: string,
): readonly TermSegment[] | null {
  const compiled = facts.compiled;
  const office = facts.office;
  if (!compiled || !office) return null;
  let rule: StateExecutiveTermRuleInWorld = { ...compiled, enactedChanges: [] };
  const segments: TermSegment[] = [{ fromElectionYear: null, rule }];
  for (const change of governingTermYearChanges(
    facts,
    stateUsps,
    office.officeKey,
  )) {
    if (typeof change.value !== "number" || change.value === rule.termYears)
      continue;
    const year = firstElectionYearWithTermFrom(segments, change.operativeAt);
    const reached = segmentForElectionYear(segments, year).rule;
    const firstTermStartsAt = commencementAfter(
      reached.commencement,
      generalElectionDay(reached.election, year),
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

export function stateExecutiveTermRuleForElectionYear(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  year: number,
): StateExecutiveTermRuleInWorld | null {
  const segments = termSegments(facts, stateUsps);
  return segments ? segmentForElectionYear(segments, year).rule : null;
}

export function isStateExecutiveElectionYearInWorld(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  year: number,
): boolean {
  const segments = termSegments(facts, stateUsps);
  if (!segments) return false;
  return isElectionYear(
    segmentForElectionYear(segments, year).rule.election,
    year,
  );
}

export function nextRegularElectionInWorld(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  onDate: IsoDate,
): IsoDate | null {
  const segments = termSegments(facts, stateUsps);
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

export function stateExecutiveTermRuleInWorld(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  onDate: IsoDate,
): StateExecutiveTermRuleInWorld | null {
  const segments = termSegments(facts, stateUsps);
  if (!segments) return null;
  const election = nextRegularElectionInWorld(facts, stateUsps, onDate);
  const year = election
    ? Number(election.slice(0, 4))
    : Number(onDate.slice(0, 4));
  return segmentForElectionYear(segments, year).rule;
}

export function termDatesAfterElectionInWorld(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  electionDate: IsoDate,
):
  | (PlannedTermDates & {
      readonly rule: StateExecutiveTermRuleInWorld;
    })
  | null {
  const segments = termSegments(facts, stateUsps);
  if (!segments) return null;
  const { rule } = segmentForElectionYear(
    segments,
    Number(electionDate.slice(0, 4)),
  );
  return { ...termDatesAfterElection(rule, electionDate), rule };
}

// stopgapId: "SG-P14-elections-executive-law-search"
