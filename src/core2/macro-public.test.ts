/** Federal purchases legislated above their base raise the nation's output gap. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import { federalPurchasesPct } from "./macro-public";
import { historyMonths, stepMacroMonth, type MacroMonth } from "./macro-model";
import { MACRO_MODULE_ID, macroCoreData } from "./modules/macro";
import { enactBudget, governments, openBudgets } from "./modules/budgets";
import { openLaws } from "./modules/laws";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { parameter } from "./parameters";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "macro-public",
);

describe("public purchases and output", () => {
  it("purchases of 1% of output raise output about 1.2% after a year and 1.5% after two", () => {
    const start = historyMonths("2024-01-01", p).at(-1)!;
    const run = (pct: number, months: number) => {
      let row: MacroMonth = start;
      for (let i = 0; i < months; i++)
        row = stepMacroMonth(row, start.policyRatePct, 0, 0, p, pct);
      return row.outputGapPct;
    };
    expect(run(1, 12) - run(0, 12)).toBeCloseTo(1.2, 1);
    expect(run(1, 24) - run(0, 24)).toBeGreaterThan(1.4);
    expect(run(1, 24) - run(0, 24)).toBeLessThan(1.5);
  });

  it(`a defense increase Congress enacts reaches the national month (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    openLaws(core);
    openBudgets(core);
    const api = coreAPI(core);
    expect(federalPurchasesPct(api)).toBe(0);
    const federal = governments(api).find((g) => g.level === "federal")!;
    // $100 billion more for defense: 1.4% of fiscal 2025 outlays.
    enactBudget(
      api,
      federal,
      Number(opening.startedAt.slice(0, 4)) - 1,
      "test",
      {
        nationalDefense: 100e9 * 100,
      },
    );
    const share = federalPurchasesPct(api);
    expect(share).toBeCloseTo((100e9 / 7.01e12) * 23.3, 2);
    advanceCore(core, `${opening.startedAt.slice(0, 4)}-03-02`);
    const months = api
      .moduleState(MACRO_MODULE_ID)
      .table("months")
      .rows() as unknown as MacroMonth[];
    const simulated = months.filter((m) => m.kind === "simulated");
    expect(simulated.length).toBeGreaterThan(0);
    for (const m of simulated) expect(m.publicGapPct ?? 0).toBeGreaterThan(0);
  }, 600_000);
});
