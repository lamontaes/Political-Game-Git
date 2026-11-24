import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lifeOf } from "./person-life";
import { openWholePast } from "./modules/people";

/**
 * A job held when the pre-start window opened but begun before it is told on
 * the day it began, not on the window's first day (CTO playtest C10, Nov 23).
 * The place is drawn; the seed prints and GOLDEN_PATH_SEED replays it.
 */
it("tells a job held at the window's start on the day it began", () => {
  setBookkeeping(false);
  const seed = process.env.GOLDEN_PATH_SEED ?? `held-job-${Date.now()}`;
  const place = drawPlace(seed, "held-job-date");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  process.stdout.write(`held-job-date: ${where}\n`);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  let held = 0;
  for (const person of [...core.people.values()].slice(0, 400)) {
    if (!person.alive) continue;
    openWholePast(core, person.id);
    for (const event of lifeOf(core, person.id)) {
      if (event.life !== "work" || event.what !== "job-started") continue;
      if (event.facts?.how !== "before-the-run") continue;
      held++;
      expect(
        event.date,
        `${where} ${person.id} ${event.id} ${event.record} ${event.from}`,
      ).toBe(event.facts.startedAt);
    }
  }
  expect(
    held,
    `${where}: nobody held a job at the window's start`,
  ).toBeGreaterThan(0);
}, 600000);
