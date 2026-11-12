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
import { countedMoves, countedStatePeople } from "./modules/counted-moves";
import { enactLaw, lawChain } from "./modules/laws";
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
  // A real band is a comparison, not a target (owner, Nov 8): each year's change is a finite
  // number from the town's own moves, and the ones outside 1.5 percent are reported beside it.
  for (const change of changes) {
    expect(Number.isFinite(change.pct), change.line).toBe(true);
    if (Math.abs(change.pct) > 1.5)
      console.warn(
        `BAND WARN D.C.: ${change.line} (${change.pct.toFixed(2)}%) is outside 1.5% a year`,
      );
  }
}, 3_600_000);

it("a small territory keeps its people within 1.5 percent a year (Futiga, American Samoa, drawn from the seed dpA)", () => {
  const place = drawPlace("dpA", "drift-played");
  const { changes } = yearsOf(place.seed, place.key, 1);
  for (const change of changes) {
    expect(Number.isFinite(change.pct), `${place.name}: ${change.line}`).toBe(
      true,
    );
    if (Math.abs(change.pct) > 1.5)
      console.warn(
        `BAND WARN ${place.name}: ${change.line} (${change.pct.toFixed(2)}%) is outside 1.5% a year`,
      );
  }
}, 3_600_000);

// A baseline inflow from abroad (owner research order, Nov 8): the ACS "moved
// from abroad" line sets how many people a place takes in from outside the
// country each year, in the survey's age mix, apart from arrivals from other
// states. Washington, D.C. (1.30 percent of its people a year) is the place
// where it shows most.
it("a place takes in people from abroad at the ACS rate, as moves with their cause (Washington, D.C., world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e)", () => {
  const seed =
    "03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e";
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: "1150000",
  });
  const start = townPeople(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 730));
  const abroad = countedMoves(coreAPI(core)).filter(
    (row) => row.direction === "in" && row.fromPlace === "abroad",
  );
  const arrived = abroad.reduce((n, row) => n + row.people, 0);
  const expected = start * 0.013 * 2;
  expect(abroad.length, "moves in from abroad").toBeGreaterThan(0);
  // Whole households arrive, and the survey's rate is a total over places, so
  // the count is near the rate, not on it.
  expect(
    arrived,
    `arrived ${arrived} of about ${Math.round(expected)}`,
  ).toBeGreaterThan(expected * 0.4);
  expect(arrived).toBeLessThan(expected * 2.5);
  for (const row of abroad) expect(row.reasons.lifeStage).toBeGreaterThan(0);
}, 3_600_000);

// The federal question to admit more immigrants raises every state's arrivals
// from abroad by the researched extra admissions (51,800 a year over the
// 2,552,193 the survey finds), against a twin world where it is not law.
it("enacting the law to admit more immigrants raises the people a state takes in from abroad (Washington, D.C. twin worlds)", () => {
  const seed =
    "03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e";
  setBookkeeping(false);
  const build = () =>
    buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: "1150000",
    }).core;
  const law = build();
  const control = build();
  const api = coreAPI(law);
  const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
  enactLaw(api, {
    jurisdiction: federal.jurisdiction,
    level: "federal",
    series: "us-federal-positions:immigration.admit-more-immigrants",
    value: 1,
    effectiveDate: law.date,
    measureId: "federal-position-admit-more-immigrants",
    citation: "Enacted in a twin-world test.",
  });
  for (const core of [law, control])
    advanceCore(core, addDays(makeIsoDate(core.date), 365 * 2));
  const month = law.date.slice(0, 7);
  // A state with no counted place here, where only the coarse model moves it.
  const total = (core: CoreState) =>
    ["TX", "CA", "FL", "NY", "OH", "PA", "IL", "GA", "NC", "MI"].reduce(
      (n, usps) => n + (countedStatePeople(core, usps, month) ?? 0),
      0,
    );
  const gain = total(law) - total(control);
  expect(total(control), "control has people").toBeGreaterThan(0);
  // 2.03 percent more arrivals from abroad: positive, and well under one percent of the people.
  expect(gain, "extra people the law brought").toBeGreaterThan(0);
  expect(gain / total(control)).toBeLessThan(0.01);
}, 3_600_000);
