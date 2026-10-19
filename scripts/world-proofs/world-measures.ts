/**
 * Economy measures for the outcome web (OPUS-WORLD, Oct 14): build the played
 * world as the bench builds it, run some months, and print the town's
 * world-metrics rows (household earnings, home value, rent against earnings,
 * eviction orders) beside the outcome web's month records that read them.
 *
 * node --import tsx scripts/world-proofs/world-measures.ts <seed> [placeKey] [days]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { WORLD_METRICS_MODULE_ID } from "../../src/core2/modules/world-metrics";
import { OUTCOME_WEB_MODULE_ID } from "../../src/core2/modules/outcome-web";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? `${Date.now()}`;
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "world-measures").key;
const days = Number(process.argv[4] ?? 120);
const start = gameStartDate();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
advanceCore(core, end.toISOString().slice(0, 10));

const fields = [
  "medianHouseholdEarningsMinor",
  "medianHomeValueMinor",
  "rentToEarnings",
  "evictionOrdersLastMonth",
] as const;
const measures = [
  "household.income",
  "housing.home-prices",
  "housing.rent-to-income-pct",
  "housing.eviction",
];
const metrics = core.modules.has(WORLD_METRICS_MODULE_ID)
  ? (api
      .moduleState(WORLD_METRICS_MODULE_ID)
      .table("months")
      .rows() as unknown as ({
      id: string;
      placeId: string;
      date: string;
    } & Record<string, number>)[])
  : [];
const web = core.modules.has(OUTCOME_WEB_MODULE_ID)
  ? (api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .rows() as unknown as {
      id: string;
      placeId: string;
      month: string;
      values?: Record<string, number>;
      causes?: Record<string, number>;
    }[])
  : [];
console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      span: [start, core.date],
      outcomeWebInstalled: core.modules.has(OUTCOME_WEB_MODULE_ID),
      metrics: metrics.map((row) => ({
        id: row.id,
        ...Object.fromEntries(fields.map((f) => [f, row[f]])),
      })),
      webReads: web.slice(-3).map((row) => ({
        id: row.id,
        ...Object.fromEntries(
          measures.map((m) => [m, (row.causes ?? row.values ?? {})[m]]),
        ),
      })),
    },
    null,
    2,
  ),
);
