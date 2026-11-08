/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Each named-payer tax installment against its plan, by year: npx tsx scripts/money/tax-base.ts <seed> <placeKey> [years] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";

const seed = process.argv[2] ?? "tb-1";
const placeKey = process.argv[3] ?? "1885562";
const years = Number(process.argv[4] ?? 3);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
console.log(`${placeKey} seed ${seed}`);
for (let y = 1; y <= years; y++) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  const api: any = coreAPI(world.core);
  const rows = api
    .moduleState("core2-budgets-v1")
    .table("taxPayments")
    .rows() as any[];
  const byYear = rows.filter((r) =>
    String(r.date).startsWith(String(2025 + y)),
  );
  let paid = 0,
    plan = 0;
  for (const r of byYear) {
    paid += r.amountMinor + (r.townPaidMinor ?? 0);
    plan += r.installmentMinor;
  }
  const macro = api
    .moduleState("macro")
    .table("state")
    .get("macro:state") as any;
  console.log(
    `year ${y} (${2025 + y}): ${byYear.length} installments, paid+town ${paid}, plan ${plan}, ratio ${(paid / plan).toFixed(4)}`,
  );
}
