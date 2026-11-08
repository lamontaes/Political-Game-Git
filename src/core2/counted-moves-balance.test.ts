/**
 * People move between a place and the rest of the country in both directions
 * from the same rates, so a place does not empty or fill by arithmetic alone
 * (Dev Tester, Nov 8: Washington, D.C. lost 7.1 percent of its people in one
 * simulated year, 54,452 leaving for a "rest of state" and 14,566 arriving).
 * A jurisdiction that is wholly counted places has no remainder to send
 * people to or take them from, and a destination's weight counts its counted
 * people too. Named regression world (a small drawn place has too few people to hold a percent bound: Loomis, SD, 116 to 112).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedMoves } from "./modules/counted-moves";
import { coreAPI } from "./state";

it("a wholly counted jurisdiction sends no one to a rest of state it does not have (Washington, D.C., world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e)", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(
    "03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e",
    gameStartDate(),
    { twoLevel: true, placeKey: "1150000" },
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const toRest = countedMoves(coreAPI(core)).filter(
    (row) =>
      row.direction === "out" && String(row.toPlace).endsWith(":rest-of-state"),
  );
  expect(toRest.length, "moves out to a rest of state that has no people").toBe(
    0,
  );
}, 3_600_000);

// Known gap, measured Nov 8 (see docs/reports/dev-tests/2026-11-08.md): after
// this fix Washington, D.C. still loses 3.6 percent of its people a year (was
// 7.1), because the pull gives a small, dense, expensive jurisdiction far more
// leavers than arrivals (destination weight is its population share). Calibrate
// on Census or IRS state-to-state flows; the bar is within 1.5 percent a year.
it.todo(
  "Washington, D.C. keeps its people within 1.5 percent a year (state-to-state flows calibrated on Census/IRS)",
);
