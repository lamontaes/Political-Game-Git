import { validateIsoDate as makeIsoDate, type IsoDate } from "./calendar";
import {
  commencementInYear,
  regularTermWindowOn,
  termDatesAfterElection,
  termRuleBasis,
} from "./executive-calendar";
import type { StateExecutiveTermRule } from "../../simulation/nationwide-world/state-executive-term-rules";
import type { StateExecutiveTermRuleInWorld } from "../../simulation/nationwide-world/executive-term-rules-in-world";
type OrdinaryTermDates =
  | {
      kind: "dated";
      startsAt: IsoDate;
      endsAt: IsoDate;
      ruleVersion: string;
      basis: "verified" | "game-profile";
    }
  | { kind: "unknown"; unknownFields: readonly RuleFieldKey[] };
type StateExecutiveTermWindow = {
  startsAt: IsoDate | null;
  endExclusive: IsoDate | null;
  ruleVersion: string | null;
  unknownFields: readonly RuleFieldKey[];
};
import type {
  RuleCapabilityResolution,
  ResolvedRuleField,
  RuleFieldKey,
} from "../../simulation/nationwide-world/rule-capability-port";
type Resolution = RuleCapabilityResolution;
const TERM_FIELDS: readonly RuleFieldKey[] = ["term.years", "term.start"];
export function admittedRuleField(
  resolution: RuleCapabilityResolution,
  field: RuleFieldKey,
): ResolvedRuleField | null {
  const found = resolution.fields.find((entry) => entry.field === field);
  return found?.state === "ADMITTED" ? found : null;
}

export function unadmittedRuleFields(
  resolution: RuleCapabilityResolution,
): readonly RuleFieldKey[] {
  return resolution.fields
    .filter((entry) => entry.state !== "ADMITTED")
    .map((entry) => entry.field);
}
function wholeYears(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? value
    : null;
}

export function admittedTermDates(
  resolution: Resolution,
  electionDate: IsoDate,
): OrdinaryTermDates | null {
  const unknownFields = unadmittedRuleFields(resolution);
  if (unknownFields.length > 0) return null;
  const years = admittedRuleField(resolution, "term.years")!;
  const start = admittedRuleField(resolution, "term.start")!;
  const duration = wholeYears(years.value);
  const shape =
    start.value !== null && typeof start.value === "object"
      ? (start.value as {
          kind?: unknown;
          referenceStart?: unknown;
          cycleYears?: unknown;
        })
      : null;
  if (duration === null || shape === null) return null;
  const electionYear = Number(electionDate.slice(0, 4));
  let startsAt: string | null = null;
  if (shape.kind === "january-first-following-election") {
    startsAt = `${electionYear + 1}-01-01`;
  } else if (shape.kind === "reference-start") {
    const cycle = wholeYears(shape.cycleYears);
    const reference = shape.referenceStart;
    if (
      cycle !== null &&
      typeof reference === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(reference)
    ) {
      const monthDay = reference.slice(4);
      const referenceYear = Number(reference.slice(0, 4));
      let year =
        referenceYear +
        Math.ceil((electionYear - referenceYear) / cycle) * cycle;
      if (`${year}${monthDay}` <= electionDate) year += cycle;
      startsAt = `${year}${monthDay}`;
    }
  }
  if (startsAt === null) return null;
  const startYear = Number(startsAt.slice(0, 4));
  return {
    kind: "dated",
    startsAt: makeIsoDate(startsAt),
    endsAt: makeIsoDate(`${startYear + duration}${startsAt.slice(4)}`),
    ruleVersion: `${years.ruleVersion}+${start.ruleVersion}`,
    basis: "verified",
  };
}

export function offCycleRecoveryDates(
  rule: StateExecutiveTermRule,
  onDate: IsoDate,
): {
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
} {
  let startYear = Number(onDate.slice(0, 4));
  if (commencementInYear(rule.commencement, startYear) <= onDate)
    startYear += 1;
  return {
    startsAt: commencementInYear(rule.commencement, startYear),
    endsAt: commencementInYear(rule.commencement, startYear + rule.termYears),
  };
}
export function ordinaryStateExecutiveTermDates(
  inWorld: StateExecutiveTermRuleInWorld | null,
  resolution: Resolution,
  electionDate: IsoDate,
): OrdinaryTermDates {
  const admitted =
    inWorld && inWorld.enactedChanges.length > 0
      ? null
      : admittedTermDates(resolution, electionDate);
  if (admitted) return admitted;
  const rule = inWorld;
  if (!rule) return { kind: "unknown", unknownFields: TERM_FIELDS };
  return {
    kind: "dated",
    ...termDatesAfterElection(rule, electionDate),
    ruleVersion: rule.ruleVersion,
    basis: termRuleBasis(rule),
  };
}
export function stateExecutiveTermWindow(
  resolution: Resolution,
  rule: StateExecutiveTermRule | null,
  onDate: IsoDate,
  options: {
    readonly gameCalendar?: boolean;
  } = {},
): StateExecutiveTermWindow {
  const unknownFields = unadmittedRuleFields(resolution);
  if (unknownFields.length > 0) {
    const calendarRule = options.gameCalendar === false ? null : rule;
    if (calendarRule) {
      const window = regularTermWindowOn(calendarRule, onDate);
      return {
        startsAt: window.startsAt,
        endExclusive: window.endsAt,
        ruleVersion: calendarRule.ruleVersion,
        unknownFields: [],
      };
    }
  }
  const years = admittedRuleField(resolution, "term.years");
  const start = admittedRuleField(resolution, "term.start");
  const duration = wholeYears(years?.value);
  const shape =
    start?.value !== null && typeof start?.value === "object"
      ? (start.value as {
          kind?: unknown;
          referenceStart?: unknown;
          cycleYears?: unknown;
        })
      : null;
  const cycle = wholeYears(shape?.cycleYears);
  const reference = shape?.referenceStart;
  if (
    unknownFields.length > 0 ||
    duration === null ||
    shape?.kind !== "reference-start" ||
    cycle === null ||
    typeof reference !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reference)
  ) {
    return {
      startsAt: null,
      endExclusive: null,
      ruleVersion: null,
      unknownFields: unknownFields.length > 0 ? unknownFields : ["term.start"],
    };
  }
  const monthDay = reference.slice(4);
  const referenceYear = Number(reference.slice(0, 4));
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    referenceYear + Math.floor((onYear - referenceYear) / cycle) * cycle;
  if (`${startYear}${monthDay}` > onDate) startYear -= cycle;
  return {
    startsAt: makeIsoDate(`${startYear}${monthDay}`),
    endExclusive: makeIsoDate(`${startYear + duration}${monthDay}`),
    ruleVersion: `${years!.ruleVersion}+${start!.ruleVersion}`,
    unknownFields: [],
  };
}
