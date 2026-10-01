import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../../src/simulation/demo";
import { createWorld, advanceWorld } from "../../src/simulation/world";
import { advanceWorldMinutes } from "../../src/simulation/time-work";
import {
  addDays,
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
      const { world, person, work, due, flow } = completedShift();
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
      const left = changeLifePathStatus(advanced, work.id, "leave");
      expect(left.ok, left.message).toBe(true);
      const reopened = deserializeWorld(serializeWorld(left.world));
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
