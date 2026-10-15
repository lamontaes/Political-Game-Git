/**
 * Cause-group giving in a played world: what full people give in a year
 * (their spare cash and how strongly they hold the cause), what groups raise
 * from the counted population, and the ads groups buy, none below the
 * outlet's smallest buy. Every gift is read off the cash journal by id.
 * Run: node --import tsx scripts/core2-year/giving-proof.ts [seed] [years]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const years = Number(process.argv[3] ?? 2);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
console.log(`${world.place.displayName}, seed ${seed}, ${years} year(s)`);

const byDonor = new Map<string, number>();
const counted: { id: string; amountMinor: number }[] = [];
const full: string[] = [];
const post = api.postJournal.bind(api);
api.postJournal = ((entry: Parameters<typeof post>[0]) => {
  if (entry.sourceRef.kind === "drive-donation") {
    const amount = entry.postings.find((row) => row.deltaMinor > 0)!.deltaMinor;
    const donor = entry.sourceRef.id.split(":").slice(1, -2).join(":");
    if (donor.startsWith("counted:"))
      counted.push({ id: entry.sourceRef.id, amountMinor: amount });
    else {
      byDonor.set(donor, (byDonor.get(donor) ?? 0) + amount);
      full.push(entry.sourceRef.id);
    }
  }
  return post(entry);
}) as typeof api.postJournal;

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
dev.advance(addDays(makeIsoDate(core.date), 365 * years));

const $ = (minor: number) => (minor / 100).toFixed(2);
const total = [...byDonor.values()].reduce((n, v) => n + v, 0);
console.log(
  `full people: ${byDonor.size} gave ${full.length} gifts, ${$(total)} in all; mean per giver per year ${byDonor.size ? $(total / byDonor.size / years) : "-"} (Giving USA check: about 456.00 a household)`,
);
const sorted = [...byDonor.values()].sort((a, b) => a - b);
if (sorted.length)
  console.log(
    `  per giver over the run: smallest ${$(sorted[0]!)}, median ${$(sorted[Math.floor(sorted.length / 2)]!)}, largest ${$(sorted.at(-1)!)}`,
  );
console.log(`  first gifts: ${full.slice(0, 3).join(", ")}`);
const countedTotal = counted.reduce((n, row) => n + row.amountMinor, 0);
console.log(
  `counted population: ${counted.length} monthly raises, ${$(countedTotal)} in all; first: ${counted
    .slice(0, 3)
    .map((row) => `${row.id} ${$(row.amountMinor)}`)
    .join(", ")}`,
);
const ads = [...(core.logByKind.get("cause-group.ad-ran") ?? [])]
  .map((id) => core.durableLog.get(id))
  .filter(Boolean) as { id: string; facts?: Record<string, string> }[];
const smallest = Math.min(
  ...ads.map((row) => Number(row.facts?.spentMinor ?? Infinity)),
);
console.log(
  `ads that ran: ${ads.length}; smallest buy ${Number.isFinite(smallest) ? $(smallest) : "-"} (minimum ${$(api.parameter("causeGroupAdMinimumMinor"))}); first: ${ads
    .slice(0, 2)
    .map((row) => row.id)
    .join(", ")}`,
);
