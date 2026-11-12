/* eslint-disable @typescript-eslint/no-explicit-any */
// Row 2: share of filled-in adults whose job is titled "Works outside the town".
// tsx scripts/measure/row02-outside-jobs.ts <seed> [maxFill]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { fillInPerson } from "../../src/core2/state";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { ageOn } from "../../src/core2/counted-groups";
setBookkeeping(false);
const [seed = "r2a", maxArg = "600"] = process.argv.slice(2);
const place = drawPlace(seed, "row02");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core: any = w.core;
const rt: any = residentsRuntime(core);
const store = rt.store;
const adults: string[] = [];
for (const h of store.households)
  for (const m of store.countedMembers(h)) {
    const f = store.factsOf(m);
    if (
      ageOn(f.birthDate, core.date) >= 18 &&
      ageOn(f.birthDate, core.date) < 65
    )
      adults.push(f.id);
  }
const fullAdults = [...core.people.values()].filter((p: any) => {
  const a = ageOn(p.birthDate, core.date);
  return a >= 18 && a < 65;
}).length;
// deterministic spread sample across households
const step = Math.max(1, Math.floor(adults.length / Number(maxArg)));
const sample = adults.filter((_, i) => i % step === 0).slice(0, Number(maxArg));
const titles = new Map<string, number>();
let noJob = 0;
for (const id of sample) {
  const p: any = fillInPerson(core, id as any);
  const job: any = p.jobId ? core.jobs.get(p.jobId) : undefined;
  if (!job) {
    noJob++;
    continue;
  }
  titles.set(job.title, (titles.get(job.title) ?? 0) + 1);
}
const outside = titles.get("Works outside the town") ?? 0;
console.log(
  JSON.stringify({
    place: place.name,
    key: place.key,
    seed: place.seed.slice(0, 16),
    counted18to64: adults.length,
    fullAdults,
    sampled: sample.length,
    noJob,
    outside,
    outsideShareOfSample: +(outside / sample.length).toFixed(3),
    outsideShareOfThoseWithJob: +(
      outside / Math.max(1, sample.length - noJob)
    ).toFixed(3),
    topTitles: [...titles].sort((a, b) => b[1] - a[1]).slice(0, 6),
  }),
);
