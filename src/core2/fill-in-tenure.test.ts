/**
 * A counted worker filled in as a full person keeps the tenure their records
 * gave them: the jobs engine reads it for layoffs and raises alike, so a
 * worker the player meets is not the newest hire in the firm. Played four
 * months in the bench world (two-level, every module) in a place drawn from
 * all 56 on a seed nobody chose, so the opening's counted jobs have run long
 * enough to tell a kept tenure from a restarted one, and the firms have hired
 * since the opening.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID, tenureYears } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState, JobInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Draws tried for a place whose four months hold a counted hire. */
const DRAWS = 3;

it("a counted worker filled in keeps the tenure their counted record gave them, whether they held the job at the opening or were hired since", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
    const place = drawPlace(drawSeed, "fill-in-tenure");
    const where = `${place.name} (${place.key}), seed ${drawSeed}`;
    const core = buildBenchWorld(drawSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core as CoreState;
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    const pay = api.moduleState(JOBS_MODULE_ID).table("pay");
    const hiredHere = (job: JobInput) =>
      (pay.get(job.id) as { since?: string } | undefined)?.since !== undefined;

    // A hire the jobs engine made in play (its job named for the opening it
    // filled) holds its job from its own start: no commitment copied from the
    // role's worker carries that worker's tenure. (A job held when the game
    // began keeps its estimated start, and a filled-in hire keeps its own on
    // its ":filled:" payroll.)
    const hire = (row: { jobId: string; payrollCalendarId?: string }) =>
      row.jobId.startsWith("job:position:") &&
      !(row.payrollCalendarId ?? "").includes(":filled:");
    for (const h of rt.store.liveHouseholds())
      for (const row of h.workCommitments)
        if (hire(row))
          expect(row.heldSince, `${where}: ${row.id}`).toBeUndefined();
    for (const row of core.work.commitments.values())
      if (hire(row))
        expect(row.heldSince, `${where}: ${row.id}`).toBeUndefined();

    const live = [...rt.jobs.values()]
      .filter(
        (job) => job.endsAt === undefined && !core.people.has(job.personId),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const later = live.filter(hiredHere).slice(0, 3);
    if (later.length === 0) {
      passed.push(`${where}: no counted hire in four months`);
      continue;
    }
    const opening = live
      .filter((job) => !hiredHere(job) && tenureYears(api, job) > 0.25)
      .slice(0, 5);
    expect(opening.length, where).toBeGreaterThan(0);
    for (const job of [...opening, ...later]) {
      const before = tenureYears(api, job);
      fillInPerson(core, job.personId);
      const full = core.jobs.get(job.id);
      expect(full, `${job.id} after fill-in`).toBeDefined();
      const after = tenureYears(api, full!);
      console.log(
        `${where}: ${job.personId} (${hiredHere(job) ? "hired since the opening" : "at the opening"}) held ${job.id} ${before.toFixed(4)} years counted, ${after.toFixed(4)} filled in`,
      );
      // Within a day's tenure: a restarted or borrowed start is far outside it.
      expect(after, `${where}: ${job.id}`).toBeCloseTo(before, 4);
    }
    return;
  }
  throw new Error(
    `No draw held a counted hire in four months: ${passed.join("; ")}`,
  );
}, 1_800_000);
