import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { World } from "../types";
import { placeOutcomesForMonth } from "./place-outcomes";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  type PlaceOutcomeRecord,
} from "./place-outcome-store";
import {
  ELECTRICITY_GENERATION_FUELS,
  electricityGenerationMixOutcomeBases,
  startingElectricityGenerationMix,
} from "./electricity-generation-mix";

const MIX_MEASURES = [
  ...ELECTRICITY_GENERATION_FUELS.map(
    (fuel) => `energy.generation-share.${fuel}`,
  ),
  "energy.generation-share.untracked-residual",
];

function worldAt(date: string): World {
  return {
    currentDate: makeIsoDate(date),
    policyCatalog: { propositions: {} },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
  } as unknown as World;
}

function recordFor(
  records: readonly PlaceOutcomeRecord[],
  measure: string,
  placeKey: string,
): PlaceOutcomeRecord {
  return records.find(
    (record) => record.measure === measure && record.placeKey === placeKey,
  )!;
}

describe("EIA starting electricity-generation mix", () => {
  it("preserves the six published fuel shares and the untracked remainder", () => {
    const mix = startingElectricityGenerationMix("US-CA")!;
    expect(mix.totalNetGenerationMwh).toBe(214_191_383);
    expect(mix.fuelGenerationMwh.coal).toBe(245_554);
    expect(mix.shares.wind).toBe(0.073057808306);
    expect(mix.untrackedResidualMwh).toBe(15_381_435);
    expect(mix.source).toMatchObject({
      dataset: "eia-electricity-generation-mix-2024",
      year: 2024,
      typeOfProducer: "Total Electric Power Industry",
      sourceRowKey:
        "eia-electricity-generation-mix-2024:2024:US-CA:Total Electric Power Industry",
    });
    expect(mix.source.url).toContain("eia.gov/electricity/data/state");
    const sixShareTotal = Object.values(mix.shares).reduce(
      (sum, share) => sum + share,
      0,
    );
    expect(sixShareTotal).toBeLessThan(1);
    expect(sixShareTotal + mix.untrackedResidualShare).toBeCloseTo(1, 11);
  });

  it("leaves places absent from EIA unknown", () => {
    expect(startingElectricityGenerationMix("US-PR")).toBeNull();
    expect(startingElectricityGenerationMix("US-GU")).toBeNull();
    for (const measure of MIX_MEASURES) {
      expect(PLACE_OUTCOME_BASES[measure]!.places).not.toHaveProperty("US-PR");
      expect(PLACE_OUTCOME_BASES[measure]!.places).not.toHaveProperty("US-GU");
    }
  });

  it("starts all seven distinct place outcomes from the EIA source rows", () => {
    const generated = electricityGenerationMixOutcomeBases();
    expect(Object.keys(generated).sort()).toEqual([...MIX_MEASURES].sort());
    expect(PLACE_OUTCOME_MEASURES).toEqual(
      expect.arrayContaining(MIX_MEASURES),
    );
    for (const measure of MIX_MEASURES) {
      const definition = PLACE_OUTCOME_BASES[measure]!;
      expect(Object.keys(definition.places)).toHaveLength(51);
      expect(definition.source).toContain("https://www.eia.gov/");
      expect(definition.source).toContain("2024");
      expect(definition.drift).toEqual({ minPct: 0, maxPct: 100 });
    }

    const records = placeOutcomesForMonth(
      worldAt("2026-01-05"),
      makeIsoDate("2026-01-01"),
      MIX_MEASURES,
    );
    for (const measure of MIX_MEASURES) {
      const california = recordFor(records, measure, "US-CA");
      const expected = PLACE_OUTCOME_BASES[measure]!.places["US-CA"]!;
      expect(california.base).toBe(expected);
      expect(california.value).toBeCloseTo(expected, 2);
    }

    const californiaShares = MIX_MEASURES.map(
      (measure) => recordFor(records, measure, "US-CA").value,
    );
    expect(californiaShares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(
      100,
      1,
    );
  });
});
