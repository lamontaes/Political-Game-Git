/**
 * Job creation and destruction in a played town, read the way Census BDS reads
 * them: each private employer's heads (named workers and counted jobs at their
 * weight) a year apart, by the firm's size class at the start. Creation is the
 * rise of a continuing firm and the heads of a new one; destruction is the fall
 * of a continuing firm and the heads of one that closed; each as a share of the
 * average of the two years' heads.
 *
 * node --import tsx scripts/world-proofs/bds-job-flows.ts <seed> <placeKey> [years]
 */
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { countedJobHeads } from "../../src/core2/residents-economy";
import type { CoreState } from "../../src/core2/types";
import { drawPlace } from "../core2-year/place";

setBookkeeping(false);
const seed = process.argv[2] ?? "bds1";
const key = process.argv[3] || drawPlace(seed, "bds-flows").key;
const years = Number(process.argv[4] ?? 2);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core: CoreState = world.core;

const classes = [
  { name: "1 to 4", from: 1 },
  { name: "5 to 9", from: 5 },
  { name: "10 to 19", from: 10 },
  { name: "20 to 99", from: 20 },
  { name: "100 to 499", from: 100 },
  { name: "500 to 999", from: 500 },
  { name: "1000+", from: 1000 },
];
/** The national BDS rates the town's flows are read against (ESTIMATED, 2023 release). */
type Rate = { readonly mean: number };
const bds = JSON.parse(
  readFileSync("data/research/business/bds-job-flows-2023.json", "utf8"),
) as {
  readonly nation: Record<
    string,
    {
      readonly jobCreationRate: Rate;
      readonly jobDestructionRate: Rate;
    }
  >;
};
const classOf = (heads: number) =>
  [...classes].reverse().find((row) => heads >= row.from)!.name;

/** Each private employer's heads in the town now. */
function heads(): Map<string, number> {
  const out = new Map<string, number>();
  const private_ = (orgId: string) => {
    const org = core.organizations.get(orgId);
    return (
      org?.kind === "employer" &&
      org.placeId === world.placeId &&
      !org.publicPayAuthority &&
      !org.outsideFlow
    );
  };
  for (const job of core.jobs.values())
    if (!job.endsAt && private_(job.organizationId))
      out.set(job.organizationId, (out.get(job.organizationId) ?? 0) + 1);
  for (const job of residentsRuntime(core)?.jobs.values() ?? [])
    if (!job.endsAt && private_(job.organizationId))
      out.set(
        job.organizationId,
        (out.get(job.organizationId) ?? 0) + countedJobHeads(core, job),
      );
  return out;
}

advanceCore(core, addDays(makeIsoDate(core.date), 1));
let before = heads();
console.log(
  `place ${key} seed ${seed}: ${before.size} private employers, ${[...before.values()].reduce((a, b) => a + b, 0).toFixed(0)} heads`,
);
for (let year = 1; year <= years; year += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const after = heads();
  type Row = {
    avg: number;
    creation: number;
    births: number;
    destruction: number;
    deaths: number;
    firms: number;
  };
  const rows = new Map<string, Row>(
    classes.map((row) => [
      row.name,
      { avg: 0, creation: 0, births: 0, destruction: 0, deaths: 0, firms: 0 },
    ]),
  );
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const e0 = before.get(id) ?? 0,
      e1 = after.get(id) ?? 0;
    const row = rows.get(classOf(Math.max(1, e0 > 0 ? e0 : e1)))!;
    row.firms += 1;
    row.avg += (e0 + e1) / 2;
    if (e0 === 0) row.births += e1;
    else if (e1 === 0) row.deaths += e0;
    else if (e1 > e0) row.creation += e1 - e0;
    else row.destruction += e0 - e1;
  }
  console.log(
    `year ${year} (to ${core.date}), percent of average heads a year:`,
  );
  const pct = (n: number, d: number) =>
    d > 0 ? ((100 * n) / d).toFixed(1) : "-";
  let all: Row = {
    avg: 0,
    creation: 0,
    births: 0,
    destruction: 0,
    deaths: 0,
    firms: 0,
  };
  for (const [name, r] of rows) {
    if (!r.firms) continue;
    all = {
      avg: all.avg + r.avg,
      creation: all.creation + r.creation,
      births: all.births + r.births,
      destruction: all.destruction + r.destruction,
      deaths: all.deaths + r.deaths,
      firms: all.firms + r.firms,
    };
    console.log(
      `  ${name.padEnd(11)} firms ${String(r.firms).padStart(3)}: creation ${pct(r.creation + r.births, r.avg)} (births ${pct(r.births, r.avg)}, expanding ${pct(r.creation, r.avg)}), destruction ${pct(r.destruction + r.deaths, r.avg)} (deaths ${pct(r.deaths, r.avg)}, contracting ${pct(r.destruction, r.avg)})`,
    );
  }
  console.log(
    `  Census BDS nation, percent of average heads a year (creation / destruction):`,
  );
  for (const [name, r] of rows) {
    const nation = bds.nation[name];
    if (!r.firms || !nation) continue;
    console.log(
      `  ${name.padEnd(11)} nation ${nation.jobCreationRate.mean.toFixed(1)} / ${nation.jobDestructionRate.mean.toFixed(1)}; town ${pct(r.creation + r.births, r.avg)} / ${pct(r.destruction + r.deaths, r.avg)}`,
    );
  }
  console.log(
    `  all         firms ${String(all.firms).padStart(3)}: creation ${pct(all.creation + all.births, all.avg)}, destruction ${pct(all.destruction + all.deaths, all.avg)}`,
  );
  before = after;
}
