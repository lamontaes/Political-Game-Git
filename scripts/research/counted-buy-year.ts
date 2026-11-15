/**
 * Counted renters buying in a played place (pool item world-counted-renters-buy):
 * a year (or `--months`) unattended, then each counted purchase with its own
 * savings, down payment, loan, holder and sellers, and the town's ownership
 * share before and after.
 *
 *   node --max-old-space-size=8192 --import tsx scripts/research/counted-buy-year.ts \
 *     --seed <s> --place <key> [--months 12]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", "c3");
const months = Number(option("months", "12"));
const drawn = drawPlace(seed, "home-price-paths");
const placeKey = option("place", drawn.key);
setBookkeeping(false);
const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const api = coreAPI(core);
const town = core.placeMetadata!.housingTown!;
const rt = residentsRuntime(core)!;
const share = () => {
  let own = 0,
    all = 0;
  for (const h of rt.store.liveHouseholds()) {
    if (h.placeId !== town || h.quarters) continue;
    const w = rt.store.weightOf(h);
    all += w;
    if (h.tenure === "mortgage" || h.tenure === "other") own += w;
  }
  return { own, all };
};
const before = share();
const started = performance.now();
const end = addDays(makeIsoDate(core.date), Math.round(months * 30.44));
advanceCore(core, end);
const after = share();
const rows = api
  .moduleState("housing")
  .table("purchases")
  .rows() as unknown as Record<string, unknown>[];
const counted = rows.filter((row) => row.counted);
console.log(
  `${placeKey} seed ${seed} world ${core.seed}: ${months} months in ${((performance.now() - started) / 1000).toFixed(0)} s; full purchases ${rows.length - counted.length}, counted ${counted.length} (weight ${counted.reduce((n, row) => n + Number(row.weight), 0).toFixed(1)})`,
);
console.log(
  `Counted owners in town: ${before.own.toFixed(0)} of ${before.all.toFixed(0)} (${((100 * before.own) / before.all).toFixed(1)}%) -> ${after.own.toFixed(0)} of ${after.all.toFixed(0)} (${((100 * after.own) / after.all).toFixed(1)}%)`,
);
for (const row of counted.slice(0, 15))
  console.log(
    `${row.id} w${row.weight} price ${Math.round(Number(row.priceMinor) / 100)} down ${Math.round(Number(row.downMinor) / 100)} loan ${Math.round(Number(row.loanMinor) / 100)} holder ${row.holderId} sellers ${JSON.stringify(row.sellerIds)} savings ${Math.round(Number(row.savingsMinor) / 100)} left/mo ${Math.round(Number(row.monthlyLeftMinor) / 100)} lease months ${row.leaseMonths} rent ${Math.round(Number(row.rentBeforeMinor) / 100)} income/mo ${Math.round(Number(row.monthlyIncomeMinor) / 100)}`,
  );
const months_ = counted
  .map((row) => Number(row.leaseMonths))
  .sort((a, b) => a - b);
const at = (q: number) =>
  months_[Math.min(months_.length - 1, Math.floor(q * months_.length))];
console.log(
  `Lease months among counted buyers: min ${months_[0]}, quarter ${at(0.25)}, median ${at(0.5)}, three quarters ${at(0.75)}, max ${months_.at(-1)}; over 60: ${months_.filter((m) => m > 60).length}, over 120: ${months_.filter((m) => m > 120).length} of ${months_.length}`,
);
const weights = counted.map((row) => Number(row.weight));
console.log(
  `Buyer weights: min ${Math.min(...weights)}, max ${Math.max(...weights)}`,
);
