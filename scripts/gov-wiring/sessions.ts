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
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { legislativeSessionsOf } from "../../src/core2/modules/world-legislating";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  type MemberPosition,
} from "../../src/core2/modules/legislature";
import { budgetsOf, governments } from "../../src/core2/modules/budgets";

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
      budgets: governments(api).map((g) => ({
        government: g.id,
        level: g.level,
        adopted: budgetsOf(api, g.id).map(
          (b) => `${b.fiscalYear}: ${b.adoptedBy}`,
        ),
      })),
      // Why Congress voted its budgets as it did: how many votes the state
      // stake decided (the vote would have gone the other way without it),
      // and the drawn place's own delegation with its reasons.
      federalBudgets: bills
        .filter(
          (b) =>
            /:(us-house|us-senate)/.test(b.bodyOfficeId) &&
            b.provisions.some((p) => p.kind === "budget-line"),
        )
        .map((b) => {
          const votes = (
            api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("votes")
              .query("byBill", [b.id]) as unknown as {
              memberId: string;
              chamber: string;
              vote: string;
              position: MemberPosition;
            }[]
          ).filter((v) => v.position.stateStake !== undefined);
          const decided = votes.filter(
            (v) =>
              v.vote !== "abstain" &&
              Math.sign(v.position.total) !==
                Math.sign(v.position.total - v.position.stateStake!),
          );
          return {
            number: b.number,
            status: b.status,
            votes: votes.length,
            decidedByStake: decided.length,
            decided: decided.slice(0, 6).map((v) => ({
              member: v.memberId,
              vote: v.vote,
              stateStake: Number(v.position.stateStake!.toFixed(3)),
              total: Number(v.position.total.toFixed(3)),
            })),
          };
        }),
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
