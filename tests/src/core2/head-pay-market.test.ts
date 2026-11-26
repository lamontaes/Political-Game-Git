import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { campaignParameter } from "../../../src/core2/campaign-data";
import { gameStartDate } from "../../../src/core2/game-start";
import { lawChain } from "../../../src/core2/modules/laws";
import { postHourlyMinor } from "../../../src/core2/modules/staff";
import { coreAPI } from "../../../src/core2/state";
import { appointeeHourlyMinor, townPayNow } from "../../../src/core2/town-labor-pay";

// An appointed department head is paid from the town's own labor market, near
// the top of what its private jobs pay, and moves when the town's pay moves.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the head's pay follows the town's own jobs' pay, seed ${seed}`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "head-pay-market");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const town = lawChain(api).townPlaceId;
  const jobs = [...core.jobs.values()].filter((job) => {
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
  expect(jobs.length, where).toBeGreaterThan(0);
  const sorted = jobs.map((job) => job.hourlyMinor!).sort((a, b) => a - b);
  const rank = Math.min(
    sorted.length - 1,
    Math.floor(sorted.length * campaignParameter("appointeePayQuantile")),
  );
  const before = appointeeHourlyMinor(api);
  // The ranking itself, read from the jobs the town holds this moment.
  expect(
    townPayNow(api, campaignParameter("appointeePayQuantile")),
    where,
  ).toBe(Math.round(sorted[rank]!));
  // A head is paid at least what an aide is.
  expect(before, where).toBeGreaterThanOrEqual(postHourlyMinor(api));
  // The town's pay rises by half; read from the jobs the town holds this moment, the head's pay has risen with it.
  const quantile = campaignParameter("appointeePayQuantile");
  const was = townPayNow(api, quantile)!;
  for (const job of jobs) job.hourlyMinor = job.hourlyMinor! * 1.5;
  expect(townPayNow(api, quantile)! / was, where).toBeGreaterThan(1.3);
}, 600000);
