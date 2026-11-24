import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { storiesHeard } from "../core2/modules/news";
import type { PersonId } from "../core2/types";
import { knownCard } from "./card";
import { loadingStory } from "./loading";
import { buildBenchWorld } from "./world";

// The loading screen's story (path 3) is the built world's own: each journal
// line is a line of the player's history by its record, each headline a
// story the player heard before day one, the years run up to the start year.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the loading story is read from the built world's records", () => {
  const place = drawPlace(seed, "loading-story");
  const where = `${place.name}, seed ${seed}`;
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const story = loadingStory(core, playerId!);
  const years = story.years.map((row) => row.year);
  expect(years, where).toEqual([...years].sort((a, b) => a - b));
  expect(years.at(-1), where).toBe(Number(core.date.slice(0, 4)));
  const history = new Set(
    (knownCard(core, playerId!, playerId!)?.history ?? []).map(
      (line) => line.recordId,
    ),
  );
  const heard = new Map(
    storiesHeard(coreAPI(core), playerId as PersonId).map((s) => [s.id, s]),
  );
  const lines = story.years.flatMap((row) => row.lines);
  expect(lines.length, `${where}: no life lines`).toBeGreaterThan(0);
  for (const line of lines)
    expect(history.has(line.recordId), `${where}: ${line.recordId}`).toBe(true);
  for (const row of story.years)
    for (const headline of row.headlines) {
      const told = heard.get(headline.recordId);
      expect(told, `${where}: ${headline.recordId}`).toBeDefined();
      expect(Number(told!.date.slice(0, 4)), where).toBe(row.year);
      expect(told!.date < core.date, where).toBe(true);
    }
  expect(story.map?.counties.length ?? 0, `${where}: no map`).toBeGreaterThan(
    0,
  );
  console.log(
    `${where}: ${years[0]} to ${years.at(-1)}, ${lines.length} lines, ${story.years.flatMap((r) => r.headlines).length} headlines`,
  );
}, 600_000);
