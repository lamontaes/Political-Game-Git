/** The town's monthly economy rows in a generated world: unemployment and the employment rate by residence, and households' past-due bills. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { townMetrics } from "./modules/world-metrics";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "world-metrics",
);

describe(`town economy rows (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("counts employment where people live, and what households owe past due", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    advanceCore(core, "2021-02-02");
    const rows = townMetrics(coreAPI(core)).filter((row) => row.adults > 0);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.employmentRate).toBeGreaterThanOrEqual(0);
      expect(row.unemploymentRate).toBeGreaterThanOrEqual(0);
      expect(row.unemploymentRate).toBeLessThan(1);
      expect(row.pastDueMinor).toBeGreaterThanOrEqual(0);
      expect(row.householdsPastDue).toBeGreaterThanOrEqual(0);
    }
    // The town (the place with the most businesses), logged: its employment rate depends on how many residents the opening employs.
    const town = [...rows].sort(
      (a, b) => b.businessesOpen - a.businessesOpen,
    )[0]!;
    console.log(
      `${drawn.name}: employment rate ${(town.employmentRate * 100).toFixed(1)}%, unemployment ${(town.unemploymentRate * 100).toFixed(1)}%`,
    );
    expect(town.employmentRate).toBeGreaterThan(0);
  }, 600_000);
});
