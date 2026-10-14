/** M1-02 proof in a generated world: national figures, every vote's reasons, and the credit lines repriced. */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { prepareWorldAt } from "./world-prepare";
import { advanceCore, createLifeCore } from "../life";
import { coreAPI } from "../state";
import { MACRO_MODULE, macroCoreData, withCentralBank } from "../modules/macro";
import { REGIONAL_MODULE } from "../modules/regional";
import { buildOpeningEconomy } from "../opening-economy";
import { checkBands, type MacroMonth } from "../macro-model";
import { parameter } from "../parameters";

const [seed, placeKey, through, output, mode, startedAt] =
  process.argv.slice(2);
const withMacro = mode !== "--no-macro";
if (!seed || !placeKey || !through || !output)
  throw new Error(
    "Usage: macro-proof <seed> <placeKey> <throughDate> <output>",
  );
const prepared = prepareWorldAt({ seed, placeKey, startedAt });
const input = process.env.MACRO_PROOF_ECONOMY
    ? buildOpeningEconomy(prepared.input).input
    : prepared.input,
  place = prepared.place;
const data = macroCoreData();
const core = withMacro
  ? createLifeCore(withCentralBank(input), {
      data,
      modules: [MACRO_MODULE, REGIONAL_MODULE],
    })
  : createLifeCore(input);
if (!withMacro) {
  const started = performance.now();
  advanceCore(core, through);
  console.log(
    JSON.stringify({
      place: place.name,
      base: true,
      ms: performance.now() - started,
    }),
  );
  process.exit(0);
}
const api = coreAPI(core);
const started = performance.now();
advanceCore(core, through);
const milliseconds = performance.now() - started;
const snap = api.moduleState("macro").snapshot();
const months = snap.tables.months as unknown as MacroMonth[];
const p = (key: string) => parameter(key, data.parameters);
const bands = checkBands(months, p);
const result = {
  schema: "macro-proof-v1",
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  seed,
  place,
  startedAt: input.startedAt,
  through,
  milliseconds,
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
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    place: place.name,
    ms: milliseconds,
    meetings: (snap.tables.meetings as unknown[]).length,
    repricings: (snap.tables.repricings as unknown[]).length,
    simulatedOutside: result.bands.simulatedBase.filter((row) => !row.inside)
      .length,
  }),
);
