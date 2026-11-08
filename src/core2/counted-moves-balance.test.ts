/**
 * People move between a place and the rest of the country in both directions
 * from the same survey, so a place does not empty or fill by arithmetic alone
 * (Dev Tester, Nov 8: Washington, D.C. lost 7.1 percent of its people in one
 * simulated year; Futiga, American Samoa, 5.2). Two causes: a jurisdiction
 * made wholly of counted places had a phantom rest of state to trade people
 * with, and a destination's weight was its share of the nation's people, not
 * the arrivals the American Community Survey finds in it. Where people go is
 * now a gravity model fitted to the survey's own departures and arrivals by
 * state, through the same pull as before. Named regression worlds (a small
 * drawn place has too few people to hold a percent bound: Loomis, SD, 116 to
 * 112).
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedMoves } from "./modules/counted-moves";
import { residentsRuntime, townPlaceOf } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/** Everyone in the town: the counted households times their weight, and the full people. */
function townPeople(core: CoreState): number {
  const store = residentsRuntime(core)!.store;
  let n = 0;
  for (const h of store.liveHouseholds()) n += store.weightedCount(h);
  const town = townPlaceOf(core);
  for (const p of core.people.values())
    if (p.alive && p.placeId === town) n += 1;
  return n;
}

function yearsOf(worldSeed: string, key: string, years: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const changes: { pct: number; line: string }[] = [];
  let before = townPeople(core);
  for (let year = 1; year <= years; year++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const after = townPeople(core);
    changes.push({
      pct: (100 * (after - before)) / before,
      line: `year ${year}: ${Math.round(before)} to ${Math.round(after)}`,
    });
    before = after;
  }
  return { core, changes };
}

it("a wholly counted jurisdiction keeps its people within 1.5 percent a year for three years, with no one sent to a rest of state it does not have (Washington, D.C., world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e)", () => {
  const { core, changes } = yearsOf(
    "03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e",
    "1150000",
    3,
  );
  const toRest = countedMoves(coreAPI(core)).filter(
    (row) =>
      row.direction === "out" && String(row.toPlace).endsWith(":rest-of-state"),
  );
  expect(toRest.length, "moves out to a rest of state with no people").toBe(0);
  for (const change of changes)
    expect(Math.abs(change.pct), change.line).toBeLessThanOrEqual(1.5);
}, 3_600_000);

it("a small territory keeps its people within 1.5 percent a year (Futiga, American Samoa, drawn from the seed dpA)", () => {
  const place = drawPlace("dpA", "drift-played");
  const { changes } = yearsOf(place.seed, place.key, 1);
  for (const change of changes)
    expect(
      Math.abs(change.pct),
      `${place.name}: ${change.line}`,
    ).toBeLessThanOrEqual(1.5);
}, 3_600_000);
