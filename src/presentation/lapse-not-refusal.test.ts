import { describe, expect, it } from "vitest";

import {
  ACTIVITY_DECLINED_EVENT,
  ACTIVITY_LAPSED_EVENT,
  scheduledActivityAnswer,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectOrdinaryDay } from "./ordinary-life";
import { projectToday } from "./day-overview";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { scheduledActivityState } from "../simulation";
import type { EntityId, World } from "../simulation";

/**
 * Letting a day go by is not turning something down.
 *
 * Passing ordinary time used to call the decline path for every optional hold
 * the clock ran past, writing "Decline <title>" as the player's own choice for
 * holds they were never shown and had no control for. Three systems read those
 * records as refusals.
 */
function life(seed: string) {
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

/** The optional hold this life opens with, while it is still standing. */
function openHold(world: World, personId: EntityId): EntityId | null {
  const hold = world.history.scheduledActivities.find(
    (activity) =>
      activity.kind === "tentative" &&
      activity.participantPersonIds.includes(personId) &&
      scheduledActivityState(world, activity.id).status === "scheduled",
  );
  return hold?.id ?? null;
}

describe("time passing and refusing are different facts", () => {
  it("records a lapse, never a choice, when the clock runs past a hold", () => {
    const { world } = life("lapse-a");
    const later = passOrdinaryDays(world, 21);
    const lapses = later.history.events.filter(
      (event) => event.type === ACTIVITY_LAPSED_EVENT,
    );
    expect(lapses.length).toBeGreaterThan(0);
    for (const lapse of lapses) {
      // The defect in one assertion: nothing is written as the player's
      // choice, because they made none.
      expect(lapse.context.choice).toBeNull();
      expect(lapse.tags).toContain("lapsed");
    }
    // And no refusal was invented anywhere while time passed.
    expect(
      later.history.events.some(
        (event) => event.type === ACTIVITY_DECLINED_EVENT,
      ),
    ).toBe(false);
  });

  it("reads a lapse as a lapse and a refusal as a refusal", () => {
    const { world, personId } = life("lapse-b");
    const hold = openHold(world, personId);
    expect(hold).not.toBeNull();
    expect(scheduledActivityAnswer(world, [hold!])).toBe("unanswered");

    const refused = declineVenueActivity(world, personId, hold!);
    expect(scheduledActivityAnswer(refused, [hold!])).toBe("refused");

    const lapsed = passOrdinaryDays(world, 21);
    const lapsedHolds = lapsed.history.events
      .filter((event) => event.type === ACTIVITY_LAPSED_EVENT)
      .flatMap((event) => event.involvedEntityIds);
    expect(scheduledActivityAnswer(lapsed, lapsedHolds)).toBe("lapsed");
  });

  it("reads a record written before the split as neither", () => {
    // A save from before this change carries a declined record with no
    // `chosen` tag, because the tag did not exist. It keeps loading, it is not
    // reinterpreted, and it is not evidence that the player refused anything.
    const { world, personId } = life("lapse-c");
    const hold = openHold(world, personId)!;
    const refused = declineVenueActivity(world, personId, hold);
    const legacy: World = {
      ...refused,
      history: {
        ...refused.history,
        events: refused.history.events.map((event) =>
          event.type === ACTIVITY_DECLINED_EVENT
            ? { ...event, tags: event.tags.filter((tag) => tag !== "chosen") }
            : event,
        ),
      },
    };
    expect(scheduledActivityAnswer(legacy, [hold])).toBe("unknown");
  });

  it("stops asking a question whose time has gone", () => {
    const { world, personId } = life("lapse-d");
    const later = passOrdinaryDays(world, 84);
    const day = projectOrdinaryDay(later, personId);
    const gone = day.pending.filter((thing) => thing.answeredBy === "lapsed");
    expect(gone.length).toBeGreaterThan(0);
    for (const thing of gone) {
      expect(thing.sentence).toMatch(/came and went without an answer/);
      // It is not still being asked for under "what is waiting on me".
      expect(
        projectToday(later, personId).waiting.some(
          (entry) => entry.key === thing.key,
        ),
      ).toBe(false);
    }
  });
});
