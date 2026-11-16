/**
 * The person card's age follows the game date (people-needs-people-128): the
 * full resident whose birthday comes soonest after the start reads their age the
 * day before it and one more on it, in a place drawn from all 56. (It was the
 * player, a 17-year-old turning 18; since Nov 16 the player is any adult, whose
 * birthday can be a year away.)
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gameStartDate } from "../core2/game-start";
import { personCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "bench-card-age");

describe(`the card's age in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("reads a resident's age the day before their next birthday and one more on it", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const nextBirthday = (birthDate: string) => {
      const age = ageOnDate(makeIsoDate(birthDate), core.date);
      return makeIsoDate(
        `${Number(birthDate.slice(0, 4)) + age + 1}${birthDate.slice(4)}`,
      );
    };
    // The full resident of the town whose birthday comes soonest (not on Feb 29).
    const person = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === world.placeId &&
          p.tier !== "husk" &&
          !p.birthDate.endsWith("-02-29"),
      )
      .sort(
        (a, b) =>
          nextBirthday(a.birthDate).localeCompare(nextBirthday(b.birthDate)) ||
          a.id.localeCompare(b.id),
      )[0]!;
    const age = ageOnDate(makeIsoDate(person.birthDate), core.date);
    const birthday = nextBirthday(person.birthDate);
    expect(personCard(core, person.id).age).toBe(age);
    advanceCore(core, addDays(birthday, -1));
    expect(core.date).toBe(addDays(birthday, -1));
    expect(personCard(core, person.id).age).toBe(age);
    advanceCore(core, birthday);
    expect(personCard(core, person.id).age).toBe(age + 1);
  }, 300_000);
});
