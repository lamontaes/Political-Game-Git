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
import { townSeats } from "./modules/offices";
import { staffOf } from "./modules/staff";
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
    const aides = townSeats(api)
      .flatMap((seat) =>
        seat.holder ? staffOf(api, seat.holder.personId) : [],
      )
      .map((aide) => aide.jobId)
      .filter((id): id is string => !!id);
    return {
      aides,
      days,
      where: `${place.name} (${place.key}), seed ${place.seed}`,
    };
  } finally {
    setBookkeeping(true);
  }
}

function checkCauses(run: ReturnType<typeof aideDays>): {
  scheduled: number;
  missed: number;
} {
  let scheduled = 0;
  let missed = 0;
  // Only the days of the place's scheduled aides (their job ids) count.
  for (const jobId of run.aides)
    for (const day of run.days.get(jobId) ?? []) {
      scheduled += 1;
      // Each scheduled day has attended time or a recorded absence reason.
      if (day.attended > 0) continue;
      missed += 1;
      // The cause is on the record: the decision's reason, and where the
      // day is longer than the hours free, why absence was the only offer.
      expect(day.reason, `${run.where} ${jobId} ${day.date} reason`).not.toBe(
        "",
      );
      if (day.planned / 60 > day.freeHours)
        expect(day.reason, `${run.where} ${jobId} ${day.date}`).toMatch(/miss/);
    }
  return { scheduled, missed };
}

it("the governor's aide in Independence, Louisiana, who attends nothing, has a recorded cause for each of 18 missed days", () => {
  const run = aideDays({
    name: "Independence",
    key: "2237025",
    seed: "7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a",
  });
  const jobId =
    "job:public:staff:official:term:seat:US-LA:governor:2025-01-20:person:aide:official:term:seat:US-LA:governor:2025-01-20:0";
  const list = run.days.get(jobId) ?? [];
  expect(list.length, `${run.where} ${jobId} scheduled days`).toBe(18);
  expect(
    list.every((d) => d.attended === 0),
    run.where,
  ).toBe(true);
  // 24-hour slot every third day: the 16 and 8 hours either side of midnight.
  expect(
    list.some((d) => d.planned / 60 > d.freeHours),
    run.where,
  ).toBe(true);
  expect(checkCauses(run).missed).toBeGreaterThanOrEqual(18);
}, 900_000);

it("every scheduled day of an aide in a drawn place has attended time or a recorded cause", () => {
  const seed =
    process.env.STAFF_ATTENDANCE_SEED ?? randomBytes(8).toString("hex");
  const tried: string[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const run = aideDays(drawPlace(`${seed}:${attempt}`, "staff-attendance"));
    const { scheduled, missed } = checkCauses(run);
    if (run.aides.length && scheduled) {
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
}, 1_800_000);
