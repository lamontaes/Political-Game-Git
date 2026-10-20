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
        state.table("changes").rows() as unknown as {
          id: string;
          kind: string;
          jobId: string;
          personId: string;
        }[]
      ).filter((row) => ["left-work", "quit", "layoff"].includes(row.kind));
      const positions = state.table("positions").rows() as unknown as {
        id: string;
        organizationId: string;
        reasonKey: string;
        status: string;
        filledBy?: string;
        replacesJobId?: string;
        replacesPersonId?: string;
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
      // The chain: each opening names the employer record that posted it and the job it replaces.
      const employers = state.table("employers");
      for (const row of replacements) {
        const where = `${world.place.key} (seed ${drawSeed}): ${row.id}`;
        expect(employers.get(row.organizationId), where).toBeDefined();
        expect(world.core.organizations.has(row.organizationId), where).toBe(
          true,
        );
        expect(row.replacesJobId, where).toBeDefined();
        expect(row.replacesPersonId, where).toBeDefined();
      }
      // At least one opening follows a recorded separation of the same job and person.
      const followed = replacements.filter((row) =>
        separations.some(
          (change) =>
            change.jobId === row.replacesJobId &&
            change.personId === row.replacesPersonId,
        ),
      );
      expect(
        followed.map((row) => row.id),
        `${world.place.key} (seed ${drawSeed}): no replacement follows a recorded separation`,
      ).not.toEqual([]);
      // A filled opening ends in a recorded hire of the person who filled it.
      const hires = (
        state.table("changes").rows() as unknown as {
          kind: string;
          personId: string;
        }[]
      ).filter((change) => change.kind === "hire");
      const filled = replacements.filter((row) => row.status === "filled");
      for (const row of filled)
        expect(
          hires.some((change) => change.personId === row.filledBy),
          `${world.place.key} (seed ${drawSeed}): ${row.id} filled by ${row.filledBy} with no hire on record`,
        ).toBe(true);
      // One followed chain, by record id, for the PR body.
      const example =
        followed.find((row) => row.status === "filled") ?? followed[0]!;
      const leaving = separations.find(
        (change) =>
          change.jobId === example.replacesJobId &&
          change.personId === example.replacesPersonId,
      )!;
      console.log(
        `leaver-refilled: ${world.place.key} seed ${drawSeed}: employer ${example.organizationId}, separation ${leaving.id} (${leaving.kind}) of ${example.replacesPersonId} from ${example.replacesJobId}, opening ${example.id} (${example.status})` +
          (example.filledBy ? `, filled by ${example.filledBy}` : ""),
      );
      return;
    }
    throw new Error(
      `no drawn place had enough separations: ${tried.join("; ")}`,
    );
  }, 900_000);
});
