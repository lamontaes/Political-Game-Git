/**
 * Every day an official's aide misses has a recorded cause (pool item
 * staff-aides-miss-every-scheduled-day). The aide who attended nothing in
 * Independence, Louisiana had a 24-hour slot every third day copied from the
 * city administrator's job: a day longer than the hours they have free leaves
 * absence as the only offer, and the other days' absences carry the decision's
 * reason. A place is drawn from all 56 for the second case; set
 * STAFF_ATTENDANCE_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { discretionaryHours } from "./modules/work";
import { coreAPI } from "./state";

interface Day {
  readonly date: string;
  readonly planned: number;
  readonly attended: number;
  readonly reason: string;
  readonly freeHours: number;
}

/** Plays 120 days and returns each aide's job id with the days it was scheduled. */
function aideDays(place: { name: string; key: string; seed: string }) {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const days = new Map<string, Day[]>();
    const record = api.recordWorkAttendance.bind(api);
    api.recordWorkAttendance = (row) => {
      if (row.jobId.startsWith("job:public:staff:"))
        days.set(row.jobId, [
          ...(days.get(row.jobId) ?? []),
          {
            date: row.date,
            planned: row.plannedMinutes,
            attended: row.attendedMinutes,
            reason: String(row.reasonKey ?? ""),
            freeHours: discretionaryHours(api, row.personId),
          },
        ]);
      return record(row);
    };
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    // Every staff job observed scheduled during the 120 days, whoever holds it now.
    const aides = [...days.keys()].sort();
    return {
      aides,
      days,
      where: `${place.name} (${place.key}), seed ${place.seed}`,
    };
  } finally {
    setBookkeeping(true);
  }
}

/** One job's scheduled days: attended time, or a recorded reason (and the miss reason where the day was longer than the hours free). */
function checkJob(where: string, jobId: string, list: readonly Day[]) {
  let missed = 0;
  for (const day of list) {
    if (day.attended > 0) continue;
    missed += 1;
    expect(day.reason, `${where} ${jobId} ${day.date} reason`).not.toBe("");
    if (day.planned / 60 > day.freeHours)
      expect(day.reason, `${where} ${jobId} ${day.date}`).toMatch(/miss/);
  }
  return { scheduled: list.length, missed };
}

/** Every staff job observed in the run, each checked day by day. */
function checkCauses(run: ReturnType<typeof aideDays>): {
  jobs: number;
  scheduled: number;
  missed: number;
} {
  let scheduled = 0;
  let missed = 0;
  for (const jobId of run.aides) {
    const r = checkJob(run.where, jobId, run.days.get(jobId) ?? []);
    scheduled += r.scheduled;
    missed += r.missed;
  }
  return { jobs: run.aides.length, scheduled, missed };
}

it("the governor's aide in Independence, Louisiana, has attended time or a recorded cause on each scheduled day", () => {
  const run = aideDays({
    name: "Independence",
    key: "2237025",
    seed: "7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a",
  });
  const jobId =
    "job:public:staff:official:term:seat:US-LA:governor:2025-01-20:person:aide:official:term:seat:US-LA:governor:2025-01-20:0";
  // The named job is among the staff jobs observed, and its own days are checked.
  expect(run.aides, `${run.where}: staff jobs observed`).toContain(jobId);
  const list = run.days.get(jobId) ?? [];
  expect(list.length, `${run.where} ${jobId} scheduled days`).toBeGreaterThan(
    0,
  );
  const named = checkJob(run.where, jobId, list);
  expect(named.scheduled, `${run.where} ${jobId}`).toBe(list.length);
  // And every other staff job observed in the place.
  const all = checkCauses(run);
  expect(all.jobs, run.where).toBeGreaterThan(0);
  expect(all.scheduled, run.where).toBeGreaterThanOrEqual(named.scheduled);
  process.stdout.write(
    `${run.where}: ${jobId}: ${named.scheduled} scheduled days, ${named.missed} missed, each with attended time or a recorded reason; ${all.jobs} staff jobs, ${all.scheduled} days\n`,
  );
}, 900_000);

it("every scheduled day of an aide in a drawn place has attended time or a recorded cause", () => {
  const seed =
    process.env.STAFF_ATTENDANCE_SEED ?? randomBytes(8).toString("hex");
  const tried: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const run = aideDays(drawPlace(`${seed}:${attempt}`, "staff-attendance"));
    const { scheduled, missed } = checkCauses(run);
    if (run.aides.length && scheduled) {
      process.stdout.write(
        `${run.where}: ${run.aides.length} staff jobs, ${scheduled} scheduled days, ${missed} missed, each accounted for\n`,
      );
      // The aides' scheduled days were observed, and every one is accounted for.
      expect(scheduled, run.where).toBeGreaterThan(0);
      expect(missed, run.where).toBeLessThanOrEqual(scheduled);
      return;
    }
    tried.push(`${run.where}: ${run.aides.length} aides, ${scheduled} days`);
  }
  throw new Error(
    `no drawn place had a scheduled aide day in 120 days (seed ${seed}): ${tried.join("; ")}`,
  );
}, 900_000);
