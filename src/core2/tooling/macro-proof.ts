/** One played year: real bank applications, credit lines and rate decisions. */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { checkBands, type MacroMonth } from "../macro-model";

// An optional seed replays the draw; callers cannot select a favorable place.
const [output, replaySeed] = process.argv.slice(2);
if (!output) throw new Error("Usage: macro-proof <output> [replaySeed]");
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const seed = replaySeed ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "macro-played-year");
console.log(JSON.stringify({ seed, place }));
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const api = coreAPI(core);
const startedAt = core.date;
const through = addDays(makeIsoDate(startedAt), 365);
const started = performance.now();
advanceCore(core, through);
const milliseconds = performance.now() - started;
const snap = api.moduleState("macro").snapshot();
const credit = api.moduleState("credit").snapshot();
const months = snap.tables.months as unknown as MacroMonth[];
const bands = checkBands(months, (key) => api.parameter(key));
const owners = api.moduleState("business").table("owners");
const facilities = [...core.finance.facilities.values()].map((facility) => {
  const ownerId = (
    owners.get(facility.borrowerId) as { ownerId?: string } | undefined
  )?.ownerId;
  return {
    ...facility,
    ownerId,
    workers: [...core.jobs.values()]
      .filter((job) => job.organizationId === facility.borrowerId)
      .map((job) => ({ jobId: job.id, personId: job.personId })),
  };
});
if (facilities.some((facility) => facility.id.startsWith("facility:stand-in:")))
  throw new Error("A synthetic credit facility survived in the played world");
const result = {
  schema: "macro-proof-v2",
  head,
  seed,
  place,
  startedAt,
  through: core.date,
  milliseconds,
  modules: [...core.modules.keys()],
  facilities,
  applications: credit.tables.applications,
  bankBooks: credit.tables.books,
  repricings: snap.tables.repricings,
  meetings: snap.tables.meetings,
  votes: snap.tables.votes,
  members: snap.tables.members,
  months: months.map((row) => ({
    month: row.month,
    kind: row.kind,
    unemploymentPct: row.unemploymentPct,
    inflationPct: row.inflationPct,
    payrollJobsThousands: row.payrollJobsThousands,
    policyRatePct: row.policyRatePct,
    mortgage30Pct: row.mortgage30Pct,
    townIncomeGrowthPct: row.townIncomeGrowthPct,
  })),
  bands: {
    simulatedBase: bands.filter((row) => !row.baseIsHistory),
    historyBase: bands.filter((row) => row.baseIsHistory),
  },
  conditions: core.finance.conditionsByPlace.get(world.placeId),
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    place: place.name,
    ms: milliseconds,
    facilities: facilities.length,
    applications: credit.tables.applications?.length,
    repricings: snap.tables.repricings?.length,
    simulatedOutside: result.bands.simulatedBase.filter((row) => !row.inside)
      .length,
  }),
);
