/**
 * Laws-reach-the-economy and money-arrears proof (OPUS-WORLD, Oct 14): build
 * the played world as the bench builds it, run a game year, and print each
 * read by record id: new openings against the wage floor in force, the
 * federal budget's push on each national month, employers' payroll tax
 * shares, tax arrears, and movers' cash.
 *
 * node --import tsx scripts/world-proofs/world-economy-year.ts <seed> [placeKey] [days]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { departuresSeen, watchDepartures } from "../../src/core2/modules/moves";
import { lawInForce } from "../../src/core2/modules/laws";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import {
  EMPLOYER_TAXES_MODULE_ID,
  type EmployerTaxRecord,
} from "../../src/core2/modules/employer-taxes";
import { purchaseTaxArrears } from "../../src/core2/modules/purchase-tax";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? `${Date.now()}`;
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "world-economy").key;
const days = Number(process.argv[4] ?? 365);
const start = gameStartDate();

const t0 = performance.now();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
watchDepartures(core);
const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
advanceCore(core, end.toISOString().slice(0, 10));
const seconds = (performance.now() - t0) / 1000;

const table = (module: string, name: string) =>
  core.modules.has(module)
    ? (api.moduleState(module).table(name).rows() as unknown as Record<
        string,
        unknown
      >[])
    : [];
const floor = lawInForce(api, "minimum-wage");
const positions = table(JOBS_MODULE_ID, "positions") as {
  id: string;
  hourlyMinor: number;
  openedAt: string;
}[];
const opened = positions.filter((row) => row.openedAt > start);
const months = table("macro", "months") as { id: string }[];
const read = months;
const shares = table(
  EMPLOYER_TAXES_MODULE_ID,
  "shares",
) as unknown as EmployerTaxRecord[];
const propertyArrears = table("housing", "taxArrears");
const salesArrears = [...purchaseTaxArrears(core).entries()];
const departures = departuresSeen(core);
const withCash = departures.filter((row) => row.cashLeftMinor);

console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      span: [start, core.date],
      seconds: Math.round(seconds),
      wageFloor: {
        lawId: floor.governing?.id,
        minorPerHour: floor.value,
        openedThisYear: opened.length,
        belowFloor: opened.filter((row) => row.hourlyMinor < (floor.value ?? 0))
          .length,
        lowest: [...opened].sort((a, b) => a.hourlyMinor - b.hourlyMinor)[0],
      },
      federalBudget: {
        monthsRead: read.length,
        sample: read.at(-1),
      },
      employerShares: {
        records: shares.length,
        paidMinor: shares.reduce((n, row) => n + row.paidMinor, 0),
        sample: shares[0],
      },
      arrears: {
        propertyTax: propertyArrears.length,
        propertyTaxSample: propertyArrears[0],
        salesTax: salesArrears.length,
        salesTaxSample: salesArrears[0],
      },
      movers: {
        departures: departures.length,
        tookCash: withCash.length,
        sample: withCash[0] && {
          id: withCash[0].id,
          cashLeftMinor: withCash[0].cashLeftMinor,
        },
      },
    },
    null,
    2,
  ),
);
