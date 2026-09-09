import { activeWorkRelationshipsAt } from "./life-queries";
import { scheduledActivityState } from "./time-work";
import { compareSimulationMoments } from "./dates";
import type { EntityId, World, SimulationMoment } from "./types";

/** Read-only shared adapter: identity, current role, and exact calendar availability. */
export function activeLifePathWorkers(
  world: World,
  organizationId: EntityId,
  interval?: {
    readonly start: SimulationMoment;
    readonly end: SimulationMoment;
  },
) {
  return world.personOrder.flatMap((personId) =>
    activeWorkRelationshipsAt(world, personId)
      .filter((entry) => entry.relationship.organizationId === organizationId)
      .map((entry) => ({
        ...entry,
        personId,
        available:
          !interval ||
          !world.history.scheduledActivities.some((a) => {
            if (!a.participantPersonIds.includes(personId)) return false;
            const state = scheduledActivityState(world, a.id);
            return (
              state.status === "scheduled" &&
              compareSimulationMoments(state.start, interval.end) < 0 &&
              compareSimulationMoments(interval.start, state.end) < 0
            );
          }),
      })),
  );
}
