/** A played year: actual bank applications, approved lines and their macro repricings.
 * node --import tsx src/core2/tooling/macro-proof.ts [--seed S] [--place KEY] [--out PATH]
 * Without replay arguments, draw a seed and a place across all 56 jurisdictions.
 */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { setBookkeeping } from "../bookkeeping";
import { addDays, makeIsoDate } from "../kernel/dates";
import { CREDIT_MODULE_ID } from "../modules/credit";
import { MACRO_MODULE_ID } from "../modules/macro";

const args = process.argv.slice(2);
const value = (key: string, fallback: string) => {
  const at = args.indexOf(key);
  if (at < 0) return fallback;
  if (!args[at + 1] || args[at + 1]!.startsWith("--"))
    throw new Error(`Missing value for ${key}`);
  return args[at + 1]!;
};
const seed = value("--seed", randomBytes(20).toString("hex"));
const drawn = drawPlace(seed, "macro-credit-proof");
const placeKey = value("--place", drawn.key);
const startedAt = value("--start", gameStartDate());
const output = value("--out", "");
setBookkeeping(false);
const { core } = buildBenchWorld(seed, startedAt, { twoLevel: true, placeKey });
const api = coreAPI(core);
console.error(
  JSON.stringify({ seed, placeKey, startedAt, modules: core.modules.size }),
);
const started = performance.now();
let through = makeIsoDate(startedAt);
for (let day = 0; day < 365; day += 1) {
  through = addDays(through, 1);
  advanceCore(core, through);
}
const milliseconds = performance.now() - started;
const macro = api.moduleState(MACRO_MODULE_ID).snapshot();
const credit = api.moduleState(CREDIT_MODULE_ID).snapshot();
const owners = api.moduleState("business").table("owners");
const facilities = [...core.finance.facilities.values()];
if (facilities.some((row) => row.id.startsWith("facility:stand-in:")))
  throw new Error("A fabricated credit facility reached the played world");
const result = {
  schema: "macro-proof-v2",
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  seed,
  place: {
    key: placeKey,
    ...(placeKey === drawn.key ? { name: drawn.name } : {}),
  },
  startedAt,
  through,
  milliseconds,
  installedModules: core.modules.size,
  banks: credit.tables.banks,
  applications: credit.tables.applications,
  facilities: facilities.map((facility) => ({
    ...facility,
    borrower: core.organizations.get(facility.borrowerId)?.name,
    ownerId: owners.get(facility.borrowerId)?.ownerId ?? null,
  })),
  bankBooks: credit.tables.books,
  householdLoans: credit.tables.loans,
  householdPayments: credit.tables.payments,
  repricings: macro.tables.repricings,
  meetings: macro.tables.meetings,
  votes: macro.tables.votes,
};
const json = JSON.stringify(result, null, 2) + "\n";
if (output) writeFileSync(output, json);
else process.stdout.write(json);
console.error(
  JSON.stringify({
    placeKey,
    milliseconds,
    facilities: facilities.length,
    applications: credit.tables.applications?.length ?? 0,
    repricings: macro.tables.repricings?.length ?? 0,
  }),
);
