import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { jobsAt } from "./law-reach/group-b-money";
import { enactLaw, lawChain } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { hireStaff, staffCandidates } from "./modules/staff";
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

// The same, in a played world: with a floor enacted, an aide an official hires
// is paid at or above it on the day they are hired, not a month later at the
// review. In play the jobs engine posts openings only at private enterprises,
// so public pay is set where public posts are filled (public-payroll.ts, from
// the staff hire).
it("pays an aide hired in a played world at the floor from the day they are hired", () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "public-floor-aide");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const state = core as CoreState;
    const holder = townSeats(api).find((seat) => seat.holder)?.holder;
    const candidate = holder
      ? staffCandidates(api, holder.personId)[0]
      : undefined;
    if (!holder || !candidate) {
      tried.push(`${where}: no official with a candidate`);
      continue;
    }
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: PUBLIC_PAY_FLOOR,
        value: 90_000,
        effectiveDate: core.date,
        measureId: "fixture:public-floor-aide",
        citation: "Fixture: a public pay floor enacted at every level.",
      });
    const aide = hireStaff(api, {
      officialId: holder.personId,
      personId: candidate.personId,
      role: "aide",
    });
    const job = aide.jobId ? state.jobs.get(aide.jobId) : undefined;
    expect(job, `${where}: aide ${aide.id} has a job`).toBeDefined();
    expect(
      PUBLIC_EMPLOYER_CLASSES.includes(
        core.organizations.get(job!.organizationId)?.classification ?? "",
      ),
      `${where}: the aide's employer is a public employer`,
    ).toBe(true);
    expect(
      job!.wageDailyMinor,
      `${where}: ${job!.id} is paid under the yearly floor`,
    ).toBeGreaterThanOrEqual(Math.floor((90_000 * 100) / 365));
    return;
  }
  throw new Error(`No drawn place hired an aide: ${tried.join("; ")}`);
}, 1_800_000);
