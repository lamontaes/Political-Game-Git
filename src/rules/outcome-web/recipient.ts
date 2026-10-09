export type OutcomeRecipientRule =
  | "recorded-school-enrollment-or-compulsory-age-estimate"
  | "infant-mortality-cohort-estimate"
  | "working-age-adult-cohort-estimate"
  | "older-adult-medicare-cohort-estimate"
  | "adult-substance-use-condition-estimate"
  | "youth-cannabis-cohort-estimate"
  | "child-asthma-cohort-estimate"
  | "jurisdiction-resident-estimate"
  | "household-resident-estimate"
  | "snap-enrolled-household-member-estimate"
  | "recorded-wage-family-member-estimate"
  | "adult-school-completer-estimate"
  | "retirement-age-adult-cohort-estimate"
  | "active-renter-household-member-estimate"
  | "snap-enrolled-renter-household-member-estimate"
  | "evicted-household-without-home-member-estimate"
  | "retirement-policy-age-cohort-estimate"
  | "recorded-married-woman-estimate"
  | "recorded-parent-of-young-child-estimate"
  | "recorded-parent-of-infant-estimate"
  | "voting-age-resident-estimate"
  | "recorded-restored-voting-right-estimate"
  | "recorded-medicaid-expansion-recipient-estimate"
  | "recorded-payday-loan-borrower-estimate"
  | "recorded-farm-operator-land-value-estimate"
  | "recorded-farm-operator-resource-estimate";

export interface RecipientAgeRangeFacts {
  readonly minimumAge: number;
  readonly maximumAge: number | null;
}

export interface OutcomeRecipientFacts {
  readonly age: number;
  readonly activeEducationEnrollment: boolean;
  readonly hasRecordedEducationEnrollment: boolean;
  readonly compulsorySchoolAge: {
    readonly minimumAge: number;
    readonly maximumAge: number;
  } | null;
  readonly activeSubstanceUseCondition: boolean;
  readonly hasCurrentHouseholdResidence: boolean;
  readonly hasSnapEnrolledHousehold: boolean;
  readonly hasRecordedWageHousehold: boolean;
  readonly completedSchooling: boolean;
  readonly hasActiveRenterHousehold: boolean;
  readonly hasSnapEnrolledRenterHousehold: boolean;
  readonly hasEvictedHouseholdWithoutHome: boolean;
  readonly hasActiveLegalMarriage: boolean;
  readonly hasRecordedFemaleIdentity: boolean;
  readonly hasActiveParentOfYoungChild: boolean;
  readonly hasActiveParentOfInfant: boolean;
  readonly hasPolicyRestoredVotingRight: boolean;
  readonly hasRecordedMedicaidExpansionCoverage: boolean;
  readonly hasActivePaydayLoan: boolean;
  readonly hasRecordedFarmOperator?: boolean;
}

/** Match selected person facts to an outcome recipient cohort. */
export function matchesOutcomeRecipientFromFacts(
  rule: OutcomeRecipientRule,
  person: OutcomeRecipientFacts,
  cohort: RecipientAgeRangeFacts | null = null,
): boolean {
  switch (rule) {
    case "recorded-school-enrollment-or-compulsory-age-estimate":
      if (person.hasRecordedEducationEnrollment)
        return person.activeEducationEnrollment;
      return (
        person.compulsorySchoolAge !== null &&
        person.age >= person.compulsorySchoolAge.minimumAge &&
        person.age <= person.compulsorySchoolAge.maximumAge
      );
    case "jurisdiction-resident-estimate":
      return true;
    case "household-resident-estimate":
      return person.hasCurrentHouseholdResidence;
    case "snap-enrolled-household-member-estimate":
      return person.hasSnapEnrolledHousehold;
    case "recorded-wage-family-member-estimate":
      return person.hasRecordedWageHousehold;
    case "active-renter-household-member-estimate":
      return person.hasActiveRenterHousehold;
    case "snap-enrolled-renter-household-member-estimate":
      return person.hasSnapEnrolledRenterHousehold;
    case "evicted-household-without-home-member-estimate":
      return person.hasEvictedHouseholdWithoutHome;
    case "recorded-married-woman-estimate":
      return person.hasActiveLegalMarriage && person.hasRecordedFemaleIdentity;
    case "recorded-parent-of-young-child-estimate":
      return person.hasActiveParentOfYoungChild;
    case "recorded-parent-of-infant-estimate":
      return person.hasActiveParentOfInfant;
    case "recorded-restored-voting-right-estimate":
      return person.hasPolicyRestoredVotingRight;
    case "recorded-payday-loan-borrower-estimate":
      return person.hasActivePaydayLoan;
    case "recorded-farm-operator-land-value-estimate":
    case "recorded-farm-operator-resource-estimate":
      return person.hasRecordedFarmOperator === true;
    case "recorded-medicaid-expansion-recipient-estimate":
    case "adult-school-completer-estimate":
      return (
        cohort !== null &&
        (rule !== "adult-school-completer-estimate" ||
          person.completedSchooling) &&
        (rule !== "recorded-medicaid-expansion-recipient-estimate" ||
          person.hasRecordedMedicaidExpansionCoverage) &&
        person.age >= cohort.minimumAge &&
        (cohort.maximumAge === null || person.age <= cohort.maximumAge)
      );
    default:
      return (
        cohort !== null &&
        person.age >= cohort.minimumAge &&
        (cohort.maximumAge === null || person.age <= cohort.maximumAge) &&
        (rule === "adult-substance-use-condition-estimate"
          ? person.activeSubstanceUseCondition
          : true)
      );
  }
}
