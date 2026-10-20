/**
 * The filing overlay says when a player becomes old enough
 * (play-nothing-to-enter-at-eighteen): an unmet minimum age carries the day
 * the person turns the required age, so a player with nothing to enter yet
 * sees when the first door opens. Played world, a place and seed nobody
 * chose; the player is 17 on day one, so every contest's age check is unmet.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { buildBenchWorld } from "./world";
import { governmentView } from "./government";

/** The age the filing check itself reads on a date (the birthday counts when the month and day have come). */
const filingAge = (born: string, on: string) =>
  Number(on.slice(0, 4)) -
  Number(born.slice(0, 4)) -
  (on.slice(5) < born.slice(5) ? 1 : 0);

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "eligible-on");

it(`names the day a player turns the age a contest asks in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const me = world.playerId!;
  const born = world.core.people.get(me)!.birthDate;
  const contests = governmentView(world.core, me).contests;
  expect(contests.length, `${where}: contests`).toBeGreaterThan(0);
  let checked = 0;
  for (const row of contests) {
    const age = row.checks.find((check) => check.rule === "minimum-age")!;
    expect(age.met, `${where}: ${row.contest.title} for a 17-year-old`).toBe(
      false,
    );
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
  expect(checked, where).toBe(contests.length);
}, 300_000);
