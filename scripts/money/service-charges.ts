/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** What households and firms paid each government in charges over N days, by service: npx tsx scripts/money/service-charges.ts <seed> <placeKey> [days] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { serviceChargeShares } from "../../src/core2/budgets-service-charges";

const seed = process.argv[2] ?? "sc-1";
const placeKey = process.argv[3] ?? "1885562";
const days = Number(process.argv[4] ?? 365);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
const api: any = coreAPI(world.core);
const months = api
  .moduleState("core2-budgets-v1")
  .table("serviceChargeMonths")
  .rows() as any[];
const total = new Map<string, { paid: number; sewer: number }>();
for (const m of months) {
  const t = total.get(m.governmentId) ?? { paid: 0, sewer: 0 };
  t.paid += m.paidMinor;
  t.sewer += m.byService?.["sewerage-and-solid-waste"] ?? 0;
  total.set(m.governmentId, t);
}
console.log(`${placeKey} seed ${seed}, ${days} days`);
for (const [g, t] of total)
  console.log(g.padEnd(40), "paid", t.paid, "of which sewer", t.sewer);
for (const row of serviceChargeShares(api) as any[])
  console.log(
    row.governmentId.padEnd(40),
    "perDwelling",
    row.sewerPerDwellingMinor ?? "-",
    "perFirm",
    row.sewerPerFirmMinor ?? "-",
    "share",
    Number(row.share).toFixed(5),
    "target/mo",
    row.targetMonthlyMinor,
  );
