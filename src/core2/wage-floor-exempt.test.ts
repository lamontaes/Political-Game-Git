import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { coreAPI } from "./state";
import { minimumWageExempt } from "./wage-floor";

// The minimum wage does not reach an elected official, their personal staff or
// a policymaking appointee (29 U.S.C. 203(e)(2)(C), data/laws/
// minimum-wage-exempt.json), nor a job at the world outside the town. A raise
// leaves their pay as it was and lifts every covered worker under the floor.
const seed = process.env.WAGE_EXEMPT_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 12;

describe(`a minimum wage raise in a played world (seed ${seed})`, () => {
  it("leaves exempt officers' pay unchanged and raises covered workers to the floor", () => {
    const tried: string[] = [];
    for (let i = 0; i < DRAWS; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "wage-exempt");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const inTown = (organizationId: string) =>
        core.visiblePlaceIds.has(
          core.organizations.get(organizationId)?.placeId ?? "",
        );
      const open = [...core.jobs.values()].filter(
        (j) =>
          j.endsAt === undefined &&
          (j.hourlyMinor ?? 0) > 0 &&
          (j.hoursDaily ?? 0) > 0 &&
          inTown(j.organizationId),
      );
      const exempt = open.filter((j) =>
        minimumWageExempt(core, j.id, j.organizationId),
      );
      const covered = open.filter(
        (j) => !minimumWageExempt(core, j.id, j.organizationId),
      );
      if (!exempt.length || !covered.length) {
        tried.push(`${where}: no exempt and covered jobs together`);
        continue;
      }
      // A floor above every covered rate: every covered worker is under it.
      const floor = Math.max(...covered.map((j) => j.hourlyMinor ?? 0)) + 100;
      const before = new Map(exempt.map((j) => [j.id, j.hourlyMinor]));
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      enactLaw(api, {
        jurisdiction: state.jurisdiction,
        level: "state",
        series: "minimum-wage",
        value: floor,
        unit: "minor/hour",
        effectiveDate: addDays(makeIsoDate(core.date), 1),
        measureId: "wage-exempt-test",
        citation: "Test act: a minimum wage above every covered rate",
      });
      // Past the wage taking effect and two monthly reviews of pay under it.
      advanceCore(core, addDays(makeIsoDate(core.date), 62));
      expect(lawInForce(api, "minimum-wage").value, where).toBe(floor);
      // Exempt pay is untouched, and some of it sits under the floor.
      for (const job of exempt)
        expect(
          core.jobs.get(job.id)?.hourlyMinor,
          `${where}: exempt ${job.id} (${job.title})`,
        ).toBe(before.get(job.id));
      expect(
        exempt.filter((j) => (before.get(j.id) ?? 0) < floor).length,
        `${where}: an exempt job under the floor`,
      ).toBeGreaterThan(0);
      // Covered full workers were raised to the floor, each on a raise record.
      const raises = api
        .moduleState(LAWS_MODULE_ID)
        .table("raises")
        .rows() as unknown as { id: string; jobId: string; toMinor: number }[];
      const raised = covered.filter(
        (j) => core.jobs.get(j.id)?.endsAt === undefined && core.jobs.has(j.id),
      );
      expect(raised.length, where).toBeGreaterThan(0);
      for (const job of raised) {
        const now = core.jobs.get(job.id)!.hourlyMinor ?? 0;
        expect(
          now,
          `${where}: covered ${job.id} (${job.title})`,
        ).toBeGreaterThanOrEqual(floor);
        expect(
          raises.some((r) => r.jobId === job.id && r.toMinor === floor),
          `${where}: no raise record for ${job.id}`,
        ).toBe(true);
      }
      return;
    }
    throw new Error(
      `No drawn place had both kinds of job: ${tried.join("; ")}`,
    );
  }, 900_000);
});
