/* global process, console */
// A played world's lawmaking, bill by bill: every bill each body filed, which
// way it pointed, how it ended, and what moved the members who passed it.
// Usage: node --import tsx scripts/gov-wiring/legislating.ts --place-key K --place-seed S [--days 400]
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

const args = process.argv.slice(2);
const value = (name: string, fallback: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
setBookkeeping(false);
const world = buildBenchWorld(value("--place-seed", ""), gameStartDate(), {
  twoLevel: true,
  placeKey: value("--place-key", ""),
});
const core = world.core;
// Every law that takes effect, as its public record says it.
const tookEffect: Record<string, string>[] = [];
coreAPI(core).subscribeEvents(
  "gov-wiring-proof",
  ["law-took-effect"],
  (_api, event) => {
    tookEffect.push({ id: event.id, date: event.date, ...(event.facts ?? {}) });
  },
);
let day = core.date;
for (let i = 0; i < Number(value("--days", "400")); i++) {
  day = addDays(makeIsoDate(day), 1);
  advanceCore(core, day);
}
const api = coreAPI(core);
type Row = Record<string, unknown> & { id: string };
const bills = api
  .moduleState("core2-legislature-v1")
  .table("bills")
  .rows() as unknown as Row[];
const local = bills.filter(
  (b) =>
    !String(b.bodyOfficeId).includes(":legislature-") &&
    !String(b.bodyOfficeId).includes(":us-"),
);
const byQuestion = new Map<
  string,
  { date: string; dir: number; status: string; number: string }[]
>();
for (const b of local) {
  const p = (
    b.provisions as { kind: string; question?: string; value: number }[]
  )[0];
  if (p?.kind !== "policy-question") continue;
  const list = byQuestion.get(p.question!) ?? [];
  list.push({
    date: String(b.introduced),
    dir: Math.sign(p.value),
    status: String(b.status),
    number: String(b.number),
  });
  byQuestion.set(p.question!, list);
}
const out = {
  tookEffect,
  federalBills: [] as unknown[],
  place: value("--place-key", ""),
  through: day,
  localPolicyBills: local.length,
  enacted: local.filter((b) =>
    ["enacted", "signed", "overridden"].includes(String(b.status)),
  ).length,
  questions: [...byQuestion.entries()]
    .map(([q, list]) => ({
      question: q,
      bills: list.length,
      enacted: list.filter((b) =>
        ["enacted", "signed", "overridden"].includes(b.status),
      ).length,
      reversals: list.filter(
        (b, i, all) =>
          i > 0 &&
          b.dir !== all[i - 1]!.dir &&
          ["enacted", "signed", "overridden"].includes(b.status),
      ).length,
      first: list.slice(0, 6),
    }))
    .sort((a, b) => b.bills - a.bills),
};
// Each member's reasons on the bills named with --bills (comma-separated numbers).
const named = value("--bills", "").split(",").filter(Boolean);
const votes = api
  .moduleState("core2-legislature-v1")
  .table("votes")
  .rows() as unknown as Row[];
const reasons = local
  .filter((b) => named.includes(String(b.number)))
  .map((b) => ({
    number: b.number,
    status: b.status,
    votes: votes
      .filter((v) => v.billId === b.id)
      .map((v) => ({
        member: v.memberId,
        vote: v.vote,
        ...(v.position as object),
      })),
  }));
const federal = bills
  .filter((b) => String(b.bodyOfficeId).includes(":us-"))
  .map((b) => ({
    number: b.number,
    status: b.status,
    question:
      (b.provisions as { question?: string; series?: string }[])[0]?.question ??
      (b.provisions as { series?: string }[])[0]?.series,
  }));
const file = value("--out", "");
out.federalBills = federal;
if (file) writeFileSync(file, JSON.stringify({ ...out, reasons }, null, 2));
console.log(
  JSON.stringify(
    { ...out, questions: out.questions.slice(0, 3), reasons },
    null,
    1,
  ),
);
