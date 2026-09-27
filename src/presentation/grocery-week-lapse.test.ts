import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  createWorkItem,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { HOUSEHOLD_ERRANDS_KEY } from "../simulation/life-opportunities";
import { workItemState } from "../simulation/time-work";
import type { World } from "../simulation";
import { letAdultTimePass } from "./adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, projectOrdinaryDay } from "./ordinary-life";

/**
 * A retired grocery chore does not recur in new lives. Older saved work items
 * can still lapse under their original rule without being replaced.
 */
const groceryWeeks = (world: World) =>
  world.history.workItems.filter((item) =>
    item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY),
  );

describe("the week's groceries", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "grocery-week-lapse",
      placeKey: "5010675",
      startAge: 34,
      questionnaire: "skipped" as const,
    }),
  ).game!;
  const personId = game.playerPersonId;
  // Ten weeks, a week at a time, without ever going shopping.
  let later = openOrdinaryLife(game.world, personId);
  for (let week = 0; week < 10; week += 1) later = letAdultTimePass(later, 7);

  it("does not create grocery weeks as ordinary time passes", () => {
    const weeks = groceryWeeks(later);
    expect(weeks).toHaveLength(0);
    assertWorldIntegrity(later);
  });

  it("lapses one legacy grocery item without writing a replacement", () => {
    const opened = openOrdinaryLife(game.world, personId);
    const legacy = createWorkItem(opened, {
      stableKey: HOUSEHOLD_ERRANDS_KEY,
      title: "The week's groceries",
      summary: "The household needs groceries for the week.",
      jurisdictionId: opened.people[personId]!.homeJurisdictionId,
      sourceEntityIds: [personId],
      focus: { kind: "person", personId },
      effort: { kind: "authored-duration", requiredMinutes: 150 },
      access: { kind: "private", personIds: [personId] },
      assignedPersonIds: [personId],
      playerRequirement: "decision",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
    const oldItem = groceryWeeks(legacy)[0]!;
    let aged = legacy;
    for (let week = 0; week < 3; week += 1) aged = letAdultTimePass(aged, 7);
    expect(workItemState(aged, oldItem.id).status).toBe("cancelled");
    expect(groceryWeeks(aged)).toHaveLength(1);
    expect(
      aged.history.events.filter(
        (event) =>
          event.type === "work.item-lapsed" &&
          event.summary === "The week went by without the grocery shopping.",
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(aged);
  });

  it("never tells the player the groceries have waited more than a week", () => {
    const day = projectOrdinaryDay(later, personId);
    const lines = JSON.stringify(day);
    expect(lines).not.toMatch(/Still not done, \d+ weeks on/);
  });

  it("writes nothing new on a reload", () => {
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(serializeWorld(letAdultTimePass(reloaded, 0))).toBe(
      serializeWorld(letAdultTimePass(later, 0)),
    );
  });
});
