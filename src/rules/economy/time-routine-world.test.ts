import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as native from "../../simulation/time-work";
import {
  addSimulationMinutes,
  simulationMinutesBetween,
} from "../../simulation/dates";
import { ensureCrisisMortality } from "../../simulation/crisis/mortality";
import { ensurePeopleGoalReview } from "../../simulation/people-goal-review";
import { recordStoryMoments } from "../../simulation/story/moments";
import * as own from "./time-routine";
import type {
  World,
  EntityId,
  RoutineWindow,
  RoutineTimeHook,
  FutureTransitionHandlerRegistry,
} from "../../simulation/types";
function prepare(world: World) {
  return ensurePeopleGoalReview(ensureCrisisMortality(world));
}
function addActivity(world: World, key: string, start: number, end: number) {
  const personId = world.personOrder[0]!;
  return native.createScheduledActivity(world, {
    stableKey: key,
    title: "Canonical routine clock control",
    summary: "Labeled saved window control, not an NPC clock benchmark",
    kind: "confirmed",
    start: addSimulationMinutes(world.currentMoment, start),
    end: addSimulationMinutes(world.currentMoment, end),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "rules2:routine:place",
      label: "Canonical recorded location",
      jurisdictionId: world.jurisdictionOrder[0]!,
    },
    sourceEntityIds: [personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
}
function hookFor(
  base: World,
  windows: readonly [number, number][],
): RoutineTimeHook {
  const slots = windows.map(([start, end]): RoutineWindow => ({
    relationshipId: base.personOrder[0]!,
    kind: "work",
    start: addSimulationMinutes(base.currentMoment, start),
    end: addSimulationMinutes(base.currentMoment, end),
    autoResolvable: true,
  }));
  return {
    isAutoResolvableActivity: (world, id) =>
      world.history.scheduledActivities.some(
        (a) => a.id === id && a.stableKey.startsWith("rules2:routine:window:"),
      ),
    projectWindows: (world, target) =>
      slots.filter(
        (slot) =>
          slot.start.date <= target.date &&
          !world.history.scheduledActivities.some(
            (a) =>
              a.stableKey === key(slot) &&
              native.scheduledActivityState(world, a.id).status === "completed",
          ),
      ),
    ensureScheduled: (world, slot) =>
      world.history.scheduledActivities.some((a) => a.stableKey === key(slot))
        ? world
        : addActivity(
            world,
            key(slot),
            simulationMinutesBetween(world.currentMoment, slot.start),
            simulationMinutesBetween(world.currentMoment, slot.end),
          ),
    afterActivityCompleted: (world) => world,
  };
}
function key(slot: RoutineWindow) {
  return (
    "rules2:routine:window:" +
    slot.start.minuteOfDay +
    ":" +
    slot.end.minuteOfDay
  );
}
function registry(hook?: RoutineTimeHook): FutureTransitionHandlerRegistry {
  return { get: () => undefined, ...(hook ? { routine: hook } : {}) };
}
const WORLD_BY_FACTS = new WeakMap<own.TimeRoutineFacts, World>();
const FACTS_BY_WORLD = new WeakMap<
  World,
  Map<FutureTransitionHandlerRegistry, own.TimeRoutineFacts>
>();
function facts(
  world: World,
  handlers: FutureTransitionHandlerRegistry,
): own.TimeRoutineFacts {
  const cached = FACTS_BY_WORLD.get(world)?.get(handlers);
  if (cached) return cached;
  const result: own.TimeRoutineFacts = {
    records: world.history,
    currentMoment: world.currentMoment,
    control: world.control,
    actionSequence: world.actionSequence,
    sources: {
      ...(handlers.routine
        ? {
            routine: {
              projectWindows: (nextFacts, target) =>
                handlers.routine!.projectWindows(
                  WORLD_BY_FACTS.get(nextFacts)!,
                  target,
                ),
              isAutoResolvableActivity: (nextFacts, id) =>
                handlers.routine!.isAutoResolvableActivity(
                  WORLD_BY_FACTS.get(nextFacts)!,
                  id,
                ),
            },
          }
        : {}),
      ...(handlers.stopAtNewTentativeHold
        ? { stopAtNewTentativeHold: handlers.stopAtNewTentativeHold }
        : {}),
    },
  };
  WORLD_BY_FACTS.set(result, world);
  const cache = FACTS_BY_WORLD.get(world) ?? new Map();
  cache.set(handlers, result);
  FACTS_BY_WORLD.set(world, cache);
  return result;
}
// Exact clock transport is private in Native. These are immutable receipts from unchanged PUBLIC parents, not a second World writer or a live adapter. The shelf computes every clock request and its full starting frontier before receipt intake; common core2 clock transport is an OPEN stopgap.
function run(
  world: World,
  minutes: number,
  handlers: FutureTransitionHandlerRegistry,
  receipts: readonly World[] = [],
  activityId?: EntityId,
) {
  const expected = activityId
    ? native.performRemainingScheduledActivity(world, activityId, handlers)
    : native.advanceWorldMinutes(world, minutes, handlers);
  const queue = [...receipts, expected];
  let current = world,
    clocks = 0;
  const gen = activityId
    ? own.performRemainingScheduledActivity(
        facts(world, handlers),
        activityId,
        facts(world, handlers).sources,
      )
    : own.advanceWorldMinutes(facts(world, handlers), minutes);
  let step = gen.next();
  while (!step.done) {
    const r = step.value;
    switch (r.kind) {
      case "prepareSchedules":
        current = prepare(current);
        break;
      case "ensureScheduled":
        current = WORLD_BY_FACTS.get(r.sourceFacts)!;
        current = handlers.routine!.ensureScheduled(current, r.slot);
        break;
      case "recordStoryMoments":
        current = WORLD_BY_FACTS.get(r.sourceFacts)!;
        current = recordStoryMoments(current);
        break;
      case "canonicalClock": {
        current = WORLD_BY_FACTS.get(r.sourceFacts)!;
        expect(r.start).toEqual(current.currentMoment);
        expect(r.actionSequence).toBe(current.actionSequence);
        expect(r.historySequence).toBe(current.history.nextSequence);
        const receipt = queue[clocks++]!;
        expect(receipt.currentMoment).toEqual(r.target);
        expect(receipt.actionSequence).toBe(current.actionSequence + 1);
        const event = receipt.history.events.find(
          (e) =>
            e.stableKey ===
            `action:${r.actionSequence}:minutes-advanced:${r.start.date}:${r.start.minuteOfDay}:${r.minutes}:${r.target.date}:${r.target.minuteOfDay}`,
        );
        expect(event).toBeDefined();
        if (r.completedActivityId)
          expect(
            native.scheduledActivityState(receipt, r.completedActivityId)
              .status,
          ).toBe("completed");
        else
          expect(
            receipt.history.scheduledActivityStates.filter(
              (s) => s.change === "completed",
            ).length,
          ).toBe(
            current.history.scheduledActivityStates.filter(
              (s) => s.change === "completed",
            ).length,
          );
        current = receipt;
        break;
      }
    }
    step = gen.next(facts(current, handlers));
  }
  current = WORLD_BY_FACTS.get(step.value)!;
  expect(current).toEqual(expected);
  return current;
}
describe.each(Object.keys(STATES))(
  "full routine public owners in US-%s",
  (usps) => {
    it("matches whole/partial/two windows, half-open blockers, saved completion and clock DTO frontiers", () => {
      const f = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:time-routine:" + usps,
      });
      const base = f.world;
      run(base, 90, registry());
      run(addActivity(base, "rules2:manual:blocked", 30, 60), 90, registry());
      const hook = hookFor(base, [[0, 60]]),
        handlers = registry(hook);
      run(base, 60, handlers);
      const partial = run(base, 30, handlers);
      const activity = partial.history.scheduledActivities.find((a) =>
        a.stableKey.startsWith("rules2:routine:window:"),
      )!;
      run(partial, 0, handlers, [], activity.id);
      run(base, 0, handlers, [], f.personId);
      run(addActivity(base, "rules2:manual:touching", 60, 90), 60, handlers);
      run(addActivity(base, "rules2:manual:overlapping", 30, 90), 60, handlers);
      const two = hookFor(base, [
          [0, 30],
          [30, 60],
        ]),
        twoHandlers = registry(two);
      let first = prepare(base);
      const slot = two.projectWindows(
        first,
        addSimulationMinutes(base.currentMoment, 60),
      )[0]!;
      first = two.ensureScheduled(first, slot);
      const id = first.history.scheduledActivities.find(
        (a) => a.stableKey === key(slot),
      )!.id;
      first = native.performScheduledActivity(first, id, twoHandlers);
      run(base, 60, twoHandlers, [first]);
      expect(() => run(base, -1, registry())).toThrow("positive whole minutes");
    }, 120000);
  },
);
