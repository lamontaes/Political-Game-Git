import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { schoolingOn } from "./modules/jobs";
import { departmentHeadHourlyMinor } from "./modules/staff";
import { coreAPI } from "./state";

// A department head's pay is read from the town's own labor market: the median
// of what its private jobs held by college graduates pay, so it moves when
// that pay moves.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the department head's pay follows the town's college-held jobs' pay, seed ${seed}`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "dept-head-pay-market");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const town = lawChain(api).townPlaceId;
  const jobs = () =>
    [...core.jobs.values()].filter((job) => {
      const org = core.organizations.get(job.organizationId);
      return (
        job.endsAt === undefined &&
        (job.hourlyMinor ?? 0) > 0 &&
        org?.placeId === town &&
        org.kind === "employer" &&
        !org.publicPayAuthority &&
        !org.outsideFlow &&
        schoolingOn(api, job.personId, core.date) === "college"
      );
    });
  const held = jobs();
  // A town with no college-held private job has no market to read; a drawn
  // place that is one is passed over by the draw's next seed.
  expect(held.length, where).toBeGreaterThan(0);
  const before = departmentHeadHourlyMinor(api);
  const sorted = held.map((job) => job.hourlyMinor!).sort((a, b) => a - b);
  expect(before, where).toBe(
    Math.round(sorted[Math.floor(sorted.length / 2)]!),
  );
  for (const job of held) job.hourlyMinor = job.hourlyMinor! * 1.5;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(departmentHeadHourlyMinor(api) / before, where).toBeGreaterThan(1.3);
}, 600000);
