import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { jobsAt } from "./law-reach/group-b-money";
import { JOBS_MODULE_ID, type PositionRow } from "./modules/jobs";
import { enactLaw, lawChain } from "./modules/laws";
import {
  PUBLIC_EMPLOYER_CLASSES,
  PUBLIC_PAY_FLOOR,
  publicPayFloorHourly,
} from "./public-pay-floor";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A public opening is posted at the public pay floor in force when the jobs
// engine posts it, and a hire from it is paid what it was posted at, not a
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

// The same, in a played year: with a floor enacted, every opening the jobs
// engine posts at a public employer meets it, and so does every hire made
// from one. Openings posted before the floor (the engine posts again each
// month) are not held to it, so only those posted after the day it took
// effect are checked.
it("posts every public opening in a played year at the floor, and hires from it at what it posted", () => {
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
    const enacted = core.date;
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const positions = (
      api
        .moduleState(JOBS_MODULE_ID)
        .table("positions")
        .rows() as unknown as PositionRow[]
    ).filter(
      (row) =>
        row.openedAt > enacted &&
        PUBLIC_EMPLOYER_CLASSES.includes(
          core.organizations.get(row.organizationId)?.classification ?? "",
        ),
    );
    if (!positions.length) {
      tried.push(`${where}: no public opening posted after the floor`);
      continue;
    }
    for (const row of positions) {
      const template = state.jobs.get(row.templateJobId);
      if (!template) continue;
      const floor = publicPayFloorHourly(api, row.organizationId, template);
      expect(
        row.hourlyMinor,
        `${where}: opening ${row.id} posted below the floor ${floor}`,
      ).toBeGreaterThanOrEqual(floor);
      if (row.filledBy) {
        const hired = state.jobs.get(`job:${row.id}:${row.filledBy}`);
        if (hired?.hourlyMinor !== undefined)
          expect(
            hired.hourlyMinor,
            `${where}: the hire from ${row.id} is paid under what it posted`,
          ).toBeGreaterThanOrEqual(row.hourlyMinor);
      }
    }
    return;
  }
  throw new Error(
    `No drawn place posted a public opening: ${tried.join("; ")}`,
  );
}, 3_600_000);
