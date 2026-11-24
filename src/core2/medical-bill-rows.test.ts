// @vitest-environment node
/** A household no longer billed leaves its medical-bill row once it owes nothing and holds no debt record (keep results, not their history). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { MedicalBillRow } from "./medical-bills";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  `drops the settled row of a household no longer billed and keeps one that still owes (replay ${replay})`,
  { timeout: 900_000 },
  () => {
    const run = (on: boolean) => {
      const previous = setBookkeeping(on);
      try {
        const drawn = drawPlace(replay, "medical-bill-rows");
        const world = buildBenchWorld(drawn.seed, gameStartDate(), {
          placeKey: drawn.key,
          twoLevel: true,
        });
        const core = world.core;
        advanceCore(core, addDays(makeIsoDate(core.date), 40));
        const bills = coreAPI(core)
          .moduleState(COVERAGE_MODULE_ID)
          .table("medicalBills");
        const billed = bills.rows() as unknown as MedicalBillRow[];
        expect(billed.length, drawn.name).toBeGreaterThan(0);
        // Two households gone from the world: one settled, one still owing.
        const gone = (id: string, owed: MedicalBillRow["owed"]) =>
          bills.put({
            ...billed[0]!,
            id: `medical-bill:${id}`,
            householdId: id,
            owed,
            debtId: null,
          } as never);
        gone("test-settled", []);
        gone(
          "test-owing",
          billed.find((row) => row.owed.length)?.owed ?? [
            { billedAt: makeIsoDate(core.date), minor: 100 },
          ],
        );
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
        return {
          settled: bills.get("medical-bill:test-settled") !== undefined,
          owing: bills.get("medical-bill:test-owing") !== undefined,
        };
      } finally {
        setBookkeeping(previous);
      }
    };
    expect(run(false)).toEqual({ settled: false, owing: true });
    expect(run(true)).toEqual({ settled: true, owing: true });
  },
);
