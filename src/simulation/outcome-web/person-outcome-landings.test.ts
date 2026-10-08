import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
import recipientAgeCohorts from "../../../data/research/outcome-web/person-recipient-age-cohorts.json" with { type: "json" };
import schoolAges from "../../../data/research/education/compulsory-school-ages-2020.json" with { type: "json" };
import agePlaceholderLedger from "../../../data/research/education/placeholder-ledger.json" with { type: "json" };
import sourceLinks from "../../../data/research/outcome-web/links.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import {
  CLEMENCY_GRANTED_EVENT,
  CLEMENCY_KIND_TAG,
  CLEMENCY_SENTENCE_TAG,
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_KIND_TAG,
  SENTENCE_MONTHS_TAG,
  sentencedPersonOf,
} from "../justice/jail-terms";
import {
  recordVotingRightForSentence,
  RESTORE_VOTING_QUESTION_KEY,
  votingStandingOn,
} from "../justice/voting-standing";
import {
  CONDITION_PACK_ORIGIN,
  holdsPackCondition,
  SUBSTANCE_USE_DISORDER_KEY,
} from "../crisis/condition-pack";
import { appendCrisisRecord } from "../crisis/records";
import { recordSnapParticipation } from "../crisis/snap-participation";
import { currentGovernorOf } from "../crisis/offices";
import { openHouseholdLoan } from "../household-loans";
import {
  createEducationEnrollment,
  createOrganization,
  createPartnership,
  createWorkRelationship,
  recordEducationEnrollmentState,
} from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import {
  LIVED_OUTCOME_REFLECTION_EVENT_TYPE,
  officialViewReflectionHandler,
} from "../living-world/official-views";
import { livedOutcomeReflectionKey } from "../law-exposure";
import { createWorkCompensation, money } from "../resources";
import { RENT_EVENTS } from "../living-world/town-rent";
import { recordWorldEvent } from "../world";
import {
  PLACE_OUTCOME_BASES,
  type PlaceOutcomeRecord,
} from "./place-outcome-store";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  matchesOutcomeRecipientRule,
  outcomeLandingDirection,
  recordPlannedPersonOutcomeLandings,
  type OutcomeRecipientRule,
} from "./person-outcome-landings";
import { smallWorld } from "../../../tests/fixtures/small-world";

const builtLinks = sourceLinks.links.filter((row) => row.status === "built");
const educationLandingPath =
  "src/simulation/outcome-web/person-outcome-landings.ts -> src/simulation/living-world/lived-outcomes.ts -> src/simulation/living-world/official-views.ts";
const plannedEducation = landingPlan.links.filter(
  (row) =>
    row.policyArea === "education" &&
    row.landingPath === educationLandingPath &&
    row.recipientRule !== null,
);
const plannedHealth = landingPlan.links.filter(
  (row) => row.policyArea === "health" && row.recipientRule !== null,
);
const plannedHousehold = landingPlan.links.filter(
  (row) => row.policyArea === "household" && row.recipientRule !== null,
);
const plannedHousing = landingPlan.links.filter(
  (row) => row.policyArea === "housing" && row.recipientRule !== null,
);
const plannedEnvironment = landingPlan.links.filter(
  (row) => row.policyArea === "env" && row.recipientRule !== null,
);
const plannedLabor = landingPlan.links.filter(
  (row) => row.policyArea === "labor" && row.recipientRule !== null,
);
const votingLinkKeys = [
  "graduation-to-turnout",
  "all-mail-voting-to-turnout",
  "automatic-registration-to-turnout",
  "restore-voting-to-turnout",
  "right-to-work-to-turnout",
  "independent-redistricting-to-turnout",
];
const plannedVoting = landingPlan.links.filter((row) =>
  votingLinkKeys.includes(row.key),
);
const plannedFinance = landingPlan.links.filter(
  (row) => row.policyArea === "finance",
);
const plannedTransit = landingPlan.links.filter(
  (row) => row.policyArea === "transit",
);
const compulsorySchoolAges = schoolAges.agesByJurisdictionKey as Readonly<
  Record<
    string,
    {
      readonly minimumAge: number;
      readonly maximumAge: number;
      readonly estimatedFrom: string;
    }
  >
>;
const recipientAgeRanges = recipientAgeCohorts.cohortsByRule as Readonly<
  Record<
    Exclude<
      OutcomeRecipientRule,
      | "recorded-school-enrollment-or-compulsory-age-estimate"
      | "jurisdiction-resident-estimate"
      | "household-resident-estimate"
      | "snap-enrolled-household-member-estimate"
      | "recorded-wage-family-member-estimate"
      | "active-renter-household-member-estimate"
      | "snap-enrolled-renter-household-member-estimate"
      | "evicted-household-without-home-member-estimate"
      | "recorded-married-woman-estimate"
      | "recorded-parent-of-young-child-estimate"
      | "recorded-parent-of-infant-estimate"
      | "recorded-restored-voting-right-estimate"
      | "recorded-payday-loan-borrower-estimate"
    >,
    {
      readonly minimumAge: number;
      readonly maximumAge: number | null;
      readonly estimatedFrom: string;
    }
  >
>;

function recipientAtAge(
  age: number,
  activeSubstanceUseCondition = false,
  householdFacts: {
    readonly hasCurrentHouseholdResidence?: boolean;
    readonly hasSnapEnrolledHousehold?: boolean;
    readonly hasRecordedWageHousehold?: boolean;
    readonly completedSchooling?: boolean;
    readonly hasActiveRenterHousehold?: boolean;
    readonly hasSnapEnrolledRenterHousehold?: boolean;
    readonly hasEvictedHouseholdWithoutHome?: boolean;
    readonly hasActiveLegalMarriage?: boolean;
    readonly hasRecordedFemaleIdentity?: boolean;
    readonly hasActiveParentOfYoungChild?: boolean;
    readonly hasActiveParentOfInfant?: boolean;
    readonly hasPolicyRestoredVotingRight?: boolean;
    readonly hasRecordedMedicaidExpansionCoverage?: boolean;
    readonly hasActivePaydayLoan?: boolean;
  } = {},
) {
  return {
    age,
    activeEducationEnrollment: false,
    hasRecordedEducationEnrollment: false,
    compulsorySchoolAge: null,
    activeSubstanceUseCondition,
    hasCurrentHouseholdResidence:
      householdFacts.hasCurrentHouseholdResidence ?? false,
    hasSnapEnrolledHousehold: householdFacts.hasSnapEnrolledHousehold ?? false,
    hasRecordedWageHousehold: householdFacts.hasRecordedWageHousehold ?? false,
    completedSchooling: householdFacts.completedSchooling ?? false,
    hasActiveRenterHousehold: householdFacts.hasActiveRenterHousehold ?? false,
    hasSnapEnrolledRenterHousehold:
      householdFacts.hasSnapEnrolledRenterHousehold ?? false,
    hasEvictedHouseholdWithoutHome:
      householdFacts.hasEvictedHouseholdWithoutHome ?? false,
    hasActiveLegalMarriage: householdFacts.hasActiveLegalMarriage ?? false,
    hasRecordedFemaleIdentity:
      householdFacts.hasRecordedFemaleIdentity ?? false,
    hasActiveParentOfYoungChild:
      householdFacts.hasActiveParentOfYoungChild ?? false,
    hasActiveParentOfInfant: householdFacts.hasActiveParentOfInfant ?? false,
    hasPolicyRestoredVotingRight:
      householdFacts.hasPolicyRestoredVotingRight ?? false,
    hasRecordedMedicaidExpansionCoverage:
      householdFacts.hasRecordedMedicaidExpansionCoverage ?? false,
    hasActivePaydayLoan: householdFacts.hasActivePaydayLoan ?? false,
  };
}

