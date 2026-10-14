/**
 * Laws-reach-the-economy and money-arrears proof (OPUS-WORLD, Oct 14): build
 * the played world as the bench builds it, run a game year, and print each
 * read by record id: new openings against the wage floor in force, the
 * federal budget's push on each national month, employers' payroll tax
 * shares, tax arrears, and movers' cash.
 *
 * node --import tsx src/core2/tooling/world-economy-year.ts <seed> [placeKey] [days]
 */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../bench/world";
import { placeLocalities, placeStateKeys } from "../places";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { departuresOf } from "../modules/moves";
import { lawInForce } from "../modules/laws";
import { JOBS_MODULE_ID } from "../modules/jobs";
import {
  EMPLOYER_TAXES_MODULE_ID,
  type EmployerTaxRecord,
} from "../modules/employer-taxes";
import { purchaseTaxArrears } from "../modules/purchase-tax";

const seed = process.argv[2] ?? `${Date.now()}`;
function drawPlace(from: string): string {
  const hash = createHash("sha256")
    .update(`${from}:world-economy`)
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
const months = table("macro", "months") as {
  id: string;
  publicBudgetImpulse?: number;
  publicBudgetRecordIds?: string[];
}[];
const read = months.filter((row) => row.publicBudgetImpulse !== undefined);
const shares = table(
  EMPLOYER_TAXES_MODULE_ID,
  "shares",
) as unknown as EmployerTaxRecord[];
const propertyArrears = table("housing", "taxArrears");
const salesArrears = [...purchaseTaxArrears(core).entries()];
const departures = departuresOf(api);
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
