import { describe, expect, it } from "vitest";

import {
  addDays,
  createScheduledActivity,
  simulationMomentAtLocalTime,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { abandonUnperformableCommitment } from "./scheduled-activity-choice";
import { venueActivities } from "./venue-activity";

/**
 * A life must never reach a state with no legal move.
 *
 * A confirmed commitment at a venue no ordinary life has an authored journey
 * to is rightly refused by the calendar, and time rightly will not step over
 * it — which together ended a life on its first morning, measured in
 * `docs/playtest/committing-a-campaign-week-stops-time-2026-09-22.md`.
 *
 * That stall was first measured with a committed campaign week. Campaign
 * sessions are now carried out in place (see
 * `campaign-session-attend.test.ts`), so this fixture books a commitment at a
 * place with no route instead, and the guard still holds for it: such a
 * commitment can be given up, and giving it up lets time move again.
 */
function unroutedCommitment(seed: string) {
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
  const world = game.world;
  const day = addDays(world.currentDate, 1);
  const at = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date: day,
      minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  const booked = createScheduledActivity(world, {
    stableKey: `test:unrouted-commitment:${seed}`,
    title: "A meeting across the county",
    summary: "A commitment at a place the game has no journey to.",
    kind: "confirmed",
    start: at(14 * 60),
    end: at(15 * 60),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "test:unrouted-venue",
      label: "A hall across the county",
      jurisdictionId: null,
    },
    sourceEntityIds: [personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  return { world: booked, personId };
}

describe("a commitment the game cannot let the player keep", () => {
  it("is offered as one that can be given up, and only where it cannot be performed", () => {
    const { world, personId } = unroutedCommitment("give-up-offered");
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
    const { world, personId } = unroutedCommitment("give-up-unblocks");
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

    // The point of the guard: once it is given up, time moves again.
    const moved = passOrdinaryDays(released, 7);
    expect(moved.currentDate > world.currentDate).toBe(true);
  });

  it("refuses to release anything that is not the player's own stuck commitment", () => {
    const { world, personId } = unroutedCommitment("give-up-guarded");
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
