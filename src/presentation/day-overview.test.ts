import { describe, expect, it } from "vitest";

import { serializeWorld } from "../simulation";
import { projectToday, projectWorkRole } from "./day-overview";
import { currentOpeningLifeScene, openNextLifeScene } from "./life-scene-flow";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { calendarEntryFor } from "./player-calendar";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import {
  respondCareerOffer,
  seekCareerOffer,
} from "../simulation/career-path7";

function adultLife(overrides: Partial<NewGameSetup> = {}, seed = "pt3-today") {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 22,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  } as NewGameSetup);
  // The same two steps the play screen takes when a life begins.
  const opened = openOrdinaryLife(game.world, game.playerPersonId);
  return {
    world: openNextLifeScene(opened, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

describe("PT3 — Today answers what is happening, next, waiting and time", () => {
  it("names the scene waiting in the room as what is happening now", () => {
    const { world, personId } = adultLife();
    const scene = currentOpeningLifeScene(world, personId);
    expect(scene).not.toBeNull();
    const today = projectToday(world, personId);
    expect(today.nowKind).toBe("scene");
    expect(today.now).toBe(scene!.prose);
  });

  it("is a pure read: projecting today changes nothing in the world", () => {
    const { world, personId } = adultLife();
    const before = serializeWorld(world);
    projectToday(world, personId);
    projectWorkRole(world, personId);
    expect(serializeWorld(world)).toBe(before);
  });

  it("offers only the character's own unfinished commitments as next", () => {
    const { world, personId } = adultLife();
    const today = projectToday(world, personId);
    // This household starts with the posted public meeting on its calendar.
    expect(today.next).not.toBeNull();
    if (today.next) {
      const activity = world.history.scheduledActivities.find(
        (entry) => entry.id === today.next!.activityId,
      )!;
      expect(activity.participantPersonIds).toContain(personId);
    }
    // A later day never offers something that has already ended.
    const later = passOrdinaryDays(world, 3);
    const after = projectToday(later, personId);
    if (after.next) {
      const entry = calendarEntryFor(later, personId, after.next.activityId)!;
      expect(entry.group).toBe("yours");
      expect(entry.status).toBe("scheduled");
      const now = later.currentMoment;
      expect(
        entry.end.date > now.date ||
          (entry.end.date === now.date &&
            entry.end.minuteOfDay > now.minuteOfDay),
      ).toBe(true);
    }
  });

  it("says plainly when a life has no job or office", () => {
    const { world, personId } = adultLife();
    const role = projectWorkRole(world, personId);
    expect(role.roles).toEqual([]);
    expect(role.sentence).toMatch(/^You do not hold a job or an office/);
  });

  it("names a held role from the work record, not from a mounted panel", () => {
    const { world, personId } = adultLife({
      startingLife: "legislative-office",
      household: "lives-alone",
    });
    const role = projectWorkRole(world, personId);
    expect(role.roles.length).toBeGreaterThan(0);
    expect(role.sentence).toContain(role.roles[0]!);
  });
});

describe("PT3 an offer of work that has not been answered", () => {
  function lifeWithAnOfferSought() {
    const { world, personId } = adultLife({ startAge: 34 }, "pt3-offer");
    const provider = CAREER_PROVIDERS.find((entry) =>
      String(entry.pathId).includes("shop"),
    )!;
    const sought = seekCareerOffer(world, provider);
    expect(sought.ok).toBe(true);
    return { world: sought.world, personId };
  }

  it("is named in the day's own sentence rather than left to one panel", () => {
    const { world, personId } = lifeWithAnOfferSought();
    const role = projectWorkRole(world, personId);
    // Still not a job. The offer is not counted as a role.
    expect(role.roles).toEqual([]);
    expect(role.sentence).toMatch(/^You do not hold a job or an office/);
    expect(role.awaitingAnswer).toHaveLength(1);
    expect(role.sentence).toContain(role.awaitingAnswer[0]!.roleTitle);
    expect(role.sentence).toMatch(/waiting for your answer/);
  });

  it("is waiting on the player, and still is twelve weeks later", () => {
    // The reported session: an offer sought on the first day, then twelve
    // weeks passed with nothing on screen ever mentioning it again.
    const { world, personId } = lifeWithAnOfferSought();
    const waitingNow = projectToday(world, personId).waiting;
    expect(
      waitingNow.some((entry) => entry.key.startsWith("work-offer:")),
    ).toBe(true);
    const later = passOrdinaryDays(world, 84);
    expect(later.currentDate > world.currentDate).toBe(true);
    const waitingLater = projectToday(later, personId).waiting;
    const offer = waitingLater.find((entry) =>
      entry.key.startsWith("work-offer:"),
    );
    expect(offer).toBeDefined();
    expect(offer!.sentence).toMatch(/waiting for your answer/);
    // The world wrote it once and it has not moved on its own.
    expect(projectWorkRole(later, personId).awaitingAnswer).toHaveLength(1);
  });

  it("stops quoting a start date once that date has gone by", () => {
    const { world, personId } = lifeWithAnOfferSought();
    const offerNowEntry = projectWorkRole(world, personId).awaitingAnswer[0]!;
    const startsOn = offerNowEntry.startsOn;
    // While it is still ahead, saying when it would begin is useful.
    expect(startsOn > world.currentDate).toBe(true);
    expect(offerNowEntry.startIsAhead).toBe(true);
    const offerNow = projectToday(world, personId).waiting.find((entry) =>
      entry.key.startsWith("work-offer:"),
    )!;
    expect(offerNow.sentence).toMatch(/to start on/);

    // Twelve weeks later that date is eleven weeks in the past. Repeating it
    // tells the player something untrue, which is worse than the silence this
    // replaced, so it is not repeated.
    const later = passOrdinaryDays(world, 84);
    expect(startsOn < later.currentDate).toBe(true);
    const offerLaterEntry = projectWorkRole(later, personId).awaitingAnswer[0]!;
    // The recorded date has not moved, and nothing here pretends it has. What
    // changes is that the projection now says the date is behind us, so a
    // consumer that renders from the record inherits the judgment rather than
    // having to rediscover that this field goes stale.
    expect(offerLaterEntry.startsOn).toBe(startsOn);
    expect(offerLaterEntry.startIsAhead).toBe(false);
    const offerLater = projectToday(later, personId).waiting.find((entry) =>
      entry.key.startsWith("work-offer:"),
    )!;
    expect(offerLater.sentence).toMatch(/waiting for your answer/);
    expect(offerLater.sentence).not.toMatch(/to start on/);
    expect(offerLater.sentence).not.toContain("2026-01");
    expect(offerLater.sentence).not.toContain("January");
  });

  it("stops asking for an answer once the offer is accepted", () => {
    // An Eastport walk: Fatima accepted the shop job and the day still said
    // the offer was waiting for her answer.
    const { world, personId } = lifeWithAnOfferSought();
    const provider = CAREER_PROVIDERS.find((entry) =>
      String(entry.pathId).includes("shop"),
    )!;
    const offerId = projectWorkRole(world, personId).awaitingAnswer[0]!
      .relationshipId;
    const accepted = respondCareerOffer(world, offerId, provider, true);
    expect(accepted.ok).toBe(true);

    const role = projectWorkRole(accepted.world, personId);
    expect(role.awaitingAnswer[0]!.answer).toBe("accepted");
    expect(role.sentence).not.toMatch(/waiting for your answer/);
    expect(role.sentence).toMatch(/You accepted work as .+\. It begins /);
    // Nothing is waiting on the player until the start date comes.
    expect(
      projectToday(accepted.world, personId).waiting.some((entry) =>
        entry.key.startsWith("work-offer:"),
      ),
    ).toBe(false);

    // Once it has, beginning the work is what waits on them.
    const started = passOrdinaryDays(accepted.world, 2);
    const waiting = projectToday(started, personId).waiting.find((entry) =>
      entry.key.startsWith("work-offer:"),
    );
    expect(waiting?.sentence).toMatch(/You can begin it under Work\./);
    expect(waiting?.sentence).not.toMatch(/waiting for your answer/);
  });

  it("says nothing about offers when none is outstanding", () => {
    const { world, personId } = adultLife({ startAge: 34 }, "pt3-no-offer");
    const role = projectWorkRole(world, personId);
    expect(role.awaitingAnswer).toEqual([]);
    expect(role.sentence).not.toMatch(/waiting for your answer/);
    expect(
      projectToday(world, personId).waiting.some((entry) =>
        entry.key.startsWith("work-offer:"),
      ),
    ).toBe(false);
  });
});
