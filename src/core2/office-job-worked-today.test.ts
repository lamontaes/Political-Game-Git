/**
 * A holder whose term has ended but who worked their office job today (the
 * controlled character plays the day before the calendar runs) keeps the job
 * until tomorrow's review instead of stopping the game. A random place from
 * all 56 that has a full-time seat holder with an office job.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { OFFICE_DAY_MODULE_ID, reviewOfficeJobs } from "./modules/office-day";
import type { ModuleRow } from "./module-data";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("ends an office job the day after the holder's last shift, not on it", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "office-job-worked-today");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const jobs = api.moduleState(OFFICE_DAY_MODULE_ID).table("officeJobs");
    const row = (
      jobs.rows() as unknown as {
        id: string;
        jobId: string | null;
        endedOn: string | null;
      }[]
    ).find((r) => r.jobId && !r.endedOn && core.jobs.get(r.jobId));
    if (!row) continue;
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const term = terms.get(row.id) as unknown as TermRow;
    terms.put({ ...term, status: "ended" } as unknown as ModuleRow);
    // The holder worked this job today already.
    core.work.lastAttendanceByJob.set(row.jobId!, {
      ...(core.work.lastAttendanceByJob.get(row.jobId!) ?? {}),
      date: core.date,
    } as never);
    reviewOfficeJobs(api);
    const where = `${place.name}, seed ${seed}:${draw}, job ${row.jobId}`;
    expect(core.jobs.get(row.jobId!)!.endsAt, where).toBeUndefined();
    // Tomorrow, before the day's work, the review ends it.
    core.date = addDays(makeIsoDate(core.date), 1);
    reviewOfficeJobs(api);
    expect(core.jobs.get(row.jobId!)!.endsAt, where).toBe(core.date);
    return;
  }
  throw new Error(`No full-time office job found: ${tried.join("; ")}`);
}, 3_600_000);
