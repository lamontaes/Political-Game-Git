/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Receipts collected over the plan, by government and year: npx tsx scripts/money/collected.ts <seed> [years] [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { BUDGETS_MODULE_ID } from "../../src/core2/modules/budgets";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 2);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
console.log(`${drawn.name} ${key} seed ${seed}`);
advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365 * years));
const api: any = coreAPI(world.core);
const tables = api.moduleState(BUDGETS_MODULE_ID);
const plan = new Map<string, number>();
for (const b of tables.table("budgets").rows() as any[])
  plan.set(
    b.governmentId + "|" + b.fiscalYear,
    Object.values(b.revenueMinor as Record<string, number>).reduce(
      (a: number, v) => a + v,
      0,
    ),
  );
const got = new Map<string, number>();
for (const m of tables.table("treasuryMonths").rows() as any[]) {
  const k = m.governmentId + "|" + m.date.slice(0, 4);
  got.set(k, (got.get(k) ?? 0) + (m.collectedMinor ?? 0));
}
for (const [k, v] of got) {
  const p = plan.get(k);
  console.log(
    `${k}: collected ${(v / 1e8).toFixed(2)} B, planned ${p ? (p / 1e8).toFixed(2) : "-"} B, ratio ${p ? (v / p).toFixed(3) : "-"}`,
  );
}
if (process.argv[5] === "months") {
  for (const m of tables.table("treasuryMonths").rows() as any[])
    if (m.governmentId === process.argv[6] && m.date.startsWith("2026-0"))
      console.log(
        m.date,
        "collected",
        m.collectedMinor,
        "outside",
        m.revenueFromOutsideMinor,
        "aid",
        m.aidReceivedMinor,
        "lines",
        Object.values(m.lines as Record<string, any>)
          .map((l: any) => l.paidMinor ?? 0)
          .reduce((a: number, v: number) => a + v, 0),
      );
}
