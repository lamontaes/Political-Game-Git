/** Refinancing in a generated world: in early 2021, at record-low rates, owners refinance and their payments drop. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { levelPayment } from "./housing-refinance";
import { advanceCore, createLifeCore } from "./life";
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
  "housing-refinance",
);

describe(`refinancing (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("a level payment repays the balance", () => {
    expect(levelPayment(120_000, 0, 120, 12)).toBe(1_000);
    expect(levelPayment(20_000_000, 0.06, 360, 12)).toBeCloseTo(119_910.1, 0);
  });

  it("owners refinance at the lower rate and pay less from the next due date", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    advanceCore(core, "2021-03-02");
    const refis = [...housing.table("refinances").rows()] as unknown as {
      householdId: string;
      fromRate: number;
      toRate: number;
      paymentBeforeMinor: number;
      paymentAfterMinor: number;
    }[];
    const open = [...housing.table("mortgages").rows()].length;
    // A place with no recorded mortgages (an island area) has none to refinance.
    if (!open) return;
    expect(refis.length).toBeGreaterThan(0);
    for (const row of refis) {
      expect(row.toRate).toBeLessThan(row.fromRate);
      expect(row.paymentAfterMinor).toBeLessThan(row.paymentBeforeMinor);
      const id = `mortgage:${row.householdId}`;
      const loan = housing.table("mortgages").get(id) as unknown as {
        paymentMinor: number;
        rate: number;
      };
      expect(loan.rate).toBe(row.toRate);
      // The payment that's charged: a full household's standing bill, or a counted one's part of a merged flow.
      const bill = core.finance.contracts.get(id);
      if (bill) expect(bill.amountMinor).toBe(row.paymentAfterMinor);
      else
        expect(
          [...residentsRuntime(core)!.flows.values()].some(
            (flow) =>
              !flow.endedAt && flow.amountByContract?.[id] !== undefined,
          ),
        ).toBe(true);
    }
  }, 600_000);
});
