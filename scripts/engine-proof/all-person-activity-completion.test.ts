import { describe, expect, it } from "vitest";
import {
  createCharacterHistoryContextPerson,
  characterHistoryContextPersonId,
} from "../../src/simulation/character-history";
import {
  addSimulationMinutes,
  makeIsoDate,
  simulationMinutesBetween,
} from "../../src/simulation/dates";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../../src/simulation/future-transitions";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import {
  advanceWorldMinutes,
  cancelScheduledActivity,
  createScheduledActivity,
  rescheduleScheduledActivity,
  scheduledActivityState,
  performScheduledActivity,
} from "../../src/simulation/time-work";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  SimulationMoment,
  ScheduledActivityKind,
  World,
} from "../../src/simulation/types";
import { openClockFixture } from "./clock-fixtures";
import { nationalPlacePlan } from "./places";

const EMPTY = createFutureTransitionHandlerRegistry([]);
type Route = "one advance" | "15-minute partitions with reload";
const ROUTES: Route[] = ["one advance", "15-minute partitions with reload"];

function fixture(label: string): World {
  const selected = nationalPlacePlan(`c5-all-person:${label}`, 1).watched[0]!;
  const world = openClockFixture(
    { seed: selected.seed, placeKey: selected.placeKey, steps: [] },
    makeIsoDate("2026-01-05"),
  );
  // The fixture's other residents are not the played person's commitments.
  return {
    ...world,
    control: { kind: "person", personId: world.personOrder[0]! },
  };
}

function activity(
  world: World,
  key: string,
  participants: readonly EntityId[],
  start: SimulationMoment,
  end: SimulationMoment,
  movable = false,
  kind: ScheduledActivityKind = "confirmed",
  responsiblePersonId: EntityId | null = null,
  sourceEntityIds: readonly EntityId[] = participants,
): { world: World; id: EntityId } {
  const jurisdictionId = world.people[participants[0]!]!.homeJurisdictionId;
  const next = createScheduledActivity(world, {
    stableKey: key,
    title: key.startsWith("preschool")
      ? "Recorded preschool session"
      : "Recorded resident activity",
    summary:
      "Authored fixture interval with actual saved participants; no service quantity is inferred.",
    kind,
    start,
    end,
    participantPersonIds: participants,
    responsiblePersonId,
    location: {
      locationKey: `${key}:room`,
      label: "Fixture activity room",
      jurisdictionId,
    },
    sourceEntityIds: [...sourceEntityIds],
    flexibility: movable
      ? {
          kind: "movable",
          earliestStart: world.currentMoment,
          latestEnd: addSimulationMinutes(world.currentMoment, 240),
        }
      : { kind: "fixed" },
    access: { kind: "private", personIds: participants },
  });
  return { world: next, id: next.history.scheduledActivities.at(-1)!.id };
}

function advance(
  world: World,
  minutes: number,
  route: Route,
  registry: FutureTransitionHandlerRegistry = EMPTY,
): World {
  if (route === "one advance")
    return advanceWorldMinutes(world, minutes, registry);
  let next = world;
  let remaining = minutes;
  let ticks = 0;
  while (remaining > 0) {
    const step = Math.min(15, remaining);
    next = advanceWorldMinutes(next, step, registry);
    remaining -= step;
    if (++ticks === 2) next = deserializeWorld(serializeWorld(next));
  }
  return next;
}

function assertCompletedOnce(
  world: World,
  id: EntityId,
  expectedEnd: SimulationMoment,
) {
  const states = world.history.scheduledActivityStates.filter(
    (row) => row.activityId === id && row.status === "completed",
  );
  expect(states).toHaveLength(1);
  const state = scheduledActivityState(world, id);
  expect(state.status).toBe("completed");
  expect(state.recordedAt).toEqual(expectedEnd);
  const event = world.history.events.find(
    (row) => row.id === state.outcomeEventId,
  )!;
  expect(event).toBeDefined();
  expect(event.type).toBe("schedule.activity-completed");
  const saved = world.history.scheduledActivities.find((row) => row.id === id)!;
  expect(event.participants.map((row) => row.personId).sort()).toEqual(
    [...saved.participantPersonIds].sort(),
  );
  expect(event.involvedEntityIds).toContain(id);
  expect(
    world.history.events.filter(
      (row) =>
        row.type === "schedule.activity-completed" &&
        row.involvedEntityIds.includes(id),
    ),
  ).toHaveLength(1);
}

