import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { CURRICULUM_QUESTION } from "../education-civil-law-terms";

import type { PublicBudgetGovernment } from "./store";

import { curriculumAdoptionEffect } from "./curriculum-standards";

const catalog = createProductionPolicyCatalog();
const proposition = Object.values(catalog.propositions).find(
  (row) => row.stableKey === CURRICULUM_QUESTION,
)!;
function pair(stateKey: string, cents: number, months: number) {
  const state = stateJurisdictionForKey(stateKey)!;
  const town = searchLifePlaces("", 5000, {
    stateJurisdictionKey: stateKey,
  }).find((row) => row.scope !== "state");
  const jurisdiction = town?.context.jurisdiction ?? state;
  const school = "organization_school";
  const base = {
    id: "world_curriculum",
    seed: "curriculum-watched-2026",
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: catalog,
    jurisdictions: { [state.id]: state, [jurisdiction.id]: jurisdiction },
    history: {
      nextSequence: 1000,
      events: [],
      legislativeMeasures: [],
      legislativeEnactments: [],
      principles: [],
      organizationProfiles: [
        {
          organizationId: school,
          effectiveAt: "2020-01-01",
          locationJurisdictionId: jurisdiction.id,
          sequence: 1,
        },
      ],
      educationEnrollments: Array.from({ length: 120 }, (_, i) => ({
        id: `enrollment_${i}`,
        personId: `person_${i}`,
        organizationId: school,
        startedAt: "2025-09-01",
        programKind: "schooling:secondary",
        sequence: i + 2,
      })),
      educationEnrollmentStates: Array.from({ length: 120 }, (_, i) => ({
        enrollmentId: `enrollment_${i}`,
        effectiveAt: "2025-09-01",
        status: "active",
        sequence: i + 122,
      })),
    },
  } as unknown as World;
  const terms = {
    questionKey: CURRICULUM_QUESTION,
    values: { materialsPerPupilCents: cents, phaseInMonths: months },
    reason: "Watched comparison's sponsor-selected terms.",
    principleRecordIds: [],
  };
  const enacted = {
    ...base,
    history: {
      ...base.history,
      legislativeMeasures: [
        {
          id: "measure_curriculum",
          jurisdictionId: state.id,
          propositionIds: [proposition.id],
          propositionAnswers: [
            { propositionId: proposition.id, answer: "yes" },
          ],
          policyTerms: [terms],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment_curriculum",
          measureId: "measure_curriculum",
          resolvedAt: "2026-01-01",
          effectiveAt: "2026-01-01",
          outcome: "enacted",
          sequence: 500,
        },
      ],
    },
  } as unknown as World;
  const government = {
    key: stateKey,
    stateKey,
    name: state.name,
    level: "state",
    jurisdictionId: state.id,
    lawJurisdictionId: state.id,
    population: 1000,
    fiscalYearStart: "01-01",
    balance: 1_000_000,
    reserve: 0,
    debt: 0,
    interestRate: 0,
    cut: 0,
    pension: { liability: 0, assets: 0, paidShare: 1 },
    years: [],
    months: [],
  } as unknown as PublicBudgetGovernment;
  return { base, enacted, government };
}
describe("curriculum materials reach school spending", () => {
  it("keeps a plain yes/no law and its named pupils visible without inventing purchase costs", () => {
    const { enacted, government } = pair(
      new SeededRng("curriculum-consumer-records").pick(
        lifePlaceStateIdentities(),
      ).jurisdictionKey,
      20_000,
      24,
    );
    const plain = {
      ...enacted,
      history: {
        ...enacted.history,
        legislativeMeasures: (enacted.history.legislativeMeasures ?? []).map(
          (row) => ({
            ...row,
            policyTerms: [],
          }),
        ),
      },
    };
    const effect = curriculumAdoptionEffect(
      plain,
      government,
      plain.currentDate,
    )!;
    expect(effect.law.measureId).toBe("measure_curriculum");
    expect(effect.recipients).toHaveLength(120);
    expect(effect.recipients[0]).toEqual({
      personId: "person_0",
      enrollmentIds: ["enrollment_0"],
      organizationIds: ["organization_school"],
    });
    expect(effect.spendingDollars).toBeNull();
    expect(effect.limit).toContain("No purchase amount");
  });
  it("does not purchase for not-yet-recorded pupils and counts overlapping enrollment once", () => {
    const { enacted, government } = pair(
      new SeededRng("curriculum-consumer-records").pick(
        lifePlaceStateIdentities(),
      ).jurisdictionKey,
      20_000,
      24,
    );
    const enrollment = enacted.history.educationEnrollments[0]!;
    const world = {
      ...enacted,
      history: {
        ...enacted.history,
        educationEnrollments: [
          ...enacted.history.educationEnrollments.map((row) =>
            row.personId === "person_1"
              ? { ...row, recordedAt: makeIsoDate("2026-02-01") }
              : row,
          ),
          { ...enrollment, id: "enrollment_duplicate" as EntityId },
        ],
        educationEnrollmentStates: [
          ...enacted.history.educationEnrollmentStates,
          {
            ...enacted.history.educationEnrollmentStates[0]!,
            enrollmentId: "enrollment_duplicate" as EntityId,
          },
        ],
      },
    };
    const effect = curriculumAdoptionEffect(
      world,
      government,
      world.currentDate,
    )!;
    expect(effect.recipients).toHaveLength(119);
    expect(
      effect.recipients.find((row) => row.personId === "person_0")
        ?.enrollmentIds,
    ).toEqual(["enrollment_0", "enrollment_duplicate"]);
    expect(effect.recipients.some((row) => row.personId === "person_1")).toBe(
      false,
    );
    expect(effect.spendingDollars).toBe(992);
  });
  it("honors filed phase-in and rejects invalid terms without inventing costs", () => {
    const place = new SeededRng("curriculum-phase-in").pick(
      lifePlaceStateIdentities(),
    );
    const { enacted, government } = pair(place.jurisdictionKey, 40_000, 6);
    expect(
      curriculumAdoptionEffect(
        { ...enacted, currentDate: makeIsoDate("2026-06-01") },
        government,
        makeIsoDate("2026-06-01"),
      )?.spendingDollars,
    ).toBe(8_000);
    expect(
      curriculumAdoptionEffect(
        { ...enacted, currentDate: makeIsoDate("2026-07-01") },
        government,
        makeIsoDate("2026-07-01"),
      )?.spendingDollars,
    ).toBe(0);
    for (const [cents, months] of [
      [-1, 6],
      [20_000, -1],
      [NaN, 6],
      [20_000, 1.5],
    ]) {
      const invalid = pair(place.jurisdictionKey, cents!, months!);
      expect(
        curriculumAdoptionEffect(
          invalid.enacted,
          invalid.government,
          invalid.enacted.currentDate,
        )?.spendingDollars,
      ).toBeNull();
    }
  });
});
