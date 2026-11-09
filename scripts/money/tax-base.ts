/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Each named-payer tax installment's base index, by year: npx tsx scripts/money/tax-base.ts <seed> <placeKey> [years] */
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
  const inYear = rows.filter((r) =>
    String(r.date).startsWith(String(2025 + y)),
  );
  const idx = inYear.map((r) => r.baseIndex ?? 1);
  console.log(
    `year ${y} (${2025 + y}): ${inYear.length} installments, base index min ${Math.min(...idx).toFixed(4)} max ${Math.max(...idx).toFixed(4)}, installments total ${inYear.reduce((n, r) => n + r.installmentMinor, 0)}`,
  );
}

const api2: any = coreAPI(world.core);
const all = api2
  .moduleState("core2-budgets-v1")
  .table("taxPayments")
  .rows() as any[];
console.log(
  "Installments in dollars (minor units over 100), by government, line, payer and date, first and last year:",
);
for (const r of all
  .filter(
    (x) =>
      String(x.date).startsWith("2026") ||
      String(x.date).startsWith(String(2025 + years)),
  )
  .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  .filter((x) => x.line === "corporateIncomeTax" || x.line === "exciseTaxes"))
  console.log(
    String(r.date),
    String(r.governmentId).slice(0, 22).padEnd(22),
    String(r.line).padEnd(20),
    String(r.payerName).padEnd(32),
    "installment $",
    Math.round(r.installmentMinor / 100),
    "base index",
    Number(r.baseIndex ?? 1).toFixed(4),
  );
