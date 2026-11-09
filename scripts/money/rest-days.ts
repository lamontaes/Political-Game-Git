/** Filled-in workers who attend none of their scheduled days: npx tsx scripts/money/rest-days.ts <seed> [days] [fill-ins] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI, fillInPerson } from "../../src/core2/state";
import type { PersonState } from "../../src/core2/types";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "bb";
const days = Number(process.argv[3] ?? 75);
const many = Number(process.argv[4] ?? 30);
const place = drawPlace(seed, "fill-in-paid-once");
setBookkeeping(false);
const { core } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const rt = residentsRuntime(core)!;
const countedJobs = new Set(
  [...rt.flows.values()]
    .filter((f) => f.kind === "wages" && f.perDayMinorByJob)
    .flatMap((f) => Object.keys(f.perDayMinorByJob!)),
);
const jobOf = new Map<string, string>();
for (const [jobId, job] of rt.jobs)
  if (countedJobs.has(jobId)) jobOf.set(job.personId, jobId);
const holders = [...jobOf.keys()]
  .filter((id) => rt.householdOfPerson.has(id))
  .sort()
  .slice(0, many);
for (const id of holders) if (!core.people.has(id)) fillInPerson(core, id);
const snap = (label: string) => {
  const id = holders[0]!,
    p: PersonState | undefined = core.people.get(id);
  console.log(
    label,
    id.slice(-8),
    "needs",
    JSON.stringify(p?.needs ?? {}).slice(0, 90),
    "liquid",
    Math.round(p?.liquidMinor ?? 0),
    "livingCost/day",
    Math.round(p?.livingCostDailyMinor ?? 0),
    "stress",
    p?.affect.stress.toFixed(3),
    "mood",
    p?.affect.mood.toFixed(3),
  );
};
snap("after fill-in");
if (process.env.DAILY) {
  const jobId = jobOf.get(holders[0]!)!;
  for (let d = 0; d < Number(process.env.DAILY); d++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const a = core.work.lastAttendanceByJob.get(jobId) as unknown as
      Record<string, unknown> | undefined;
    const p: PersonState | undefined = core.people.get(holders[0]!);
    console.log(
      "DAY",
      core.date,
      JSON.stringify({
        date: a?.date,
        attended: a?.attendedMinutes,
        planned: a?.plannedMinutes,
        reason: a?.reasonKey,
      }),
      "needs",
      JSON.stringify(p?.needs).slice(0, 70),
      "stress",
      p?.affect.stress.toFixed(2),
    );
  }
}
advanceCore(core, addDays(makeIsoDate(core.date), days));
snap("after days");
let none = 0;
for (const id of holders) {
  const t = core.work.totalsByJob.get(jobOf.get(id)!);
  const p = core.people.get(id);
  if (!t) continue;
  if (t.attendedMinutes === 0) none++;
  console.log(
    id.slice(-8),
    "attended",
    t.attendedMinutes,
    "paid",
    t.paidMinor,
    "needs",
    JSON.stringify(p?.needs ?? {}).slice(0, 120),
  );
}
console.log(
  `${place.name} ${place.key}: ${none} of ${holders.length} attended nothing in ${days} days`,
);
const dismissed = (
  coreAPI(core).moduleState("jobs").table("changes").rows() as unknown as {
    id: string;
    reasonKey: string;
    values?: Record<string, number>;
  }[]
).filter((r) => r.reasonKey === "absent-from-work");
console.log(
  "dismissed for absence:",
  dismissed
    .map((r) => `${r.id} pull ${r.values?.absentPull?.toFixed(2)}`)
    .join("; ") || "none",
);
