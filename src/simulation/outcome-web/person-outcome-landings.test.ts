import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
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
import { currentGovernorOf } from "../crisis/offices";
import { createEducationEnrollment, createOrganization } from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import {
  LIVED_OUTCOME_REFLECTION_EVENT_TYPE,
  officialViewReflectionHandler,
} from "../living-world/official-views";
import { livedOutcomeReflectionKey } from "../law-exposure";
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
      "person-linked": 44,
      "budget-only": 4,
      "place-number-only": 51,
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

  it.each([
    ["age-0-infant-cohort-estimate", 0, false, true],
    ["age-0-infant-cohort-estimate", 1, false, false],
    ["age-19-to-64-cohort-estimate", 18, false, false],
    ["age-19-to-64-cohort-estimate", 19, false, true],
    ["age-19-to-64-cohort-estimate", 64, false, true],
    ["age-19-to-64-cohort-estimate", 65, false, false],
    ["age-65-plus-cohort-estimate", 64, false, false],
    ["age-65-plus-cohort-estimate", 65, false, true],
    ["age-18-plus-substance-use-condition-estimate", 18, false, false],
    ["age-18-plus-substance-use-condition-estimate", 18, true, true],
    ["age-18-plus-substance-use-condition-estimate", 17, true, false],
    ["age-13-to-17-cohort-estimate", 13, false, true],
    ["age-13-to-17-cohort-estimate", 17, false, true],
    ["age-13-to-17-cohort-estimate", 18, false, false],
    ["age-5-to-17-cohort-estimate", 4, false, false],
    ["age-5-to-17-cohort-estimate", 5, false, true],
    ["age-5-to-17-cohort-estimate", 17, false, true],
    ["age-5-to-17-cohort-estimate", 18, false, false],
  ] as const)(
    "matches %s at age %i with condition=%s => %s",
    (rule, age, active, expected) => {
      expect(
        matchesOutcomeRecipientRule(rule, {
          age,
          activeEducationEnrollment: false,
          hasRecordedEducationEnrollment: false,
          compulsorySchoolAge: null,
          activeSubstanceUseCondition: active,
        }),
      ).toBe(expected);
    },
  );

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
      const youth = {
        age: 16,
        activeEducationEnrollment: false,
        hasRecordedEducationEnrollment: false,
        compulsorySchoolAge: null,
        activeSubstanceUseCondition: false,
      };
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
        age >= 19 &&
        age <= 64 &&
        !holdsPackCondition(fixture.world, id, SUBSTANCE_USE_DISORDER_KEY)
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
        age >= 19 &&
        age <= 64 &&
        !holdsPackCondition(fixture.world, id, SUBSTANCE_USE_DISORDER_KEY)
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
      recipientRule: "age-19-to-64-cohort-estimate",
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
