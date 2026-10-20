/**
 * Every aide of an official in a played world is on a treasury payroll, in
 * any place: a territory's state and federal offices have no job where they
 * sit to take a schedule from, so they follow the town's (pool item
 * gov-stopgap-staff-missing-engine). A place is drawn from all 56; set
 * STAFF_PAID_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import { staffOf } from "./modules/staff";

const seed = process.env.STAFF_PAID_SEED ?? randomBytes(8).toString("hex");

function aidesAreOnPayroll(place: { seed: string; key: string; name: string }) {
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const api = coreAPI(core);
  const aides = townSeats(api).flatMap((s) =>
    s.holder ? staffOf(api, s.holder.personId) : [],
  );
  expect(aides.length, where).toBeGreaterThan(0);
  const unpaid = aides.filter((a) => !a.jobId).map((a) => a.id);
  expect(unpaid, where).toEqual([]);
  // A paycheck has reached them: the pay ledgers of the aides' jobs show money paid.
  const jobs = new Set(aides.map((a) => a.jobId));
  const paid = [...core.work.payrollLedgerByCommitment.values()]
    .filter((ledger) => jobs.has(ledger.jobId))
    .reduce((n, ledger) => n + ledger.paidMinor, 0);
  expect(paid, `${where}: aides' pay ledgers`).toBeGreaterThan(0);
}

it("an aide hired in a played world draws a government paycheck", () => {
  aidesAreOnPayroll(drawPlace(seed, "staff-paid"));
}, 900_000);

// A territory district whose town opens with no ordinary job to follow.
it("an aide in Charlotte Amalie East, Virgin Islands (seed p3) draws a government paycheck", () => {
  aidesAreOnPayroll({
    seed: "p3",
    key: "territory:VI:charlotte-amalie-east",
    name: "Charlotte Amalie East",
  });
}, 900_000);
