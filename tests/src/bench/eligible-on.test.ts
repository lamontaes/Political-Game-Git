/**
 * The filing overlay says when a player becomes old enough
 * (play-nothing-to-enter-at-eighteen): an unmet minimum age carries the day
 * the person turns the required age, so a player with nothing to enter yet
 * sees when the first door opens. Played world, a place and seed nobody
 * chose; the player is 18 on day one, so a contest asking more is unmet.
 */
import { advanceToFilingOpen } from "../../support/gov-test-clock";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { buildBenchWorld } from "../../../src/bench/world";
import { governmentView } from "../../../src/bench/government";

/** The age the filing check itself reads on a date (the birthday counts when the month and day have come). */
const filingAge = (born: string, on: string) =>
  Number(on.slice(0, 4)) -
  Number(born.slice(0, 4)) -
  (on.slice(5) < born.slice(5) ? 1 : 0);

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it(`names the day a player turns the age a contest asks, in a place from seed ${seed}`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(draw ? `${seed}:${draw}` : seed, "eligible-on");
    const where = `${place.name} (${place.key}), seed ${seed}${draw ? `:${draw}` : ""}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Every race opens its filing on its own real day, so play to the first.
    advanceToFilingOpen(world.core);
    const me = world.playerId!;
    const born = world.core.people.get(me)!.birthDate;
    const contests = governmentView(world.core, me).contests;
    expect(contests.length, `${where}: contests`).toBeGreaterThan(0);
    // The player starts at 18 (owner, Nov 16): only a contest that asks more
    // than the player's age is one they are too young for, and only those
    // carry the day they turn the age. A place whose contests all ask 18 or
    // less is passed over by name.
    const today = world.core.date;
    const tooYoung = contests.filter((row) => {
      const age = row.checks.find((check) => check.rule === "minimum-age")!;
      return Number(age.required) > filingAge(born, today);
    });
    if (!tooYoung.length) {
      tried.push(`${where}: no contest asks more than the player's age`);
      continue;
    }
    let checked = 0;
    for (const row of tooYoung) {
      const age = row.checks.find((check) => check.rule === "minimum-age")!;
      expect(age.met, `${where}: ${row.contest.title} too young`).toBe(false);
      expect(age.metOn, `${where}: ${row.contest.title} date`).toBeDefined();
      const required = Number(age.required);
      const on = makeIsoDate(age.metOn!);
      expect(filingAge(born, on), `${where}: on ${on}`).toBe(required);
      expect(
        filingAge(born, addDays(on, -1)),
        `${where}: the day before ${on}`,
      ).toBe(required - 1);
      checked += 1;
    }
    expect(checked, where).toBe(tooYoung.length);
    return;
  }
  throw new Error(
    `No drawn place had a contest asking more than the player's age: ${tried.join("; ")}`,
  );
}, 900_000);
