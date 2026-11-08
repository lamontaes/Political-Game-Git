// @vitest-environment node
/** The town's unemployment rate stands on its residents' labor force, not on every job at its firms (commuters hold some). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { WORLD_METRICS_MODULE_ID } from "./modules/world-metrics";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
type Row = {
  placeId: string;
  date: string;
  employed: number;
  residentsEmployed: number;
  unemployed: number;
  unemploymentRate: number;
};

for (const [name, seed, key] of [
  ["Algiers, Vermont", "r7", "5001035"],
  ["a drawn place", undefined, undefined],
] as const)
  it(
    `${name}: the rate is residents out of work over residents in the labor force (replay ${replay})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const drawn = seed ? null : drawPlace(replay, "metrics-resident-rate");
        const world = buildBenchWorld(seed ?? drawn!.seed, gameStartDate(), {
          placeKey: key ?? drawn!.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        const town = (api.state.placeMetadata as { housingTown?: string })
          .housingTown!;
        const seen: string[] = [];
        for (let month = 0; month < 14; month += 1) {
          advanceCore(world.core, addDays(makeIsoDate(world.core.date), 30));
          const rows = (
            api
              .moduleState(WORLD_METRICS_MODULE_ID)
              .table("months")
              .rows() as unknown as Row[]
          ).filter((r) => r.placeId === town && r.date <= world.core.date);
          const row = rows.sort((a, b) => b.date.localeCompare(a.date))[0];
          if (!row) continue;
          const force = row.residentsEmployed + row.unemployed;
          if (force > 0)
            expect(row.unemploymentRate).toBeCloseTo(
              row.unemployed / force,
              12,
            );
          seen.push(
            `${row.date} jobs here ${row.employed}, residents working ${row.residentsEmployed}, out of work ${row.unemployed}, rate ${(row.unemploymentRate * 100).toFixed(1)}%`,
          );
        }
        process.stdout.write(
          `METRICS ${drawn ? `${drawn.name} (${drawn.key}, seed ${drawn.seed})` : `${name} seed ${seed}`}\n${seen.join("\n")}\n`,
        );
        expect(seen.length).toBeGreaterThan(0);
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
