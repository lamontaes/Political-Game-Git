import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { countedJobsOf } from "./residents-economy";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

const after = (from: string, days: number) => {
  const at = new Date(`${from}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

describe(`a business's price follows its own pay (seed ${seed})`, () => {
  it("lifts the price of the firms whose jobs were raised more than the firms whose pay stood", () => {
    // A town with firms enough to split in two (some are too small).
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "finance-own-pay-price");
      const core = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core;
      const api = coreAPI(core);
      // Two monthly reviews, so every firm holds a record of what its jobs paid.
      advanceCore(core, after(core.date, 70));
      const jobsOf = (id: string) => [
        ...[...(core.finance.jobsByOrganization.get(id) ?? [])]
          .map((jobId) => core.jobs.get(jobId))
          .filter((job) => job?.hourlyMinor && job.endsAt === undefined),
        ...countedJobsOf(core, id).filter((job) => job.hourlyMinor),
      ];
      const firms = [...core.finance.businesses.keys()]
        .filter((id) => !core.finance.businesses.get(id)!.closedAt)
        .filter((id) => jobsOf(id).length > 0)
        .sort();
      if (firms.length < 6) continue;
      const raised = new Set(firms.filter((_, at) => at % 2 === 0));
      const priceBefore = new Map(
        firms.map((id) => [id, core.finance.businesses.get(id)!.price]),
      );
      // The firms' own pay rises by a third (a local minimum wage raise does this to a low-wage firm).
      for (const id of raised)
        for (const job of jobsOf(id))
          api.rerateJob(job!.id, Math.round(job!.hourlyMinor! * 1.33), {
            tag: "SOURCED",
            citation: "Own-pay price regression fixture",
            asOf: core.date,
          });
      advanceCore(core, after(core.date, 35));
      const mean = (ids: string[]) =>
        ids.reduce(
          (sum, id) =>
            sum + core.finance.businesses.get(id)!.price / priceBefore.get(id)!,
          0,
        ) / ids.length;
      const up = firms.filter((id) => raised.has(id));
      const stood = firms.filter((id) => !raised.has(id));
      expect(
        mean(up),
        `${place.name}; seed ${place.seed}; raised ${up.slice(0, 3)}`,
      ).toBeGreaterThan(mean(stood));
      return;
    }
    throw new Error(`No town with six firms in eight draws; seed ${seed}`);
  }, 1_200_000);
});
