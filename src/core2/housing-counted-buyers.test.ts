/** Renters of the wider population buy finished new houses from their builder: the pool pays the down payment and the loan, and the rent ends. Place and seed in the test name. */
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
  "housing-counted-buyers",
);

describe(`counted renters buy new houses (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("sells finished new houses to the wider population's renters", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    const year = Number(opening.startedAt.slice(0, 4));
    advanceCore(core, `${year}-02-03`);
    const api = coreAPI(core);
    const housing = api.moduleState(HOUSING_MODULE_ID);
    const rt = residentsRuntime(core)!;
    const account = rt.input.accounts[0];
    const rents = () =>
      [...rt.flows.values()].filter(
        (f) =>
          f.id.startsWith("rent:") &&
          !f.endedAt &&
          f.placeId === account?.placeId,
      ).length;
    // A place with no counted renters has nobody to sell to.
    if (!account || !rents()) return;
    const stock = housing.table("stock").get(`stock:${account.placeId}`) as
      Record<string, unknown> | undefined;
    if (!stock) return;
    // Two houses a builder has finished (the construction engine's own rows, as its completions write them).
    const builder = [...core.organizations.values()].find(
      (o) => o.placeId === account.placeId && o.kind === "employer",
    )!;
    housing.table("projects").put({
      id: "project:test-houses",
      placeId: account.placeId,
      kind: "single",
      units: 2,
      affordableUnits: 0,
      startedAt: opening.startedAt,
      completesAt: `${year}-02-01`,
      payerId: builder.id,
      builderId: builder.id,
      monthlyCostMinor: 0,
      paidMinor: 0,
      open: false,
      isProject: true,
    });
    housing.table("stock").put({ ...stock, newHomesForSale: 2 });
    const before = rents();
    const builderCash = builder.liquidMinor;
    advanceCore(core, `${year}-08-03`);
    const sold = (
      housing.table("purchases").rows() as unknown as {
        counted?: boolean;
        priceMinor: number;
        downMinor: number;
        loanMinor: number;
      }[]
    ).filter((row) => row.counted);
    console.log(
      `${drawn.name}: ${sold.length} new houses sold to counted renters, prices ${sold.map((r) => Math.round(r.priceMinor / 100)).join(", ")}`,
    );
    // No more than the houses for sale; where renters' pay can't carry a new house, none sell.
    expect(sold.length).toBeLessThanOrEqual(2);
    expect(rents()).toBeLessThanOrEqual(before - sold.length);
    // Every sale pays the house's price: one value for both, the down payment and the loan.
    if (sold.length === 2)
      expect(
        Math.abs(sold[0]!.priceMinor - sold[1]!.priceMinor),
      ).toBeLessThanOrEqual(2);
    for (const row of sold) {
      expect(row.downMinor).toBeGreaterThan(0);
      expect(row.downMinor + row.loanMinor).toBe(row.priceMinor);
    }
    if (sold.length) expect(builder.liquidMinor).not.toBe(builderCash);
  }, 600_000);
});
