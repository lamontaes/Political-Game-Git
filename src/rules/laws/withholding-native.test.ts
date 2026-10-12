import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import * as native from "../../simulation/income-tax-withholding";
import { initialPrivacyComplianceEstimate as oldPrivacy } from "../../simulation/federal-data-privacy-law";
import { startingStateMinimumHourly as oldMinimum } from "../../simulation/minimum-wage";
import {
  TOWN_MINIMUM_WAGES,
  FEDERAL_MINIMUM_HOURLY,
} from "../../simulation/living-world/town-pay.generated";
import stateTaxes from "../../../data/research/money/state-income-tax-2026.json";
import incomes from "../../../data/research/money/state-household-income-cps-2023.json";
import privacyCosts from "../../../data/research/money/privacy-law-compliance-cost-ccpa-2019.json";
import { censusRegionOf } from "../../simulation/world-setup/census-regions";
import { makeIsoDate, addDays } from "../../simulation/dates";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  activePartnershipsAt,
  householdMembershipsAt,
} from "../../simulation/life-queries";
import { childrenOf } from "../../simulation/people-family";
import {
  stateDeductionEstimate,
  stateIncomeTaxSchedule,
  filingStatusAt,
  payPeriodsPerYear,
  type ScheduleFacts,
} from "./withholding-facts";
import { initialPrivacyComplianceEstimate } from "./privacy-estimate";
import { startingStateMinimumHourly } from "./minimum-hourly";
function receipt(f: () => unknown) {
  try {
    return { value: f() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
const facts: ScheduleFacts = {
  places: stateTaxes.places,
  householdIncomes: incomes.medianHouseholdIncomeDollarsByState,
  regions: new Map(
    Object.keys(stateTaxes.places).map((key) => [
      key.slice(3),
      censusRegionOf(key.slice(3)),
    ]),
  ),
  sourceUrl: stateTaxes.source.url,
};
describe("laws: immutable sourced withholding and public-life caller closure", () => {
  it.each(Object.keys(STATES))(
    "matches raw sourced facts and generated family records in %s",
    (usps) => {
      const key = `US-${usps}`;
      expect(receipt(() => stateDeductionEstimate(facts, key))).toEqual(
        receipt(() => native.stateDeductionEstimate(key)),
      );
      for (const status of [
        "single",
        "married-filing-jointly",
        "head-of-household",
      ] as const)
        expect(
          receipt(() =>
            stateIncomeTaxSchedule(facts, key, status, "rules2-laws"),
          ),
        ).toEqual(
          receipt(() =>
            native.stateIncomeTaxSchedule(key, status, "rules2-laws"),
          ),
        );
      expect(
        startingStateMinimumHourly(
          {
            stateMinimums: TOWN_MINIMUM_WAGES,
            federalMinimum: FEDERAL_MINIMUM_HOURLY,
          },
          key,
        ),
      ).toEqual(oldMinimum(key));
      for (const count of [
        -1,
        0,
        1,
        99,
        100,
        101,
        499,
        500,
        501,
        1000,
        1.5,
        NaN,
      ])
        expect(initialPrivacyComplianceEstimate(privacyCosts, count)).toEqual(
          oldPrivacy(count),
        );
      const { world } = smallWorld({
        place: key,
        household: true,
        seed: `rules2-law-withholding:${usps}`,
      });
      const ids = world.personOrder;
      const family = {
        onDate: world.currentDate,
        people: world.people,
        partnerships: new Map(
          ids.map((id) => [id, activePartnershipsAt(world, id)]),
        ),
        memberships: new Map(
          ids.map((id) => [id, householdMembershipsAt(world, id)]),
        ),
        children: new Map(ids.map((id) => [id, childrenOf(world, id)])),
      };
      for (const id of ids)
        expect(filingStatusAt(family, id)).toEqual(
          native.filingStatusAt(world, id),
        );
      const date = makeIsoDate("2026-01-01");
      for (const days of [
        -2, 0, 1, 6, 13, 14, 15, 27, 28, 29, 30, 31, 60, 365,
      ]) {
        const period = {
          periodStartsAt: date,
          periodEndsAt: addDays(date, days),
        };
        expect(payPeriodsPerYear(period)).toEqual(
          native.payPeriodsPerYear(period),
        );
      }
    },
  );
});
