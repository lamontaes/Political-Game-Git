/**
 * One played year of the state legislature and Congress sitting through their
 * sessions: for each session, its dates, how many bills were introduced on
 * how many days and in which chamber, how many votes on how many floor days,
 * and what died at adjournment.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/sessions.ts [seed] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { legislativeSessionsOf } from "../../src/core2/modules/world-legislating";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../../src/core2/modules/legislature";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(seed, "sessions");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const started = Date.now();
advanceCore(core, addDays(makeIsoDate(core.date), days));
const bills = api
  .moduleState(LEGISLATURE_MODULE_ID)
  .table("bills")
  .rows() as unknown as BillRow[];
const tally = (list: readonly string[]) =>
  list.reduce<Record<string, number>>(
    (out, k) => ({ ...out, [k]: (out[k] ?? 0) + 1 }),
    {},
  );
console.log(
  JSON.stringify(
    {
      seed,
      place: `${place.name} (${place.key})`,
      days,
      seconds: Math.round((Date.now() - started) / 1000),
      sessions: legislativeSessionsOf(api).map((s) => {
        const mine = s.filings.flatMap((f) =>
          f.billId ? [bills.find((b) => b.id === f.billId)!] : [],
        );
        return {
          id: s.id,
          convene: s.conveneAt,
          adjourn: s.adjournAt,
          perWeek: s.perWeek,
          filed: s.filings.length,
          introduced: mine.length,
          introducedOnDays: new Set(mine.map((b) => b.introduced)).size,
          byChamber: tally(mine.map((b) => b.bodyOfficeId.split(":").pop()!)),
          voted: s.bills.filter((b) => b.fate === "voted").length,
          votedOnDays: new Set(
            s.bills.filter((b) => b.fate === "voted").map((b) => b.decidedOn),
          ).size,
          firstVote: s.bills.find((b) => b.fate === "voted")?.decidedOn,
          lastVote: [...s.bills].reverse().find((b) => b.fate === "voted")
            ?.decidedOn,
          died: s.bills.filter((b) => b.fate === "not-reached").length,
          byStatus: tally(s.bills.map((b) => b.status)),
          example: s.bills[0] ?? null,
        };
      }),
    },
    null,
    1,
  ),
);
