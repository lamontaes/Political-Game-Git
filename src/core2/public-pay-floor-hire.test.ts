import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { jobsAt } from "./law-reach/group-b-money";
import { enactLaw, lawChain } from "./modules/laws";
import { inCustody } from "./modules/justice";
import { townSeats } from "./modules/offices";
import { hireStaff, staffCandidates } from "./modules/staff";
import {
  PUBLIC_EMPLOYER_CLASSES,
  PUBLIC_PAY_FLOOR,
  publicPayFloorHourly,
} from "./public-pay-floor";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/**
 * The seeds a test draws, logged before the world is built so a failed draw
 * can be replayed: set PUBLIC_FLOOR_SEED and that seed is tried first, then
 * the usual fresh draws follow (a seed whose place lacks the case the test
 * needs is passed over and named, like any other draw).
 */
function* drawSeeds(purpose: string, attempts: number): Generator<string> {
  const replay = process.env.PUBLIC_FLOOR_SEED;
  const total = replay ? attempts + 1 : attempts;
  for (let i = 0; i < total; i += 1) {
    const seed = replay && i === 0 ? replay : randomBytes(8).toString("hex");
    process.stdout.write(`public-pay-floor-hire ${purpose}: seed ${seed}\n`);
    yield seed;
  }
}

// A public hire is paid at the public pay floor on the day it is hired, not a
// month later at the review (pool: laws-stopgap-laws-missing-engine, row
// SG-GOV-public-pay-floor-owner). The jobs engine reads this helper when it
// sets a hire's pay, so a job at a public employer with the floor in force
// must come out at or above the floor and a private employer's at zero.
it("holds a new public hire's pay to the floor in force, and no private hire's", () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (const seed of drawSeeds("public-floor-hire", 6)) {
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
  for (const seed of drawSeeds("public-floor-aide", 6)) {
    const place = drawPlace(seed, "public-floor-aide");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const state = core as CoreState;
    const holder = townSeats(api).find((seat) => seat.holder)?.holder;
    if (!holder) {
      tried.push(`${where}: no official`);
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
    // The applicant is picked from who is advertised with the laws in force,
    // then hired at once: a candidate chosen before the laws can stop being
    // one by the time of the hire.
    const candidate = staffCandidates(api, holder.personId).find(
      (row) => !inCustody(api, row.personId),
    );
    process.stdout.write(
      `public-pay-floor-hire aide: ${where}, official ${holder.personId}, applicant ${candidate?.personId ?? "none"}\n`,
    );
    if (!candidate) {
      tried.push(`${where}: no official with a candidate`);
      continue;
    }
    const aide = hireStaff(api, {
      officialId: holder.personId,
      personId: candidate.personId,
      role: "aide",
    });
    const job = aide.jobId ? state.jobs.get(aide.jobId) : undefined;
    expect(job, `${where}: aide ${aide.id} has a job`).toBeDefined();
    // The aide's employer is the government's own treasury, which the floor
    // reads as a public employer of that government's level.
    expect(
      core.organizations.get(job!.organizationId)?.kind,
      `${where}: the aide's employer ${job!.organizationId}`,
    ).toBe("government-treasury");
    expect(
      job!.wageDailyMinor,
      `${where}: ${job!.id} is paid under the yearly floor`,
    ).toBeGreaterThanOrEqual(Math.floor((90_000 * 100) / 365));
    return;
  }
  throw new Error(`No drawn place hired an aide: ${tried.join("; ")}`);
}, 1_800_000);

// A school district is a government of its own under its state: a floor
// enacted at the county or city does not reach its staff, and one enacted at
// the state does (SG-GOV-public-pay-floor-owner).
it("holds a school district's hire to a state floor and not to a city or county floor", () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (const seed of drawSeeds("public-floor-school", 8)) {
    const place = drawPlace(seed, "public-floor-school");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const classOf = (organizationId: string) =>
      core.organizations.get(organizationId)?.classification ?? "";
    const school = jobsAt(api, ["service:school", "service:public-school"])[0];
    const town = jobsAt(api, [
      "service:municipal-government",
      "sector:local-government-office",
    ])[0];
    if (!school || !town) {
      tried.push(`${where}: no school and town job`);
      continue;
    }
    const lowPay = { hourlyMinor: 1_000, wageDailyMinor: 8_000 };
    const enact = (level: string, measureId: string) => {
      const row = lawChain(api).levels.find((l) => l.level === level);
      if (!row) return false;
      enactLaw(api, {
        jurisdiction: row.jurisdiction,
        level: row.level,
        series: PUBLIC_PAY_FLOOR,
        value: 90_000,
        effectiveDate: core.date,
        measureId,
        citation: "Fixture: a public pay floor enacted at one level.",
      });
      return true;
    };
    if (!enact("city", "fixture:school-floor-city")) {
      tried.push(`${where}: no city level`);
      continue;
    }
    // A town employer is held to the city floor; the school district is not.
    expect(
      publicPayFloorHourly(api, town.organizationId, lowPay),
      `${where}: ${classOf(town.organizationId)}`,
    ).toBeGreaterThan(lowPay.hourlyMinor);
    expect(
      publicPayFloorHourly(api, school.organizationId, lowPay),
      `${where}: ${classOf(school.organizationId)}`,
    ).toBe(0);
    if (!enact("state", "fixture:school-floor-state")) {
      tried.push(`${where}: no state level`);
      continue;
    }
    expect(
      publicPayFloorHourly(api, school.organizationId, lowPay),
      `${where}: ${classOf(school.organizationId)}`,
    ).toBeGreaterThan(lowPay.hourlyMinor);
    return;
  }
  throw new Error(`No drawn place had both: ${tried.join("; ")}`);
}, 1_800_000);
