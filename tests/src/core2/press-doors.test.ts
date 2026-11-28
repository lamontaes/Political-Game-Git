/**
 * The press and news doors the screens read through (World item 2): in the
 * played world of a place drawn from all 56, run for four months, each door
 * returns exactly what the engine's table holds, so a screen that switches
 * from opening the table to the door reads the same rows.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { newsStories } from "../../../src/core2/modules/news";
import {
  interviewOf,
  outletsHere,
  PRESS_MODULE_ID,
  printedStoryOf,
  storiesOfWire,
  storiesPrinted,
} from "../../../src/core2/modules/press";
import { coreAPI } from "../../../src/core2/state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`each press and news door returns what the table holds (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "press-doors");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, makeIsoDate(addDays(makeIsoDate(core.date), 120)));
  const table = (name: string) =>
    api.moduleState(PRESS_MODULE_ID).table(name).rows() as unknown as {
      id: string;
      wireId?: string;
    }[];
  const printed = outletsHere(api).flatMap((o) => storiesPrinted(api, o.id));
  expect(
    printed.length,
    `${where}: no story printed in four months`,
  ).toBeGreaterThan(0);
  for (const story of printed.slice(0, 20)) {
    expect(printedStoryOf(api, story.id)?.id, where).toBe(story.id);
    const wired = storiesOfWire(api, story.wireId).map((s) => s.id);
    expect(wired, `${where}: wire ${story.wireId}`).toContain(story.id);
    expect(wired.sort(), where).toEqual(
      table("stories")
        .filter((row) => row.wireId === story.wireId)
        .map((row) => row.id)
        .sort(),
    );
  }
  for (const row of table("interviews").slice(0, 20))
    expect(interviewOf(api, row.id)?.id, where).toBe(row.id);
  expect(interviewOf(api, "no-such-interview"), where).toBeUndefined();
  expect(storiesOfWire(api, "no-such-wire"), where).toEqual([]);
  expect(newsStories(api).length, where).toBe(
    api.moduleState("news").table("stories").rows().length,
  );
}, 900_000);
