/**
 * In the played world, who runs is decided by the people themselves
 * (candidacy), not by the filing stand-in (SG-GOV-who-runs-stand-in): over two
 * years with an election, every filing was made by a candidate who weighed it,
 * and the stand-in filed no one. A place is drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("no filing in two played years comes from the who-runs stand-in", () => {
  const place = drawPlace(seed, "who-runs-played");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 730));
  const filings = coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .rows() as unknown as { id: string; how?: string }[];
  expect(filings.length, `${where}: filings`).toBeGreaterThan(0);
  const stoodIn = filings.filter((row) => row.how !== undefined);
  expect(
    stoodIn.map((row) => `${row.id}: ${row.how}`),
    `${where}: filings made by the stand-in`,
  ).toEqual([]);
}, 1_800_000);
