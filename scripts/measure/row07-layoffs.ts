/* eslint-disable @typescript-eslint/no-explicit-any */
// Row 7: layoffs of full workers and counted workers over six months, and pulls held back at review.
// tsx scripts/measure/row07-layoffs.ts <seed> [days]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { countedJobHeads } from "../../src/core2/residents-economy";
setBookkeeping(false);
const [seed = "l1", daysArg = "183"] = process.argv.slice(2);
const place = process.env.PLACEKEY
  ? {
      key: process.env.PLACEKEY,
      seed: process.env.SEEDHEX!,
      name: process.env.PLACEKEY,
    }
  : drawPlace(seed, "row07");
const w: any = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core: any = w.core;
const api: any = coreAPI(core);
const rt: any = residentsRuntime(core);
const t = (n: string) => api.moduleState("jobs").table(n);
const private_ = (job: any) => {
  const o = core.organizations.get(job.organizationId);
  return o?.kind === "employer" && !o.publicPayAuthority && !o.outsideFlow;
};
// exposure at the start: private local jobs held by full people and by counted workers (heads)
const fullIds = new Set<string>();
let fullExposure = 0;
for (const j of core.jobs.values())
  if (j.endsAt === undefined && private_(j)) {
    fullIds.add(j.id);
    fullExposure++;
  }
const countedHeads = new Map<string, number>();
let countedExposure = 0;
for (const j of rt.jobs.values())
  if (j.endsAt === undefined && private_(j) && !fullIds.has(j.id)) {
    const h = countedJobHeads(core, j);
    countedHeads.set(j.id, h);
    countedExposure += h;
  }
// every open job of a full person at the start, by the class of employer
const cls = (job: any) => {
  const o = core.organizations.get(job.organizationId);
  if (!o) return "none";
  if (o.outsideFlow) return "outside";
  if (o.publicPayAuthority) return "public";
  return o.kind === "employer" ? "private" : "other:" + o.kind;
};
const jobClass = new Map<string, string>();
const classCount: Record<string, number> = {};
for (const j of core.jobs.values())
  if (j.endsAt === undefined) {
    const k = cls(j);
    jobClass.set(j.id, k);
    classCount[k] = (classCount[k] ?? 0) + 1;
  }
const endsByClass: Record<string, Record<string, number>> = {};
const regionalExposure = (t("regional").rows() as any[]).length;
const start = core.date;
const seen = new Set<string>();
let fullLay = 0,
  countedLay = 0,
  countedLayHeads = 0,
  otherLay = 0,
  regionalLay = 0;
const stuck = new Map<string, { first: string; days: number }>();
let stuckFullDays = 0,
  stuckCountedDays = 0;
for (let d = 1; d <= Number(daysArg); d++) {
  advanceCore(core, addDays(makeIsoDate(start), d));
  for (const r of t("turnover").rows() as any[])
    if (r.pull >= 1) {
      const key = r.id;
      const isFull = core.jobs.has(key);
      if (isFull) stuckFullDays++;
      else if (!String(key).startsWith("regional:")) stuckCountedDays++;
      if (!stuck.has(key)) stuck.set(key, { first: core.date, days: 0 });
      stuck.get(key)!.days++;
    }
  for (const r of t("changes").rows() as any[]) {
    if (
      r.date > start &&
      jobClass.has(r.jobId) &&
      r.kind !== "hire" &&
      !seen.has("c" + r.id)
    ) {
      seen.add("c" + r.id);
      const k = jobClass.get(r.jobId)!;
      (endsByClass[k] ??= {})[r.kind] =
        ((endsByClass[k] ??= {})[r.kind] ?? 0) + 1;
    }
    if (r.kind !== "layoff" || seen.has(r.id) || r.date <= start) continue;
    seen.add(r.id);
    if (r.values?.regional) {
      regionalLay++;
      continue;
    }
    if (!r.values || r.values.turnoverPull === undefined) {
      otherLay++;
      continue;
    }
    if (fullIds.has(r.jobId)) {
      fullLay++;
    } else {
      countedLay++;
      countedLayHeads += countedHeads.get(r.jobId) ?? 1;
    }
  }
}
const stuckF = [...stuck].filter(
  ([k]) => core.jobs.has(k) || fullIds.has(k),
).length;
const stuckC = [...stuck].filter(
  ([k]) => !core.jobs.has(k) && !fullIds.has(k) && !k.startsWith("regional:"),
).length;
console.log(
  JSON.stringify(
    {
      place: place.name,
      key: place.key,
      seed: place.seed.slice(0, 16),
      start,
      days: daysArg,
      full: {
        exposure: fullExposure,
        turnoverLayoffs: fullLay,
        sharePct: +((100 * fullLay) / Math.max(1, fullExposure)).toFixed(2),
        jobsEverHeldAtPull1OrMore: stuckF,
        jobDaysHeldBack: stuckFullDays,
      },
      counted: {
        exposureHeads: Math.round(countedExposure),
        jobs: countedHeads.size,
        turnoverLayoffRecords: countedLay,
        layoffHeads: Math.round(countedLayHeads),
        sharePct: +(
          (100 * countedLayHeads) /
          Math.max(1, countedExposure)
        ).toFixed(2),
        jobsEverHeldAtPull1OrMore: stuckC,
        jobDaysHeldBack: stuckCountedDays,
      },
      fullJobsAtStartByEmployerClass: classCount,
      fullJobChangesByClassAndKind: endsByClass,
      regionalCounted: { exposure: regionalExposure, layoffs: regionalLay },
      otherLayoffs: otherLay,
    },
    null,
    1,
  ),
);
