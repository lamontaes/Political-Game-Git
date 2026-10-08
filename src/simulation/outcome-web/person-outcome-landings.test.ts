import landingPlan from "../../../data/research/outcome-web/landing-plan.json" with { type: "json" };
import schoolAges from "../../../data/research/education/compulsory-school-ages-2020.json" with { type: "json" };
import agePlaceholderLedger from "../../../data/research/education/placeholder-ledger.json" with { type: "json" };
import sourceLinks from "../../../data/research/outcome-web/links.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
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
      "person-linked": 34,
      "budget-only": 4,
      "place-number-only": 61,
      "no-live-consumer": 2,
    });
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
    "reads gain and cost direction without a place-specific branch for %s",
    (place) => {
      expect(place.jurisdictionKey).toMatch(/^US-/);
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
    const world = {
      ...enrolled,
      placeOutcomes: { months: [{ month, records: [outcome] }] },
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

    const reflectionKey = livedOutcomeReflectionKey(personId, landing!.id);
    const due = landed.history.futureDueItems.find(
      (row) => row.stableKey === reflectionKey,
    );
    expect(due).toBeDefined();
    const reflected = officialViewReflectionHandler(landed, due!).world;
    expect(
      reflected.history.events.some(
        (event) =>
          event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE &&
          event.tags.includes(`lived-outcome-source:${landing!.id}`),
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
  });
});
