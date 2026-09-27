import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { letAdultTimePass } from "./adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, projectOrdinaryDay } from "./ordinary-life";

/** A new life can run for ten weeks without recreating the removed route. */
describe("ordinary weeks without a grocery chore", () => {
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
  let later = openOrdinaryLife(game.world, personId);
  for (let week = 0; week < 10; week += 1) later = letAdultTimePass(later, 7);

  it("creates no grocery work item across ten weeks", () => {
    expect(
      later.history.workItems.some((item) =>
        item.stableKey.startsWith("ordinary-life:household-errands"),
      ),
    ).toBe(false);
    assertWorldIntegrity(later);
  });

  it("does not tell the player an old grocery task is waiting", () => {
    expect(JSON.stringify(projectOrdinaryDay(later, personId))).not.toMatch(
      /Still not done, \d+ weeks on/,
    );
  });

  it("continues identically after save and reload", () => {
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(serializeWorld(letAdultTimePass(reloaded, 0))).toBe(
      serializeWorld(letAdultTimePass(later, 0)),
    );
  });
});
