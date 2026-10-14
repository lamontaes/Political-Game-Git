/**
 * Business audit proof (OPUS-WORLD, Oct 14): build the played world as the
 * bench builds it, run a game year, and print each changed read by record
 * id: job changes by what drove them, withdrawn positions, closures from
 * causes, compliance and outside-cost records, payroll and profit taxes, the
 * regional price level, credit lines drawn, and a business's books record.
 *
 * node --import tsx src/core2/tooling/world-business-year.ts <seed> [placeKey] [days]
 */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../bench/world";
import { placeLocalities, placeStateKeys } from "../places";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { JOBS_MODULE_ID } from "../modules/jobs";
import { BUSINESS_MODULE_ID } from "../modules/business";
import { EMPLOYER_TAXES_MODULE_ID } from "../modules/employer-taxes";
import { regionalLevel } from "../modules/regional";
import { lawChain } from "../modules/laws";
import { businessBooksView } from "../business-books-view";

const seed = process.argv[2] ?? `${Date.now()}`;
function drawPlace(from: string): string {
  const hash = createHash("sha256")
    .update(`${from}:world-business`)
    .digest("hex");
  const states = [...placeStateKeys()].sort((a, b) => a.localeCompare(b));
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = [...placeLocalities(state)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  return places[parseInt(hash.slice(8, 16), 16) % places.length]!.key;
}
const placeKey = process.argv[3] || drawPlace(seed);
const days = Number(process.argv[4] ?? 365);
const start = gameStartDate();

const t0 = performance.now();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
const months: { month: string; price?: number }[] = [];
const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
const town = lawChain(api).townPlaceId;
// The regional price level at each month's start, as the economy published it.
for (let at = new Date(`${start}T00:00:00Z`); at < end;) {
  at.setUTCMonth(at.getUTCMonth() + 1);
  const date = (at < end ? at : end).toISOString().slice(0, 10);
  advanceCore(core, date);
  const level = regionalLevel(api, town);
  months.push({
    month: date,
    ...(level ? { price: level.priceLevelPct } : {}),
  });
}
const seconds = (performance.now() - t0) / 1000;

const rows = (module: string, name: string) =>
  core.modules.has(module)
    ? (api.moduleState(module).table(name).rows() as unknown as Record<
        string,
        unknown
      >[])
    : [];
const changes = rows(JOBS_MODULE_ID, "changes") as {
  id: string;
  kind: string;
  reasonKey?: string;
}[];
const byReason = new Map<string, number>();
for (const row of changes) {
  const key = `${row.kind}:${row.reasonKey ?? ""}`;
  byReason.set(key, (byReason.get(key) ?? 0) + 1);
}
const positions = rows(JOBS_MODULE_ID, "positions") as {
  id: string;
  status: string;
  occupation?: string;
}[];
const closures = rows(BUSINESS_MODULE_ID, "closures");
const compliance = rows(BUSINESS_MODULE_ID, "compliance");
const outside = rows(BUSINESS_MODULE_ID, "outsideCosts") as {
  id: string;
  inTown?: boolean;
}[];
const shares = rows(EMPLOYER_TAXES_MODULE_ID, "shares") as {
  id: string;
  federalUnemploymentMinor?: number;
  stateUnemploymentMinor?: number;
}[];
const profits = rows(EMPLOYER_TAXES_MODULE_ID, "profits");
const drawn = [...core.finance.facilities.values()].filter(
  (row) => row.principalMinor > 0,
);
const business = [...core.finance.businesses.keys()].sort()[0];

console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      span: [start, core.date],
      seconds: Math.round(seconds),
      jobChanges: Object.fromEntries([...byReason].sort()),
      jobChangeSample: changes.find((row) => row.kind === "quit"),
      positions: {
        withdrawn: positions.filter((row) => row.status === "withdrawn").length,
        occupations: [...new Set(positions.map((row) => row.occupation ?? ""))]
          .length,
        sample: positions.find((row) => row.status === "withdrawn"),
      },
      closures: { count: closures.length, sample: closures[0] },
      compliance: { count: compliance.length, sample: compliance[0] },
      outsideCosts: {
        count: outside.length,
        inTown: outside.filter((row) => row.inTown).length,
        sample: outside.find((row) => row.inTown) ?? outside[0],
      },
      unemploymentTax: {
        records: shares.filter(
          (row) =>
            (row.federalUnemploymentMinor ?? 0) +
              (row.stateUnemploymentMinor ?? 0) >
            0,
        ).length,
        sample: shares.find((row) => (row.stateUnemploymentMinor ?? 0) > 0),
      },
      profitTax: { count: profits.length, sample: profits[0] },
      regionalPrice: months,
      creditLinesDrawn: drawn.map((row) => ({
        id: row.id,
        principalMinor: row.principalMinor,
      })),
      booksView: business ? businessBooksView(api, business) : null,
    },
    null,
    2,
  ),
);
