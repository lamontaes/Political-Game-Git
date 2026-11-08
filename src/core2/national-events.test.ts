/**
 * The country's disasters are results (Nation, Nov 8): the month after a
 * disaster FEMA declared began anywhere, one row per state it reached is
 * kept and a public `national.disaster` record is emitted for national:<state>.
 * Played in a place drawn from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { nationalEvents } from "./modules/national-events";
import { coreAPI } from "./state";
import declarations from "./data/disasters/declarations.json";
import { placeStateKey } from "./place-map";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("the country's disasters are generated from recorded rates and happen on their day", () => {
  const place = drawPlace(seed, "national-events");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const emitted = new Set<string>();
  api.subscribeEvents("nation-test", ["national.disaster"], (_api, event) => {
    emitted.add(event.id);
  });
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 100);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
  }
  const where = `${place.name}, seed ${seed}`;
  const events = nationalEvents(api);
  expect(
    events.length,
    `${where}: disasters were generated for 100 days`,
  ).toBeGreaterThan(0);
  const states = new Set(events.map((e) => e.stateKey));
  expect(
    states.size,
    `${where}: more than the town's own state`,
  ).toBeGreaterThan(1);
  // Inside the record these are FEMA's real disasters on their real days.
  const real = new Set<string>();
  for (const [county, rows] of Object.entries(
    declarations.byCounty as unknown as Record<string, [string][]>,
  ))
    for (const row of rows)
      real.add(`${placeStateKey(`county:${county}`)}|${row[0]}`);
  for (const e of events) {
    expect(
      real.has(`${e.stateKey}|${e.date}`),
      `${where}: ${e.id} is a recorded disaster on its real day`,
    ).toBe(true);
    expect(e.counties).toBeGreaterThan(0);
    // One that has begun by the end of the run was emitted for its state.
    expect(emitted.has(e.id), e.id).toBe(e.date <= day);
  }
}, 900000);
