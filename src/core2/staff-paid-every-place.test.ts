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

it("an aide hired in a played world draws a government paycheck", () => {
  const place = drawPlace(seed, "staff-paid");
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
}, 900_000);
