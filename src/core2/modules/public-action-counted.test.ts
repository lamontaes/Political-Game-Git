import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { TERM_MEASURES } from "../term-read";
import { actionsOf } from "./public-action";

// The wider town's counted people are asked to join an action by the same
// decision as a named person, as many as their record stands for: the renters
// in a rent protest, the jobless in a protest over jobs, every resident in a
// rally over health (owner, Oct 14: one model, two tiers). Two places pinned
// by name and seed, each a town where the first six months of a bad term
// formed actions the named people alone did not fill out.
const PLACES = [
  {
    label: "pa-a",
    name: "Port O'Connor, Texas",
    // Rent: the renters who are not named people make the whole protest.
    expect: { area: "rent", kind: "protest", namedMax: 0, countedMin: 1 },
  },
  {
    label: "pa-b",
    name: "Lincoln, Vermont",
    // Health: named residents plus the counted residents.
    expect: { area: "health", kind: "rally", namedMax: 1000, countedMin: 1 },
  },
] as const;

for (const row of PLACES)
  it(`${row.name}: counted people are in the ${row.expect.area} ${row.expect.kind}`, () => {
    setBookkeeping(false);
    const place = drawPlace("pa-seed-9320", row.label);
    expect(place.name).toBe(row.name);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const change: Record<string, number> = {
      "housing.rent": 0.3,
      "labor.unemployment": 0.4,
      "health.": -0.2,
    };
    for (const [at, month] of [
      "2025-01",
      "2026-01",
      "2026-02",
      "2026-03",
    ].entries()) {
      const values: Record<string, number> = {};
      for (const key of TERM_MEASURES) {
        const factor = Object.entries(change).find(([prefix]) =>
          key.startsWith(prefix),
        )?.[1];
        values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
      }
      web.put({
        id: `web:${world.placeId}:${month}`,
        placeId: world.placeId,
        month,
        date: `${month}-02`,
        values,
        bases: values,
        effects: {},
        engineSources: {},
      } as never);
    }
    advanceCore(world.core, "2025-07-06");
    const found = actionsOf(api, world.placeId).find(
      (action) =>
        action.area === row.expect.area && action.kind === row.expect.kind,
    );
    expect(found, `${row.name}: no ${row.expect.area} action`).toBeDefined();
    expect(found!.participantIds.length).toBeLessThanOrEqual(
      row.expect.namedMax,
    );
    expect(found!.countedParticipants).toBeGreaterThanOrEqual(
      row.expect.countedMin,
    );
  }, 120_000);
