import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import {
  countyGeoidsForPlace,
  countyLandSharesForPlace,
} from "../../simulation/government-units";
import { placeReferencePopulation } from "../../simulation/nationwide-world/place-population";
import {
  COUNTY_BUSINESS_ROWS,
  STATE_BUSINESS_ROWS,
  SALES_PER_EMPLOYEE_ROWS,
  LOCAL_BUSINESS_COUNT_KINDS,
} from "../../simulation/local-business-counts.generated";
import {
  PLACE_COUNTY_RELATIONS_ROWS,
  PLACE_COUNTY_RELATIONS_META,
} from "../../simulation/place-county-relations.generated";
import { NATIONAL_PLACES_ROWS } from "../../simulation/national-places.generated";
import {
  COUNTY_SECTOR_EMPLOYMENT,
  STATE_PUBLIC_EMPLOYMENT,
  TOWN_EMPLOYMENT_META,
} from "../../simulation/living-world/town-employment.generated";
import {
  FDIC_SMALL_BANK_SHAPES,
  FDIC_SMALL_BANK_RECORDS,
} from "../../simulation/living-world/town-bank-shapes.generated";
import scf from "../../../data/research/money/scf-transaction-accounts-2022.json";
import research from "../../../data/research/money/debt-and-credit-2026.json";
import { recordedBankShape as nativeBank } from "../../simulation/living-world/town-finances";
import {
  townEmploymentMix as nativeMix,
  townWorkplaceWeights as nativeWeights,
} from "../../simulation/living-world/town-employment";
import { localBusinessPlansFor as nativePlans } from "../../simulation/local-economy";
import { medianTransactionBalance as nativeBalance } from "../../simulation/starting-money";
import { studentLoanRateFor as nativeStudent } from "../../simulation/student-debt";
import { recordedBankShape } from "./bank-source-profile";
import {
  townEmploymentMix,
  townWorkplaceWeights,
} from "./employment-source-mix";
import { localBusinessPlansFor } from "./business-plans";
import {
  medianTransactionBalance,
  studentLoanRateFor,
} from "./source-money-selectors";
import type { BusinessSupplyFacts } from "./business-supply";
const populations = new Map<
  string,
  ReturnType<typeof placeReferencePopulation>
>();
for (const [geoid] of JSON.parse(NATIONAL_PLACES_ROWS) as readonly (readonly [
  string,
  ...unknown[],
])[])
  populations.set(geoid, placeReferencePopulation(geoid));
const bank = {
  shapes: FDIC_SMALL_BANK_SHAPES,
  records: FDIC_SMALL_BANK_RECORDS,
};
describe("economy complete source selectors through unchanged native public owners", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:business-source:" + usps,
      });
      const ids = [base.jurisdictionId, base.stateJurisdictionId];
      const places = new Map(
        ids.map((id) => [id, lifePlaceByJurisdictionId(id)]),
      );
      const geoids = [...places.values()].flatMap((p) =>
        p?.sourceGeoid ? [p.sourceGeoid] : [],
      );
      const countiesByGeoid = new Map(
        geoids.map((g) => [g, countyGeoidsForPlace(g)]),
      );
      const mix = {
        countyRows: COUNTY_SECTOR_EMPLOYMENT,
        stateRows: STATE_PUBLIC_EMPLOYMENT,
        meta: TOWN_EMPLOYMENT_META,
        places,
        countiesByGeoid,
      };
      const supply: BusinessSupplyFacts = {
        kinds: LOCAL_BUSINESS_COUNT_KINDS,
        countyRows: COUNTY_BUSINESS_ROWS,
        stateRows: STATE_BUSINESS_ROWS,
        salesRows: SALES_PER_EMPLOYEE_ROWS,
        countyRelationsRows: PLACE_COUNTY_RELATIONS_ROWS,
        nationalPlacesRows: NATIONAL_PLACES_ROWS,
        geographyAsOf: PLACE_COUNTY_RELATIONS_META.geographyAsOf,
        places,
        populations,
        landShares: new Map(
          geoids.map((g) => [g, countyLandSharesForPlace(g)]),
        ),
      };
      for (const id of ids) {
        expect(townEmploymentMix(mix, id)).toEqual(nativeMix(id));
        expect(townWorkplaceWeights(mix, id)).toEqual(nativeWeights(id));
        const realize = (plans: ReturnType<typeof nativePlans>) =>
          plans.map((plan) => ({
            ...plan,
            kind: { ...plan.kind, name: plan.kind.name("Controlled family") },
          }));
        expect(realize(localBusinessPlansFor(supply, id))).toEqual(
          realize(nativePlans(id)),
        );
      }
      for (const state of [usps, null, "unknown"])
        for (const deposits of [0, 1, 100000, 999999, 25000000, 1e12])
          expect(recordedBankShape(bank, state, deposits)).toEqual(
            nativeBank(state, deposits),
          );
      for (const income of [-1, 0, 1, 1000, 20000, 50000, 150000, 1e9])
        expect(
          medianTransactionBalance({ groups: scf.groups }, income),
        ).toEqual(nativeBalance(income));
      for (const date of [
        "2000-01-01",
        "2026-06-30",
        "2026-07-01",
        "2027-06-30",
        "2027-07-01",
        "2040-01-01",
      ])
        expect(studentLoanRateFor({ research }, makeIsoDate(date))).toEqual(
          nativeStudent(makeIsoDate(date)),
        );
    });
});
