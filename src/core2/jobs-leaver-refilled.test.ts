/**
 * A firm short of staff refills the job its worker left: a shrink carried
 * from an earlier month no longer swallows the leaver's vacancy, so a small
 * town's employers open positions through a year. The place and seed are in
 * every failure message; places are drawn until one has enough separations.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { JOBS_DATA, JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.JOBS_REFILL_SEED ?? randomBytes(8).toString("hex");
const START = "2026-10-12";
const DRAWS = 3;
const MIN_SEPARATIONS = 5;

const addDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

describe(`employers refill the jobs workers leave (seed ${seed})`, () => {
  it("a year with separations opens a position that replaces a leaver", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
      const world = buildBenchWorld(drawSeed, START, { twoLevel: true });
      let date = START;
      for (let i = 0; i < 365; i += 1) {
        date = addDay(date);
        advanceCore(world.core, date);
      }
      const state = coreAPI(world.core).moduleState(JOBS_MODULE_ID);
      const separations = (
        state.table("changes").rows() as unknown as { kind: string }[]
      ).filter((row) => ["left-work", "quit", "layoff"].includes(row.kind));
      const positions = state.table("positions").rows() as unknown as {
        reasonKey: string;
        replacesJobId?: string;
      }[];
      const replacements = positions.filter(
        (row) => row.reasonKey === JOBS_DATA.reasons.replacement,
      );
      tried.push(
        `${world.place.key} (seed ${drawSeed}): ${separations.length} separations, ${replacements.length} replacements`,
      );
      if (separations.length < MIN_SEPARATIONS) continue;
      expect(
        replacements.length,
        `${world.place.key} (seed ${drawSeed}) had ${separations.length} separations and no replacement opening`,
      ).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `no drawn place had enough separations: ${tried.join("; ")}`,
    );
  }, 900_000);
});
