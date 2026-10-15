import { workRoleAt, workStatusAt } from "./life-queries";
import { weeklyHoursOf } from "./living-world/town-pay";
import { resourceFlowTermsAt } from "./resource-queries";
import type { EntityId, IsoDate, World } from "./types";

const PERIODS: Readonly<Record<string, number>> = {
  "schedule:weekly": 52,
  "schedule:biweekly": 26,
  "schedule:semimonthly": 24,
  "schedule:monthly": 12,
  "schedule:annual": 1,
};

/** Recorded occupation hours, preferring active work in the same place. */
export function recordedOccupationWeeklyHours(
  world: World,
  occupation: string,
  jurisdictionId: EntityId | null,
  workRelationshipId?: EntityId,
): number | null {
  const hours: { weekly: number; local: boolean }[] = [];
  for (const work of world.history.workRelationships) {
    if (
      work.startedAt > world.currentDate ||
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

/** Average comparable active saved pay, with local records preferred. */
export function recordedWorkAnnualPay(
  world: World,
  input: {
    occupation: string | null;
    workKind?: string;
    jurisdictionId: EntityId | null;
    weeklyHours: number;
    onDate?: IsoDate;
    excludeWorkId?: EntityId;
  },
): { annualMinor: number; note: string } | null {
  const onDate = input.onDate ?? world.currentDate;
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const samples: { annualMinor: number; local: boolean; flowId: EntityId }[] =
    [];
  const works = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  for (const flow of world.history.resourceFlows) {
    if (flow.startsAt > onDate || flow.basisReference.kind !== "work") continue;
    const workId = flow.basisReference.workRelationshipId;
    if (workId === input.excludeWorkId) continue;
    const work = works.get(workId);
    const role = workRoleAt(world, workId, cutoff);
    if (
      !work ||
      work.startedAt > onDate ||
      !role ||
      workStatusAt(world, workId, cutoff)?.status !== "active"
    )
      continue;
    if (
      input.occupation
        ? role.occupationClassification !== input.occupation
        : !input.workKind || work.kind !== input.workKind
    )
      continue;
    if (input.workKind && work.kind !== input.workKind) continue;
    const terms = resourceFlowTermsAt(world, flow.id, cutoff);
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
