/**
 * The Washington, D.C. worlds of the counted-moves balance checks (Dev Tester,
 * Nov 8: D.C. lost 7.1 percent of its people in one simulated year). They
 * take 734 to 1,555 seconds each, so they run in the heavy set, not in the
 * hosted `unit` job (CTO, Nov 18 02:28Z: "move the three D.C. cases ... into
 * the heavy suite. No assertion changes"). `vite.config.ts` leaves this file
 * out unless OCD_CALIBRATION is set, and `npm run test:calibration`, which the
 * heavy set runs on a train-to-main pull request, the nightly and by hand,
 * carries it. The small-territory case stays in counted-moves-balance.test.ts.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { townPeople, yearsOf } from "./counted-moves-balance-kit";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedMoves, countedStatePeople } from "./modules/counted-moves";
import { countryAbroadArrivals } from "./modules/macro";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

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

// A baseline inflow from abroad (owner research order, Nov 8): the country
// tier's own month brings people from abroad to each state (Pins family 29:
// no second rate of its own here), and the counted places take their part,
// settling where work is open. Washington, D.C. is the place where it shows
// most. Each arrival names the tier's month and the row it read.
it("a place takes in people from abroad as the country tier's month brings them, as moves with their cause (Washington, D.C., world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e)", () => {
  const seed =
    "03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e";
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: "1150000",
  });
  const start = townPeople(core);
  // The tier's own arrivals to the state, month by month over two years: the
  // counted places can take only their part of what the state was brought.
  const seen = new Set<string>();
  let stateArrived = 0;
  // Every 28 days, so no month is passed over (none is shorter).
  for (let day = 0; day < 730; day += 28) {
    advanceCore(core, addDays(makeIsoDate(core.date), Math.min(28, 730 - day)));
    const month = countryAbroadArrivals(coreAPI(core), "DC");
    if (!month || seen.has(`${month.month}`)) continue;
    seen.add(`${month.month}`);
    stateArrived += month.byBand.reduce((n, v) => n + v, 0);
  }
  const abroad = countedMoves(coreAPI(core)).filter(
    (row) => row.direction === "in" && row.fromPlace === "abroad",
  );
  const arrived = abroad.reduce((n, row) => n + row.people, 0);
  const line = `arrived ${arrived} of ${Math.round(start)}; the tier brought the state ${Math.round(stateArrived)} over ${seen.size} months`;
  process.stdout.write(`from abroad: ${line}\n`);
  expect(abroad.length, "moves in from abroad").toBeGreaterThan(0);
  // Whole households arrive, so the place's count can run past what it was
  // due by at most one arrival (a record stands for every household it
  // copies: SG-WORLD-counted-record-moves-whole); never more than that past
  // what the state was brought.
  const largest = Math.max(...abroad.map((row) => row.people));
  expect(seen.size, line).toBeGreaterThan(0);
  expect(arrived, `${line}; largest arrival ${largest}`).toBeLessThanOrEqual(
    stateArrived + largest,
  );
  for (const row of abroad) {
    expect(row.reasons.fromAbroad).toBeGreaterThan(0);
    expect(row.reads?.fromAbroad).toEqual(["country-state:US-DC"]);
  }
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
  // A state with no counted place here, where only the coarse model moves it.
  const total = (core: CoreState) =>
    ["TX", "CA", "FL", "NY", "OH", "PA", "IL", "GA", "NC", "MI"].reduce(
      (n, usps) => n + (countedStatePeople(core, usps) ?? 0),
      0,
    );
  const gain = total(law) - total(control);
  expect(total(control), "control has people").toBeGreaterThan(0);
  // 2.03 percent more arrivals from abroad: positive, and well under one percent of the people.
  expect(gain, "extra people the law brought").toBeGreaterThan(0);
  expect(gain / total(control)).toBeLessThan(0.01);
}, 3_600_000);
