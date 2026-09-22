import { describe, expect, it } from "vitest";

import { SUPPORT_FLOOR_BASIS_POINTS } from "./campaign-support";
import { createExplicitGeographyLife } from "../presentation/new-game-geography";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import { letAdultTimePass } from "../presentation/adult-life";

/**
 * Election night cannot print a share the support model forbids.
 *
 * Support is floored at one percent for every candidate all the way through a
 * campaign. The result then added a swing wider than that floor and clamped at
 * a single basis point, so a rival held at the floor and drawing the worst
 * swing finished on 0.01 percent — one vote in ten thousand, shown to the
 * player as 0.0%. Found by playing: a candidate who worked every afternoon the
 * game offered won 99.99 to 0.01.
 *
 * This says nothing about how steep the curve should be, which is a separate
 * question. It says only that both ends of the day use the same floor.
 */
describe("the result respects the floor the campaign respected", () => {
  it("never puts a candidate below the support floor, however lopsided the race", () => {
    const created = createExplicitGeographyLife({
      placeKey: "2100694",
      seed: "election-floor",
      startAge: 40,
      startKind: "normal",
      depth: "begin-adult-life",
    });
    let world = fileForOffice(
      created.game.world,
      created.game.playerPersonId,
      null,
      "us-ky-general-assembly-v1:house",
    );
    const personId = created.game.playerPersonId;

    // Work every afternoon the game offers, which is what produced 0.01%.
    let taken = 0;
    for (let day = 0; day < 40; day += 1) {
      if (projectCampaign(world, personId).phase !== "active") break;
      for (let slot = 0; slot < 6; slot += 1) {
        const offers = projectCampaign(world, personId).offers.filter(
          (offer) => offer.available !== false,
        );
        if (offers.length === 0) break;
        try {
          const next = spendAnAfternoon(
            world,
            personId,
            offers[(taken + slot) % offers.length]!.kind,
          );
          if (next === world) break;
          world = next;
          taken += 1;
        } catch {
          break;
        }
      }
      world = letAdultTimePass(world, 1);
    }

    const view = projectCampaign(world, personId);
    expect(view.phase).toBe("won");
    expect(taken).toBeGreaterThan(50);
    for (const tally of view.tallies) {
      expect(tally.votes).toBeGreaterThanOrEqual(SUPPORT_FLOOR_BASIS_POINTS);
    }
  }, 180_000);
});
