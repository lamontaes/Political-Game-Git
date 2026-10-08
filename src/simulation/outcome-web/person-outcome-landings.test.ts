import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
import recipientAgeCohorts from "../../../data/research/outcome-web/person-recipient-age-cohorts.json" with { type: "json" };
import schoolAges from "../../../data/research/education/compulsory-school-ages-2020.json" with { type: "json" };
import agePlaceholderLedger from "../../../data/research/education/placeholder-ledger.json" with { type: "json" };
import sourceLinks from "../../../data/research/outcome-web/links.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../dates";
import {
  CONDITION_PACK_ORIGIN,
  holdsPackCondition,
  SUBSTANCE_USE_DISORDER_KEY,
} from "../crisis/condition-pack";
import { appendCrisisRecord } from "../crisis/records";
import { recordSnapParticipation } from "../crisis/snap-participation";
import { currentGovernorOf } from "../crisis/offices";
import {
  createEducationEnrollment,
  createOrganization,
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
import { createWorkCompensation } from "../resources";
import type { PlaceOutcomeRecord } from "./place-outcome-store";
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
      | "household-resident-estimate"
      | "snap-enrolled-household-member-estimate"
      | "recorded-wage-family-member-estimate"
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
      "person-linked": 54,
      "budget-only": 4,
      "place-number-only": 41,
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
