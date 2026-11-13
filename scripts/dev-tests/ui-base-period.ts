// A claim after an hours cut reads the base period: tsx ui-base-period.ts <seed>
// Two worlds of one drawn place and seed. In one, eight named workers' hours are halved mid-quarter;
// in the twin the hours stand. After that quarter ends (so it is the last completed quarter, which
// the base period leaves out), each worker is laid off in both worlds through the jobs engine
// (retried the next day when they worked today), and the two claims are compared by record id.
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { JOBS_MODULE_ID, layOffWorker } from "../../src/core2/modules/jobs";
import type { ClaimRow } from "../../src/core2/jobs-benefits";

setBookkeeping(false);
const [seed = "ui-base-a"] = process.argv.slice(2);
const place = drawPlace(seed, "ui-base-period");
const where = `${place.name} [${place.key}], seed ${place.seed}`;
const build = () =>
  buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
const cut = build();
const steady = build();
const log = (msg: string) => process.stderr.write(`${where}: ${msg}\n`);
const jobsOf = (w: ReturnType<typeof build>) =>
  [...w.core.jobs.values()].filter(
    (j) =>
      j.endsAt === undefined &&
      j.hoursDaily > 0 &&
      w.core.work.payrollCalendarByJob.has(j.id) &&
      w.core.people.get(j.personId)?.alive &&
      j.personId !== w.core.playerId,
  );
// Mid-quarter of the third quarter after the opening (five completed quarters stand by then).
advanceCore(cut.core, "2026-08-15");
advanceCore(steady.core, "2026-08-15");
// Lower-paid workers whose job still stands in both worlds, so the state's weekly maximum caps neither claim.
const standing = new Set(jobsOf(steady).map((j) => j.id));
const byPay = jobsOf(cut)
  .filter((j) => standing.has(j.id))
  .sort(
    (a, b) => a.wageDailyMinor - b.wageDailyMinor || a.id.localeCompare(b.id),
  );
const start = Math.floor(byPay.length / 5);
const picks = byPay.slice(start, start + 8);
log(`${picks.length} workers picked: ${picks.map((j) => j.id).join(", ")}`);
const source = {
  tag: "SOURCED" as const,
  asOf: cut.core.date,
  citation: "Played proof: hours cut",
};
for (const j of picks)
  coreAPI(cut.core).rehourJob(j.id, j.hoursDaily / 2, source);
// The quarter ends; the cut quarter is now the last completed one.
advanceCore(cut.core, "2026-10-05");
advanceCore(steady.core, "2026-10-05");
const claimsOf = (w: ReturnType<typeof build>, personId: string) =>
  (
    coreAPI(w.core)
      .moduleState(JOBS_MODULE_ID)
      .table("claims")
      .rows() as unknown as ClaimRow[]
  ).filter((r) => r.personId === personId);
let compared = 0;
for (const j of picks) {
  const claimIn = (w: ReturnType<typeof build>) => {
    for (let day = 0; day < 8; day += 1) {
      const job = w.core.jobs.get(j.id);
      if (!job || job.endsAt !== undefined) break;
      const out = layOffWorker(coreAPI(w.core), j.id);
      if (out !== "worked-today") break;
      advanceCore(w.core, addDays(makeIsoDate(w.core.date), 1));
    }
    return claimsOf(w, j.personId).at(-1);
  };
  const a = claimIn(cut);
  const b = claimIn(steady);
  if (!a || !b) {
    log(
      `${j.id}: no claim in ${!a ? "the cut world" : "the twin"} (not compared)`,
    );
    continue;
  }
  compared += 1;
  const capped = a.cappedByLawId || b.cappedByLawId;
  const folded = (
    cut.core.work as unknown as {
      payByQuarter?: ReadonlyMap<string, readonly unknown[]>;
    }
  ).payByQuarter?.get(j.personId)?.length;
  log(
    `${j.id} ${j.personId}: cut-world claim ${a.id} weekly ${a.weeklyMinor}; steady twin claim ${b.id} weekly ${b.weeklyMinor}; ${a.weeklyMinor === b.weeklyMinor ? "EQUAL" : "DIFFER"}${capped ? " (capped by the weekly maximum)" : ""}; pay-by-quarter rows in the cut world: ${folded ?? "none (named list absent)"}`,
  );
}
log(`compared ${compared} pairs`);
