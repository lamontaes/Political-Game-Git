import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
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

// A public employer's leaver is replaced through the jobs engine, and the
// opening is paid at or above the floor in force (pool item
// world-public-opening-floor-proof). Public employers have no business book,
// so they used to be left out of the jobs engine's employers and never opened
// a position. A place is drawn from all 56 on a seed nobody chose.
it("replaces a public employer's leaver with an opening paid at the floor", () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "public-floor-opening");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The jobs engine opens on the first day it runs; a death before then is not its to answer.
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const leaving = jobsAt(api, PUBLIC_EMPLOYER_CLASSES).find(
      (job) =>
        (core as CoreState).people.get(job.personId)?.alive &&
        core.organizations.get(job.organizationId)?.publicPayAuthority,
    );
    if (!leaving) {
      tried.push(`${where}: no full person in a public job`);
      continue;
    }
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: PUBLIC_PAY_FLOOR,
        value: 90_000,
        effectiveDate: core.date,
        measureId: "fixture:public-floor-opening",
        citation: "Fixture: a public pay floor enacted at every level.",
      });
    // The worker dies; the employer's need grows by their job at once.
    api.emit({
      id: `life.death:fixture:${leaving.personId}`,
      date: core.date,
      kind: "life.death",
      personIds: [leaving.personId],
      placeId: core.people.get(leaving.personId)!.placeId,
      source: {
        tag: "SOURCED",
        citation: "Fixture: a public worker dies.",
        asOf: core.date,
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const position = (
      api.moduleState(JOBS_MODULE_ID).table("positions").rows() as unknown as {
        id: string;
        organizationId: string;
        replacesJobId?: string;
        hourlyMinor: number;
        templateJobId: string;
      }[]
    ).find(
      (row) =>
        row.organizationId === leaving.organizationId &&
        row.replacesJobId === leaving.id,
    );
    const employerRow = api
      .moduleState(JOBS_MODULE_ID)
      .table("employers")
      .get(leaving.organizationId);
    expect(
      position,
      `${where}: an opening replacing ${leaving.id}; employer row ${JSON.stringify(employerRow)}`,
    ).toBeDefined();
    const template = (core as CoreState).jobs.get(position!.templateJobId)!;
    expect(
      position!.hourlyMinor,
      `${where}: ${position!.id} pays the floor`,
    ).toBeGreaterThanOrEqual(
      publicPayFloorHourly(api, leaving.organizationId, template),
    );
    console.log(
      `${where}: ${leaving.id} replaced by ${position!.id} at ${position!.hourlyMinor}`,
    );
    return;
  }
  throw new Error(`No drawn place had a public worker: ${tried.join("; ")}`);
}, 1_800_000);
