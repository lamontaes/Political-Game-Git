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
import {
  nationalDisasterDetail,
  nationalEvents,
} from "./modules/national-events";
import { PRESS_MODULE_ID } from "./modules/press";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("the country's disasters are generated from each world's own exposures and happen on their day", () => {
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
  let onWire = 0;
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 100);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
    // The day a national disaster happens, the national press has it on the
    // wire at the nation level (the wire drops old items, so it is read now).
    for (const e of nationalEvents(api).filter((row) => row.date === day)) {
      const item = api
        .moduleState(PRESS_MODULE_ID)
        .table("wire")
        .get(e.id) as unknown as { level: string } | undefined;
      expect(item?.level, `${place.name}: ${e.id} on the wire`).toBe("nation");
      onWire += 1;
    }
  }
  const where = `${place.name}, seed ${seed}`;
  expect(onWire, `${where}: disasters seen on the wire`).toBeGreaterThan(0);
  // Play on, up to three years, until a disaster that has begun shows aid or
  // damage when opened; none within that is a failure, never a pass.
  const aidShown = () =>
    nationalEvents(api).some((e) => {
      if (e.date > day) return false;
      const d = nationalDisasterDetail(api, e.id)!;
      return d.publicAssistanceMinor > 0 || d.homesDamaged > 0;
    });
  const cap = addDays(makeIsoDate(world.core.date), 365 * 3);
  while (!aidShown() && day < cap) {
    for (let i = 0; i < 30; i++) {
      day = addDays(day, 1);
      advanceCore(world.core, day);
    }
  }
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
  // Every disaster is the world's own: its state and hazard have an exposure
  // row, and its record says which level it came from.
  const exposureIds = new Set(
    (
      api
        .moduleState("national-events")
        .table("exposure")
        .rows() as unknown as {
        id: string;
      }[]
    ).map((row) => row.id),
  );
  for (const e of events) {
    expect(
      exposureIds.has(`exposure:${e.stateKey}:${e.hazard}`),
      `${where}: ${e.id} has an exposure row and a hazard`,
    ).toBe(true);
    expect(e.counties).toBeGreaterThan(0);
    // One that has begun by the end of the run was emitted for its state.
    expect(emitted.has(e.id), e.id).toBe(e.date <= day);
  }
  // Opened, a disaster shows the counties and the aid FEMA recorded for it.
  const opened = events
    .filter((e) => e.date <= day)
    .map((e) => ({ e, d: nationalDisasterDetail(api, e.id)! }))
    .filter(({ d }) => d.publicAssistanceMinor > 0 || d.homesDamaged > 0);
  expect(
    opened.length,
    `${where}: a disaster with recorded aid or damage`,
  ).toBeGreaterThan(0);
  for (const { e, d } of opened) {
    expect(d.counties.length, e.id).toBe(e.counties);
    expect(d.disasterNumber).toBe(e.disasterNumber);
  }
  process.stdout.write(
    `nation proof: national disasters: ${where}; ${events.length} generated in 100 days across ${states.size} states; first ${events[0]!.id}\n`,
  );
}, 900000);
