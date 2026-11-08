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

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("disasters FEMA declared elsewhere become national events", () => {
  const place = drawPlace(seed, "national-events");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
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
    `${where}: disasters began in 100 days`,
  ).toBeGreaterThan(0);
  const states = new Set(events.map((e) => e.stateKey));
  expect(
    states.size,
    `${where}: more than the town's own state`,
  ).toBeGreaterThan(1);
  for (const e of events) {
    expect(e.begins <= e.date).toBe(true);
    expect(e.counties).toBeGreaterThan(0);
    expect(world.core.durableLog.get(e.id)?.kind, e.id).toBe(
      "national.disaster",
    );
  }
}, 900000);
