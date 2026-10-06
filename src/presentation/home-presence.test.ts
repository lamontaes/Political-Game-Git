import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, World } from "../simulation";
import { whereaboutsAt } from "../simulation/living-world/work-schedules";
import { createNewGameWorld } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { availablePlayerConversations } from "./player-conversation";
import { householdResidentIds } from "./play-scene-context";
import { recordedRoomPresence } from "./recorded-room-presence";
import { DEFAULT_INTERRUPTIONS } from "./shell-navigation";
import { submitTimeCommand } from "./time-command";

const CASES = [
  ["bg69-a", 34],
  ["bg69-b", 34],
  ["bg69-c", 9],
  ["bg69-d", 52],
  ["bg69-e", 17],
] as const;

function life(seed: string, startAge: number) {
  const place = drawRandomPlace(seed);
  const { world, playerPersonId } = createNewGameWorld({
    startKind: "custom",
    seed,
    placeKey: place.key,
    startAge,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    givenName: "Home",
    familyName: "Check",
    gender: "unstated",
    pronouns: "they-them",
    questionnaire: "skipped",
    appearanceCatalogGeneration: 10,
    appearanceRecipeVersion: "appearance-recipe-v2",
    appearanceOutfitVersion: "complete-outfit-v2",
  } as never);
  return { world, playerPersonId, place };
}

function housemateAt(world: World, playerPersonId: EntityId) {
  const home: EntityId[] = [];
  const away: EntityId[] = [];
  for (const id of householdResidentIds(world, playerPersonId))
    (whereaboutsAt(world, id).kind === "home" ? home : away).push(id);
  return { home: home.sort(), away: away.sort() };
}

function presentWithPlayer(world: World, playerPersonId: EntityId) {
  return (recordedRoomPresence(world, playerPersonId)?.personIds ?? [])
    .filter((id) => id !== playerPersonId)
    .sort();
}

describe("home presence is recorded from schedules", () => {
  it("records exactly the housemates who are home, in places drawn at random", () => {
    let someoneHome = false;
    let someoneAway = false;
    for (const [seed, age] of CASES) {
      const { world, playerPersonId, place } = life(seed, age);
      const states: { label: string; world: World }[] = [];
      // An adult's life opens through the ordinary-life writer; any age moves
      // through the same Day command the shell sends.
      if (age >= 18)
        states.push({
          label: "opening",
          world: openOrdinaryLife(world, playerPersonId),
        });
      const day = submitTimeCommand(world, {
        requestId: `${seed}-day`,
        personId: playerPersonId,
        sourceMoment: world.currentMoment,
        command: { kind: "days", days: 1 },
        interruptions: DEFAULT_INTERRUPTIONS,
      });
      expect(day.receipt.status, `${place.displayName} ${seed}`).toBe(
        "accepted",
      );
      states.push({ label: "after a Day", world: day.world });
      for (const { label, world: at } of states) {
        const { home, away } = housemateAt(at, playerPersonId);
        const where = `${place.displayName}, seed ${seed}, ${label}`;
        expect(presentWithPlayer(at, playerPersonId), where).toEqual(home);
        someoneHome ||= home.length > 0;
        someoneAway ||= away.length > 0;
      }
    }
    expect(someoneHome, "a housemate was home in some drawn life").toBe(true);
    expect(someoneAway, "a housemate on shift was left out").toBe(true);
  });

  it("offers household talk only when somebody is recorded home, and reading writes nothing", () => {
    let talked = 0;
    for (const [seed, age] of CASES) {
      const { world, playerPersonId, place } = life(seed, age);
      const day = submitTimeCommand(world, {
        requestId: `${seed}-day-2`,
        personId: playerPersonId,
        sourceMoment: world.currentMoment,
        command: { kind: "days", days: 1 },
        interruptions: DEFAULT_INTERRUPTIONS,
      }).world;
      const before = day.history.nextSequence;
      const offered = availablePlayerConversations(day, playerPersonId).filter(
        (entry) => entry.subject === "life-talk",
      );
      expect(day.history.nextSequence, "reading is free").toBe(before);
      const housemates = presentWithPlayer(day, playerPersonId);
      if (housemates.length === 0)
        expect(
          offered,
          `${place.displayName} ${seed}: nobody home, no household talk`,
        ).toEqual([]);
      else talked += offered.length;
    }
    expect(talked).toBeGreaterThan(0);
  });
});
