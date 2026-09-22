import { describe, expect, it } from "vitest";

import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { commitCampaignWeek, projectCampaignWeek } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { abandonUnperformableCommitment } from "./scheduled-activity-choice";
import { venueActivities } from "./venue-activity";

/**
 * A life must never reach a state with no legal move.
 *
 * Committing a campaign week books sessions at venues no ordinary life has an
 * authored journey to. The calendar rightly refuses to carry them out, and
 * time rightly will not step over a confirmed commitment — which together
 * ended the life on its first morning, measured in
 * `docs/playtest/committing-a-campaign-week-stops-time-2026-09-22.md`.
 *
 * This holds the guard: such a commitment can be given up, and giving it up
 * lets time move again. It does not assert anything about whether the session
 * should instead become performable, which is a separate decision.
 */
function committedCampaignWeek(seed: string) {
  // Not Kentucky. The stall was measured in Baltimore and the default start is
  // a compatibility placeKey, not where this belongs.
  const home = requireLocalityInState("US-MD", "Baltimore");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: home.key,
    }),
  ).game!;
  const personId = game.playerPersonId;
  const filed = fileForOffice(game.world, personId);
  const week = projectCampaignWeek(filed, personId)!;
  const committed = commitCampaignWeek(filed, personId, {
    campaignId: week.campaignId,
    weekStart: week.weekStart,
    proposerPersonId: null,
    revision: week.revision,
    emphasis: "field",
    allocation: { fieldShifts: 1, fundraisingSessions: 0, advertisingBuys: 0 },
    advertising: null,
  });
  return { world: committed, personId };
}

describe("a commitment the game cannot let the player keep", () => {
  it("is offered as one that can be given up, and only where it cannot be performed", () => {
    const { world, personId } = committedCampaignWeek("give-up-offered");
    const entries = venueActivities(world, personId);
    const stuck = entries.filter((entry) => entry.abandonable);
    expect(stuck.length).toBeGreaterThan(0);
    for (const entry of stuck) {
      expect(entry.refusal).not.toBeNull();
      expect(entry.activity.kind).not.toBe("tentative");
      expect(entry.activity.kind).not.toBe("travel");
    }
    // Nothing performable is offered as abandonable.
    for (const entry of entries) {
      if (entry.refusal === null) expect(entry.abandonable).toBe(false);
    }
  });

  it("lets time move again once it is given up", () => {
    const { world, personId } = committedCampaignWeek("give-up-unblocks");
    const stuck = venueActivities(world, personId).find(
      (entry) => entry.abandonable,
    )!;

    const released = abandonUnperformableCommitment(
      world,
      personId,
      stuck.activity.id,
    );
    expect(released).not.toBe(world);
    // Giving up costs no time and spends nothing.
    expect(released.currentMoment).toEqual(world.currentMoment);

    // The point of the guard. Whether time also moves without giving up is
    // deliberately not asserted: it does not today, and the day it does — if a
    // campaign session becomes performable — this test should still pass.
    const moved = passOrdinaryDays(released, 7);
    expect(moved.currentDate > world.currentDate).toBe(true);
  });

  it("refuses to release anything that is not the player's own stuck commitment", () => {
    const { world, personId } = committedCampaignWeek("give-up-guarded");
    const travel = world.history.scheduledActivities.find(
      (activity) => activity.kind === "travel",
    );
    if (travel)
      expect(abandonUnperformableCommitment(world, personId, travel.id)).toBe(
        world,
      );
    expect(
      abandonUnperformableCommitment(world, personId, "not-an-activity"),
    ).toBe(world);
  });
});
