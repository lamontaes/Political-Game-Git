import { personName } from "../simulation/people";
import { addSimulationMinutes } from "../simulation/dates";
import { scheduledActivityPerformanceTiming } from "../simulation/time-work";
import {
  judicialOfficeAssignments,
  judicialOfficeContexts,
  judicialOfficeCoverage,
  judicialOfficeFollowUps,
  receiveJudicialOfficeWork,
} from "../simulation/judicial-office-work";
import type { EntityId, World } from "../simulation/types";

/** Pure feature-local Work adapter. UI-core owns its registration in PlayerGame. */
export function projectJudicialOffice(
  world: World,
  courtOrganizationId: EntityId,
) {
  const office = judicialOfficeContexts(world).find(
    (o) => o.courtOrganizationId === courtOrganizationId,
  );
  if (!office) return null;
  const assignments = judicialOfficeAssignments(world, courtOrganizationId);
  return {
    office,
    assignments: assignments.map((a) => ({
      ...a,
      participants: a.source.participants.map((p) => ({
        id: p.personId,
        name: personName(world.people[p.personId]!),
      })),
      timing:
        a.activityState.status === "scheduled"
          ? scheduledActivityPerformanceTiming(world, a.activityId)
          : null,
    })),
    followUps: judicialOfficeFollowUps(world, courtOrganizationId).map((f) => ({
      ...f,
      completion:
        world.history.events.find((e) => e.id === f.state.outcomeEventId) ??
        null,
    })),
    coverage: judicialOfficeCoverage(world, courtOrganizationId),
  };
}

/** Introduces the next eligible authored episode once; reading never calls this. */
export function receiveNextJudicialOfficeWork(
  world: World,
  courtOrganizationId: EntityId,
) {
  const view = projectJudicialOffice(world, courtOrganizationId);
  if (!view)
    return {
      ok: false as const,
      world,
      reason: "No active judicial office role at this court.",
    };
  if (
    view.assignments.some((a) => a.state.status === "active") ||
    view.followUps.some((f) => f.state.status === "active")
  )
    return {
      ok: false as const,
      world,
      reason: "Finish the current office review and follow-up first.",
    };
  const next = view.coverage.find(
    (r) =>
      r.consumerStatus === "supported-office-practice" &&
      !view.assignments.some((a) => a.kernelId === r.id),
  );
  if (!next)
    return {
      ok: false as const,
      world,
      reason:
        "There is no further supported office correspondence for this role.",
    };
  return receiveJudicialOfficeWork(
    world,
    courtOrganizationId,
    next.id,
    addSimulationMinutes(world.currentMoment, 10),
  );
}
