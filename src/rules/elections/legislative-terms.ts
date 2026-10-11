import { makeIsoDate, type IsoDate } from "./calendar";
import { commencementInYear } from "./executive-calendar";
import type { LegislativeTermProfile } from "../../simulation/legislative-term-rules";
export function blanketLegislativeTermYears(
  officeKey: string,
  knownTermYears: number | null,
): number {
  if (knownTermYears !== null) return knownTermYears;
  const chamber = officeKey.split(":").at(-1);
  return chamber === "house" || chamber === "assembly" ? 2 : 4;
}
export interface LegislativeTermFacts {
  readonly supported: readonly LegislativeTermProfile[];
  readonly reviewed: readonly LegislativeTermProfile[];
  readonly officeExists: boolean;
  readonly knownTermYears: number | null;
  readonly blanketVersion: string;
}
export function legislativeTermDates(
  facts: LegislativeTermFacts,
  officeKey: string,
  electionDate: IsoDate,
) {
  const supported = facts.supported.find((row) =>
    row.officeKeys.some((key) => key === officeKey),
  );
  const reviewed = facts.reviewed.find((row) =>
    row.officeKeys.some((key) => key === officeKey),
  );
  const rule = supported ?? reviewed;
  if (rule) {
    const year = Number(electionDate.slice(0, 4)) + 1;
    return {
      startsAt: commencementInYear(rule.commencement, year),
      endsAt: commencementInYear(rule.commencement, year + rule.durationYears),
      ruleVersion: rule.ruleVersion,
      basis: supported ? ("sourced" as const) : ("reviewed-profile" as const),
    };
  }
  if (!facts.officeExists) return null;
  const years = blanketLegislativeTermYears(officeKey, facts.knownTermYears),
    year = Number(electionDate.slice(0, 4)) + 1;
  return {
    startsAt: makeIsoDate(`${year}-01-01`),
    endsAt: makeIsoDate(`${year + years}-01-01`),
    ruleVersion: facts.blanketVersion,
    basis: "blanket" as const,
  };
}
