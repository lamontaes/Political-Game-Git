/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Which named jobs were paid less than they earned in a played year, by employer kind: npx tsx scripts/money/pay-shortfall.ts <seed> [years] [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 1);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
console.log(`${drawn.name} ${key} seed ${seed}`);
advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365 * years));
const core: any = world.core;
const byKind = new Map<
  string,
  { jobs: number; short: number; earned: number; none: number }
>();
for (const [jobId, t] of core.work.totalsByJob) {
  const job = core.jobs.get(jobId);
  const org = job && core.organizations.get(job.organizationId);
  const kind = org?.kind ?? "unknown";
  const row = byKind.get(kind) ?? { jobs: 0, short: 0, earned: 0, none: 0 };
  row.jobs++;
  row.earned += t.requestedMinor;
  row.short += t.requestedMinor - t.paidMinor;
  if (t.requestedMinor > 0 && t.paidMinor === 0) {
    row.none++;
    console.log(
      `  paid nothing: ${jobId} at ${job?.organizationId} (${kind}), earned ${t.requestedMinor}, started ${job?.startsOn ?? job?.startedAt ?? "?"}, ends ${job?.endsAt ?? "-"}, employer cash ${org?.liquidMinor}`,
    );
  }
  byKind.set(kind, row);
}
for (const [kind, r] of [...byKind].sort((a, b) => b[1].short - a[1].short))
  console.log(
    `${kind}: ${r.jobs} jobs, earned ${r.earned}, unpaid ${r.short} (${((100 * r.short) / Math.max(1, r.earned)).toFixed(1)}%), jobs paid nothing ${r.none}`,
  );
