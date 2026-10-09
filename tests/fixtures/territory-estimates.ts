import { expect } from "vitest";

/** The five territories, by their place-outcome keys. */
export const TERRITORY_KEYS = [
  "US-AS",
  "US-GU",
  "US-MP",
  "US-PR",
  "US-VI",
] as const;

interface MeasureDefinition {
  readonly places: Readonly<Record<string, number>>;
  readonly source: string;
}

/**
 * A place-outcome measure holds researched values for the states it covers
 * (the 50 states and D.C. unless the test names fewer) and, for the five
 * territories, a value the data marks "ESTIMATED FROM AVERAGE" with the place
 * it was taken from. A territory is never left unknown.
 */
export function expectTerritoriesEstimated(
  definition: MeasureDefinition,
  researched = 51,
): void {
  const keys = Object.keys(definition.places);
  const territories = new Set<string>(TERRITORY_KEYS);
  expect(keys.filter((key) => !territories.has(key))).toHaveLength(researched);
  for (const key of TERRITORY_KEYS)
    expect(definition.places, key).toHaveProperty(key);
  const note = (definition as { readonly note?: string }).note ?? "";
  expect(`${note} ${definition.source}`).toMatch(/ESTIMATED FROM/);
}
