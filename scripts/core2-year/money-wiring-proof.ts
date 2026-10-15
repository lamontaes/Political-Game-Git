/**
 * Proof for the Oct 14 money stress-audit items (OPUS-CORE): one year of the
 * played world (`buildBenchWorld`, two-level, every module) in a place drawn
 * from all 56 by a seed taken from the clock, naming by record id the
 * officials' pay (defect 9) and estates passing at death (defect 6).
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/core2-year/money-wiring-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { OFFICIAL_PAY_MODULE_ID } from "../../src/core2/modules/official-pay";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "played-world");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
console.log(`Place ${place.key}, seed ${seed}`);

const entries: { id: string; date: string; postings: string }[] = [];
const afterDeath: string[] = [];
const post = api.postJournal.bind(api);
api.postJournal = (entry) => {
  for (const row of entry.postings) {
    const owner = core.cashJournal.accounts.get(row.accountId)?.ownerId;
    const person = owner ? core.people.get(owner) : undefined;
    if (person && !person.alive && row.deltaMinor > 0)
      afterDeath.push(
        `${entry.date} ${entry.sourceRef.kind} ${entry.sourceRef.id} +${row.deltaMinor} to ${owner}`,
      );
  }
  const head = entry.sourceRef.id.split(/[:@]/)[0];
  if (head === "salary" || head === "estate")
    entries.push({
      id: entry.sourceRef.id,
      date: entry.date,
      postings: entry.postings
        .map((row) => `${row.accountId} ${row.deltaMinor}`)
        .join("; "),
    });
  return post(entry);
};

const pay = () =>
  api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay").rows() as unknown as {
    id: string;
    jobId: string;
    payerId: string;
    annualMinor: number;
  }[];
const seated = pay();
const officials = seated.filter((row) => row.jobId.startsWith("job:office:"));
console.log(
  `\nDefect 9: ${seated.length} officials paid from opening day, ${officials.length} holding the office as their job`,
);
const deadAtStart = new Set(
  [...core.people.values()].filter((p) => !p.alive).map((p) => p.id),
);
advanceCore(core, addDays(makeIsoDate(core.date), 365));

const salaries = entries.filter((row) => row.id.startsWith("salary:"));
const byPayer = new Map<string, number>();
for (const row of pay())
  byPayer.set(row.payerId, (byPayer.get(row.payerId) ?? 0) + 1);
console.log(
  `  ${salaries.length} salary payments in the year; payers: ${JSON.stringify([...byPayer])}`,
);
const example = officials[0];
if (example) {
  const person = core.people.get(example.id)!;
  console.log(
    `  e.g. ${example.id}: job ${example.jobId} (${core.jobs.get(example.jobId)?.title}), ${example.annualMinor / 100} a year from ${example.payerId}; cash at year end ${person.liquidMinor / 100}`,
  );
  for (const row of salaries
    .filter((r) => r.id.includes(example.id))
    .slice(0, 2))
    console.log(`  journal ${row.date} ${row.id}: ${row.postings}`);
}
const broke = seated.filter(
  (row) => (core.people.get(row.id)?.liquidMinor ?? 0) === 0,
).length;
console.log(`  officials still at $0 at year end: ${broke}`);

const estates = entries.filter((row) => row.id.startsWith("estate:"));
const died = [...core.people.values()].filter(
  (p) => !p.alive && !deadAtStart.has(p.id),
);
console.log(
  `\nDefect 6: ${died.length} full people died; ${estates.length} estate transfers`,
);
for (const row of estates.slice(0, 4))
  console.log(`  journal ${row.date} ${row.id}: ${row.postings}`);
const leftOnDead = died.filter((p) => p.liquidMinor > 0);
for (const line of afterDeath.slice(0, 6))
  console.log(`  paid after death: ${line}`);
console.log(
  `  dead with cash left: ${leftOnDead.length}${leftOnDead[0] ? ` (e.g. ${leftOnDead[0].id}: ${leftOnDead[0].liquidMinor / 100})` : ""}`,
);
