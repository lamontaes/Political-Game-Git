/**
 * The opening's seekers come from the place's own unemployment rate, for the
 * counted people and the named ones alike (pool item gov-standins-jobs). A place
 * is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("opening seekers are chosen per place, from the place's own rate", () => {
  const place = drawPlace(seed, "opening-seekers");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const rows = coreAPI(core)
    .moduleState(JOBS_MODULE_ID)
    .table("seekers")
    .query("all", [true]) as unknown as {
    reasonKey: string;
    placeId: string;
  }[];
  const counted = coreAPI(core)
    .moduleState(JOBS_MODULE_ID)
    .table("countedSeekers")
    .query("all", [true]) as unknown as {
    reasonKey: string;
    placeId: string;
  }[];
  expect(
    counted.filter((r) => r.reasonKey === "opening-unemployed").length,
    `${where}: the wider population's seekers`,
  ).toBeGreaterThan(0);
  const opening = rows.filter((r) => r.reasonKey === "opening-unemployed");
  expect(opening.length, where).toBeGreaterThan(0);
  expect(
    opening.every((r) => r.placeId),
    where,
  ).toBe(true);
}, 600_000);
