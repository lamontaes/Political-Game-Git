import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../../src/simulation/demo";
import { createWorld, advanceWorld } from "../../src/simulation/world";
import {
  advanceWorldMinutes,
  createScheduledActivity,
  advanceWhileJoiningScheduledActivity,
  performRemainingScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "../../src/simulation/time-work";
import {
  addDays,
  addSimulationMinutes,
  simulationMomentOnLocalDate,
  simulationMinutesBetween,
} from "../../src/simulation/dates";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
  changeLifePathStatus,
} from "../../src/simulation/life-paths2";
import { resourcePositionAt } from "../../src/simulation/resource-queries";
import { money } from "../../src/simulation/resources";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import type { World } from "../../src/simulation/types";

function completedShift() {
  const demo = createDemoWorld("a4-default-clock-payday", { peopleCount: 6 });
  const person = demo.people[demo.personOrder[0]!]!;
  let world = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    currentMoment: demo.currentMoment,
    jurisdictions: Object.values(demo.jurisdictions),
    people: [person],
    control: { kind: "person", personId: person.id },
  });
  const entered = enterLifePath(world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  world = entered.world;
  const work = world.history.workRelationships.at(-1)!;
  const scheduled = scheduleLifePathSession(world, work.id);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  const worked = performLifePathSession(scheduled.world, activity.id);
  expect(worked.ok, worked.message).toBe(true);
  world = worked.world;
  const due = world.history.futureDueItems.find(
    (row) => row.transitionKey === "life-paths2:pay",
  );
  if (!due) throw new Error("Actual completed shift did not schedule payday");
  const flow = world.history.resourceFlows.find((row) =>
    due.entityIds.includes(row.id),
  );
  if (!flow) throw new Error("Payday has no actual wage flow");
  // End only after the completed shift, before the next routine can earn another.
  const left = changeLifePathStatus(world, work.id, "leave");
  expect(left.ok, left.message).toBe(true);
  world = left.world;
  expect(world.history.futureDueItems.some((row) => row.id === due.id)).toBe(
    true,
  );
  return { world, person, work, due, flow };
}
function paid(world: World, flowId: string) {
  return world.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === flowId && row.status === "completed",
  );
}
describe("A4 default clock carries actual due payday", () => {
  it.each(["days", "minutes"] as const)(
    "pays one completed shift through default %s and preserves it through Continue",
    (route: "days" | "minutes") => {
      const { world, person, due, flow } = completedShift();
      expect(paid(world, flow.id)).toHaveLength(0);
      const advance = (input: World) => {
        if (route === "days") return advanceWorld(input, 1);
        const target = simulationMomentOnLocalDate(
          input.currentMoment,
          addDays(input.currentDate, 1),
        );
        return advanceWorldMinutes(
          input,
          simulationMinutesBetween(input.currentMoment, target),
        );
      };
      const advanced = advance(world);
      const outcomes = paid(advanced, flow.id);
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]!.occurredAt).toBe(due.dueAt);
      expect(outcomes[0]!.transferredAmount.minorUnits).toBeGreaterThan(0);
      expect(
        advanced.history.futureDueItemStates.find(
          (row) => row.dueItemId === due.id && row.status === "resolved",
        ),
      ).toBeDefined();
      const balance = resourcePositionAt(
        advanced,
        { kind: "person", personId: person.id },
        money(0, "USD").currency,
      );
      expect(balance?.liquidBalance.minorUnits).toBeGreaterThan(0);
      const reopened = deserializeWorld(serializeWorld(advanced));
      expect(paid(reopened, flow.id)).toEqual(outcomes);
      const repeated = advance(reopened);
      expect(paid(repeated, flow.id)).toEqual(outcomes);
      expect(
        resourcePositionAt(
          repeated,
          { kind: "person", personId: person.id },
          money(0, "USD").currency,
        )?.liquidBalance,
      ).toEqual(balance!.liquidBalance);
    },
  );
});

describe("A4 activity entries carry actual due payday", () => {
  it.each(["join", "remaining", "perform"] as const)(
    "settles saved pay through default %s and preserves the account through Continue",
    (route: "join" | "remaining" | "perform") => {
      const { world, person, due, flow } = completedShift();
      expect(paid(world, flow.id)).toHaveLength(0);
      const completedWork = world.history.events.find((event) =>
        due.entityIds.includes(event.id),
      );
      expect(completedWork).toBeDefined();
      const scheduled = createScheduledActivity(world, {
        stableKey: "a4-activity-payday:" + route,
        title: "A recorded personal appointment",
        summary:
          "Explicit interval across the completed shift's actual pay date.",
        kind: "confirmed",
        start: world.currentMoment,
        end: addSimulationMinutes(world.currentMoment, 1500),
        participantPersonIds: [person.id],
        responsiblePersonId: person.id,
        location: {
          locationKey: "a4-activity-payday",
          label: "Recorded appointment",
          jurisdictionId: null,
        },
        sourceEntityIds: [completedWork!.id],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [person.id] },
      });
      const activity = scheduled.history.scheduledActivities.at(-1)!;
      let advanced: World;
      if (route === "join") {
        advanced = advanceWhileJoiningScheduledActivity(
          scheduled,
          activity.id,
          1440,
        );
        expect(scheduledActivityState(advanced, activity.id).status).toBe(
          "scheduled",
        );
      } else if (route === "remaining") {
        const joined = advanceWhileJoiningScheduledActivity(
          scheduled,
          activity.id,
          1,
        );
        expect(joined.currentMoment).not.toEqual(scheduled.currentMoment);
        advanced = performRemainingScheduledActivity(joined, activity.id);
        expect(scheduledActivityState(advanced, activity.id).status).toBe(
          "completed",
        );
      } else {
        advanced = performScheduledActivity(scheduled, activity.id);
        expect(scheduledActivityState(advanced, activity.id).status).toBe(
          "completed",
        );
      }
      const outcomes = paid(advanced, flow.id);
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]!.occurredAt).toBe(due.dueAt);
      expect(outcomes[0]!.transferredAmount.minorUnits).toBeGreaterThan(0);
      expect(
        advanced.history.futureDueItemStates.find(
          (row) => row.dueItemId === due.id && row.status === "resolved",
        ),
      ).toBeDefined();
      const position = resourcePositionAt(
        advanced,
        { kind: "person", personId: person.id },
        money(0, "USD").currency,
      );
      expect(position?.liquidBalance.minorUnits).toBeGreaterThan(0);
      const reopened = deserializeWorld(serializeWorld(advanced));
      expect(paid(reopened, flow.id)).toEqual(outcomes);
      const repeated = advanceWorldMinutes(reopened, 1440);
      expect(paid(repeated, flow.id)).toEqual(outcomes);
      expect(
        resourcePositionAt(
          repeated,
          { kind: "person", personId: person.id },
          money(0, "USD").currency,
        )?.liquidBalance,
      ).toEqual(position!.liquidBalance);
    },
  );
});