describe("the outcome landing plan", () => {
  it("tracks every built link once from the audit through the candidate status", () => {
    expect(landingPlan.links.map((row) => row.key)).toEqual(
      builtLinks.map((row) => row.key),
    );
    expect(landingPlan.audit.builtLinkCount).toBe(101);
    expect(landingPlan.audit.statusCounts).toEqual({
      "person-linked": 18,
      "budget-only": 4,
      "place-number-only": 77,
      "no-live-consumer": 2,
    });
    expect(landingPlan.sourceSnapshot.statusCounts).toEqual({
      "person-linked": 21,
      "budget-only": 4,
      "place-number-only": 74,
      "no-live-consumer": 2,
    });
    expect(landingPlan.currentStatusCounts).toEqual({
      "person-linked": 85,
      "budget-only": 4,
      "place-number-only": 10,
      "no-live-consumer": 2,
    });
  });

  it("routes every health link through the shared person path with evidence", () => {
    expect(plannedHealth).toHaveLength(10);
    expect(
      plannedHealth.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          row.outcomeDirection === "higher-is-worse" &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    expect(plannedHealth.map((row) => row.key).sort()).toEqual(
      [
        "abortion-ban-to-infant-deaths",
        "cannabis-sales-to-overdose-deaths",
        "cannabis-sales-to-youth-use",
        "drug-negotiation-to-out-of-pocket",
        "gas-hookup-ban-to-child-asthma",
        "harm-reduction-to-overdose-deaths",
        "medicaid-expansion-to-coverage",
        "particles-to-infant-deaths",
        "unemployment-to-uninsured",
        "work-requirement-to-coverage",
      ].sort(),
    );
  });

  it("routes all ten household estimates through the shared person path", () => {
    expect(plannedHousehold).toHaveLength(10);
    expect(
      plannedHousehold.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          row.outcomeDirection === "higher-is-worse" &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    expect(plannedHousehold.map((row) => row.key).sort()).toEqual(
      [
        "federal-minimum-wage-to-poverty",
        "grocery-exemption-to-food-insecurity",
        "graduation-to-poverty",
        "licensing-reform-to-poverty",
        "minimum-wage-to-poverty",
        "poor-roads-to-prices",
        "retirement-age-to-poverty",
        "snap-to-food-insecurity",
        "tariffs-to-prices",
        "unemployment-to-poverty",
      ].sort(),
    );
  });

  it("routes all seven housing estimates through the shared person path", () => {
    expect(plannedHousing).toHaveLength(7);
    expect(
      plannedHousing.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    const directions = new Map(
      plannedHousing.map((row) => [row.key, row.outcomeDirection]),
    );
    expect(Object.fromEntries(directions)).toEqual({
      "rent-control-to-rental-supply": "higher-is-better",
      "rent-control-to-tenant-stays": "higher-is-worse",
      "housing-by-right-to-new-buildings": "higher-is-better",
      "housing-first-to-homelessness": "higher-is-worse",
      "housing-vouchers-to-homelessness": "higher-is-worse",
      "by-right-permitting-to-homelessness": "higher-is-worse",
      "housing-preemption-to-homelessness": "higher-is-worse",
    });
  });

  it("routes all six environmental place estimates through the shared person path", () => {
    expect(plannedEnvironment).toHaveLength(6);
    expect(
      plannedEnvironment.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          row.recipientRule === "jurisdiction-resident-estimate" &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    const directions = new Map(
      plannedEnvironment.map((row) => [row.key, row.outcomeDirection]),
    );
    expect(Object.fromEntries(directions)).toEqual({
      "carbon-price-to-emissions": "higher-is-worse",
      "container-deposit-to-recycling": "higher-is-better",
      "power-plant-carbon-to-emissions": "higher-is-worse",
      "power-plant-carbon-to-particulates": "higher-is-worse",
      "clean-electricity-to-particulates": "higher-is-worse",
      "carbon-price-to-particulates": "higher-is-worse",
    });
  });

  it("routes all six labor estimates through the shared person path", () => {
    expect(plannedLabor).toHaveLength(6);
    expect(
      plannedLabor.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    const rules = new Map(
      plannedLabor.map((row) => [row.key, row.recipientRule]),
    );
    expect(Object.fromEntries(rules)).toEqual({
      "broadband-to-married-women-work": "recorded-married-woman-estimate",
      "universal-childcare-to-mothers-work":
        "recorded-parent-of-young-child-estimate",
      "paid-leave-to-mothers-work": "recorded-parent-of-infant-estimate",
      "retirement-age-to-older-work": "retirement-policy-age-cohort-estimate",
      "public-bargaining-to-earnings": "jurisdiction-resident-estimate",
      "defense-contracts-to-earnings": "jurisdiction-resident-estimate",
    });
    const directions = new Map(
      plannedLabor.map((row) => [row.key, row.outcomeDirection]),
    );
    expect(Object.fromEntries(directions)).toEqual({
      "broadband-to-married-women-work": "higher-is-better",
      "universal-childcare-to-mothers-work": "higher-is-better",
      "paid-leave-to-mothers-work": "higher-is-better",
      "retirement-age-to-older-work": "higher-is-better",
      "public-bargaining-to-earnings": "higher-is-better",
      "defense-contracts-to-earnings": "higher-is-better",
    });
  });

  it("routes all six voting estimates through the shared person path", () => {
    expect(plannedVoting).toHaveLength(6);
    expect(plannedVoting.map((row) => row.key).sort()).toEqual(
      [...votingLinkKeys].sort(),
    );
    expect(
      plannedVoting.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    const rules = new Map(
      plannedVoting.map((row) => [row.key, row.recipientRule]),
    );
    expect(Object.fromEntries(rules)).toEqual({
      "graduation-to-turnout": "adult-school-completer-estimate",
      "all-mail-voting-to-turnout": "voting-age-resident-estimate",
      "automatic-registration-to-turnout": "voting-age-resident-estimate",
      "restore-voting-to-turnout": "recorded-restored-voting-right-estimate",
      "right-to-work-to-turnout": "voting-age-resident-estimate",
      "independent-redistricting-to-turnout": "voting-age-resident-estimate",
    });
    expect(
      Object.fromEntries(
        plannedVoting.map((row) => [row.key, row.outcomeDirection]),
      ),
    ).toEqual({
      "graduation-to-turnout": "higher-is-better",
      "all-mail-voting-to-turnout": "higher-is-better",
      "automatic-registration-to-turnout": "higher-is-better",
      "restore-voting-to-turnout": "higher-is-better",
      "right-to-work-to-turnout": "higher-is-better",
      "independent-redistricting-to-turnout": "higher-is-better",
    });
    expect(
      recipientAgeRanges["voting-age-resident-estimate"].estimatedFrom,
    ).toContain("Amendment XXVI");
  });

  it("routes the three finance estimates through recorded coverage and loan facts", () => {
    expect(plannedFinance).toHaveLength(3);
    expect(
      plannedFinance.every(
        (row) =>
          row.currentStatus === "person-linked" &&
          row.landingPath === educationLandingPath &&
          typeof row.estimatedFrom === "string" &&
          row.estimatedFrom.length > 0,
      ),
    ).toBe(true);
    expect(
      Object.fromEntries(
        plannedFinance.map((row) => [row.key, row.recipientRule]),
      ),
    ).toEqual({
      "medicaid-expansion-to-medical-debt":
        "recorded-medicaid-expansion-recipient-estimate",
      "loan-rate-cap-to-high-cost-borrowing":
        "recorded-payday-loan-borrower-estimate",
      "federal-loan-cap-to-high-cost-loans":
        "recorded-payday-loan-borrower-estimate",
    });
    expect(
      plannedFinance.every((row) => row.outcomeDirection === "higher-is-worse"),
    ).toBe(true);
    expect(
      recipientAgeRanges["recorded-medicaid-expansion-recipient-estimate"]
        .estimatedFrom,
    ).toContain("42 C.F.R. § 435.119");
  });

  it("routes the three transit opportunities through the shared resident estimate", () => {
    expect(plannedTransit.map((row) => row.key).sort()).toEqual(
      [
        "fare-free-transit-to-ridership",
        "highway-money-for-transit-to-service",
        "transit-service-to-ridership",
      ].sort(),
    );
    for (const row of plannedTransit) {
      expect(row.currentStatus).toBe("person-linked");
      expect(row.landingPath).toBe(educationLandingPath);
      expect(row.recipientRule).toBe("jurisdiction-resident-estimate");
      expect(row.outcomeDirection).toBe("higher-is-better");
      expect(row.estimatedFrom).toContain(
        "recipient estimate: FTA National Transit Database 2024",
      );
      expect(row.estimatedFrom).toContain("individual trips");
    }
  });

  it.each(lifePlaceStateIdentities())(
    "has transit rates and the shared recipient estimate for %s",
    (place) => {
      for (const row of plannedTransit) {
        const base = PLACE_OUTCOME_BASES[row.outcome];
        expect(base?.source).toContain("FTA National Transit Database 2024");
        expect(Number.isFinite(base?.places[place.jurisdictionKey])).toBe(true);
        expect(
          matchesOutcomeRecipientRule(
            row.recipientRule as OutcomeRecipientRule,
            recipientAtAge(0),
          ),
        ).toBe(true);
      }
    },
  );

  it.each(lifePlaceStateIdentities())(
    "uses the same voting recipients in %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const adult = recipientAgeRanges["voting-age-resident-estimate"];
      expect(
        matchesOutcomeRecipientRule(
          "voting-age-resident-estimate",
          recipientAtAge(adult.minimumAge),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          "voting-age-resident-estimate",
          recipientAtAge(adult.minimumAge - 1),
        ),
      ).toBe(false);
      const graduate = plannedVoting.find(
        (row) => row.key === "graduation-to-turnout",
      )?.recipientRule as OutcomeRecipientRule;
      expect(
        matchesOutcomeRecipientRule(
          graduate,
          recipientAtAge(
            recipientAgeRanges["adult-school-completer-estimate"].minimumAge,
            false,
            { completedSchooling: true },
          ),
        ),
      ).toBe(true);
      const restoration = plannedVoting.find(
        (row) => row.key === "restore-voting-to-turnout",
      )?.recipientRule as OutcomeRecipientRule;
      expect(
        matchesOutcomeRecipientRule(
          restoration,
          recipientAtAge(30, false, {
            hasPolicyRestoredVotingRight: true,
          }),
        ),
      ).toBe(true);
      expect(matchesOutcomeRecipientRule(restoration, recipientAtAge(30))).toBe(
        false,
      );
    },
  );

  it.each(lifePlaceStateIdentities())(
    "uses recorded finance recipients in %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const medicaid =
        recipientAgeRanges["recorded-medicaid-expansion-recipient-estimate"];
      expect(
        matchesOutcomeRecipientRule(
          "recorded-medicaid-expansion-recipient-estimate",
          recipientAtAge(medicaid.minimumAge, false, {
            hasRecordedMedicaidExpansionCoverage: true,
          }),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          "recorded-medicaid-expansion-recipient-estimate",
          recipientAtAge(medicaid.minimumAge - 1, false, {
            hasRecordedMedicaidExpansionCoverage: true,
          }),
        ),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          "recorded-medicaid-expansion-recipient-estimate",
          recipientAtAge(medicaid.minimumAge, false),
        ),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          "recorded-payday-loan-borrower-estimate",
          recipientAtAge(30, false, { hasActivePaydayLoan: true }),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          "recorded-payday-loan-borrower-estimate",
          recipientAtAge(30),
        ),
      ).toBe(false);
    },
  );

  it.each(lifePlaceStateIdentities())(
    "uses recorded family facts and the same labor estimates in %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const rule = (key: string) =>
        plannedLabor.find((row) => row.key === key)
          ?.recipientRule as OutcomeRecipientRule;
      const marriedWoman = recipientAtAge(40, false, {
        hasActiveLegalMarriage: true,
        hasRecordedFemaleIdentity: true,
      });
      expect(
        matchesOutcomeRecipientRule(
          rule("broadband-to-married-women-work"),
          marriedWoman,
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("broadband-to-married-women-work"),
          recipientAtAge(40, false, { hasActiveLegalMarriage: true }),
        ),
      ).toBe(false);
      const parent = recipientAtAge(30, false, {
        hasActiveParentOfYoungChild: true,
        hasActiveParentOfInfant: true,
      });
      expect(
        matchesOutcomeRecipientRule(
          rule("universal-childcare-to-mothers-work"),
          parent,
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule("paid-leave-to-mothers-work"), parent),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("paid-leave-to-mothers-work"),
          recipientAtAge(30, false, { hasActiveParentOfYoungChild: true }),
        ),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          rule("public-bargaining-to-earnings"),
          recipientAtAge(0),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("defense-contracts-to-earnings"),
          recipientAtAge(100),
        ),
      ).toBe(true);
      const retirement =
        recipientAgeRanges["retirement-policy-age-cohort-estimate"];
      expect(retirement.estimatedFrom).toContain("Mastrobuoni 2009");
      expect(
        matchesOutcomeRecipientRule(
          rule("retirement-age-to-older-work"),
          recipientAtAge(retirement.minimumAge),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("retirement-age-to-older-work"),
          recipientAtAge(retirement.maximumAge! + 1),
        ),
      ).toBe(false);
    },
  );

  it.each(lifePlaceStateIdentities())(
    "applies the jurisdiction-average environmental recipient rule in %s",
    (place) => {
      expect(place.jurisdictionKey).toBeTruthy();
      expect(
        matchesOutcomeRecipientRule(
          "jurisdiction-resident-estimate",
          recipientAtAge(0),
        ),
      ).toBe(true);
    },
  );

  it.each(
    Object.entries(recipientAgeRanges) as [
      Exclude<
        OutcomeRecipientRule,
        "recorded-school-enrollment-or-compulsory-age-estimate"
      >,
      (typeof recipientAgeRanges)[string],
    ][],
  )("matches the sourced %s age cohort", (rule, range) => {
    expect(range.estimatedFrom.length).toBeGreaterThan(0);
    if (rule === "adult-school-completer-estimate") {
      expect(
        matchesOutcomeRecipientRule(
          rule,
          recipientAtAge(range.minimumAge, false, {
            completedSchooling: true,
          }),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule,
          recipientAtAge(range.minimumAge - 1, false, {
            completedSchooling: true,
          }),
        ),
      ).toBe(false);
      return;
    }
    if (rule === "adult-substance-use-condition-estimate") {
      expect(
        matchesOutcomeRecipientRule(rule, recipientAtAge(range.minimumAge)),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          rule,
          recipientAtAge(range.minimumAge, true),
        ),
      ).toBe(true);
      return;
    }
    if (rule === "recorded-medicaid-expansion-recipient-estimate") {
      expect(
        matchesOutcomeRecipientRule(
          rule,
          recipientAtAge(range.minimumAge, false, {
            hasRecordedMedicaidExpansionCoverage: true,
          }),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule, recipientAtAge(range.minimumAge)),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          rule,
          recipientAtAge(range.minimumAge - 1, false, {
            hasRecordedMedicaidExpansionCoverage: true,
          }),
        ),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          rule,
          recipientAtAge(range.maximumAge!, false, {
            hasRecordedMedicaidExpansionCoverage: true,
          }),
        ),
      ).toBe(true);
      return;
    }
    expect(
      matchesOutcomeRecipientRule(rule, recipientAtAge(range.minimumAge)),
    ).toBe(true);
    expect(
      matchesOutcomeRecipientRule(rule, recipientAtAge(range.minimumAge - 1)),
    ).toBe(false);
    if (range.maximumAge !== null) {
      expect(
        matchesOutcomeRecipientRule(rule, recipientAtAge(range.maximumAge)),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule, recipientAtAge(range.maximumAge + 1)),
      ).toBe(false);
    }
  });

  it.each(lifePlaceStateIdentities())(
    "uses recorded enrollment or sourced attendance ages for %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const ages = compulsorySchoolAges[place.jurisdictionKey];
      if (!ages) throw new Error(`No compulsory school age for ${place.name}.`);
      expect(ages.estimatedFrom).toContain("NCES");
      const rule = plannedEducation[0]?.recipientRule as OutcomeRecipientRule;
      const withoutEnrollment = {
        activeEducationEnrollment: false,
        hasRecordedEducationEnrollment: false,
        compulsorySchoolAge: ages,
        activeSubstanceUseCondition: false,
        hasCurrentHouseholdResidence: false,
        hasSnapEnrolledHousehold: false,
        hasRecordedWageHousehold: false,
        completedSchooling: false,
        hasActiveRenterHousehold: false,
        hasSnapEnrolledRenterHousehold: false,
        hasEvictedHouseholdWithoutHome: false,
        hasActiveLegalMarriage: false,
        hasRecordedFemaleIdentity: false,
        hasActiveParentOfYoungChild: false,
        hasActiveParentOfInfant: false,
        hasPolicyRestoredVotingRight: false,
      };
      expect(
        matchesOutcomeRecipientRule(rule, {
          ...withoutEnrollment,
          age: ages.minimumAge,
        }),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule, {
          ...withoutEnrollment,
          age: ages.minimumAge - 1,
        }),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(rule, {
          ...withoutEnrollment,
          age: ages.maximumAge + 1,
        }),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(rule, {
          ...withoutEnrollment,
          age: ages.maximumAge + 1,
          activeEducationEnrollment: true,
          hasRecordedEducationEnrollment: true,
        }),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule, {
          ...withoutEnrollment,
          age: ages.minimumAge,
          hasRecordedEducationEnrollment: true,
        }),
      ).toBe(false);
    },
  );

  it("uses one sourced enrollment rule for all 13 education links", () => {
    expect(plannedEducation).toHaveLength(13);
    expect(new Set(plannedEducation.map((row) => row.recipientRule))).toEqual(
      new Set(["recorded-school-enrollment-or-compulsory-age-estimate"]),
    );
    expect(
      plannedEducation.every(
        (row) => row.estimatedFrom && row.currentStatus === "person-linked",
      ),
    ).toBe(true);
    expect(Object.keys(compulsorySchoolAges)).toHaveLength(56);
    expect(agePlaceholderLedger.entries[0]?.jurisdictionKeys).toEqual([
      "US-AS",
      "US-GU",
      "US-MP",
      "US-PR",
      "US-VI",
    ]);
  });

  it.each(lifePlaceStateIdentities())(
    "uses the same health cohorts and gain-cost rules for %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const youth = recipientAtAge(
        recipientAgeRanges["youth-cannabis-cohort-estimate"].minimumAge,
      );
      const eligibleHealthLinks = plannedHealth
        .filter((row) =>
          matchesOutcomeRecipientRule(
            row.recipientRule as OutcomeRecipientRule,
            youth,
          ),
        )
        .map((row) => row.key)
        .sort();
      expect(eligibleHealthLinks).toEqual([
        "cannabis-sales-to-youth-use",
        "gas-hookup-ban-to-child-asthma",
      ]);
      expect(outcomeLandingDirection(1, 1.01, "higher-is-better")).toBe("gain");
      expect(outcomeLandingDirection(1, 0.99, "higher-is-better")).toBe("cost");
      expect(outcomeLandingDirection(1, 1.01, "higher-is-worse")).toBe("cost");
      expect(outcomeLandingDirection(1, 0.99, "higher-is-worse")).toBe("gain");
    },
  );

  it.each(lifePlaceStateIdentities())(
    "matches the same household recipient rules for %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const rule = (key: string) =>
        plannedHousehold.find((row) => row.key === key)
          ?.recipientRule as OutcomeRecipientRule;
      const resident = recipientAtAge(30, false, {
        hasCurrentHouseholdResidence: true,
        hasSnapEnrolledHousehold: true,
        hasRecordedWageHousehold: true,
        completedSchooling: true,
      });
      expect(
        matchesOutcomeRecipientRule(rule("snap-to-food-insecurity"), resident),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule("minimum-wage-to-poverty"), resident),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(rule("tariffs-to-prices"), resident),
      ).toBe(true);
      const adult = recipientAgeRanges["adult-school-completer-estimate"];
      expect(adult.estimatedFrom).toContain("Census Bureau");
      expect(
        matchesOutcomeRecipientRule(
          rule("graduation-to-poverty"),
          recipientAtAge(adult.minimumAge, false, {
            completedSchooling: true,
          }),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("graduation-to-poverty"),
          recipientAtAge(adult.minimumAge - 1, false, {
            completedSchooling: true,
          }),
        ),
      ).toBe(false);
      const retirement =
        recipientAgeRanges["retirement-age-adult-cohort-estimate"];
      expect(retirement.estimatedFrom).toContain("20 CFR 404.410");
      expect(
        matchesOutcomeRecipientRule(
          rule("retirement-age-to-poverty"),
          recipientAtAge(retirement.minimumAge),
        ),
      ).toBe(true);
    },
  );

  it.each(lifePlaceStateIdentities())(
    "matches the same housing recipient rules for %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
      const rule = (key: string) =>
        plannedHousing.find((row) => row.key === key)
          ?.recipientRule as OutcomeRecipientRule;
      const activeRenter = recipientAtAge(35, false, {
        hasCurrentHouseholdResidence: true,
        hasActiveRenterHousehold: true,
        hasSnapEnrolledRenterHousehold: true,
      });
      expect(
        matchesOutcomeRecipientRule(
          rule("rent-control-to-rental-supply"),
          activeRenter,
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("housing-vouchers-to-homelessness"),
          activeRenter,
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("housing-vouchers-to-homelessness"),
          recipientAtAge(35, false, {
            hasCurrentHouseholdResidence: true,
            hasActiveRenterHousehold: true,
          }),
        ),
      ).toBe(false);
      expect(
        matchesOutcomeRecipientRule(
          rule("housing-first-to-homelessness"),
          recipientAtAge(35, false, {
            hasCurrentHouseholdResidence: true,
            hasEvictedHouseholdWithoutHome: true,
          }),
        ),
      ).toBe(true);
      expect(
        matchesOutcomeRecipientRule(
          rule("housing-by-right-to-new-buildings"),
          recipientAtAge(35, false, {
            hasCurrentHouseholdResidence: true,
          }),
        ),
      ).toBe(true);
    },
  );
});

