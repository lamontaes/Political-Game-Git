/**
 * People move between a place and the rest of the country in both directions
 * from the same survey, so a place does not empty or fill by arithmetic alone
 * (Dev Tester, Nov 8: Washington, D.C. lost 7.1 percent of its people in one
 * simulated year; Futiga, American Samoa, 5.2). Two causes: a jurisdiction
 * made wholly of counted places had a phantom rest of state to trade people
 * with, and a destination's weight was its share of the nation's people, not
 * the arrivals the American Community Survey finds in it. Where people go is
 * now a gravity model fitted to the survey's own departures and arrivals by
 * state, through the same pull as before. Named regression worlds. The checks
 * ask whether the world's own records (births, deaths, moves) explain each
 * year's change, never whether it stays inside a range (owner, Nov 8: real
 * ranges are not targets).
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
import { RENEWAL_MODULE_ID } from "./modules/renewal";
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

/**
 * A year's change in the town's people and what the world recorded for it:
 * the counted tier's births and deaths (the renewal engine's running totals),
 * the counted moves in and out, and the full people's own births and deaths.
 * What none of those records explains is `unexplained`.
 */
interface YearChange {
  readonly line: string;
  readonly change: number;
  readonly explained: number;
  readonly unexplained: number;
  readonly pct: number;
}

function carryTotals(core: CoreState) {
  let born = 0,
    died = 0;
  for (const row of coreAPI(core)
    .moduleState(RENEWAL_MODULE_ID)
    .table("countedCarry")
    .rows() as unknown as { born?: number; died?: number }[]) {
    born += row.born ?? 0;
    died += row.died ?? 0;
  }
  return { born, died };
}

function fullEvents(core: CoreState, from: string) {
  const town = townPlaceOf(core);
  let born = 0,
    died = 0;
  for (const event of core.durableLog.values()) {
    if (event.date < from || event.placeId !== town) continue;
    if (event.kind === "person-birth") born += 1;
    if (event.kind === "life.death") died += 1;
  }
  return { born, died };
}

function yearsOf(worldSeed: string, key: string, years: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const changes: YearChange[] = [];
  let before = townPeople(core);
  let carry = carryTotals(core);
  let seen = countedMoves(coreAPI(core)).length;
  let from = core.date;
  for (let year = 1; year <= years; year++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const after = townPeople(core);
    const now = carryTotals(core);
    const moves = countedMoves(coreAPI(core)).slice(seen);
    const full = fullEvents(core, from);
    const into = moves
      .filter((row) => row.direction === "in")
      .reduce((n, row) => n + row.people, 0);
    const out = moves
      .filter((row) => row.direction === "out")
      .reduce((n, row) => n + row.people, 0);
    const explained =
      now.born -
      carry.born -
      (now.died - carry.died) +
      into -
      out +
      full.born -
      full.died;
    changes.push({
      line: `year ${year}: ${Math.round(before)} to ${Math.round(after)}; counted births ${Math.round(now.born - carry.born)}, deaths ${Math.round(now.died - carry.died)}, moves in ${Math.round(into)}, out ${Math.round(out)}, full births ${full.born}, deaths ${full.died}`,
      change: after - before,
      explained,
      unexplained: after - before - explained,
      pct: (100 * (after - before)) / before,
    });
    before = after;
    carry = now;
    seen += moves.length;
    from = core.date;
  }
  return { core, changes };
}

/**
 * Owner, Nov 8: real ranges are not targets. A place's people may rise or fall
 * by whatever its causes bring; a year fails only when its change is not
 * explained by the births, deaths and moves the world recorded. The
 * accounting identity is exact up to people filled in between tiers and a
 * few full people's moves, so the unexplained part may not exceed half a
 * percent of the start.
 */
function expectExplained(changes: readonly YearChange[], where: string) {
  for (const row of changes) {
    const before = row.change / (row.pct / 100);
    expect(
      Math.abs(row.unexplained),
      `${where}: ${row.line}; change ${row.change}, explained ${row.explained}`,
    ).toBeLessThanOrEqual(Math.max(5, before * 0.005));
  }
}

it("a wholly counted jurisdiction's people change only by what the world recorded for three years, with no one sent to a rest of state it does not have (Washington, D.C., world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e)", () => {
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
  expectExplained(changes, "Washington, D.C.");
}, 3_600_000);

it("a small territory's people change only by what the world recorded (Futiga, American Samoa, drawn from the seed dpA)", () => {
  const place = drawPlace("dpA", "drift-played");
  const { changes } = yearsOf(place.seed, place.key, 1);
  expectExplained(changes, place.name);
}, 3_600_000);

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
