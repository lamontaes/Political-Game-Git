import { describe, expect, it } from "vitest";

import { serializeWorld } from "../simulation";
import { projectToday, projectWorkRole } from "./day-overview";
import { currentOpeningLifeScene, openNextLifeScene } from "./life-scene-flow";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { calendarEntryFor } from "./player-calendar";

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
