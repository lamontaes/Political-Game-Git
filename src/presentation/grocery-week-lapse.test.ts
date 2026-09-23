import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
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
 * A grocery week nobody shops for lapses when the next week comes.
 *
 * Found in a San Antonio life, where the calendar said the groceries were
 * "Still not done, 61 weeks on". Played in Burlington, Vermont.
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

  it("lapses each unshopped week and opens the next, so one week is open at a time", () => {
    const weeks = groceryWeeks(later);
    expect(weeks.length).toBeGreaterThan(5);
    const open = weeks.filter(
      (item) => workItemState(later, item.id).status === "active",
    );
    expect(open).toHaveLength(1);
    const lapsed = weeks.filter(
      (item) => workItemState(later, item.id).status === "cancelled",
    );
    expect(lapsed.length).toBe(weeks.length - 1);
    expect(
      later.history.events.filter(
        (event) =>
          event.type === "work.item-lapsed" &&
          event.summary === "The week went by without the grocery shopping.",
      ),
    ).toHaveLength(lapsed.length);
    assertWorldIntegrity(later);
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
