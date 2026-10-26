/**
 * One played year of floor amendments: the sections holdouts took for their
 * votes and the poison pills moved, by chamber, with what became of each bill,
 * and how long the year took.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/floor-amendments.ts [seed] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../../src/core2/modules/legislature";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(seed, "floor-amendments");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const started = Date.now();
advanceCore(core, addDays(makeIsoDate(core.date), days));
const seconds = (Date.now() - started) / 1000;
const api = coreAPI(core);
const bills = api
  .moduleState(LEGISLATURE_MODULE_ID)
  .table("bills")
  .rows() as unknown as BillRow[];
const votes = api
  .moduleState(LEGISLATURE_MODULE_ID)
  .table("votes")
  .rows() as unknown as { billId: string; chamber: string; vote: string }[];
const tally = new Map<string, { yes: number; no: number }>();
for (const v of votes) {
  const key = `${v.billId}|${v.chamber}`;
  const t = tally.get(key) ?? { yes: 0, no: 0 };
  if (v.vote === "yes") t.yes += 1;
  if (v.vote === "no") t.no += 1;
  tally.set(key, t);
}
const floorFailed: Record<string, string[]> = {};
for (const bill of bills.filter((b) => b.status === "failed"))
  for (const [key, t] of tally)
    if (key.startsWith(`${bill.id}|`) && t.yes <= t.no)
      (floorFailed[key.split("|")[1]!] ??= []).push(`${t.yes}-${t.no}`);
const byBody = new Map<string, Record<string, number>>();
const examples: unknown[] = [];
for (const bill of bills) {
  const row = byBody.get(bill.bodyOfficeId) ?? {
    bills: 0,
    passed: 0,
    trades: 0,
    tradedPassed: 0,
    pills: 0,
    pilledFailed: 0,
  };
  row[`status:${bill.status}`] = (row[`status:${bill.status}`] ?? 0) + 1;
  row.bills! += 1;
  if (!["drafted", "failed", "vetoed", "blocked"].includes(bill.status))
    row.passed! += 1;
  const trades = bill.deals.filter((d) => d.kind === "trade-amendment");
  const pills = bill.deals.filter((d) => d.kind === "poison-pill");
  row.trades! += trades.length;
  row.pills! += pills.length;
  if (
    trades.length &&
    !["drafted", "failed", "vetoed", "blocked"].includes(bill.status)
  )
    row.tradedPassed! += 1;
  if (pills.length && bill.status === "failed") row.pilledFailed! += 1;
  if ((trades.length || pills.length) && examples.length < 6)
    examples.push({
      bill: bill.id,
      number: bill.number,
      status: bill.status,
      sections: bill.provisions.length,
      deals: [...trades, ...pills],
    });
  byBody.set(bill.bodyOfficeId, row);
}
console.log(
  JSON.stringify(
    {
      seed,
      place: `${place.name} (${place.key})`,
      days,
      seconds,
      byBody: Object.fromEntries(byBody),
      floorFailed,
      examples,
    },
    null,
    1,
  ),
);
