import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stableHash } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import type { World } from "../types";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import {
  PLACE_OUTCOME_BASES,
  type PlaceOutcomeRecord,
} from "./place-outcome-store";

/*
 * Married women in the labor force is a place outcome: each state, D.C. and
 * Puerto Rico starts at the 2024 ACS share, and the outcome web moves it from
 * there. Home broadband acts on it: each point more of households with
 * broadband than the place began with adds about 0.07% (Dettling 2017). The
 * place is drawn from every place that keeps both measures, not named.
 */
const MEASURE = "labor.married-women-participation";
const BROADBAND = "broadband.home-access";
const LINK = "broadband-to-married-women-work";
const SEED = "married-women-work-1";

const PLACES = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places)
  .filter((key) => key in PLACE_OUTCOME_BASES[BROADBAND]!.places)
  .sort();
const PLACE =
  PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;

function broadbandRecord(placeKey: string, value: number): PlaceOutcomeRecord {
  const base = PLACE_OUTCOME_BASES[BROADBAND]!.places[placeKey]!;
  return {
    measure: BROADBAND,
    placeKey,
    jurisdictionId: stateJurisdictionForKey(placeKey)!.id,
    month: makeIsoDate("2028-07-01"),
    base,
    structural: value,
    multiplier: 1,
    value,
    causes: [],
  };
}

function worldWith(records: readonly PlaceOutcomeRecord[]): World {
  return {
    currentDate: makeIsoDate("2028-07-01"),
    policyCatalog: { propositions: {} },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
    placeOutcomes: {
      months: [{ month: makeIsoDate("2028-07-01"), records }],
    },
  } as unknown as World;
}

const factor = (world: World, placeKey: string) =>
  outcomeFactor(
    world,
    stateJurisdictionForKey(placeKey)!.id,
    MEASURE,
    makeIsoDate("2028-07-15"),
  ).causes.find((cause) => cause.key === LINK)?.factor;

describe("married women at work as a place outcome", () => {
  it("starts every state, D.C. and Puerto Rico at the 2024 ACS share, and the other territories are unknown", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(52);
    expect(places).toHaveProperty("US-DC");
    expect(places).toHaveProperty("US-PR");
    expect(places).not.toHaveProperty("US-GU");
    for (const [key, value] of Object.entries(places)) {
      expect(value, key).toBeGreaterThan(30);
      expect(value, key).toBeLessThan(85);
    }
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("the broadband link into it now acts", () => {
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(link.to).toBe(MEASURE);
    expect(outcomeLinkStatus(link)).toBe("built");
  });

  it(`ten points more home broadband than ${PLACE} began with raises married women's work about 0.7%, and ten fewer lowers it (seed ${SEED})`, () => {
    const base = PLACE_OUTCOME_BASES[BROADBAND]!.places[PLACE]!;
    expect(factor(worldWith([broadbandRecord(PLACE, base)]), PLACE)).toBe(1);
    expect(
      factor(worldWith([broadbandRecord(PLACE, base + 10)]), PLACE),
    ).toBeCloseTo(1.007, 10);
    expect(
      factor(worldWith([broadbandRecord(PLACE, base - 10)]), PLACE),
    ).toBeCloseTo(0.993, 10);
  });
});
