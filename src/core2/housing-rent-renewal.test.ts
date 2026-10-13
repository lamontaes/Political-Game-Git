/** Counted renters' leases renew in a generated world: spread over the year, each by the region's pay since its last renewal. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "housing-rent-renewal",
);

describe(`counted rents renew (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("renews each counted lease once a year, in months spread over the year", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    const rents = () =>
      new Map(
        [...(residentsRuntime(core)?.flows.values() ?? [])]
          .filter((flow) => flow.id.startsWith("rent:") && !flow.endedAt)
          .map((flow) => [flow.id, flow.amountMinor]),
      );
    const before = rents();
    // A place with no counted renters (an island area) has nothing to renew.
    if (!before.size) return;
    advanceCore(core, `${Number(opening.startedAt.slice(0, 4)) + 1}-01-15`);
    const renewals = [
      ...coreAPI(core).moduleState(HOUSING_MODULE_ID).table("renewals").rows(),
    ] as unknown as {
      id: string;
      renewedAt: string;
      rentMinor: number;
      previousRentMinor?: number;
    }[];
    const counted = renewals.filter(
      (row) => row.id.startsWith("rent:") && row.previousRentMinor,
    );
    // Over a year every counted lease has renewed once, in several different months.
    expect(counted.length).toBeGreaterThan(before.size * 0.75);
    // The first review sees them a month in, so the last month's group renews just after the year.
    expect(
      new Set(counted.map((row) => row.renewedAt.slice(0, 7))).size,
    ).toBeGreaterThanOrEqual(Math.min(11, before.size));
    const after = rents();
    for (const row of counted) expect(after.get(row.id)).toBe(row.rentMinor);
  }, 600_000);
});
