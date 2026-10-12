/** Complete retained employer wage owner, including weekly-hours preference, comparable pay, source floor and designed fallback. */
import type {
  EntityId,
  OccupationClassification,
} from "../../simulation/types";
import {
  recordedWorkAnnualPay,
  recordedPayReceiptKey,
  type RecordedPayFacts,
} from "./recorded-pay";
import { weeklyHoursOf } from "./payday-and-shift";
import {
  stateMedianAnnualWage as sourceAnnual,
  townMinimumHourly as sourceMinimum,
  type WageSourceFacts,
} from "./wage-source";
// stopgapId: "economy.employer-wage-designed-fallback"
export const LOCAL_BUSINESS_ESTIMATE = {
  researchQuestionId: "businesses-owners-and-wealth",
  currency: "USD",
  provenance: "designed",
  estimated: false,
  rationale:
    "designed game fallback: reads an occupation and area with no published wage and balances it at about 16 dollars an hour full time, so a worker is never paid nothing where the record is silent",
  monthlyWageMinor: 280000,
} as const;
export interface EmployerWageFacts {
  readonly wage: WageSourceFacts;
  readonly pay?: RecordedPayFacts;
}
export function localBusinessWageMinor(
  facts: EmployerWageFacts,
  kind: {
    readonly workerOccupation: OccupationClassification;
    readonly workerRelationshipId?: EntityId;
  },
  id: EntityId | null,
  workId = kind.workerRelationshipId,
) {
  return compile(facts.wage)(kind, id, facts.pay, workId);
}
function compile(wage: WageSourceFacts) {
  const stateMedianAnnualWage = (occupation: string, id: EntityId | null) =>
    sourceAnnual(wage, occupation, id);
  const townMinimumHourly = (id: EntityId | null) => sourceMinimum(wage, id);
  function workRoleAt(facts: RecordedPayFacts, id: EntityId) {
    return (
      facts.roles.get(
        recordedPayReceiptKey(id, {
          asOfDate: facts.onDate,
          historySequenceExclusive: facts.nextSequence,
        }),
      ) ?? undefined
    );
  }
  function workStatusAt(facts: RecordedPayFacts, id: EntityId) {
    return (
      facts.statuses.get(
        recordedPayReceiptKey(id, {
          asOfDate: facts.onDate,
          historySequenceExclusive: facts.nextSequence,
        }),
      ) ?? undefined
    );
  }
  function recordedOccupationWeeklyHours(
    world: RecordedPayFacts,
    occupation: string,
    jurisdictionId: EntityId | null,
    workRelationshipId?: EntityId,
  ): number | null {
    const hours: {
      weekly: number;
      local: boolean;
    }[] = [];
    for (const work of world.work) {
      if (
        work.startedAt > world.onDate ||
        workStatusAt(world, work.id)?.status !== "active"
      )
        continue;
      const role = workRoleAt(world, work.id);
      if (role?.occupationClassification !== occupation) continue;
      const weekly = weeklyHoursOf(role);
      if (!Number.isFinite(weekly) || weekly < 0) continue;
      if (work.id === workRelationshipId) return weekly;
      hours.push({
        weekly,
        local:
          jurisdictionId !== null &&
          role.locationJurisdictionId === jurisdictionId,
      });
    }
    const local = hours.filter((row) => row.local);
    const comparable = local.length ? local : hours;
    return comparable.length
      ? comparable.reduce((sum, row) => sum + row.weekly, 0) / comparable.length
      : null;
  }
  function localBusinessWageMinor(
    kind: {
      readonly workerOccupation: OccupationClassification;
      readonly workerRelationshipId?: EntityId;
    },
    jurisdictionId: EntityId | null,
    world?: RecordedPayFacts,
    workRelationshipId = kind.workerRelationshipId,
  ): {
    readonly monthlyMinor: number;
    readonly sourced: boolean;
  } {
    const weeklyHours = world
      ? recordedOccupationWeeklyHours(
          world,
          kind.workerOccupation,
          jurisdictionId,
          workRelationshipId,
        )
      : null;
    const recorded =
      world && weeklyHours !== null
        ? recordedWorkAnnualPay(world, {
            occupation: kind.workerOccupation,
            jurisdictionId,
            weeklyHours,
          })
        : null;
    if (recorded)
      return {
        monthlyMinor: Math.round(recorded.annualMinor / 12),
        sourced: true,
      };
    const annual = stateMedianAnnualWage(kind.workerOccupation, jurisdictionId);
    const minimum = townMinimumHourly(jurisdictionId);
    const minimumAnnual =
      minimum !== null && weeklyHours !== null
        ? minimum * weeklyHours * 52
        : null;
    return annual !== null
      ? {
          monthlyMinor: Math.round(
            (Math.max(annual, minimumAnnual ?? annual) * 100) / 12,
          ),
          sourced: true,
        }
      : {
          monthlyMinor: LOCAL_BUSINESS_ESTIMATE.monthlyWageMinor,
          sourced: false,
        };
  }
  return localBusinessWageMinor;
}