describe("a named education outcome landing", () => {
  it("records an estimated student outcome and schedules the official view reflection", () => {
    const fixture = smallWorld({
      place: "OH",
      date: "2026-01-01",
      offices: ["governor"],
      seed: "ow-spine-education-one-week",
    });
    const personId = fixture.world.personOrder.find(
      (id) => id !== fixture.personId,
    );
    if (!personId) throw new Error("The seeded world needs another resident.");
    const healthPersonId = fixture.world.personOrder.find((id) => {
      if (id === fixture.personId || id === personId) return false;
      const resident = fixture.world.people[id];
      if (!resident) return false;
      const age = ageOnDate(resident.birthDate, fixture.world.currentDate);
      return (
        matchesOutcomeRecipientRule(
          "working-age-adult-cohort-estimate",
          recipientAtAge(age),
        ) && !holdsPackCondition(fixture.world, id, SUBSTANCE_USE_DISORDER_KEY)
      );
    });
    if (!healthPersonId)
      throw new Error("The seeded world needs a working-age adult.");
    const unconditionedAdultId = fixture.world.personOrder.find((id) => {
      if (id === healthPersonId) return false;
      const resident = fixture.world.people[id];
      if (!resident) return false;
      const age = ageOnDate(resident.birthDate, fixture.world.currentDate);
      return (
        matchesOutcomeRecipientRule(
          "working-age-adult-cohort-estimate",
          recipientAtAge(age),
        ) && !holdsPackCondition(fixture.world, id, SUBSTANCE_USE_DISORDER_KEY)
      );
    });
    if (!unconditionedAdultId)
      throw new Error("The seeded world needs another working-age adult.");
    const state = stateJurisdictionForKey("US-OH");
    if (!state) throw new Error("Ohio's state jurisdiction must be present.");
    const month = makeIsoDate("2026-01-01");
    const provenance = {
      kind: "authored" as const,
      note: "A seeded education landing test record.",
    };
    const withSchool = createOrganization(fixture.world, {
      stableKey: "ow-spine-education-test:school",
      formedAt: fixture.world.currentDate,
      provenance,
      initialProfile: {
        name: "Education outcome test school",
        classification: "service:school",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    const schoolId = withSchool.history.organizations.at(-1)!.id;
    const enrolled = createEducationEnrollment(withSchool, {
      stableKey: "ow-spine-education-test:enrollment",
      personId,
      organizationId: schoolId,
      startedAt: withSchool.currentDate,
      programKind: "schooling:general",
      contextKind: "stage:school",
      provenance,
    });
    const outcome: PlaceOutcomeRecord = {
      measure: "school.spending-per-student",
      placeKey: "US-OH",
      jurisdictionId: state.id,
      month,
      base: 11000,
      structural: 11000,
      multiplier: 1.07,
      value: 11770,
      causes: [{ key: "equalized-funding-to-spending", factor: 1.07 }],
    };
    const healthOutcome: PlaceOutcomeRecord = {
      measure: "health.uninsured-pct",
      placeKey: "US-OH",
      jurisdictionId: state.id,
      month,
      base: 8,
      structural: 8,
      multiplier: 1.04,
      value: 8.32,
      causes: [{ key: "work-requirement-to-coverage", factor: 1.04 }],
    };
    const overdoseOutcome: PlaceOutcomeRecord = {
      measure: "health.overdose-deaths",
      placeKey: "US-OH",
      jurisdictionId: state.id,
      month,
      base: 18,
      structural: 18,
      multiplier: 1.05,
      value: 18.9,
      causes: [
        { key: "harm-reduction-to-overdose-deaths", factor: 1.04 },
        { key: "cannabis-sales-to-overdose-deaths", factor: 1.05 },
      ],
    };
    const withSubstanceUseCondition = appendCrisisRecord(enrolled, {
      kind: "health-episode",
      stableKey: "ow-spine-health-test:substance-use-condition",
      effectiveAt: month,
      causalParentIds: [],
      visibility: "private",
      eventId: null,
      personId: healthPersonId,
      label: "condition",
      conditionKey: SUBSTANCE_USE_DISORDER_KEY,
      severity: "chronic",
      origin: CONDITION_PACK_ORIGIN,
      hazardMultiplierMicros: 1_000_000,
      hazardBasis: "Seeded test condition.",
      course: [],
    });
    const world = {
      ...withSubstanceUseCondition,
      placeOutcomes: {
        months: [{ month, records: [outcome, healthOutcome, overdoseOutcome] }],
      },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const landing = landed.placeOutcomes?.landings?.find(
      (row) =>
        row.personId === personId &&
        row.linkKey === "equalized-funding-to-spending",
    );
    expect(landing).toMatchObject({
      personId,
      linkKey: "equalized-funding-to-spending",
      measure: "school.spending-per-student",
      outcomeRecordId: `place-outcome:${state.id}:school.spending-per-student:${month}`,
      direction: "gain",
      estimatedFrom: expect.any(String),
    });
    const governor = currentGovernorOf(landed, "OH");
    expect(landing?.answeringPersonId).toBe(governor?.personId);
    const healthLanding = landed.placeOutcomes?.landings?.find(
      (row) =>
        row.personId === healthPersonId &&
        row.linkKey === "work-requirement-to-coverage",
    );
    expect(healthLanding).toMatchObject({
      measure: "health.uninsured-pct",
      recipientRule: "working-age-adult-cohort-estimate",
      direction: "cost",
      estimatedFrom: expect.any(String),
    });
    const substanceUseLandings = landed.placeOutcomes?.landings?.filter(
      (row) =>
        row.personId === healthPersonId &&
        [
          "harm-reduction-to-overdose-deaths",
          "cannabis-sales-to-overdose-deaths",
        ].includes(row.linkKey),
    );
    expect(substanceUseLandings).toHaveLength(2);
    expect(
      landed.placeOutcomes?.landings?.some(
        (row) =>
          row.personId === unconditionedAdultId &&
          [
            "harm-reduction-to-overdose-deaths",
            "cannabis-sales-to-overdose-deaths",
          ].includes(row.linkKey),
      ),
    ).toBe(false);

    const reflectionKey = livedOutcomeReflectionKey(personId, landing!.id);
    const due = landed.history.futureDueItems.find(
      (row) => row.stableKey === reflectionKey,
    );
    expect(due).toBeDefined();
    const healthReflectionKey = livedOutcomeReflectionKey(
      healthPersonId,
      healthLanding!.id,
    );
    const healthDue = landed.history.futureDueItems.find(
      (row) => row.stableKey === healthReflectionKey,
    );
    expect(healthDue).toBeDefined();
    const reflected = officialViewReflectionHandler(landed, due!).world;
    expect(
      reflected.history.events.some(
        (event) =>
          event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE &&
          event.tags.includes(`lived-outcome-source:${landing!.id}`),
      ),
    ).toBe(true);
    const healthReflected = officialViewReflectionHandler(
      reflected,
      healthDue!,
    ).world;
    expect(
      healthReflected.history.events.some(
        (event) =>
          event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE &&
          event.tags.includes(`lived-outcome-source:${healthLanding!.id}`),
      ),
    ).toBe(true);
    expect(
      reflected.history.decisionTraces.some((trace) =>
        trace.context.considerations.some((consideration) =>
          consideration.sourceRefs.some(
            (reference) =>
              reference.kind === "place-outcome" &&
              reference.outcomeRecordId === landing!.outcomeRecordId,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      healthReflected.history.decisionTraces.some((trace) =>
        trace.context.considerations.some((consideration) =>
          consideration.sourceRefs.some(
            (reference) =>
              reference.kind === "place-outcome" &&
              reference.outcomeRecordId === healthLanding!.outcomeRecordId,
          ),
        ),
      ),
    ).toBe(true);
  });
});

describe("a named voting outcome landing", () => {
  it("routes graduates and policy-restored voters through official reflection", () => {
    const fixture = smallWorld({
      place: "TN",
      date: "2026-01-01",
      people: 12,
      offices: ["governor"],
      laws: [RESTORE_VOTING_QUESTION_KEY],
      seed: "ow-spine-voting-recorded-recipients",
    });
    const month = makeIsoDate("2026-01-01");
    const state = stateJurisdictionForKey("US-TN");
    if (!state) throw new Error("Tennessee's state jurisdiction must exist.");
    const adultMinimumAge =
      recipientAgeRanges["voting-age-resident-estimate"].minimumAge;
    const restoredVoterId = fixture.world.personOrder.find((personId) => {
      if (personId === fixture.personId) return false;
      const person = fixture.world.people[personId];
      return person && ageOnDate(person.birthDate, month) >= adultMinimumAge;
    });
    if (!restoredVoterId)
      throw new Error("The seeded world needs an adult resident.");
    const pardonedResidentId = fixture.world.personOrder.find((personId) => {
      if (personId === fixture.personId || personId === restoredVoterId)
        return false;
      const person = fixture.world.people[personId];
      return person && ageOnDate(person.birthDate, month) >= adultMinimumAge;
    });
    if (!pardonedResidentId)
      throw new Error("The seeded world needs a second adult resident.");

    const provenance = {
      kind: "authored" as const,
      note: "A seeded voting landing test record.",
    };
    const enrollmentStart = makeIsoDate("2025-01-01");
    let world = fixture.world;
    const school = createOrganization(world, {
      stableKey: "ow-spine-voting-test:school",
      formedAt: enrollmentStart,
      provenance,
      initialProfile: {
        name: "Voting outcome test school",
        classification: "service:school",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    world = createEducationEnrollment(school, {
      stableKey: "ow-spine-voting-test:graduation",
      personId: restoredVoterId,
      organizationId: school.history.organizations.at(-1)!.id,
      startedAt: enrollmentStart,
      programKind: "schooling:general",
      contextKind: "stage:school",
      provenance,
    });
    const enrollmentId = world.history.educationEnrollments.at(-1)!.id;
    const initialEnrollmentState =
      world.history.educationEnrollmentStates.at(-1)!;
    world = recordEducationEnrollmentState(world, {
      stableKey: "ow-spine-voting-test:graduation:completed",
      enrollmentId,
      supersedesStateId: initialEnrollmentState.id,
      effectiveAt: month,
      status: "completed",
      contextKind: "stage:school",
      reason: "The seeded resident completed the recorded program.",
      provenance,
    });

    const propositionId = fixture.propositionIds[RESTORE_VOTING_QUESTION_KEY];
    if (!propositionId)
      throw new Error("The restore-voting policy question must be loaded.");
    const measureId = "measure_ow_spine_voting_restore" as EntityId;
    const sequence = world.history.nextSequence;
    const measure: LegislativeMeasureRecord = {
      id: measureId,
      stableKey: "ow-spine-voting-test:restoration-law",
      sequence,
      jurisdictionId: state.id,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Voting Rights Restoration Act",
      summary: "A seeded restoration law.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2025-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    };
    const enactment: LegislativeEnactmentRecord = {
      id: "enactment_ow_spine_voting_restore" as EntityId,
      stableKey: "ow-spine-voting-test:restoration-law:enactment",
      sequence: sequence + 1,
      measureId,
      resolvedAt: makeIsoDate("2025-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2025-07-05"),
      outcomeEventId: "event_ow_spine_voting_restore" as EntityId,
    };
    world = {
      ...world,
      history: {
        ...world.history,
        nextSequence: sequence + 2,
        legislativeMeasures: [
          ...(world.history.legislativeMeasures ?? []),
          measure,
        ],
        legislativeEnactments: [
          ...(world.history.legislativeEnactments ?? []),
          enactment,
        ],
      },
    };
    const recordExpiredSentence = (
      source: World,
      personId: EntityId,
      stableKey: string,
      occurredAt: string,
    ) => {
      const sentenced = recordWorldEvent(source, {
        stableKey,
        type: PROSECUTION_SENTENCED_EVENT,
        occurredAt: makeIsoDate(occurredAt),
        recordedAt: month,
        jurisdictionId: state.id,
        involvedEntityIds: [personId],
        participants: [{ personId, role: "focus:defendant", detail: null }],
        personFactConstraints: [],
        visibility: "public",
        tags: [`${SENTENCE_KIND_TAG}jail`, `${SENTENCE_MONTHS_TAG}18`],
        summary: "A seeded felony sentence ended before the current month.",
        context: {
          location: null,
          socialContext: "Controlled voting fixture",
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const sentence = sentenced.history.events.at(-1)!;
      expect(sentencedPersonOf(sentence)).toBe(personId);
      return recordVotingRightForSentence(sentenced, sentence.id);
    };
    world = recordExpiredSentence(
      world,
      restoredVoterId,
      "ow-spine-voting-test:expired-felony-sentence",
      "2024-01-05",
    );
    world = recordExpiredSentence(
      world,
      pardonedResidentId,
      "ow-spine-voting-test:pardoned-felony-sentence",
      "2024-01-10",
    );
    const pardonSentenceId = world.history.events.find(
      (event) =>
        event.type === PROSECUTION_SENTENCED_EVENT &&
        event.participants.some(
          (participant) => participant.personId === pardonedResidentId,
        ),
    )!.id;
    world = recordWorldEvent(world, {
      stableKey: "ow-spine-voting-test:pardon",
      type: CLEMENCY_GRANTED_EVENT,
      occurredAt: makeIsoDate("2025-01-10"),
      recordedAt: month,
      jurisdictionId: state.id,
      involvedEntityIds: [pardonedResidentId],
      participants: [
        {
          personId: pardonedResidentId,
          role: "impact:recipient",
          detail: null,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `${CLEMENCY_SENTENCE_TAG}${pardonSentenceId}`,
        `${CLEMENCY_KIND_TAG}pardon`,
      ],
      summary: "A seeded pardon returned voting rights.",
      context: {
        location: null,
        socialContext: "Controlled voting fixture",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(votingStandingOn(world, pardonedResidentId, month).standing).toBe(
      "restored",
    );

    const factors = new Map(
      sourceLinks.links
        .filter((row) => votingLinkKeys.includes(row.key))
        .map((row) => [
          row.key,
          1 + (row.sizeByPlace?.["US-TN"]?.size ?? row.size!),
        ]),
    );
    const causes = votingLinkKeys.map((key) => ({
      key,
      factor: factors.get(key)!,
    }));
    const multiplier = causes.reduce(
      (product, cause) => product * cause.factor,
      1,
    );
    world = {
      ...world,
      placeOutcomes: {
        months: [
          {
            month,
            records: [
              {
                measure: "voting.turnout-pct",
                placeKey: "US-TN",
                jurisdictionId: state.id,
                month,
                base: 60,
                structural: 60,
                multiplier,
                value: 60 * multiplier,
                causes,
              },
            ],
          },
        ],
      },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const linksFor = (personId: EntityId) =>
      landed.placeOutcomes?.landings
        ?.filter((row) => row.personId === personId)
        .map((row) => row.linkKey)
        .sort() ?? [];
    expect(linksFor(restoredVoterId)).toEqual([...votingLinkKeys].sort());
    expect(linksFor(pardonedResidentId)).toEqual(
      [
        "all-mail-voting-to-turnout",
        "automatic-registration-to-turnout",
        "independent-redistricting-to-turnout",
        "right-to-work-to-turnout",
      ].sort(),
    );

    const restoreLanding = landed.placeOutcomes?.landings?.find(
      (row) =>
        row.personId === restoredVoterId &&
        row.linkKey === "restore-voting-to-turnout",
    );
    expect(restoreLanding).toMatchObject({
      recipientRule: "recorded-restored-voting-right-estimate",
      direction: "cost",
      estimatedFrom: expect.stringContaining("denominator"),
    });
    expect(
      landed.placeOutcomes?.landings?.some(
        (row) =>
          row.personId === pardonedResidentId &&
          row.linkKey === "restore-voting-to-turnout",
      ),
    ).toBe(false);

    const reflectionKey = livedOutcomeReflectionKey(
      restoredVoterId,
      restoreLanding!.id,
    );
    const due = landed.history.futureDueItems.find(
      (row) => row.stableKey === reflectionKey,
    );
    expect(due).toBeDefined();
    const reflected = officialViewReflectionHandler(landed, due!).world;
    expect(
      reflected.history.events.some(
        (event) =>
          event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE &&
          event.tags.includes(`lived-outcome-source:${restoreLanding!.id}`),
      ),
    ).toBe(true);
  });
});

describe("a named finance outcome landing", () => {
  it("routes recorded coverage and active payday borrowers through official reflection", () => {
    const fixture = smallWorld({
      place: "TN",
      date: "2026-01-01",
      people: 24,
      offices: ["governor"],
      seed: "ow-spine-finance-recorded-recipients",
    });
    const month = makeIsoDate("2026-01-01");
    const state = stateJurisdictionForKey("US-TN");
    if (!state) throw new Error("Tennessee's state jurisdiction must exist.");
    const medicaidAge =
      recipientAgeRanges["recorded-medicaid-expansion-recipient-estimate"];
    const adults = fixture.world.personOrder.filter((personId) => {
      if (personId === fixture.personId) return false;
      const person = fixture.world.people[personId];
      if (!person) return false;
      const age = ageOnDate(person.birthDate, month);
      return age >= medicaidAge.minimumAge && age <= medicaidAge.maximumAge!;
    });
    const [coveredBorrowerId, nonPaydayBorrowerId, unrecordedAdultId] = adults;
    if (!coveredBorrowerId || !nonPaydayBorrowerId || !unrecordedAdultId)
      throw new Error("The seeded finance world needs three adult residents.");

    const coverageRecord = (
      source: World,
      personId: EntityId,
      covered: boolean,
      stableKey: string,
    ) =>
      appendCrisisRecord(source, {
        kind: "health-coverage",
        stableKey,
        effectiveAt: month,
        causalParentIds: [],
        visibility: "private",
        eventId: null,
        personId,
        program: "medicaid-expansion",
        covered,
        reasonKey: covered ? "covered" : "outside:income",
        stateKey: "US-TN",
        householdSize: 1,
        monthlyIncomeMinor: 0,
        monthlyWorkHours: null,
        hazardMultiplierMicros: 1_000_000,
        hazardFrom: null,
        hazardBasis:
          "No personal hazard change is estimated from this outcome.",
        basis: "A seeded coverage status for the outcome landing test.",
      });

    const provenance = {
      kind: "authored" as const,
      note: "A seeded finance outcome landing test loan.",
    };
    let world = coverageRecord(
      fixture.world,
      coveredBorrowerId,
      true,
      "ow-spine-finance:test:medicaid-covered",
    );
    world = coverageRecord(
      world,
      nonPaydayBorrowerId,
      false,
      "ow-spine-finance:test:medicaid-not-covered",
    );
    world = openHouseholdLoan(world, {
      stableKey: "ow-spine-finance:test:payday-loan",
      borrower: { kind: "person", personId: coveredBorrowerId },
      lenderOrganizationId: null,
      lenderKind: "payday-lender",
      kind: "payday",
      principal: money(50_000, "USD"),
      marketAnnualRateBasisPoints: 32_000,
      rateCap: null,
      repayment: { kind: "installment", termMonths: 6 },
      lateFee: null,
      missedPaymentsToDefault: 2,
      missedPaymentsToCollections: 4,
      jurisdictionId: state.id,
      housingTenureId: null,
      provenance,
    });
    world = openHouseholdLoan(world, {
      stableKey: "ow-spine-finance:test:credit-card-loan",
      borrower: { kind: "person", personId: nonPaydayBorrowerId },
      lenderOrganizationId: null,
      lenderKind: "bank",
      kind: "credit-card",
      principal: money(50_000, "USD"),
      marketAnnualRateBasisPoints: 2_500,
      rateCap: null,
      repayment: {
        kind: "revolving",
        principalShareBasisPoints: 500,
        minimumPaymentFloor: money(2_500, "USD"),
      },
      lateFee: null,
      missedPaymentsToDefault: 2,
      missedPaymentsToCollections: 4,
      jurisdictionId: state.id,
      housingTenureId: null,
      provenance,
    });

    const causesByMeasure = new Map<
      string,
      { key: string; factor: number }[]
    >();
    for (const row of plannedFinance) {
      const source = sourceLinks.links.find((link) => link.key === row.key);
      if (!source) throw new Error(`Missing source link ${row.key}.`);
      const size = source.sizeByPlace?.["US-TN"]?.size ?? source.size;
      if (typeof size !== "number")
        throw new Error(`Missing researched effect size for ${row.key}.`);
      const causes = causesByMeasure.get(row.outcome) ?? [];
      causes.push({ key: row.key, factor: 1 + size });
      causesByMeasure.set(row.outcome, causes);
    }
    const records: PlaceOutcomeRecord[] = [...causesByMeasure].map(
      ([measure, causes]) => {
        const multiplier = causes.reduce(
          (product, cause) => product * cause.factor,
          1,
        );
        return {
          measure,
          placeKey: "US-TN",
          jurisdictionId: state.id,
          month,
          base: 100,
          structural: 100,
          multiplier,
          value: 100 * multiplier,
          causes,
        };
      },
    );
    world = {
      ...world,
      placeOutcomes: { months: [{ month, records }] },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const linksFor = (personId: EntityId) =>
      landed.placeOutcomes?.landings
        ?.filter((row) => row.personId === personId)
        .map((row) => row.linkKey)
        .sort() ?? [];
    expect(linksFor(coveredBorrowerId)).toEqual(
      plannedFinance.map((row) => row.key).sort(),
    );
    expect(linksFor(nonPaydayBorrowerId)).toEqual([]);
    expect(linksFor(unrecordedAdultId)).toEqual([]);
    const borrowerLandings = landed.placeOutcomes?.landings?.filter(
      (row) => row.personId === coveredBorrowerId,
    );
    expect(borrowerLandings?.every((row) => row.direction === "gain")).toBe(
      true,
    );
    expect(
      borrowerLandings?.find(
        (row) => row.linkKey === "medicaid-expansion-to-medical-debt",
      ),
    ).toMatchObject({
      recipientRule: "recorded-medicaid-expansion-recipient-estimate",
      direction: "gain",
      estimatedFrom: expect.stringContaining("42 C.F.R. § 435.119"),
    });
    expect(
      borrowerLandings
        ?.filter((row) => row.measure === "finance.high-cost-loans")
        .map((row) => row.recipientRule),
    ).toEqual([
      "recorded-payday-loan-borrower-estimate",
      "recorded-payday-loan-borrower-estimate",
    ]);
    const financeLanding = borrowerLandings?.[0];
    if (!financeLanding)
      throw new Error(
        "The recorded finance changes did not reach the borrower.",
      );
    const reflectionKey = livedOutcomeReflectionKey(
      coveredBorrowerId,
      financeLanding.id,
    );
    const due = landed.history.futureDueItems.find(
      (row) => row.stableKey === reflectionKey,
    );
    expect(due).toBeDefined();
    const reflected = officialViewReflectionHandler(landed, due!).world;
    expect(
      reflected.history.events.some(
        (event) =>
          event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE &&
          event.tags.includes(`lived-outcome-source:${financeLanding.id}`),
      ),
    ).toBe(true);
  });
});

describe("a named household outcome landing", () => {
  it("routes recorded household members through the shared path", () => {
    const fixture = smallWorld({
      place: "OH",
      date: "2026-01-01",
      people: 12,
      household: true,
      offices: ["governor"],
      seed: "ow-spine-household-recorded-recipients",
    });
    const month = makeIsoDate("2026-01-01");
    const state = stateJurisdictionForKey("US-OH");
    if (!state) throw new Error("Ohio's state jurisdiction must be present.");
    const adultAge = recipientAgeRanges["adult-school-completer-estimate"];
    const workerId = fixture.world.personOrder.find((id) => {
      const person = fixture.world.people[id];
      return (
        id !== fixture.personId &&
        person &&
        ageOnDate(person.birthDate, month) >= adultAge.minimumAge
      );
    });
    if (!workerId)
      throw new Error("The small world needs an adult household member.");
    const householdId = fixture.world.history.households[0]?.id;
    if (!householdId)
      throw new Error("The small world needs its recorded household.");
    const provenance = {
      kind: "authored" as const,
      note: "A seeded household landing test record.",
    };
    let world = recordSnapParticipation(fixture.world, {
      householdId,
      enrolled: true,
      monthlyBenefitMinor: 25000,
      benefitSource: "seeded SNAP recipient fixture",
      causeId: householdId,
      applicationId: "ow-spine-household-test:snap-application",
      effectiveAt: month,
      householdSize: fixture.world.history.householdMemberships.length,
      monthlyWorkHours: null,
      incomeToThreshold: 0.5,
    });
    const employer = createOrganization(world, {
      stableKey: "ow-spine-household-test:employer",
      formedAt: month,
      provenance,
      initialProfile: {
        name: "Household landing test employer",
        classification: "service:school",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    world = employer;
    const relationshipWorld = createWorkRelationship(world, {
      stableKey: "ow-spine-household-test:work",
      personId: workerId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: month,
      kind: "employment:household-outcome-test",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Recorded wage worker",
        occupationClassification: "occupation:retail-worker",
        locationJurisdictionId: fixture.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 30 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: fixture.jurisdictionId,
        },
      },
    });
    world = createWorkCompensation(relationshipWorld, {
      stableKey: "ow-spine-household-test:pay",
      workRelationshipId:
        relationshipWorld.history.workRelationships.at(-1)!.id,
      startsAt: month,
      amount: { minorUnits: 250000, currency: "USD" },
      cadenceKind: "schedule:monthly",
      restrictionKind: null,
      jurisdictionId: fixture.jurisdictionId,
      provenance,
    });
    const school = createOrganization(world, {
      stableKey: "ow-spine-household-test:school",
      formedAt: month,
      provenance,
      initialProfile: {
        name: "Household landing test school",
        classification: "service:school",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    const enrollmentWorld = createEducationEnrollment(school, {
      stableKey: "ow-spine-household-test:school-completion",
      personId: workerId,
      organizationId: school.history.organizations.at(-1)!.id,
      startedAt: month,
      programKind: "schooling:secondary",
      contextKind: "stage:school",
      provenance,
    });
    const initialSchoolState =
      enrollmentWorld.history.educationEnrollmentStates.at(-1)!;
    world = recordEducationEnrollmentState(enrollmentWorld, {
      stableKey: "ow-spine-household-test:school-completion:completed",
      enrollmentId: enrollmentWorld.history.educationEnrollments.at(-1)!.id,
      effectiveAt: month,
      status: "completed",
      contextKind: "stage:school",
      reason: "The seeded test member completed the recorded program.",
      provenance,
      supersedesStateId: initialSchoolState.id,
    });

    const causesByMeasure = new Map<
      string,
      { key: string; factor: number }[]
    >();
    for (const row of plannedHousehold) {
      const causes = causesByMeasure.get(row.outcome) ?? [];
      causes.push({ key: row.key, factor: 1.05 });
      causesByMeasure.set(row.outcome, causes);
    }
    const records: PlaceOutcomeRecord[] = [...causesByMeasure].map(
      ([measure, causes]) => ({
        measure,
        placeKey: "US-OH",
        jurisdictionId: state.id,
        month,
        base: 100,
        structural: 100,
        multiplier: 1.05,
        value: 105,
        causes,
      }),
    );
    world = {
      ...world,
      placeOutcomes: { months: [{ month, records }] },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const expectedHouseholdLinks = [
      "federal-minimum-wage-to-poverty",
      "grocery-exemption-to-food-insecurity",
      "graduation-to-poverty",
      "licensing-reform-to-poverty",
      "minimum-wage-to-poverty",
      "poor-roads-to-prices",
      "snap-to-food-insecurity",
      "tariffs-to-prices",
      "unemployment-to-poverty",
    ];
    const workerLandings = landed.placeOutcomes?.landings?.filter(
      (row) => row.personId === workerId,
    );
    for (const key of expectedHouseholdLinks) {
      const source = plannedHousehold.find((row) => row.key === key);
      expect(workerLandings?.find((row) => row.linkKey === key)).toMatchObject({
        personId: workerId,
        measure: source?.outcome,
        recipientRule: source?.recipientRule,
        direction: "cost",
        estimatedFrom: source?.estimatedFrom,
      });
    }
    const landing = workerLandings?.find(
      (row) => row.linkKey === "tariffs-to-prices",
    );
    if (!landing) throw new Error("The household price outcome did not land.");
    const reflectionKey = livedOutcomeReflectionKey(workerId, landing.id);
    expect(
      landed.history.futureDueItems.some(
        (row) => row.stableKey === reflectionKey,
      ),
    ).toBe(true);
  });
});

describe("a named housing outcome landing", () => {
  it("uses active renter and recorded housing-crisis household facts", () => {
    const fixture = smallWorld({
      place: "OH",
      date: "2026-01-01",
      household: true,
      offices: ["governor"],
      seed: "ow-spine-housing-recorded-recipients",
    });
    const month = makeIsoDate("2026-01-01");
    const state = stateJurisdictionForKey("US-OH");
    if (!state) throw new Error("Ohio's state jurisdiction must be present.");
    const personId = fixture.world.personOrder.find(
      (id) => id !== fixture.personId,
    );
    if (!personId)
      throw new Error("The small world needs another household member.");
    const householdId = fixture.world.history.households[0]?.id;
    if (!householdId)
      throw new Error("The small world needs its recorded household.");
    const provenance = {
      kind: "authored" as const,
      note: "A seeded housing outcome landing test record.",
    };
    let world = recordSnapParticipation(fixture.world, {
      householdId,
      enrolled: true,
      monthlyBenefitMinor: 25000,
      benefitSource: "seeded housing recipient fixture",
      causeId: householdId,
      applicationId: "ow-spine-housing-test:snap-application",
      effectiveAt: month,
      householdSize: fixture.world.history.householdMemberships.length,
      monthlyWorkHours: null,
      incomeToThreshold: 0.5,
    });
    const tenureId = "test:ow-spine-housing:rental-tenure";
    const nextSequence = world.history.nextSequence;
    const tenure = {
      id: tenureId,
      stableKey: tenureId,
      sequence: nextSequence,
      holder: { kind: "household" as const, householdId },
      dwellingId: "test:ow-spine-housing:dwelling",
      startedAt: month,
      kind: "lease:rented",
      provenance,
    } as (typeof world.history.housingTenures)[number];
    const tenureState = {
      id: "test:ow-spine-housing:rental-tenure:active",
      stableKey: "test:ow-spine-housing:rental-tenure:active",
      sequence: nextSequence + 1,
      housingTenureId: tenureId,
      effectiveAt: month,
      status: "active" as const,
      context: null,
      provenance,
      supersedesStateId: null,
    } as (typeof world.history.housingTenureStates)[number];
    const eviction = {
      id: "test:ow-spine-housing:eviction",
      stableKey: "test:ow-spine-housing:eviction",
      sequence: nextSequence + 2,
      type: RENT_EVENTS.evicted,
      occurredAt: month,
      recordedAt: month,
      jurisdictionId: fixture.jurisdictionId,
      locationJurisdictionId: fixture.jurisdictionId,
      involvedEntityIds: [householdId],
    } as unknown as (typeof world.history.events)[number];
    world = {
      ...world,
      history: {
        ...world.history,
        nextSequence: nextSequence + 3,
        housingTenures: [...world.history.housingTenures, tenure],
        housingTenureStates: [
          ...world.history.housingTenureStates,
          tenureState,
        ],
        events: [...world.history.events, eviction],
      },
    };

    const causesByMeasure = new Map<
      string,
      { key: string; factor: number }[]
    >();
    for (const row of plannedHousing) {
      const causes = causesByMeasure.get(row.outcome) ?? [];
      const factor =
        row.key === "housing-by-right-to-new-buildings" ? 1.05 : 0.95;
      causes.push({ key: row.key, factor });
      causesByMeasure.set(row.outcome, causes);
    }
    const records: PlaceOutcomeRecord[] = [...causesByMeasure].map(
      ([measure, causes]) => ({
        measure,
        placeKey: "US-OH",
        jurisdictionId: state.id,
        month,
        base: 100,
        structural: 100,
        multiplier: 1,
        value: 100,
        causes,
      }),
    );
    world = {
      ...world,
      placeOutcomes: { months: [{ month, records }] },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const landings = landed.placeOutcomes?.landings?.filter(
      (row) => row.personId === personId,
    );
    expect(landings?.map((row) => row.linkKey).sort()).toEqual(
      plannedHousing.map((row) => row.key).sort(),
    );
    const supply = landings?.find(
      (row) => row.linkKey === "rent-control-to-rental-supply",
    );
    const tenantStays = landings?.find(
      (row) => row.linkKey === "rent-control-to-tenant-stays",
    );
    const housingFirst = landings?.find(
      (row) => row.linkKey === "housing-first-to-homelessness",
    );
    expect(supply?.direction).toBe("cost");
    expect(tenantStays?.direction).toBe("gain");
    expect(housingFirst).toMatchObject({
      recipientRule: "evicted-household-without-home-member-estimate",
      direction: "gain",
      estimatedFrom: plannedHousing.find(
        (row) => row.key === "housing-first-to-homelessness",
      )?.estimatedFrom,
    });
    if (!housingFirst)
      throw new Error(
        "The recorded housing crisis did not reach the resident.",
      );
    const reflectionKey = livedOutcomeReflectionKey(personId, housingFirst.id);
    expect(
      landed.history.futureDueItems.some(
        (row) => row.stableKey === reflectionKey,
      ),
    ).toBe(true);
  });
});

describe("a named environmental outcome landing", () => {
  it("records place-average changes for a resident and schedules the official view", () => {
    const fixture = smallWorld({
      place: "OH",
      date: "2026-01-01",
      offices: ["governor"],
      seed: "ow-spine-environment-place-resident",
    });
    const month = makeIsoDate("2026-01-01");
    const state = stateJurisdictionForKey("US-OH");
    if (!state) throw new Error("Ohio's state jurisdiction must be present.");
    const personId = fixture.world.personOrder.find(
      (id) => id !== fixture.personId,
    );
    if (!personId) throw new Error("The small world needs another resident.");
    const factors: Readonly<Record<string, number>> = {
      "carbon-price-to-emissions": 0.97,
      "container-deposit-to-recycling": 1.1,
      "power-plant-carbon-to-emissions": 0.98,
      "power-plant-carbon-to-particulates": 0.995,
      "clean-electricity-to-particulates": 0.99,
      "carbon-price-to-particulates": 0.995,
    };
    const causesByMeasure = new Map<
      string,
      { key: string; factor: number }[]
    >();
    for (const row of plannedEnvironment) {
      const causes = causesByMeasure.get(row.outcome) ?? [];
      causes.push({ key: row.key, factor: factors[row.key]! });
      causesByMeasure.set(row.outcome, causes);
    }
    const records: PlaceOutcomeRecord[] = [...causesByMeasure].map(
      ([measure, causes]) => {
        const multiplier = causes.reduce(
          (product, row) => product * row.factor,
          1,
        );
        return {
          measure,
          placeKey: "US-OH",
          jurisdictionId: state.id,
          month,
          base: 100,
          structural: 100,
          multiplier,
          value: 100 * multiplier,
          causes,
        };
      },
    );
    const world = {
      ...fixture.world,
      placeOutcomes: { months: [{ month, records }] },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const landings = landed.placeOutcomes?.landings?.filter(
      (row) => row.personId === personId,
    );
    expect(landings?.map((row) => row.linkKey).sort()).toEqual(
      plannedEnvironment.map((row) => row.key).sort(),
    );
    expect(landings?.every((row) => row.direction === "gain")).toBe(true);
    expect(
      landings?.every(
        (row) => row.recipientRule === "jurisdiction-resident-estimate",
      ),
    ).toBe(true);
    const landing = landings?.[0];
    if (!landing)
      throw new Error(
        "The environmental place outcome did not reach a person.",
      );
    const reflectionKey = livedOutcomeReflectionKey(personId, landing.id);
    expect(
      landed.history.futureDueItems.some(
        (row) => row.stableKey === reflectionKey,
      ),
    ).toBe(true);
  });
});

describe("a named labor outcome landing", () => {
  it("uses current marriage and parent records, estimates place measures, and schedules reflections", () => {
    const fixture = smallWorld({
      place: "OH",
      date: "2026-01-01",
      offices: ["governor"],
      seed: "ow-spine-labor-family-records",
    });
    const [parentId, partnerId] = fixture.world.personOrder.filter(
      (personId) => personId !== fixture.personId,
    );
    if (!parentId || !partnerId)
      throw new Error("The seeded labor world needs two residents.");
    const childGenerationKey = "ow-spine-labor-test:child";
    const olderGenerationKey = "ow-spine-labor-test:older";
    const childId = createStableId(
      "person",
      `${fixture.world.id}:${childGenerationKey}`,
    );
    const olderPersonId = createStableId(
      "person",
      `${fixture.world.id}:${olderGenerationKey}`,
    );
    const month = makeIsoDate("2026-01-01");
    const state = stateJurisdictionForKey("US-OH");
    if (!state) throw new Error("Ohio's state jurisdiction must be present.");
    const provenance = {
      kind: "authored" as const,
      note: "A seeded labor landing test record.",
    };
    const homeJurisdictionId =
      fixture.world.people[parentId]!.homeJurisdictionId;
    const personForTest = (
      id: EntityId,
      generationKey: string,
      givenName: string,
      birthDate: ReturnType<typeof makeIsoDate>,
      identity?: {
        readonly gender: "female" | "male";
        readonly pronouns: "she-her" | "he-him";
      },
    ) => {
      const factProvenance = {
        method: "manual" as const,
        sourceEventId: null,
        note: "Seeded labor outcome test.",
      };
      return {
        id,
        generationKey,
        givenName,
        familyName: "Test",
        birthDate,
        homeJurisdictionId,
        ...(identity ? { identity } : {}),
        establishedFacts: [
          {
            id: createStableId("fact", `${id}:birth-date`),
            stableKey: "birth-date",
            kind: "birth-date" as const,
            occurredAt: birthDate,
            jurisdictionId: null,
            summary: "Test birth date.",
            provenance: factProvenance,
          },
          {
            id: createStableId("fact", `${id}:birthplace`),
            stableKey: "birthplace",
            kind: "birthplace" as const,
            occurredAt: birthDate,
            jurisdictionId: homeJurisdictionId,
            summary: "Test birthplace.",
            provenance: factProvenance,
          },
          {
            id: createStableId("fact", `${id}:residence:initial`),
            stableKey: "residence:initial",
            kind: "residence" as const,
            occurredAt: fixture.world.currentDate,
            jurisdictionId: homeJurisdictionId,
            endedAt: null,
            summary: "Test residence.",
            provenance: factProvenance,
          },
        ],
        detailLevel: "lightweight" as const,
      };
    };
    let world: World = {
      ...fixture.world,
      people: {
        ...fixture.world.people,
        [parentId]: {
          ...fixture.world.people[parentId]!,
          identity: { gender: "female", pronouns: "she-her" },
        },
        [partnerId]: {
          ...fixture.world.people[partnerId]!,
          identity: { gender: "male", pronouns: "he-him" },
        },
        [childId]: {
          ...personForTest(
            childId,
            childGenerationKey,
            "Child",
            makeIsoDate("2025-04-01"),
          ),
        },
        [olderPersonId]: {
          ...personForTest(
            olderPersonId,
            olderGenerationKey,
            "Worker",
            makeIsoDate("1962-01-01"),
          ),
        },
      },
      personOrder: [...fixture.world.personOrder, childId, olderPersonId],
    };
    world = createPartnership(world, {
      stableKey: "ow-spine-labor-test:marriage",
      personIds: [parentId, partnerId],
      startedAt: month,
      kind: "legal:marriage",
      provenance,
    });
    const authorityId = "child-authority_ow-spine-labor-test" as EntityId;
    const authorityStateId =
      "child-authority-state_ow-spine-labor-test" as EntityId;
    const sequence = world.history.nextSequence;
    world = {
      ...world,
      history: {
        ...world.history,
        nextSequence: sequence + 2,
        childAuthorities: [
          ...world.history.childAuthorities,
          {
            id: authorityId,
            stableKey: "ow-spine-labor-test:parent-child",
            sequence,
            childPersonId: childId,
            holder: { kind: "person", personId: parentId },
            establishedAt: month,
            kind: "parental:legal-parent",
            provenance,
          },
        ],
        childAuthorityStates: [
          ...world.history.childAuthorityStates,
          {
            id: authorityStateId,
            stableKey: "ow-spine-labor-test:parent-child:state",
            sequence: sequence + 1,
            childAuthorityId: authorityId,
            effectiveAt: month,
            status: "active",
            basisKind: "legal:parentage",
            context: null,
            provenance,
            supersedesStateId: null,
          },
        ],
      },
    };

    const factors: Readonly<Record<string, number>> = {
      "broadband-to-married-women-work": 1.07,
      "universal-childcare-to-mothers-work": 1.15,
      "paid-leave-to-mothers-work": 1.02,
      "retirement-age-to-older-work": 1.1,
      "public-bargaining-to-earnings": 0.99,
      "defense-contracts-to-earnings": 1.015,
    };
    const causesByMeasure = new Map<
      string,
      { key: string; factor: number }[]
    >();
    for (const row of plannedLabor) {
      const causes = causesByMeasure.get(row.outcome) ?? [];
      causes.push({ key: row.key, factor: factors[row.key]! });
      causesByMeasure.set(row.outcome, causes);
    }
    const records: PlaceOutcomeRecord[] = [...causesByMeasure].map(
      ([measure, causes]) => {
        const multiplier = causes.reduce(
          (product, row) => product * row.factor,
          1,
        );
        return {
          measure,
          placeKey: "US-OH",
          jurisdictionId: state.id,
          month,
          base: 100,
          structural: 100,
          multiplier,
          value: 100 * multiplier,
          causes,
        };
      },
    );
    world = {
      ...world,
      placeOutcomes: { months: [{ month, records }] },
    };

    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const linksFor = (personId: EntityId) =>
      (landed.placeOutcomes?.landings ?? [])
        .filter((row) => row.personId === personId)
        .map((row) => row.linkKey)
        .sort();
    expect(linksFor(parentId)).toEqual(
      [
        "broadband-to-married-women-work",
        "universal-childcare-to-mothers-work",
        "paid-leave-to-mothers-work",
        "public-bargaining-to-earnings",
        "defense-contracts-to-earnings",
      ].sort(),
    );
    expect(linksFor(partnerId)).toEqual(
      ["public-bargaining-to-earnings", "defense-contracts-to-earnings"].sort(),
    );
    expect(linksFor(childId)).toEqual(
      ["public-bargaining-to-earnings", "defense-contracts-to-earnings"].sort(),
    );
    expect(linksFor(olderPersonId)).toEqual(
      [
        "retirement-age-to-older-work",
        "public-bargaining-to-earnings",
        "defense-contracts-to-earnings",
      ].sort(),
    );
    const parentLandings = (landed.placeOutcomes?.landings ?? []).filter(
      (row) => row.personId === parentId,
    );
    expect(parentLandings.every((row) => row.estimatedFrom.length > 0)).toBe(
      true,
    );
    expect(
      parentLandings.every((landing) =>
        landed.history.futureDueItems.some(
          (row) =>
            row.stableKey === livedOutcomeReflectionKey(parentId, landing.id),
        ),
      ),
    ).toBe(true);
  });
});

describe("a named transit opportunity landing", () => {
  it("records sourced resident estimates, skips quiet measures, and saves official reflection", () => {
    const fixture = smallWorld({
      place: "OH",
      date: "2026-01-01",
      offices: ["governor"],
      seed: "ow-spine-transit-resident-opportunity",
    });
    const month = makeIsoDate("2026-01-01");
    const personId = fixture.world.personOrder.find(
      (id) => id !== fixture.personId,
    );
    if (!personId) throw new Error("The small world needs another resident.");
    const recordsFor = (
      factors: Readonly<Record<string, number>>,
    ): PlaceOutcomeRecord[] => {
      const causesByMeasure = new Map<
        string,
        { key: string; factor: number }[]
      >();
      for (const row of plannedTransit) {
        const causes = causesByMeasure.get(row.outcome) ?? [];
        causes.push({ key: row.key, factor: factors[row.key]! });
        causesByMeasure.set(row.outcome, causes);
      }
      return [...causesByMeasure].map(([measure, causes]) => {
        const base = PLACE_OUTCOME_BASES[measure]!.places["US-OH"]!;
        const multiplier = causes.reduce(
          (product, cause) => product * cause.factor,
          1,
        );
        return {
          measure,
          placeKey: "US-OH",
          jurisdictionId: fixture.stateJurisdictionId,
          month,
          base,
          structural: base,
          multiplier,
          value: base * multiplier,
          causes,
        };
      });
    };
    const worldFor = (factors: Readonly<Record<string, number>>): World => ({
      ...fixture.world,
      placeOutcomes: { months: [{ month, records: recordsFor(factors) }] },
    });
    const quiet = worldFor({
      "fare-free-transit-to-ridership": 1,
      "highway-money-for-transit-to-service": 1,
      "transit-service-to-ridership": 1,
    });
    expect(recordPlannedPersonOutcomeLandings(quiet, month)).toBe(quiet);

    const world = worldFor({
      "fare-free-transit-to-ridership": 1.42,
      "highway-money-for-transit-to-service": 1.1,
      "transit-service-to-ridership": 1.05,
    });
    const landed = recordPlannedPersonOutcomeLandings(world, month);
    const landings = (landed.placeOutcomes?.landings ?? []).filter(
      (row) => row.personId === personId,
    );
    expect(landings.map((row) => row.linkKey).sort()).toEqual(
      plannedTransit.map((row) => row.key).sort(),
    );
    const governor = currentGovernorOf(landed, "OH");
    expect(governor).not.toBeNull();
    for (const landing of landings) {
      expect(landing.direction).toBe("gain");
      expect(landing.recipientRule).toBe("jurisdiction-resident-estimate");
      expect(landing.estimatedFrom).toContain(
        "recipient estimate: FTA National Transit Database 2024",
      );
      expect(landing.answeringPersonId).toBe(governor!.personId);
    }
    expect(landed.history.resourceFlows).toEqual(world.history.resourceFlows);
    expect(landed.history.scheduledActivities).toEqual(
      world.history.scheduledActivities,
    );
    expect(recordPlannedPersonOutcomeLandings(landed, month)).toBe(landed);

    const landing = landings[0];
    if (!landing)
      throw new Error("The transit estimate did not reach a resident.");
    const due = landed.history.futureDueItems.find(
      (row) =>
        row.stableKey === livedOutcomeReflectionKey(personId, landing.id),
    );
    expect(due).toBeDefined();
    const reflected = officialViewReflectionHandler(landed, due!).world;
    expect(
      reflected.history.events.some(
        (event) =>
          event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE &&
          event.tags.includes(`lived-outcome-source:${landing.id}`),
      ),
    ).toBe(true);
  });
});
