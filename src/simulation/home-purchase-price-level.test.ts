import { describe, expect, it } from "vitest";
import { homeValueForJurisdiction } from "./county-home-value";
import { makeIsoDate } from "./dates";
import { homePurchaseTerms } from "./home-purchase";
import { lifePlaces } from "./life-places";
import { homePriceLevel, homePriceLevels } from "./living-world/housing-market";
import { startValuesFromLatents } from "./macro-economy/kernel";
import {
  CHANGE_AUTHORED_IMPULSES_VERSION,
  MACRO_POLICY_VERSION,
} from "./macro-economy/policy";
import { macroScopeForJurisdiction } from "./macro-economy/readers";
import {
  monthEnd,
  monthRecordKey,
  monthStart,
  nextMonthKey,
} from "./macro-economy/store";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "./macro-economy/types";
import type { MacroMonthRecord, MacroScopeKey } from "./macro-economy/types";
import { SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import { createWorld } from "./world";

const SEED = "team4-a54-home-price-level-all56-20261001";
const available = [...lifePlaces()];
const rng = new SeededRng(SEED);
const places = Array.from(
  { length: 5 },
  () => available.splice(rng.integer(0, available.length), 1)[0]!,
);

/** Controlled saved macro inputs, not a forecast or production price calibration. */
function month(
  scope: MacroScopeKey,
  key: string,
  priceIndex: number,
): MacroMonthRecord {
  return {
    key: monthRecordKey(scope, key),
    scope,
    ordinal: scope !== "national" || key.endsWith("01") ? 0 : 1,
    periodStart: monthStart(key),
    periodEnd: monthEnd(key),
    recordedAt: monthStart(nextMonthKey(key)),
    growthPct: 12,
    inflationPct: 0,
    unemploymentPct: 5,
    realOutputIndex: 100,
    priceIndex,
    realIncomeIndex: null,
    housing:
      scope === "national"
        ? {
            supplyDemandRatio: 1,
            supplyUnits: null,
            demandHouseholds: null,
            classification: "adequate",
          }
        : null,
    exposure:
      scope === "national"
        ? null
        : {
            basis: "national-average-no-local-source",
            multiplier: 1,
            sourceKey: null,
          },
    creditTightness: 0,
    policyRate: {
      lowerPct: 4,
      upperPct: 4,
      basis: "retained-reference",
      decisionEventId: null,
    },
    innovations: { growth: 0, unemployment: 0, inflation: 0 },
    impulses: { growthPp: 0, laborPp: 0, pricePp: 0 },
    shockKeys: [],
  };
}

describe("A54 purchase prices follow the housing market", () => {
  it.each(places)(
    "reads the dated housing level in $displayName ($key), seed " + SEED,
    (place) => {
      const date = makeIsoDate("2026-03-01");
      const base = createWorld({
        seed: `${SEED}:${place.key}`,
        currentDate: date,
        jurisdictions: [place.context.jurisdiction],
        people: [],
      });
      const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
      const start = {
        contractVersion: "crunch46-macro-start/v1",
        policyVersion: "crunch46-provisional-v1",
        regime: "near-reference",
        volatilityScale: 0,
        latents,
        initial: startValuesFromLatents("near-reference", latents),
        effectiveDate: makeIsoDate("2026-01-01"),
      } as const;
      const town = place.context.jurisdiction.id;
      const national = [
        month("national", "2026-01", 100),
        month("national", "2026-02", 200),
      ];
      const local = month(macroScopeForJurisdiction(town), "2026-02", 300);
      const world = {
        ...base,
        macroEconomy: {
          contractVersion: MACRO_ECONOMY_CONTRACT_VERSION,
          policyVersion: MACRO_POLICY_VERSION,
          impulsesVersion: CHANGE_AUTHORED_IMPULSES_VERSION,
          start,
          shocks: [],
          shockEnds: [],
          releases: [],
          months: [...national, local],
        },
      };
      const before = serializeWorld(world);
      const opening = homeValueForJurisdiction(town).dollars * 100;
      const level = homePriceLevel(world, town, date);
      const terms = homePurchaseTerms(world, town);
      expect(level).not.toBe(3);
      expect(terms.priceMinor).toBe(
        Math.max(100_000, Math.round((opening * level) / 100_000) * 100_000),
      );
      expect(terms.priceMinor).not.toBe(
        Math.round((opening * 3) / 100_000) * 100_000,
      );
      expect(homePurchaseTerms(world, null).priceMinor).toBe(
        Math.max(
          100_000,
          Math.round(
            (homeValueForJurisdiction(null).dollars *
              100 *
              homePriceLevels(national).at(-1)!.level) /
              100_000,
          ) * 100_000,
        ),
      );
      expect(serializeWorld(world)).toBe(before);
      const reopened = deserializeWorld(before);
      expect(homePurchaseTerms(reopened, town)).toEqual(terms);
      expect(serializeWorld(reopened)).toBe(before);
    },
  );
});
