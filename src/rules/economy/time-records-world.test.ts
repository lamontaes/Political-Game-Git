import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addDays, addSimulationMinutes } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import {
  createScheduledActivity,
  createWorkItem,
  timeWorkEntityAvailableAt as nativeAvailable,
  timeWorkEntityExists as nativeExists,
} from "../../simulation/time-work";
import {
  timeWorkEntityAvailableAt,
  timeWorkEntityExists,
} from "./time-records";
import type { World } from "../../simulation/types";
function compare(world: World) {
  const ids = [
    ...world.history.scheduledActivities,
    ...world.history.scheduledActivityStates,
    ...world.history.workItems,
    ...world.history.workItemStates,
  ].map((row) => row.id);
  ids.push(
    createStableId("work-item", `${world.id}:rules2:missing-time-entity`),
  );
  for (const id of ids) {
    expect(timeWorkEntityExists({ records: world.history }, id)).toBe(
      nativeExists(world, id),
    );
    for (const date of [
      addDays(world.currentDate, -1),
      world.currentDate,
      addDays(world.currentDate, 1),
    ])
      for (const sequence of [
        0,
        ...[
          ...world.history.scheduledActivities,
          ...world.history.scheduledActivityStates,
          ...world.history.workItems,
          ...world.history.workItemStates,
        ].flatMap((row) => [row.sequence, row.sequence + 1]),
        world.history.nextSequence,
      ])
        expect(
          timeWorkEntityAvailableAt(
            { records: world.history },
            id,
            date,
            sequence,
          ),
        ).toBe(nativeAvailable(world, id, date, sequence));
  }
}
describe("full canonical scheduled/work record availability public owner across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:time-records:" + usps,
        });
        compare(fixture.world);
        let world = createScheduledActivity(fixture.world, {
          stableKey: "rules2:time:activity",
          title: "Saved activity control",
          summary:
            "Explicit record availability edge; no ordinary schedule claim.",
          kind: "confirmed",
          start: addSimulationMinutes(fixture.world.currentMoment, 30),
          end: addSimulationMinutes(fixture.world.currentMoment, 60),
          participantPersonIds: [fixture.personId],
          responsiblePersonId: fixture.personId,
          location: {
            locationKey: "rules2:time:place",
            label: "Saved location control",
            jurisdictionId: fixture.jurisdictionId,
          },
          sourceEntityIds: [fixture.personId],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [fixture.personId] },
        });
        world = createWorkItem(world, {
          stableKey: "rules2:time:work",
          title: "Saved work control",
          summary:
            "Explicit canonical work record availability, not ordinary assigned work.",
          jurisdictionId: fixture.jurisdictionId,
          sourceEntityIds: [fixture.personId],
          focus: { kind: "person", personId: fixture.personId },
          effort: { kind: "authored-duration", requiredMinutes: 120 },
          access: { kind: "private", personIds: [fixture.personId] },
          assignedPersonIds: [fixture.personId],
          playerRequirement: "none",
          waitingOnPersonIds: [],
          blocker: null,
          scheduledActivityId: null,
        });
        compare(world);
        const first = world.history.workItems.at(-1)!;
        const duplicate = {
          ...first,
          sequence: first.sequence + 1000,
          createdAt: {
            ...first.createdAt,
            date: addDays(world.currentDate, 1),
          },
        };
        const saved = {
          ...world,
          history: { ...world.history, workItems: [first, duplicate] },
        }; // Labeled noncanonical duplicate input; never committed through a writer.
        compare(saved);
      },
      30000,
    );
});
