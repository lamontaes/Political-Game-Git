/**
 * Counted workers (the wider population) retire and start looking for work by
 * the shared chooser, from what their counted record holds, not by summed
 * pulls. A year of a played town is run in a place drawn from all 56 until a
 * counted worker has retired and a counted adult has started looking; each is
 * found by record id with the chooser's recorded reasons. The place, seed and
 * ids are printed, and every failure names each place and seed tried.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  JOBS_DATA,
  JOBS_MODULE_ID,
  retirementOnsetYears,
  reviewCountedEntry,
  reviewJobless,
} from "./modules/jobs";
import { residentPerson } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.JOBS_COUNTED_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

interface Change {
  id: string;
  kind: string;
  personId: string;
  jobId: string;
  reasonKey: string;
  decidedBy: string;
  values: Record<string, number>;
}
interface Seeker {
  id: string;
  personId: string;
  employed: boolean;
  since: string;
  reasonKey: string;
  reasons?: Record<string, number>;
}

describe(`counted workers decide by the shared chooser (seed ${seed})`, () => {
  it("a counted worker retires and a counted adult starts looking, each with the chooser's reasons", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(draw ? `${seed}:${draw}` : seed, "jobs-counted");
      const where = `${place.key} (seed ${place.seed})`;
      tried.push(where);
      const start = gameStartDate();
      const world = buildBenchWorld(place.seed, start, {
        twoLevel: true,
        placeKey: place.key,
      });
      const jobs = coreAPI(world.core).moduleState(JOBS_MODULE_ID);
      const looking = new Map<string, Seeker>();
      let retired: Change | undefined;
      let date = makeIsoDate(start);
      // The whole played year: the first witnesses are kept as they appear,
      // and the year runs on to its end before their reasons are read.
      for (let day = 0; day < 365; day += 1) {
        date = addDays(date, 1);
        advanceCore(world.core, date);
        for (const row of jobs
          .table("countedSeekers")
          .rows() as unknown as Seeker[])
          if (
            row.reasonKey === JOBS_DATA.reasons.startedLooking &&
            row.reasons &&
            !looking.has(row.personId) &&
            residentPerson(world.core, row.personId)
          )
            looking.set(row.personId, { ...row });
        retired ??= (jobs.table("changes").rows() as unknown as Change[]).find(
          (row) =>
            row.kind === "left-work" &&
            row.reasonKey === JOBS_DATA.reasons.retired &&
            row.values.counted === 1,
        );
      }
      expect(date, `${where}: the played year`).toBe(
        addDays(makeIsoDate(start), 365),
      );
      if (!retired || !looking.size) continue;
      const searcher = [...looking.values()][0]!;
      console.log(
        `counted choices: ${where}; retired change ${retired.id} (person ${retired.personId}, job ${retired.jobId}); started looking ${searcher.personId} on ${searcher.since} (${looking.size} in all)`,
      );
      // The retirement is the person's own decision, read from their record.
      expect(retired.decidedBy, where).toBe(retired.personId);
      expect(retired.values.age, where).toBeGreaterThan(
        retirementOnsetYears(coreAPI(world.core)),
      );
      for (const reasons of [retired.values, searcher.reasons!]) {
        expect(reasons, where).toHaveProperty("score");
        expect(reasons, where).toHaveProperty("trait");
        const parts =
          (reasons.need ?? 0) +
          (reasons.goal ?? 0) +
          (reasons.drive ?? 0) +
          (reasons.trait ?? 0) +
          (reasons.emotion ?? 0) +
          (reasons.effort ?? 0) +
          (reasons.module ?? 0);
        expect(reasons.score, where).toBeCloseTo(parts, 9);
      }
      return;
    }
    throw new Error(
      `No counted retirement and search in a year in ${DRAWS} places: ${tried.join("; ")}`,
    );
  }, 3_600_000);

  it("someone already looking who now prefers to wait stops looking, full or counted alike, with the claim ended", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(draw ? `${seed}:${draw}` : seed, "jobs-wait");
      const where = `${place.key} (seed ${place.seed})`;
      tried.push(where);
      const start = gameStartDate();
      const world = buildBenchWorld(place.seed, start, {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const jobs = api.moduleState(JOBS_MODULE_ID);
      const openClaims = (personId: string) =>
        (
          jobs.table("claims").rows() as unknown as {
            personId: string;
            open: boolean;
          }[]
        ).filter((row) => row.personId === personId && row.open).length;
      let date = makeIsoDate(start);
      let full: Seeker | undefined;
      let counted: Seeker | undefined;
      for (let day = 0; day < 365 && !(full && counted); day += 1) {
        date = addDays(date, 1);
        advanceCore(world.core, date);
        full ??= (jobs.table("seekers").rows() as unknown as Seeker[]).find(
          (row) => !row.employed && world.core.people.has(row.personId),
        );
        counted ??= (
          jobs.table("countedSeekers").rows() as unknown as Seeker[]
        ).find(
          (row) =>
            !row.employed &&
            row.reasonKey === JOBS_DATA.reasons.startedLooking &&
            residentPerson(world.core, row.personId),
        );
      }
      if (!full || !counted) continue;
      // Looking is now far below waiting for everyone: the same circumstances for both tiers.
      const baseline = world.core.data.parameters.jobsEnterBaseline!;
      const kept = baseline.value;
      baseline.value = -1000;
      const claimsBefore = [
        openClaims(full.personId),
        openClaims(counted.personId),
      ];
      try {
        reviewJobless(api);
        reviewCountedEntry(api);
      } finally {
        baseline.value = kept;
      }
      console.log(
        `wait review: ${where}; full seeker ${full.personId} (open claims ${claimsBefore[0]}), counted seeker ${counted.personId} (open claims ${claimsBefore[1]})`,
      );
      expect(jobs.table("seekers").get(full.personId), where).toBeUndefined();
      expect(
        jobs.table("countedSeekers").get(counted.personId),
        where,
      ).toBeUndefined();
      expect(openClaims(full.personId), where).toBe(0);
      expect(openClaims(counted.personId), where).toBe(0);
      return;
    }
    throw new Error(
      `No already-seeking full and counted person in ${DRAWS} places: ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
