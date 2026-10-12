import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addSimulationMinutes } from "../../simulation/dates";
import {
  createScheduledActivity,
  cancelScheduledActivity,
  scheduledConflictExists as native,
} from "../../simulation/time-work";
import { scheduledConflictExists } from "./time-conflicts";
import type { World } from "../../simulation/types";
function compare(world: World) {
  const facts = { records: world.history };
  for (const persons of [
    [],
    [world.personOrder[0]!],
    [world.personOrder[1]!],
    world.personOrder.slice(0, 2),
  ])
    for (const [start, end] of [
      [0, 30],
      [0, 31],
      [30, 60],
      [60, 90],
      [59, 61],
      [89, 91],
      [-1, 120],
      [30, 30],
    ] as const) {
      const left = addSimulationMinutes(world.currentMoment, start),
        right = addSimulationMinutes(world.currentMoment, end);
      expect(scheduledConflictExists(facts, persons, left, right)).toBe(
        native(world, persons, left, right),
      );
    }
}
describe("full scheduled conflict public owner/half-open intervals across all 56 generated Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:time-conflicts:" + usps,
        });
        compare(fixture.world);
        let world = fixture.world;
        for (const [index, personId] of world.personOrder.slice(0, 2).entries())
          world = createScheduledActivity(world, {
            stableKey: "rules2:conflict:activity:" + index,
            title: "Saved conflict control",
            summary:
              "Canonical scheduled conflict/endpoint edge; not ordinary NPC activity.",
            kind: "confirmed",
            start: addSimulationMinutes(
              world.currentMoment,
              index === 0 ? 30 : 60,
            ),
            end: addSimulationMinutes(
              world.currentMoment,
              index === 0 ? 60 : 90,
            ),
            participantPersonIds: [personId],
            responsiblePersonId: personId,
            location: {
              locationKey: "rules2:conflict:place",
              label: "Saved location control",
              jurisdictionId: fixture.jurisdictionId,
            },
            sourceEntityIds: [personId],
            flexibility: { kind: "fixed" },
            access: { kind: "private", personIds: [personId] },
          });
        compare(world);
        world = cancelScheduledActivity(
          world,
          world.history.scheduledActivities[0]!.id,
        );
        compare(world);
        // Read-only reordered/duplicated state-array control; no writer commits this unsupported history. Native last array row wins, without an extra date/sequence frontier.
        const states = world.history.scheduledActivityStates;
        const earliest = states[0]!;
        compare({
          ...world,
          history: {
            ...world.history,
            scheduledActivityStates: [
              ...states,
              {
                ...earliest,
                recordedAt: addSimulationMinutes(world.currentMoment, 120),
                sequence: world.history.nextSequence + 1000,
              },
            ],
          },
        });
      },
      30000,
    );
});
