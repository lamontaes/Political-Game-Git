import recipientAgeCohorts from "../../../data/research/outcome-web/person-recipient-age-cohorts.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  matchesOutcomeRecipientRule as legacyMatches,
  type OutcomeRecipientRule,
} from "../../simulation/outcome-web/person-outcome-landings";
import { STATES } from "../../simulation/state-reference";
import {
  matchesOutcomeRecipientFromFacts,
  type OutcomeRecipientFacts,
} from "./recipient";

const rules: readonly OutcomeRecipientRule[] = [
  "recorded-school-enrollment-or-compulsory-age-estimate",
  "infant-mortality-cohort-estimate",
  "working-age-adult-cohort-estimate",
  "older-adult-medicare-cohort-estimate",
  "adult-substance-use-condition-estimate",
  "youth-cannabis-cohort-estimate",
  "child-asthma-cohort-estimate",
  "jurisdiction-resident-estimate",
  "household-resident-estimate",
  "snap-enrolled-household-member-estimate",
  "recorded-wage-family-member-estimate",
  "adult-school-completer-estimate",
  "retirement-age-adult-cohort-estimate",
  "active-renter-household-member-estimate",
  "snap-enrolled-renter-household-member-estimate",
  "evicted-household-without-home-member-estimate",
  "retirement-policy-age-cohort-estimate",
  "recorded-married-woman-estimate",
  "recorded-parent-of-young-child-estimate",
  "recorded-parent-of-infant-estimate",
  "voting-age-resident-estimate",
  "recorded-restored-voting-right-estimate",
  "recorded-medicaid-expansion-recipient-estimate",
  "recorded-payday-loan-borrower-estimate",
  "recorded-farm-operator-land-value-estimate",
  "recorded-farm-operator-resource-estimate",
];
const cohorts = recipientAgeCohorts.cohortsByRule as Record<
  string,
  { minimumAge: number; maximumAge: number | null }
>;

describe("standalone outcome recipient rules", () => {
  it.each(Object.keys(STATES))("matches legacy cohorts for US-%s", (usps) => {
    const code = usps.charCodeAt(0) + usps.charCodeAt(1);
    const person: OutcomeRecipientFacts = {
      age: 1 + (code % 90),
      activeEducationEnrollment: code % 2 === 0,
      hasRecordedEducationEnrollment: code % 3 === 0,
      compulsorySchoolAge: { minimumAge: 5, maximumAge: 18 },
      activeSubstanceUseCondition: code % 4 === 0,
      hasCurrentHouseholdResidence: code % 5 === 0,
      hasSnapEnrolledHousehold: code % 6 === 0,
      hasRecordedWageHousehold: code % 7 === 0,
      completedSchooling: code % 8 === 0,
      hasActiveRenterHousehold: code % 9 === 0,
      hasSnapEnrolledRenterHousehold: code % 10 === 0,
      hasEvictedHouseholdWithoutHome: code % 11 === 0,
      hasActiveLegalMarriage: code % 12 === 0,
      hasRecordedFemaleIdentity: code % 13 === 0,
      hasActiveParentOfYoungChild: code % 14 === 0,
      hasActiveParentOfInfant: code % 15 === 0,
      hasPolicyRestoredVotingRight: code % 16 === 0,
      hasRecordedMedicaidExpansionCoverage: code % 17 === 0,
      hasActivePaydayLoan: code % 18 === 0,
      hasRecordedFarmOperator: code % 19 === 0,
    };
    for (const rule of rules) {
      expect(
        matchesOutcomeRecipientFromFacts(rule, person, cohorts[rule] ?? null),
        `${usps} ${rule}`,
      ).toBe(legacyMatches(rule, person));
    }
  });
});