describe("canonical clock completes saved activities for all participants", () => {
  it.each(["saved", "reloaded"] as const)(
    "preserves explicit optional performance across a due producer: %s",
    (route) => {
      let world = fixture("explicit-due-producer");
      const personId = world.personOrder[0]!;
      const npcId = world.personOrder[1]!;
      const end = addSimulationMinutes(world.currentMoment, 2 * 1440);
      const saved = activity(
        world,
        "optional:explicit-across-producer",
        [personId],
        world.currentMoment,
        end,
        false,
        "tentative",
        personId,
      );
      world = scheduleFutureDueItem(saved.world, {
        stableKey: "c5:explicit-activity-producer-due",
        dueAt: makeIsoDate("2026-01-06"),
        transitionKey: "c5:explicit-activity-producer",
        entityIds: [npcId],
        jurisdictionId: world.people[npcId]!.homeJurisdictionId,
        provenance: { kind: "authored", note: "Saved fixture producer." },
      });
      if (route === "reloaded") world = deserializeWorld(serializeWorld(world));
      const registry = createFutureTransitionHandlerRegistry([
        [
          "c5:explicit-activity-producer",
          (input) => {
            const start = addSimulationMinutes(input.currentMoment, 15);
            const created = activity(
              input,
              "explicit-producer:npc-session",
              [npcId],
              start,
              addSimulationMinutes(start, 30),
            );
            return {
              world: created.world,
              status: "resolved",
              reasonKey: null,
              context: "Saved another resident's activity before explicit end.",
              outcomeEventId: null,
            };
          },
        ],
      ]);
      let next = performScheduledActivity(world, saved.id, registry);
      const created = next.history.scheduledActivities.find(
        (row) => row.stableKey === "explicit-producer:npc-session",
      )!;
      expect(created).toBeDefined();
      assertCompletedOnce(next, saved.id, end);
      assertCompletedOnce(
        next,
        created.id,
        scheduledActivityState(next, created.id).end,
      );
      next = advanceWorldMinutes(
        deserializeWorld(serializeWorld(next)),
        30,
        registry,
      );
      assertCompletedOnce(next, saved.id, end);
    },
  );

  it("preserves explicit performance of an optional activity", () => {
    const world = fixture("explicit-optional");
    const personId =
      world.control.kind === "person" ? world.control.personId : null;
    expect(personId).not.toBeNull();
    const end = addSimulationMinutes(world.currentMoment, 30);
    const saved = activity(
      world,
      "optional:explicit",
      [personId!],
      world.currentMoment,
      end,
      false,
      "tentative",
      personId,
    );
    const next = performScheduledActivity(saved.world, saved.id, EMPTY);
    assertCompletedOnce(next, saved.id, end);
  });

  it.each(ROUTES)(
    "travel inherits its saved destination commitment: %s",
    (route) => {
      for (const kind of ["confirmed", "tentative"] as const) {
        const world = fixture(`travel:${kind}`);
        const personId = world.personOrder[1]!;
        const arrival = addSimulationMinutes(world.currentMoment, 30);
        const end = addSimulationMinutes(world.currentMoment, 60);
        const destination = activity(
          world,
          `destination:${kind}`,
          [personId],
          arrival,
          end,
          false,
          kind,
        );
        const journey = activity(
          destination.world,
          `journey:${kind}`,
          [personId],
          world.currentMoment,
          arrival,
          false,
          "travel",
          null,
          [destination.id],
        );
        const next = advance(journey.world, 120, route);
        if (kind === "confirmed") {
          assertCompletedOnce(next, journey.id, arrival);
          assertCompletedOnce(next, destination.id, end);
        } else {
          expect(scheduledActivityState(next, journey.id).status).toBe(
            "scheduled",
          );
          expect(scheduledActivityState(next, destination.id).status).toBe(
            "scheduled",
          );
          expect(
            next.history.events.filter(
              (row) =>
                row.type === "schedule.activity-completed" &&
                (row.involvedEntityIds.includes(journey.id) ||
                  row.involvedEntityIds.includes(destination.id)),
            ),
          ).toHaveLength(0);
        }
      }
    },
  );

  it.each(ROUTES)(
    "does not turn an optional hold into attendance: %s",
    (route) => {
      const world = fixture("optional-holds");
      let next = world;
      const ids: EntityId[] = [];
      for (const [index, kind] of (
        ["tentative", "flexible", "travel"] as const
      ).entries()) {
        const saved = activity(
          next,
          `optional:${kind}`,
          [world.personOrder[1]!],
          addSimulationMinutes(world.currentMoment, index * 30),
          addSimulationMinutes(world.currentMoment, index * 30 + 30),
          false,
          kind,
        );
        next = saved.world;
        ids.push(saved.id);
      }
      next = advance(next, 120, route);
      for (const id of ids) {
        expect(scheduledActivityState(next, id).status).toBe("scheduled");
        expect(
          next.history.events.filter(
            (row) =>
              row.type === "schedule.activity-completed" &&
              row.involvedEntityIds.includes(id),
          ),
        ).toHaveLength(0);
      }
    },
  );

  it.each(ROUTES)(
    "completes distinct NPC activities sharing the exact end: %s",
    (route) => {
      const world = fixture("same-end");
      const end = addSimulationMinutes(world.currentMoment, 60);
      const first = activity(
        world,
        "same-end:first",
        [world.personOrder[1]!],
        world.currentMoment,
        end,
      );
      const second = activity(
        first.world,
        "same-end:second",
        [world.personOrder[2]!],
        world.currentMoment,
        end,
      );
      expect(first.id).not.toBe(second.id);
      let next = advance(second.world, 120, route);
      assertCompletedOnce(next, first.id, end);
      assertCompletedOnce(next, second.id, end);
      next = advance(deserializeWorld(serializeWorld(next)), 30, route);
      assertCompletedOnce(next, first.id, end);
      assertCompletedOnce(next, second.id, end);
    },
  );

  it.each(ROUTES)(
    "completes two other residents without controlled responsibility: %s",
    (route) => {
      const world = fixture("other-residents");
      const participants = world.personOrder.slice(1, 3);
      const end = addSimulationMinutes(world.currentMoment, 60);
      const saved = activity(
        world,
        "npc:session",
        participants,
        world.currentMoment,
        end,
      );
      let next = advance(saved.world, 120, route);
      assertCompletedOnce(next, saved.id, end);
      next = advance(deserializeWorld(serializeWorld(next)), 30, route);
      assertCompletedOnce(next, saved.id, end);
    },
  );

  it.each(ROUTES)(
    "completes a preschool roster containing only children: %s",
    (route) => {
      let world = fixture("children");
      const homeJurisdictionId =
        world.people[world.personOrder[0]!]!.homeJurisdictionId;
      const participants: EntityId[] = [];
      for (const index of [0, 1]) {
        const stableKey = `c5:child:${index}`;
        world = createCharacterHistoryContextPerson(world, {
          stableKey,
          givenName: index ? "Maya" : "Eli",
          familyName: "Fixture",
          birthDate: makeIsoDate("2021-06-01"),
          homeJurisdictionId,
        });
        participants.push(characterHistoryContextPersonId(world, stableKey));
      }
      const end = addSimulationMinutes(world.currentMoment, 60);
      const saved = activity(
        world,
        "preschool:session",
        participants,
        world.currentMoment,
        end,
      );
      let next = advance(saved.world, 120, route);
      assertCompletedOnce(next, saved.id, end);
      next = advance(deserializeWorld(serializeWorld(next)), 30, route);
      assertCompletedOnce(next, saved.id, end);
    },
  );

  it.each(ROUTES)(
    "completes an activity created by an actual due handler before the target: %s",
    (route) => {
      let world = fixture("due-created");
      const participants = world.personOrder.slice(1, 3);
      const dueAt = makeIsoDate("2026-01-06");
      const key = "c5:produce-activity";
      world = scheduleFutureDueItem(world, {
        stableKey: "c5:activity-producer-due",
        dueAt,
        transitionKey: key,
        entityIds: participants,
        jurisdictionId: world.people[participants[0]!]!.homeJurisdictionId,
        provenance: {
          kind: "authored",
          note: "Fixture producer runs on its actual saved due date.",
        },
      });
      const registry = createFutureTransitionHandlerRegistry([
        [
          key,
          (input) => {
            const start = addSimulationMinutes(input.currentMoment, 15);
            const saved = activity(
              input,
              "due-created:session",
              participants,
              start,
              addSimulationMinutes(start, 30),
            );
            return {
              world: saved.world,
              status: "resolved",
              reasonKey: null,
              context: "Saved actual activity interval.",
              outcomeEventId: null,
            };
          },
        ],
      ]);
      const minutes = 2 * 1440;
      const next = advance(world, minutes, route, registry);
      expect(
        simulationMinutesBetween(world.currentMoment, next.currentMoment),
      ).toBe(minutes);
      const created = next.history.scheduledActivities.find(
        (row) => row.stableKey === "due-created:session",
      )!;
      expect(created).toBeDefined();
      assertCompletedOnce(
        next,
        created.id,
        scheduledActivityState(next, created.id).end,
      );
    },
  );

  it.each(ROUTES)(
    "does not complete cancelled or stale rescheduled intervals: %s",
    (route) => {
      const world = fixture("stale");
      const participants = world.personOrder.slice(1, 3);
      const first = activity(
        world,
        "cancelled:session",
        participants,
        world.currentMoment,
        addSimulationMinutes(world.currentMoment, 30),
      );
      const cancelled = cancelScheduledActivity(first.world, first.id);
      const second = activity(
        cancelled,
        "moved:session",
        participants,
        addSimulationMinutes(world.currentMoment, 30),
        addSimulationMinutes(world.currentMoment, 60),
        true,
      );
      const end = addSimulationMinutes(world.currentMoment, 120);
      const moved = rescheduleScheduledActivity(second.world, {
        stableKey: "c5:move-session",
        activityId: second.id,
        start: addSimulationMinutes(world.currentMoment, 90),
        end,
      });
      expect(moved.ok).toBe(true);
      if (!moved.ok)
        throw new Error(`Fixture reschedule failed: ${moved.reason}`);
      let next = advance(moved.world, 60, route);
      expect(scheduledActivityState(next, first.id).status).toBe("cancelled");
      expect(scheduledActivityState(next, second.id).status).toBe("scheduled");
      expect(
        next.history.scheduledActivityStates.filter(
          (row) => row.status === "completed",
        ),
      ).toHaveLength(0);
      next = advance(next, 90, route);
      assertCompletedOnce(next, second.id, end);
      expect(scheduledActivityState(next, first.id).outcomeEventId).toBeNull();
    },
  );
});
