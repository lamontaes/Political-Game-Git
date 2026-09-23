import { writeLegacyHouseholdEveningInvitation } from "../simulation/life-opportunities";
import { describe, expect, it } from "vitest";

import { scheduledActivityState, serializeWorld } from "../simulation";
import { simulateCalendarDays } from "./calendar-time-control";
import { interruptionHandlers } from "./interruption-policy";
import {
  openNextLifeScene,
  openingLifeLocation,
  walkOpeningNeighborhood,
} from "./life-scene-flow";
import { createNewGameWorld } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectPersonContact, travelTowardsPerson } from "./person-contact";
import { openConversationWith } from "./person-conversation-entry";
import {
  currentPublicOfficeholders,
  establishOpeningOfficeholders,
} from "./opening-officeholders";
import { projectContacts } from "./people-contacts";
import { DEFAULT_INTERRUPTIONS } from "./shell-navigation";

/**
 * UI36 adapters: the interruption checklist and the person card's real
 * actions, proven on the existing clock and the existing walk writer.
 */

function ordinaryAdult(seed: string) {
  const created = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

function childAtHome(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-from-childhood",
    startingLife: "opening-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  return {
    world: openNextLifeScene(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

describe("interruption preferences", () => {
  it("only ever makes a skip stop more often, never less", () => {
    const relaxed = interruptionHandlers(DEFAULT_INTERRUPTIONS);
    const strict = interruptionHandlers({
      stopForWorkShifts: true,
      stopForTentativeHolds: false,
    });
    const { world } = ordinaryAdult("ui36-policy");
    for (const activity of world.history.scheduledActivities) {
      const base = relaxed.routine?.isAutoResolvableActivity(
        world,
        activity.id,
      );
      const gated = strict.routine?.isAutoResolvableActivity(
        world,
        activity.id,
      );
      expect(gated).toBe(false);
      if (!base) expect(gated).toBe(false);
    }
    expect(strict.get).toBeTypeOf("function");
  });

  it("stops a day skip at a tentative hold when asked, leaving the hold and the World alone", () => {
    const opened = ordinaryAdult("ui36-hold");
    const personId = opened.personId;
    // The evening invitation was this life's tentative hold. Play stopped
    // writing it on 2026-09-22; a save made before then still holds one.
    const world = writeLegacyHouseholdEveningInvitation(opened.world, personId);
    const hold = world.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "tentative" &&
        activity.participantPersonIds.includes(personId) &&
        scheduledActivityState(world, activity.id).start.date ===
          world.currentDate,
    );
    expect(hold).toBeDefined();
    const stopping = simulateCalendarDays(world, personId, 1, {
      stopForWorkShifts: false,
      stopForTentativeHolds: true,
    });
    const lapsing = simulateCalendarDays(world, personId, 1, {
      stopForWorkShifts: false,
      stopForTentativeHolds: false,
    });
    /* Asked to stop: time halts at the hold and the hold is still scheduled. */
    expect(scheduledActivityState(stopping.world, hold!.id).status).toBe(
      "scheduled",
    );
    expect(stopping.reached).toEqual(
      scheduledActivityState(world, hold!.id).start,
    );
    expect(stopping.outcome).toContain(`Stopped for ${hold!.title}`);
    /* Not asked: the hold lapses and the morning is reached. */
    expect(lapsing.reached.date > world.currentDate).toBe(true);
    expect(lapsing.reached.minuteOfDay).toBe(7 * 60);
    expect(lapsing.outcome).not.toMatch(/Stopped|pending commitment/);
    expect(scheduledActivityState(lapsing.world, hold!.id).status).toBe(
      "cancelled",
    );
    expect(serializeWorld(stopping.world)).not.toBe(
      serializeWorld(lapsing.world),
    );
  });
});

describe("the person card's actions", () => {
  it("takes presence from the room, not from a pin or the authored scene", () => {
    const opened = ordinaryAdult("ui36-presence");
    const personId = opened.personId;
    const world = establishOpeningOfficeholders(opened.world, personId);
    const chiefJustice = currentPublicOfficeholders(world).find(
      (holder) => holder.officeKey === "us-chief-justice",
    );
    expect(chiefJustice).toBeDefined();
    const other = chiefJustice!.personId;
    expect(
      projectContacts(world, personId).contacts.some(
        (contact) => contact.personId === other,
      ),
    ).toBe(false);
    const here = projectPersonContact(world, personId, other, {
      presentPersonIds: [personId, other],
    });
    const away = projectPersonContact(world, personId, other, {
      presentPersonIds: [personId],
    });
    expect(here.presentNow).toBe(true);
    expect(away.presentNow).toBe(false);
    // C#245: the canonical conversation gate owns Talk, not a second
    // presentation-roster veto. A pin/roster cannot grant or revoke it.
    const entry = openConversationWith(world, personId, other);
    expect(away.talk.available).toBe(entry.kind === "available");
    expect(here.talk.available).toBe(away.talk.available);
    if (entry.kind === "unavailable")
      expect(away.talk.reason).toBe(entry.reason);
    expect(away.contact.available).toBe(false);
    expect(away.contact.reason).toMatch(/No way to contact/);
    expect(away.meet.available).toBe(false);
  });

  it("travels towards somebody only along the one supported walk", () => {
    const { world, personId } = childAtHome("ui36-walk-family-0");
    const out = walkOpeningNeighborhood(world, personId, "neighborhood");
    expect(openingLifeLocation(out, personId)?.setting).toBe("neighborhood");
    const household = out.personOrder.find(
      (id) =>
        id !== personId && openingLifeLocation(out, id)?.setting === "home",
    );
    expect(household).toBeDefined();
    const contact = projectPersonContact(out, personId, household!, {
      presentPersonIds: [personId],
    });
    expect(contact.travel.available).toBe(true);
    expect(contact.talk.available).toBe(false);
    expect(contact.travel.walk).toBe("home");
    expect(contact.travel.reason).toMatch(/Walk home/);
    const back = travelTowardsPerson(out, personId, household!, {
      presentPersonIds: [personId],
    });
    expect(back).not.toBe(out);
    expect(openingLifeLocation(back, personId)?.setting).toBe("home");
    /* Already together: no journey is invented. */
    const together = projectPersonContact(back, personId, household!, {
      presentPersonIds: [personId, household!],
    });
    expect(together.travel.available).toBe(false);
    expect(
      travelTowardsPerson(back, personId, household!, {
        presentPersonIds: [personId, household!],
      }),
    ).toBe(back);
  });
});
