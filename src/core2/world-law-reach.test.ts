/** Laws reach the economy, in a generated world: a drawn town enacts each policy and its engine changes. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import { amendBudget, governments, openBudgets } from "./modules/budgets";
import { baseLine, budgetToday } from "./law-reach/group-a-money";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { openLawEffects } from "./modules/law-effects";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreAPI, CoreState } from "./types";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "world-law-reach",
);
const P = "us-policy-positions:";
let core: CoreState,
  api: CoreAPI,
  town: string,
  measure = 0;

const tomorrow = () => {
  const at = new Date(`${api.state.date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return at.toISOString().slice(0, 10);
};
/** Enacts a yes at the town's lowest level, effective tomorrow, and runs past it. */
function enact(series: string, value = 1) {
  const level = lawChain(api).levels.at(-1)!;
  measure += 1;
  const date = tomorrow();
  enactLaw(api, {
    jurisdiction: level.jurisdiction,
    level: level.level,
    series,
    value,
    effectiveDate: date,
    measureId: `TEST-${measure}`,
    citation: `Test act ${measure}`,
  });
  const after = new Date(`${date}T00:00:00Z`);
  after.setUTCDate(after.getUTCDate() + 1);
  advanceCore(core, after.toISOString().slice(0, 10));
}
const housing = (name: string) =>
  api.moduleState(HOUSING_MODULE_ID).table(name);
const rule = (good: string, kind: string) =>
  api
    .moduleState(PLACE_PRICES_MODULE_ID)
    .table("rules")
    .get(`${town}:${good}:${kind}`) as unknown as
    { value: number; payeeId?: string; providerId?: string } | undefined;

describe(`laws reach the economy (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  beforeAll(() => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    openLaws(core);
    openBudgets(core);
    openLawEffects(core);
    api = coreAPI(core);
    town = lawChain(api).townPlaceId;
  }, 600_000);

  it("zoning, set-aside units, gas hookups and farmland change what builders may build", () => {
    enact(`${P}housing-land-use.allow-multifamily-in-single-family-zones`);
    enact(`${P}housing-land-use.inclusionary-requirement`);
    enact(`${P}environment-energy.ban-new-gas-hookups`);
    enact(
      `${P}agriculture-natural-resources.protect-farmland-from-development`,
    );
    const stock = housing("stock").get(`stock:${town}`) as unknown as {
      zoning: Record<string, number | boolean>;
    };
    expect(stock.zoning).toEqual({
      multifamilyLandShare: 1,
      inclusionaryShare: 0.15,
      allElectric: true,
      farmlandProtected: true,
    });
  }, 600_000);

  it("rent stabilization caps renewals, right to counsel is funded, and assessments are capped", () => {
    enact(`${P}housing-land-use.rent-stabilization`);
    enact(`${P}housing-land-use.right-to-counsel-in-eviction`);
    enact(`${P}fiscal.cap-property-tax-growth`);
    expect(
      (housing("rentCaps").get(town) as unknown as { capShare: number })
        .capShare,
    ).toBe(0.07);
    const counsel = housing("counsel").get(town) as unknown as {
      inForce: boolean;
      fundedById?: string;
    };
    expect(counsel.inForce).toBe(true);
    if (governments(api).length) expect(counsel.fundedById).toBeTruthy();
    expect(
      (
        housing("assessments").get("law:assessment-cap") as unknown as {
          capShare: number;
        }
      ).capShare,
    ).toBe(0.02);
  }, 600_000);

  it("transit, a mileage fee, broadband, energy laws and a bottle deposit change what households pay", () => {
    enact(`${P}transportation-infrastructure.fare-free-transit`);
    enact(`${P}transportation-infrastructure.public-broadband`);
    enact(`${P}environment-energy.clean-electricity-standard`);
    enact(`${P}environment-energy.price-carbon`);
    enact(`${P}environment-energy.bottle-deposit`);
    expect(rule("transit-fare", "price")?.value).toBe(0);
    expect(rule("beverage-container", "per-unit")?.value).toBe(5);
    // Power: the standard's 3% and $50 a ton at 0.367 t/MWh on $160/MWh (11.5%).
    expect(rule("electricity", "share")?.value).toBeCloseTo(
      0.03 + (50 * 0.367) / 160,
      6,
    );
    // Gasoline: $50 a ton at 8.887 kg a gallon on $3.52 (12.6%).
    expect(rule("fuel", "share")?.value).toBeCloseTo((50 * 0.008887) / 3.52, 6);
    if (governments(api).length) {
      enact(`${P}transportation-infrastructure.mileage-fee-replaces-fuel-tax`);
      expect(rule("vehicle-miles", "per-unit")?.value).toBe(2);
      expect(rule("broadband", "offer")?.value).toBe(6000);
    }
  }, 600_000);

  it("halving a highway budget leaves more roads in poor condition", () => {
    const gov = governments(api).find((row) => {
      const budget = budgetToday(api, row);
      return budget && (budget.spendingMinor.highways ?? 0) > 0;
    });
    if (!gov) return;
    const budget = budgetToday(api, gov)!;
    const base = baseLine(api, gov, budget, "highways");
    amendBudget(api, {
      governmentId: gov.id,
      line: "highways",
      deltaMinor: -Math.round((budget.spendingMinor.highways ?? 0) / 2),
      measureId: "TEST-roads",
    });
    const now = budgetToday(api, gov)!.spendingMinor.highways ?? 0;
    expect(rule("vehicle-repair", "road")?.value).toBeCloseTo(
      0.226 * (base / now) ** 0.5,
      6,
    );
  }, 600_000);

  it("a repeal ends the rule", () => {
    enact(`${P}transportation-infrastructure.fare-free-transit`, 0);
    expect(rule("transit-fare", "price")).toBeUndefined();
  }, 600_000);
});
