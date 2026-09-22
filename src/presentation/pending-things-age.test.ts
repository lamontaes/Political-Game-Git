import { describe, expect, it } from "vitest";

import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectOrdinaryDay } from "./ordinary-life";
import { projectToday } from "./day-overview";

/**
 * Things standing in an ordinary life say how long they have stood.
 *
 * The authored summary on a work item is fixed text, so the household errands
 * and the posted meeting read word for word the same on the first day of a life
 * and three months later. A player who had let twelve weeks go by was shown a
 * first morning.
 */
function ordinaryLife(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 34,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "kentucky",
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

describe("an ordinary life's standing things age", () => {
  it("says nothing in the first week, because a few days is not a fact", () => {
    const { world, personId } = ordinaryLife("pending-age-fresh");
    const day = projectOrdinaryDay(world, personId);
    expect(day.pending.length).toBeGreaterThan(0);
    for (const thing of day.pending) {
      expect(thing.daysStanding).toBe(0);
      expect(thing.openedOn).toBe(world.currentDate);
      expect(thing.sentence).not.toMatch(/still/i);
    }
    const nearly = projectOrdinaryDay(passOrdinaryDays(world, 5), personId);
    for (const thing of nearly.pending) {
      expect(thing.daysStanding).toBe(5);
      expect(thing.sentence).not.toMatch(/still/i);
    }
  });

  it("says how long once it has stood a week or more", () => {
    const { world, personId } = ordinaryLife("pending-age-week");
    const day = projectOrdinaryDay(passOrdinaryDays(world, 10), personId);
    expect(day.pending.length).toBeGreaterThan(0);
    // Only what is still open ages. Ten days is long enough for the posted
    // meeting's own time to have come and gone, and a thing that is over does
    // not go on saying how long it has been waiting for an answer.
    const open = day.pending.filter((thing) => thing.answeredBy === null);
    expect(open.length).toBeGreaterThan(0);
    for (const thing of open) {
      expect(thing.daysStanding).toBe(10);
      expect(thing.sentence).toMatch(/a week on\./);
      // The day it was written has not moved and is not restated as today.
      expect(thing.openedOn).toBe(world.currentDate);
    }
  });

  it("no longer reads like a first morning after twelve weeks", () => {
    // The reported session: the same two items, identical on 2026-01-05 and
    // on 2026-03-30, with nothing on screen acknowledging the gap.
    const { world, personId } = ordinaryLife("pending-age-twelve");
    const first = projectOrdinaryDay(world, personId);
    const later = passOrdinaryDays(world, 84);
    const twelve = projectOrdinaryDay(later, personId);
    expect(twelve.pending).toHaveLength(first.pending.length);
    for (const [index, thing] of twelve.pending.entries()) {
      expect(thing.key).toBe(first.pending[index]!.key);
      // Same thing, not the same sentence.
      expect(thing.sentence).not.toBe(first.pending[index]!.sentence);
      expect(thing.daysStanding).toBe(84);
      if (thing.answeredBy !== null) {
        // Twelve weeks after the meeting's own evening, the day says the time
        // came and went. It used to say "Decide whether to attend", to a
        // player who had never been shown a control for deciding.
        expect(thing.answeredBy).toBe("lapsed");
        expect(thing.sentence).toMatch(/came and went without an answer/);
        continue;
      }
      expect(thing.sentence).toContain(first.pending[index]!.sentence);
      expect(thing.sentence).toMatch(/12 weeks on\./);
    }
    // Something did lapse here, or this test is no longer about what it says.
    expect(twelve.pending.some((thing) => thing.answeredBy === "lapsed")).toBe(
      true,
    );
    // And the day's own waiting list inherits it rather than restating it.
    for (const entry of projectToday(later, personId).waiting) {
      if (entry.key.startsWith("work-offer:")) continue;
      expect(entry.sentence).toMatch(/12 weeks on\./);
    }
  });
});
