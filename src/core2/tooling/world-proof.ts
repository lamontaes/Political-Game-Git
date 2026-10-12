/** A generated world with the whole economy: what the bank lent, what jobs did, and the rate decisions, for a few months. */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { advanceCore, createLifeCore } from "../life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { createOpeningFinance } from "../opening-finance";
import { coreAPI } from "../state";
import { prepareWorldAt } from "./world-prepare";

const [seed, placeKey, startedAt, through, output] = process.argv.slice(2);
if (!seed || !placeKey || !startedAt || !through || !output)
  throw new Error(
    "Usage: world-proof <seed> <placeKey> <startedAt> <through> <output>",
  );
const prepared = prepareWorldAt({ seed, placeKey, startedAt });
const opening = {
  ...prepared.input,
  finance: createOpeningFinance(prepared.input),
};
const core = createLifeCore(withWorldEconomy(opening), {
  data: worldCoreData(),
  modules: [...WORLD_MODULES],
});
const api = coreAPI(core);
const started = performance.now();
advanceCore(core, through);
const milliseconds = performance.now() - started;
const snap = (id: string) => api.moduleState(id).snapshot().tables;
const jobs = snap("jobs"),
  credit = snap("credit"),
  macro = snap("macro");
const employed = [...core.jobs.values()].filter(
  (job) => job.endsAt === undefined,
).length;
const changes = jobs.changes as unknown as { kind: string; date: string }[];
const byMonth: Record<string, Record<string, number>> = {};
for (const row of changes) {
  const month = row.date.slice(0, 7);
  byMonth[month] ??= {};
  byMonth[month][row.kind] = (byMonth[month][row.kind] ?? 0) + 1;
}
const result = {
  schema: "world-proof-v1",
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  seed,
  place: prepared.place,
  startedAt,
  through,
  milliseconds,
  employed,
  seekers: (jobs.seekers as unknown[]).length,
  positions: jobs.positions,
  changesByMonth: byMonth,
  changes: changes.slice(0, 200),
  bank: credit.banks,
  books: credit.books,
  applications: credit.applications,
  meetings: macro.meetings,
  repricings: macro.repricings,
  closures: [...core.finance.businesses.values()].filter((row) => row.closedAt)
    .length,
  leases: [...core.finance.contracts.values()].filter((row) =>
    row.id.startsWith("lease:"),
  ).length,
  leasesInArrears: [...core.finance.contracts.values()].filter(
    (row) => row.id.startsWith("lease:") && row.arrearsMinor > 0,
  ).length,
  evictionCases: snap("housing").cases,
  owners: (snap("business").owners as unknown[]).length,
  draws: snap("business").draws,
  loans: credit.loans,
  loanPayments: (credit.payments as unknown[]).length,
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    place: prepared.place.name,
    seconds: Math.round(milliseconds / 1000),
    employed,
    seekers: result.seekers,
    changesByMonth: byMonth,
    applications: (credit.applications as unknown[]).length,
    repricings: (macro.repricings as unknown[]).length,
    closures: result.closures,
    leases: result.leases,
    leasesInArrears: result.leasesInArrears,
    evictionCases: (result.evictionCases as unknown[]).length,
    owners: result.owners,
    draws: (result.draws as unknown[]).length,
    householdLoans: (result.loans as unknown[]).length,
  }),
);
