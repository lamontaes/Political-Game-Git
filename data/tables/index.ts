/** Exact JSON snapshots; legacy readers continue using the generated modules. */
import type * as TownPay from "../../src/core2/reference/town-pay.generated";
import type * as TownRent from "../../src/core2/reference/town-rent.generated";
import type * as TownEmployment from "../../src/simulation/living-world/town-employment.generated";
import type * as TownBankShapes from "../../src/simulation/living-world/town-bank-shapes.generated";
import type * as TownDeposits from "../../src/simulation/living-world/town-deposits.generated";
import type * as LocalBusinessCounts from "../../src/simulation/local-business-counts.generated";
import type * as CountyHomeValue from "../../src/simulation/county-home-value.generated";
import type * as PlacePopulation from "../../src/simulation/nationwide-world/place-population.generated";

// JSON inference widens literal metadata and tuples. Complete equality is
// checked against the original module by tests/data-tables.test.ts.

export async function loadTownPay(): Promise<typeof TownPay> {
  const { default: table } = await import("./town-pay.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof TownPay;
}

export async function loadTownRent(): Promise<typeof TownRent> {
  const { default: table } = await import("./town-rent.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof TownRent;
}

export async function loadTownEmployment(): Promise<typeof TownEmployment> {
  const { default: table } = await import("./town-employment.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof TownEmployment;
}

export async function loadTownBankShapes(): Promise<typeof TownBankShapes> {
  const { default: table } = await import("./town-bank-shapes.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof TownBankShapes;
}

export async function loadTownDeposits(): Promise<typeof TownDeposits> {
  const { default: table } = await import("./town-deposits.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof TownDeposits;
}

export async function loadLocalBusinessCounts(): Promise<
  typeof LocalBusinessCounts
> {
  const { default: table } = await import("./local-business-counts.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof LocalBusinessCounts;
}

export async function loadCountyHomeValue(): Promise<typeof CountyHomeValue> {
  const { default: table } = await import("./county-home-value.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof CountyHomeValue;
}

export async function loadPlacePopulation(): Promise<typeof PlacePopulation> {
  const { default: table } = await import("./place-population.json", {
    with: { type: "json" },
  });
  return table as unknown as typeof PlacePopulation;
}
