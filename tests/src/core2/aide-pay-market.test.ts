import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { lawChain } from "../../../src/core2/modules/laws";
import { postHourlyMinor } from "../../../src/core2/modules/staff";
import { coreAPI } from "../../../src/core2/state";

// An official's aide is paid from the town's own labor market: the median of
// what its private jobs pay, so it moves when the town's pay moves.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the aide's pay follows the town's own jobs' pay, seed ${seed}`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "aide-pay-market");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const town = lawChain(api).townPlaceId;
  const townJobs = () =>
    [...core.jobs.values()].filter((job) => {
      const org = core.organizations.get(job.organizationId);
      return (
        job.endsAt === undefined &&
        (job.hourlyMinor ?? 0) > 0 &&
        org?.placeId === town &&
        org.kind === "employer" &&
        !org.publicPayAuthority &&
        !org.outsideFlow
      );
    });
  const jobs = townJobs();
  expect(jobs.length, where).toBeGreaterThan(0);
  const before = postHourlyMinor(api);
  const sorted = jobs.map((job) => job.hourlyMinor!).sort((a, b) => a - b);
  expect(before, where).toBe(
    Math.round(sorted[Math.floor(sorted.length / 2)]!),
  );
  // The town's pay rises by half; a day later the aide's pay has risen with it.
  for (const job of jobs) job.hourlyMinor = job.hourlyMinor! * 1.5;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(postHourlyMinor(api) / before, where).toBeGreaterThan(1.3);
}, 600000);
