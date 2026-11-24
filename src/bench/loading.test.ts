import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { lifeOf } from "../core2/modules/people";
import type { PersonId } from "../core2/types";
import { loadingStory } from "./loading";
import { buildBenchWorld } from "./world";

// The loading screen's story (path 3) is the built world's own: each line
// names a record the built world holds about the player, one of their life's
// events or their household (the CTO, Nov 24, 7138015560 on #10390: the
// story tells the birth and the opening day, which the person card's history
// does not list), and the years run up to the start year. It holds no
// headlines (the CTO, Nov 24, send-back 2 on #10390: the headline rows were
// "the list of facts").
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
  const history = new Set<string>([
    ...lifeOf(core, playerId as PersonId).map((event) => event.id),
    core.people.get(playerId!)!.householdId,
  ]);
  const lines = story.years.flatMap((row) => row.lines);
  expect(lines.length, `${where}: no life lines`).toBeGreaterThan(0);
  for (const line of lines)
    expect(history.has(line.recordId), `${where}: ${line.recordId}`).toBe(true);
  for (const row of story.years)
    expect(Object.keys(row).sort(), `${where}: ${row.year}`).toEqual([
      "lines",
      "year",
    ]);
  expect(story.map?.counties.length ?? 0, `${where}: no map`).toBeGreaterThan(
    0,
  );
  console.log(
    `${where}: ${years[0]} to ${years.at(-1)}, ${lines.length} lines`,
  );
}, 600_000);
