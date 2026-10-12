import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  World,
  WorkRoleRecord,
  WorkStatusRecord,
  ResourceFlowTermsRecord,
} from "../../simulation/types";
import { weeklyHoursOf } from "./payday-and-shift";
export interface RecordedPayFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly work: World["history"]["workRelationships"];
  readonly flows: World["history"]["resourceFlows"];
  readonly roles: ReadonlyMap<string, WorkRoleRecord | null>;
  readonly statuses: ReadonlyMap<string, WorkStatusRecord | null>;
  readonly terms: ReadonlyMap<string, ResourceFlowTermsRecord | null>;
}
export function recordedPayReceiptKey(id: EntityId, cutoff: HistoricalCutoff) {
  return JSON.stringify([id, cutoff.asOfDate, cutoff.historySequenceExclusive]);
}
const PERIODS: Readonly<Record<string, number>> = {
  "schedule:weekly": 52,
  "schedule:biweekly": 26,
  "schedule:semimonthly": 24,
  "schedule:monthly": 12,
  "schedule:annual": 1,
};

// stopgapId: "economy.recorded-pay-comparable-mean"
export function recordedWorkAnnualPay(
  facts: RecordedPayFacts,
  input: {
    occupation: string | null;
    workKind?: string;
    jurisdictionId: EntityId | null;
    weeklyHours: number;
    onDate?: IsoDate;
    excludeWorkId?: EntityId;
  },
): {
  annualMinor: number;
  note: string;
} | null {
  const onDate = input.onDate ?? facts.onDate;
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: facts.nextSequence,
  };
  const samples: {
    annualMinor: number;
    local: boolean;
    flowId: EntityId;
  }[] = [];
  const works = new Map(facts.work.map((row) => [row.id, row]));
  for (const flow of facts.flows) {
    if (flow.startsAt > onDate || flow.basisReference.kind !== "work") continue;
    const workId = flow.basisReference.workRelationshipId;
    if (workId === input.excludeWorkId) continue;
    const work = works.get(workId);
    const role = facts.roles.get(recordedPayReceiptKey(workId, cutoff)) ?? null;
    if (
      !work ||
      work.startedAt > onDate ||
      !role ||
      facts.statuses.get(recordedPayReceiptKey(workId, cutoff))?.status !==
        "active"
    )
      continue;
    if (
      input.occupation
        ? role.occupationClassification !== input.occupation
        : !input.workKind || work.kind !== input.workKind
    )
      continue;
    if (input.workKind && work.kind !== input.workKind) continue;
    const terms =
      facts.terms.get(recordedPayReceiptKey(flow.id, cutoff)) ?? null;
    const periods = terms ? PERIODS[terms.cadenceKind] : undefined;
    if (
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== "USD" ||
      terms.amount.minorUnits <= 0 ||
      !periods
    )
      continue;
    const hours = weeklyHoursOf(role);
    if (hours <= 0 || input.weeklyHours <= 0) continue;
    samples.push({
      annualMinor:
        (terms.amount.minorUnits * periods * input.weeklyHours) / hours,
      local:
        input.jurisdictionId !== null &&
        role.locationJurisdictionId === input.jurisdictionId,
      flowId: flow.id,
    });
  }
  const local = samples.filter((row) => row.local);
  const comparable = local.length ? local : samples;
  if (!comparable.length) return null;
  return {
    annualMinor: Math.round(
      comparable.reduce((sum, row) => sum + row.annualMinor, 0) /
        comparable.length,
    ),
    note: `ESTIMATED FROM AVERAGE: ${comparable.length} comparable active recorded USD pay agreements, normalized to ${input.weeklyHours} hours a week. Source flows: ${comparable.map((row) => row.flowId).join(", ")}.`,
  };
}
