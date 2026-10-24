/**
 * A counted household's own jobs and yearly wages follow the jobs engine's
 * changes to its workers' jobs (hires, quits, layoffs, closures), so the
 * household's income reads the jobs its employers pay, and a member hired
 * during the year keeps that job, on its own employer's payroll, when the
 * player meets them. Played for a year in the bench world in a place drawn
 * from all 56 on a seed nobody chose; a year with no counted hire still unmet
 * is drawn again, a bounded number of times. A second case plays a named
 * seed whose year has a founded firm hiring from another employer's role,
 * the hire whose calendar a fill-in once refused.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  countedHouseholdsByPlace,
  residentsRuntime,
} from "./modules/residents";
import { fillInPerson } from "./state";
import type { CoreState, WorkCommitmentInput } from "./types";

const seed = process.env.COUNTED_JOBS_SEED || randomBytes(8).toString("hex");
const DRAWS = 3;
// Its drawn town's year has a founded firm hiring counted workers from another
// employer's role (Central Falls, Rhode Island when this case was added).
const WITNESS_SEED = "speedlead-a1";
const DAYS_PER_YEAR = 365;

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "counted-household-jobs");
  const core = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const rt = residentsRuntime(core)!;
  const opening = new Set(
    [...rt.jobs.values()]
      .filter((job) => job.endsAt === undefined)
      .map((job) => job.id),
  );
  let day = makeIsoDate(core.date);
  const end = addDays(day, DAYS_PER_YEAR);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  const open = [...rt.jobs.values()].filter((job) => job.endsAt === undefined);
  const hired = open.filter((job) => !opening.has(job.id));
  const ended = [...opening].filter((id) => rt.jobs.get(id)?.endsAt);
  return { place, core, rt, open, hired, ended };
}

type Played = ReturnType<typeof play>;

/** Open commitments households keep whose schedule is another employer's role. */
function borrowedRoles({ core, rt }: Played): WorkCommitmentInput[] {
  const out: WorkCommitmentInput[] = [];
  for (const h of rt.store.households)
    for (const commitment of h?.workCommitments ?? []) {
      const templateId = commitment.scheduleTemplateJobId;
      const role = templateId
        ? (rt.jobs.get(templateId) ?? core.jobs.get(templateId))
        : undefined;
      if (
        commitment.endsAt === undefined &&
        role &&
        role.organizationId !== commitment.organizationId
      )
        out.push(commitment);
    }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Every open commitment a household keeps with a kept calendar is paid on its
 * own employer's calendar (a fill-in refuses any other). Returns how many.
 */
function ownCalendars(run: Played, where: string): number {
  const calendars = new Map(
    (run.rt.input.calendars ?? []).map((row) => [row.id, row]),
  );
  let kept = 0;
  for (const h of run.rt.store.households)
    for (const commitment of h?.workCommitments ?? []) {
      const calendar = commitment.payrollCalendarId
        ? calendars.get(commitment.payrollCalendarId)
        : undefined;
      if (commitment.endsAt !== undefined || !calendar) continue;
      expect(
        calendar.organizationId,
        `${where}: ${commitment.id} paid on ${calendar.id}`,
      ).toBe(commitment.organizationId);
      kept += 1;
    }
  return kept;
}

/**
 * Meets a counted worker hired in the year and checks they keep the job, its
 * pay, and a payroll calendar whose employer is the job's. A commitment given
 * is the hire met; its kept calendar must exist and name its employer.
 */
function meet(run: Played, where: string, commitment?: WorkCommitmentInput) {
  const { core, rt, hired } = run;
  const job = commitment
    ? rt.jobs.get(commitment.jobId)
    : hired
        .filter((row) => !core.people.has(row.personId))
        .sort((a, b) => a.id.localeCompare(b.id))[0];
  expect(job, `${where}: a counted worker hired in the year`).toBeDefined();
  if (commitment) {
    const kept = (rt.input.calendars ?? []).find(
      (row) => row.id === commitment.payrollCalendarId,
    );
    expect(kept, `${where}: ${commitment.id} keeps its calendar`).toBeDefined();
    expect(
      kept!.organizationId,
      `${where}: ${commitment.id} kept on ${kept!.id}`,
    ).toBe(commitment.organizationId);
  }
  const person = fillInPerson(core, job!.personId);
  expect(person.jobId, `${where}: ${job!.personId} met`).toBe(job!.id);
  const full = core.jobs.get(job!.id);
  expect(full?.endsAt, `${where}: ${job!.id} open when met`).toBeUndefined();
  expect(full?.wageDailyMinor, `${where}: ${job!.id} pay`).toBe(
    job!.wageDailyMinor,
  );
  // Paid by the job's own employer on the role's schedule.
  const calendarId = core.work.payrollCalendarByJob.get(job!.id);
  expect(calendarId, `${where}: ${job!.id} on a payroll`).toBeDefined();
  const calendar = core.work.payrollCalendars.get(calendarId!);
  expect(
    calendar?.organizationId,
    `${where}: ${job!.id} paid on ${calendarId}`,
  ).toBe(full?.organizationId);
  return { job: job!, person, calendarId: calendarId! };
}

describe(`a counted household's jobs follow its workers' jobs (seed ${seed})`, () => {
  it("reads the jobs its employers pay after a year of hires and layoffs, and a member hired in the year keeps the job when met", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      const tried: string[] = [];
      let drawSeed = seed;
      let run = play(drawSeed);
      const unmet = (played: Played) =>
        played.hired.filter((row) => !played.core.people.has(row.personId));
      for (let draw = 1; draw < DRAWS && !unmet(run).length; draw += 1) {
        tried.push(
          `${run.place.name}, ${run.place.state} (${drawSeed}): no counted hire left to meet`,
        );
        drawSeed = `${seed}-${draw}`;
        run = play(drawSeed);
      }
      const where = `${run.place.name}, ${run.place.state}, seed ${drawSeed}`;
      const { core, rt, open, hired, ended } = run;
      expect(
        hired.length,
        `${where}: counted hires (${tried.join("; ")})`,
      ).toBeGreaterThan(0);

      // Every counted household's own jobs and wages are the open jobs its
      // members hold on the employers' books.
      const openByPerson = new Map<string, number>();
      for (const job of open)
        openByPerson.set(
          job.personId,
          (openByPerson.get(job.personId) ?? 0) +
            job.wageDailyMinor * DAYS_PER_YEAR,
        );
      let households = 0;
      for (const records of countedHouseholdsByPlace(core).values())
        for (const record of records) {
          const at = rt.store.householdOf.get(record.household.id);
          if (at === undefined) continue;
          const h = rt.store.households[at]!;
          const books = record.people.reduce(
            (n, person) => n + (openByPerson.get(person.id) ?? 0),
            0,
          );
          expect(
            Math.abs(h.wagesMinorYear - books),
            `${where}: ${h.id} wages ${h.wagesMinorYear} against the books' ${books}`,
          ).toBeLessThanOrEqual(1);
          for (const job of h.jobs)
            expect(
              job.endsAt,
              `${where}: ${h.id} keeps ended ${job.id}`,
            ).toBeUndefined();
          households += 1;
        }
      expect(households, where).toBeGreaterThan(0);
      const kept = ownCalendars(run, where);

      // A member hired during the year keeps that job, with its pay, when met:
      // one from another employer's role if the year has one still unmet.
      const borrowed = borrowedRoles(run).filter(
        (row) => !core.people.has(row.personId),
      );
      const { job, person, calendarId } = meet(run, where, borrowed[0]);
      const pay = (core.jobs.get(job.id)?.wageDailyMinor ?? 0) * DAYS_PER_YEAR;
      console.log(
        `counted household jobs: ${where}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}: ${households} counted households read the books; ${kept} kept commitments on their employers' calendars, ${borrowed.length} unmet from another employer's role; ${hired.length} counted hires, ${ended.length} opening jobs ended; ${job.personId} hired as ${job.id} keeps it when met, on payroll ${calendarId} (household ${person.householdId}, income ${pay})`,
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 1_800_000);

  it(`a founded firm's hire from another employer's role is paid on the firm's own calendar when met (seed ${WITNESS_SEED})`, () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      const run = play(WITNESS_SEED);
      const where = `${run.place.name}, ${run.place.state}, seed ${WITNESS_SEED}`;
      ownCalendars(run, where);
      const borrowed = borrowedRoles(run).filter(
        (row) => !run.core.people.has(row.personId),
      );
      expect(
        borrowed.length,
        `${where}: an unmet counted hire from another employer's role`,
      ).toBeGreaterThan(0);
      const { job, calendarId } = meet(run, where, borrowed[0]);
      console.log(
        `counted household jobs, witness: ${where}: ${borrowed.length} unmet hires from another employer's role; ${job.personId} met as ${job.id} at ${job.organizationId}, on payroll ${calendarId}`,
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 1_800_000);
});
