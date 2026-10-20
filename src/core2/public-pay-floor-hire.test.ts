import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { jobsAt } from "./law-reach/group-b-money";
import { enactLaw, lawChain } from "./modules/laws";
import {
  PUBLIC_EMPLOYER_CLASSES,
  PUBLIC_PAY_FLOOR,
  publicPayFloorHourly,
} from "./public-pay-floor";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A public hire is paid at the public pay floor on the day it is hired, not a
// month later at the review (pool: laws-stopgap-laws-missing-engine, row
// SG-GOV-public-pay-floor-owner). The jobs engine reads this helper when it
// sets a hire's pay, so a job at a public employer with the floor in force
// must come out at or above the floor and a private employer's at zero.
it("holds a new public hire's pay to the floor in force, and no private hire's", () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "public-floor-hire");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const publicJob = jobsAt(api, PUBLIC_EMPLOYER_CLASSES)[0];
    const privateJob = [...(core as CoreState).jobs.values()].find(
      (job) =>
        job.endsAt === undefined &&
        !PUBLIC_EMPLOYER_CLASSES.includes(
          core.organizations.get(job.organizationId)?.classification ?? "",
        ),
    );
    if (!publicJob || !privateJob) {
      tried.push(`${where}: no public and private job`);
      continue;
    }
    const lowPay = { hourlyMinor: 1_000, wageDailyMinor: 8_000 };
    expect(
      publicPayFloorHourly(api, publicJob.organizationId, lowPay),
      where,
    ).toBe(0);
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: PUBLIC_PAY_FLOOR,
        value: 90_000,
        effectiveDate: core.date,
        measureId: "fixture:public-floor-hire",
        citation: "Fixture: a public pay floor enacted at every level.",
      });
    const hourly = publicPayFloorHourly(api, publicJob.organizationId, lowPay);
    // The pay it asks for meets the yearly floor at the job's own hours.
    expect(hourly, where).toBeGreaterThan(lowPay.hourlyMinor);
    expect(
      (hourly / lowPay.hourlyMinor) * lowPay.wageDailyMinor * 365,
      where,
    ).toBeGreaterThanOrEqual(90_000 * 100);
    expect(
      publicPayFloorHourly(api, privateJob.organizationId, lowPay),
      where,
    ).toBe(0);
    return;
  }
  throw new Error(`No drawn place had both: ${tried.join("; ")}`);
}, 1_800_000);

// The same, in a played year: with a floor enacted, every public post the
// game fills afterwards (an aide, a department head) is paid at or above it on
// the day it is filled, not a month later at the review. In play the jobs
// engine posts openings only at private enterprises, so public pay is set
// where public posts are filled (public-payroll.ts).
it("pays every public post filled in a played year at the floor from the day it is filled", () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "public-floor-year");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const state = core as CoreState;
    const before = new Set(state.jobs.keys());
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: PUBLIC_PAY_FLOOR,
        value: 90_000,
        effectiveDate: core.date,
        measureId: "fixture:public-floor-year",
        citation: "Fixture: a public pay floor enacted at every level.",
      });
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const posts = [...state.jobs.values()].filter(
      (job) =>
        !before.has(job.id) &&
        job.id.startsWith("job:public:") &&
        PUBLIC_EMPLOYER_CLASSES.includes(
          core.organizations.get(job.organizationId)?.classification ?? "",
        ),
    );
    if (!posts.length) {
      tried.push(`${where}: no public post filled after the floor`);
      continue;
    }
    const floorDaily = (90_000 * 100) / 365;
    for (const job of posts)
      expect(
        job.wageDailyMinor,
        `${where}: ${job.id} is paid under the yearly floor`,
      ).toBeGreaterThanOrEqual(Math.floor(floorDaily));
    return;
  }
  throw new Error(`No drawn place filled a public post: ${tried.join("; ")}`);
}, 3_600_000);
