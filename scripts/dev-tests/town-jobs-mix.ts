/* eslint-disable @typescript-eslint/no-explicit-any */
// The town's employers and jobs by kind of workplace against its county's
// sourced mix, and the open positions on the books week by week.
// node --max-old-space-size=8000 --import tsx scripts/dev-tests/town-jobs-mix.ts <seed> [placeKey] [weeks]
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  countedJobsOf,
  countedJobHeads,
} from "../../src/core2/residents-economy";
import { publishedTownWorkplaceWeights } from "../../src/core2/town-employment-mix";
import { TOWN_WORKPLACES } from "../../src/core2/town-workplaces";
import { moduleState } from "../../src/core2/module-state";
import { residentsRuntime } from "../../src/core2/modules/residents";
setBookkeeping(false);
const [seed = "jobs1", key, weeks = "8"] = process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(key ? { placeKey: key } : {}),
});
const c = w.core as any;
const town = w.placeId;
console.log(
  `PLACE ${w.place.displayName} (${w.place.key}) seed ${seed} town ${town}`,
);
const kindOfOrg = (org: any): string => {
  const cls = org.classification ?? org.kind;
  const byCls = TOWN_WORKPLACES.find((wp) => wp.classification === cls);
  return byCls?.key ?? `other:${org.kind}`;
};
const mix = publishedTownWorkplaceWeights(town as any);
const mixTotal = [...mix.values()].reduce((a, b) => a + b, 0);
const employers = new Map<string, number>();
const jobs = new Map<string, number>();
const fullJobs = new Map<string, number>();
const titles = new Map<string, number>();
let total = 0;
let outsideTitled = 0;
for (const org of c.organizations.values()) {
  const full = [...(c.finance.jobsByOrganization.get(org.id) ?? [])]
    .map((id: string) => c.jobs.get(id))
    .filter(
      (j: any) => j && j.endsAt === undefined && c.people.get(j.personId),
    );
  const counted = countedJobsOf(c, org.id);
  let heads = full.length;
  for (const j of counted) heads += countedJobHeads(c, j);
  if (heads === 0) continue;
  const k = org.placeId === town ? kindOfOrg(org) : `elsewhere:${org.kind}`;
  employers.set(k, (employers.get(k) ?? 0) + 1);
  jobs.set(k, (jobs.get(k) ?? 0) + heads);
  fullJobs.set(k, (fullJobs.get(k) ?? 0) + full.length);
  total += heads;
  for (const j of [...full, ...counted]) {
    titles.set(j.title, (titles.get(j.title) ?? 0) + 1);
    if (/outside the town/i.test(j.title)) outsideTitled += 1;
  }
}
const keys = new Set([...mix.keys(), ...jobs.keys()]);
const rows = [...keys]
  .map((k) => ({
    k,
    employers: employers.get(k) ?? 0,
    jobs: Math.round(jobs.get(k) ?? 0),
    full: fullJobs.get(k) ?? 0,
    share: ((jobs.get(k) ?? 0) / total) * 100,
    county: ((mix.get(k) ?? 0) / mixTotal) * 100,
  }))
  .sort((a, b) => b.county - a.county || b.share - a.share);
console.log("kind | employers | jobs | full-people jobs | town % | county %");
for (const r of rows)
  console.log(
    `${r.k} | ${r.employers} | ${r.jobs} | ${r.full} | ${r.share.toFixed(1)} | ${r.county.toFixed(1)}`,
  );
console.log(
  `TOTAL jobs ${Math.round(total)}; titled "outside the town": ${outsideTitled}`,
);
console.log(
  "TOP TITLES",
  [...titles]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t, n]) => `${t}:${n}`)
    .join(", "),
);
{
  const commute = new Map<string, number>();
  for (const job of c.jobs.values())
    if (job.endsAt === undefined && job.id.startsWith("job:commuter:"))
      commute.set(job.title, (commute.get(job.title) ?? 0) + 1);
  console.log(
    "COMMUTERS' WORK",
    [...commute]
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}:${n}`)
      .join(", "),
  );
}
// Full people (the ones a player meets) by kind of employer.
const metKinds = new Map<string, number>();
for (const p of c.people.values()) {
  if (!p.alive || p.placeId !== town) continue;
  const job = [...c.jobs.values()].find(
    (j: any) => j.personId === p.id && j.endsAt === undefined,
  );
  if (!job) continue;
  const org = c.organizations.get(job.organizationId);
  const k = org
    ? org.placeId === town
      ? kindOfOrg(org)
      : `elsewhere:${org.kind}`
    : "none";
  metKinds.set(k, (metKinds.get(k) ?? 0) + 1);
}
console.log(
  "FULL PEOPLE'S EMPLOYERS",
  [...metKinds]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k}:${n}`)
    .join(", "),
);
{
  const rt = residentsRuntime(c) as any;
  let unplaced = 0;
  for (const flow of rt?.flows?.values() ?? [])
    if (
      flow.financeKind === "work.unplaced-residents" &&
      flow.placeId === town &&
      !flow.endedAt
    )
      unplaced += flow.unplacedWorkers ?? 0;
  let perHousehold = 0;
  for (const h of rt?.store?.households ?? [])
    if (h && !h.gone && h.placeId === town)
      perHousehold += h.unplacedWorkers ?? 0;
  console.log(
    `UNPLACED workers (commute out) flow ${Math.round(unplaced)} households ${Math.round(perHousehold)}`,
  );
}
const positionsTable = () => moduleState(c, "jobs").table("positions") as any;
const week = (label: string) => {
  const open = positionsTable().query("byStatus", ["open"]) as any[];
  const inTown = open.filter((row) => row.placeId === town);
  const heads = inTown.reduce((s, row) => s + (row.heads ?? 1), 0);
  const titles = new Map<string, number>();
  for (const row of inTown) {
    const org = c.organizations.get(row.organizationId);
    const k = org ? kindOfOrg(org) : "?";
    titles.set(`${row.title}@${k}`, (titles.get(`${row.title}@${k}`) ?? 0) + 1);
  }
  const all = positionsTable().query("byStatus", ["filled"]) as any[];
  console.log(
    `WEEK ${label} ${c.date} open-in-town ${inTown.length} (jobs ${Math.round(heads)}) open-anywhere ${open.length} filled-so-far ${all.length} :: ${[
      ...titles,
    ]
      .slice(0, 8)
      .map(([t, n]) => `${t}:${n}`)
      .join(", ")}`,
  );
};
week("0");
for (let n = 1; n <= Number(weeks); n += 1) {
  advanceCore(c, addDays(makeIsoDate(c.date), 7));
  week(String(n));
}
