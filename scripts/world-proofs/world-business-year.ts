/**
 * Business audit proof (OPUS-WORLD, Oct 14): build the played world as the
 * bench builds it, run a game year, and print each changed read by record
 * id: job changes by what drove them, withdrawn positions, closures from
 * causes, compliance and outside-cost records, payroll and profit taxes, the
 * regional price level, credit lines drawn, and a business's books record.
 *
 * node --import tsx scripts/world-proofs/world-business-year.ts <seed> [placeKey] [days]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import { BUSINESS_MODULE_ID } from "../../src/core2/modules/business";
import { EMPLOYER_TAXES_MODULE_ID } from "../../src/core2/modules/employer-taxes";
import { regionalLevel } from "../../src/core2/modules/regional";
import { lawChain } from "../../src/core2/modules/laws";
import { businessBooksView } from "../../src/core2/business-books-view";

import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? `${Date.now()}`;
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "world-business").key;
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
