/**
 * The outcome web reads the government's own measures (pool item
 * web-gov-measures-read): in a random place from all 56, the town as the
 * player gets it, played a few months. A measure from the minimum-wage law or
 * the city budget that the web's links use is read from the engines' records
 * and cites the record it stands on, not a world-metrics month.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { govMeasure, govMeasureRecord } from "./gov-measures";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { placeOutcome } from "./modules/outcome-web";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("reads a government measure from its engine's record and cites that record", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "web-gov-measures");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core, placeId } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 75));
  let read = 0;
  for (const measure of [
    "labor.minimum-wage-to-median",
    "labor.minimum-wage-gap-to-15",
    "labor.minimum-wage-change-pct",
    "budget.parks-added-pct",
  ]) {
    const value = govMeasure(api, measure);
    const outcome = placeOutcome(api, placeId, measure);
    if (value === null) continue;
    expect(outcome, `${where}: ${measure}`).toBeTruthy();
    expect(outcome!.value, `${where}: ${measure}`).toBeCloseTo(value, 6);
    // The record it stands on is the engine's, named by id.
    expect(outcome!.engineRecordId, `${where}: ${measure}`).toBe(
      govMeasureRecord(api, measure),
    );
    read += 1;
  }
  expect(read, `${where}: government measures read`).toBeGreaterThan(0);
}, 900_000);
