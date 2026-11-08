// @vitest-environment node
/** A school measure for a cohort too small to measure reads the place's expected rate, never a count of none passing. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Algiers, Vermont: the town whose first school year read zero (Story's find, seed r7). */
const ALGIERS = { key: "5001035", seed: "r7" };

function measuresAfterAYear(seed: string, placeKey: string) {
  const world = buildBenchWorld(seed, gameStartDate(), {
    placeKey,
    twoLevel: true,
  });
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 400));
  return coreAPI(world.core)
    .moduleState(SCHOOL_MODULE_ID)
    .table("measures")
    .rows() as unknown as readonly SchoolMeasureRow[];
}

for (const [name, seed, key] of [
  ["Algiers, Vermont", ALGIERS.seed, ALGIERS.key],
  ["a drawn place", undefined, undefined],
] as const)
  it(
    `${name}: no small cohort reads none passing in its first year (replay ${replay})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const drawn = seed ? null : drawPlace(replay, "school-small-cohort");
        const rows = measuresAfterAYear(seed ?? drawn!.seed, key ?? drawn!.key);
        process.stdout.write(
          `SCHOOL ${name} ${drawn ? `${drawn.name} (${drawn.key}, seed ${drawn.seed})` : `seed ${seed}`}: ${rows.map((r) => `${r.measure}=${r.value.toFixed(1)} of ${r.students}`).join("; ") || "no school rows"}\n`,
        );
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          if (row.students > 0 && row.expected > 0)
            expect(row.value, row.id).toBeGreaterThan(0);
        }
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
