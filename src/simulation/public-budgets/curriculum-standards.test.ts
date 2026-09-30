import type { LawEffectStampedRecord } from "../law-effect-stamp";
import { isLawEffectStamp } from "../law-effect-stamp";
import { describe, expect, it } from "vitest";
import { contentDecisionAuthority } from "../governing/question-authority";
import { recordCurriculumDecision } from "../governing/curriculum-decisions";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import {
  CURRICULUM_QUESTION,
  sponsorPolicyTerms,
} from "../governing/policy-bill-terms";
import { budgetLawReadings, firstOfNextMonth } from "./fiscal";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  type PublicBudgetGovernment,
} from "./store";

import { curriculumAdoptionEffect } from "./curriculum-standards";

const catalog = createProductionPolicyCatalog();
const proposition = Object.values(catalog.propositions).find(
  (row) => row.stableKey === CURRICULUM_QUESTION,
)!;
const flows: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
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
    years: [
      {
        fiscalYear: 2026,
        adoptedOn: "2026-01-01",
        startsOn: "2026-01-01",
        endsOn: "2026-12-31",
        expectedRevenue: BUDGET_SOURCES.map(() => 100000),
        appropriations: BUDGET_PROGRAMS.map(() => 1000),
        laws: budgetLawReadings(
          base,
          state.id,
          makeIsoDate("2026-01-01"),
          false,
        ),
        pensionRequired: 0,
        pensionShare: 1,
        reserveDeposit: 0,
        economyAtAdoption: null,
      },
    ],
    months: [],
  } as unknown as PublicBudgetGovernment;
  const run = (world: World) => {
    let budget = government;
    for (
      let month = makeIsoDate("2026-01-01");
      month < "2027-01-01";
      month = firstOfNextMonth(month)
    )
      budget = settleGovernmentMonth(
        { ...world, currentDate: month },
        budget,
        month,
        flows,
      ).government;
    return budget;
  };
  return {
    base,
    enacted,
    government,
    control: run(base),
    treated: run(enacted),
  };
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
  it("moves curriculum authority and refuses local adoption under enacted state standards in all 56 places", () => {
    for (const place of lifePlaceStateIdentities()) {
      const { enacted } = pair(place.jurisdictionKey, 20_000, 24);
      const town = Object.values(enacted.jurisdictions).find(
        (j) => j.id !== stateJurisdictionForKey(place.jurisdictionKey)!.id,
      )!;
      expect(
        contentDecisionAuthority(enacted, town.id, "curriculum").level,
        place.jurisdictionKey,
      ).toBe("state");
      expect(() =>
        recordCurriculumDecision(enacted, {
          stableKey: "unauthorized-local-standards",
          townId: town.id,
          authorityLevel: "local",
          decidingPersonIds: [],
          standards: "Local standards",
          reason: "Attempt local adoption",
        }),
      ).toThrow("Curriculum adoption refused");
      const repealed = {
        ...enacted,
        history: {
          ...enacted.history,
          legislativeMeasures: (enacted.history.legislativeMeasures ?? []).map(
            (m) => ({
              ...m,
              propositionAnswers: [
                { propositionId: proposition.id, answer: "no" as const },
              ],
            }),
          ),
        },
      };
      expect(
        contentDecisionAuthority(repealed, town.id, "curriculum").level,
        place.jurisdictionKey,
      ).toBe("local");
    }
  });
  it("spends filed amounts for a 12-month watched comparison in a named random place drawn from all 56", () => {
    const seed = "curriculum-watched-2026";
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    const state = new SeededRng(seed).pick(places);
    const { control, treated } = pair(state.jurisdictionKey, 20_000, 24);
    const at = BUDGET_PROGRAMS.indexOf("schools");
    const moved =
      treated.months.reduce((n, row) => n + row.spending[at]!, 0) -
      control.months.reduce((n, row) => n + row.spending[at]!, 0);
    console.log(
      JSON.stringify({
        law: CURRICULUM_QUESTION,
        seed,
        place: state.jurisdictionKey,
        schoolSpendingDollars: moved,
      }),
    );
    expect(moved).toBe(12_000);
    for (const month of treated.months) {
      const stamps = (month as typeof month & LawEffectStampedRecord)
        .lawEffectStamps;
      expect(stamps).toHaveLength(1);
      expect(isLawEffectStamp(stamps![0])).toBe(true);
      expect(stamps![0]!.governingLawKey).toBe("measure_curriculum");
      expect(stamps![0]!.effectKind).toBe("state-spending");
      expect(stamps![0]!.sourceRecordIds).toContain("person_0");
      expect(stamps![0]!.sourceRecordIds).toContain("enrollment_0");
    }
    expect(control.balance - treated.balance).toBe(12_000);
  });
  it("reads each bill's amount and phase-in and stops charging after the cycle", () => {
    for (const place of lifePlaceStateIdentities()) {
      const { control, treated } = pair(place.jurisdictionKey, 40_000, 6);
      const at = BUDGET_PROGRAMS.indexOf("schools");
      expect(
        treated.months.reduce((n, r) => n + r.spending[at]!, 0) -
          control.months.reduce((n, r) => n + r.spending[at]!, 0),
        place.jurisdictionKey,
      ).toBe(48_000);
      expect(treated.months[6]!.spending[at], place.jurisdictionKey).toBe(
        control.months[6]!.spending[at],
      );
    }
  });
  it("files the sponsor's reason and leaves repeal bills without purchase terms", () => {
    const state = lifePlaceStateIdentities()[0]!;
    const { base } = pair(state.jurisdictionKey, 20_000, 24);
    const terms = sponsorPolicyTerms(
      base,
      stateJurisdictionForKey(state.jurisdictionKey)!.id,
      null,
      [{ propositionId: proposition.id, answer: "yes" }],
    );
    expect(terms[0]?.values).toEqual({
      materialsPerPupilCents: 20_000,
      phaseInMonths: 24,
    });
    expect(terms[0]?.reason).toContain("Sponsor principle score 0");
    expect(
      sponsorPolicyTerms(
        base,
        stateJurisdictionForKey(state.jurisdictionKey)!.id,
        null,
        [{ propositionId: proposition.id, answer: "no" }],
      ),
    ).toEqual([]);
  });
});
