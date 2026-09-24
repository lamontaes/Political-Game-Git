import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { buildProductionWorld } from "../presentation/production-world";
import { characterHistoryContextPersonId } from "./character-history";
import { daysBetween } from "./dates";
import { lifePlaceSearch } from "./life-places";
import type { IsoDate, World } from "./types";

// The three people a summarized childhood meets. Before the repair the
// classmate was born on the player's own birthday in every save, the parent
// exactly 28 years earlier to the day and the teacher exactly 30.
const KEY = "production:earlier-life";

function grownStart(seed: string, withSpread: boolean) {
  const place = lifePlaceSearch("Columbus", 20, {
    stateJurisdictionKey: "US-OH",
    scope: "locality",
  }).find((candidate) => /^Columbus\b/.test(candidate.displayName))!;
  return buildProductionWorld({
    seed,
    place,
    age: 34,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    depth: "summarize-earlier-life",
    household: "lives-alone",
    identity: { gender: "female", pronouns: "she-her" },
    givenNameGenerationVersion:
      DEFAULT_NEW_GAME_SETUP.givenNameGenerationVersion,
    ...(withSpread
      ? {
          childhoodGenerationVersion:
            DEFAULT_NEW_GAME_SETUP.childhoodGenerationVersion,
        }
      : {}),
  });
}

function birthDates(world: World, playerId: string) {
  const born = (suffix: string): IsoDate => {
    const person =
      world.people[characterHistoryContextPersonId(world, `${KEY}:${suffix}`)];
    if (person === undefined) throw new Error(`no ${suffix} in ${world.seed}`);
    return person.birthDate;
  };
  return {
    player: world.people[playerId]!.birthDate,
    parent: born("parent"),
    peer: born("peer"),
    teacher: born("teacher"),
  };
}

const yearsOlder = (older: IsoDate, younger: IsoDate) =>
  daysBetween(older, younger) / 365.25;

describe("the people a summarized childhood meets have birthdays of their own", () => {
  it("a new game declares the spread", () => {
    expect(DEFAULT_NEW_GAME_SETUP.childhoodGenerationVersion).toBeDefined();
  });

  it("puts nobody on the player's birthday, and keeps each in their role", () => {
    const sameDay: string[] = [];
    const days = new Set<string>();
    for (let index = 0; index < 16; index += 1) {
      const built = grownStart(`context-birth-dates-${index}`, true);
      const dates = birthDates(built.world, built.playerPersonId);
      const monthDay = dates.player.slice(5);
      for (const [role, date] of Object.entries(dates)) {
        if (role !== "player" && date.slice(5) === monthDay) {
          sameDay.push(`${index}:${role}:${date}`);
        }
        days.add(`${role}:${date.slice(5)}`);
      }
      // A classmate: the same school year, within half a year either way.
      expect(
        Math.abs(daysBetween(dates.peer, dates.player)),
      ).toBeLessThanOrEqual(183);
      expect(dates.peer).not.toBe(dates.player);
      expect(yearsOlder(dates.parent, dates.player)).toBeGreaterThanOrEqual(22);
      expect(yearsOlder(dates.parent, dates.player)).toBeLessThan(40);
      expect(yearsOlder(dates.teacher, dates.player)).toBeGreaterThanOrEqual(
        24,
      );
      expect(yearsOlder(dates.teacher, dates.player)).toBeLessThan(57);
    }
    // Sharing a day of the year by chance is possible (one in 365 per pair);
    // sharing it in every save is the defect. Allow chance, forbid the rule.
    expect(sameDay.length).toBeLessThanOrEqual(2);
    // And the dates really vary: sixteen saves, not one offset repeated.
    expect(days.size).toBeGreaterThan(40);
  });

  it("an old replay that never declared it keeps the fixed offsets", () => {
    const built = grownStart("context-birth-dates-legacy", false);
    const dates = birthDates(built.world, built.playerPersonId);
    expect(dates.peer).toBe(dates.player);
    expect(dates.parent.slice(5)).toBe(dates.player.slice(5));
    expect(
      Number(dates.player.slice(0, 4)) - Number(dates.parent.slice(0, 4)),
    ).toBe(28);
    expect(
      Number(dates.player.slice(0, 4)) - Number(dates.teacher.slice(0, 4)),
    ).toBe(30);
  });
});
