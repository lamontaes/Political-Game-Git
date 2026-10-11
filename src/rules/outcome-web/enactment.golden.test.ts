import { describe, it, expect } from "vitest";
import { STATES } from "../../simulation/state-reference";
import {
  applyEnactedLawEffectsFromReaders,
  applyNewlyEnactedLawEffectsFromReaders,
  consequenceRowsForActivity,
  resolvedConsequenceApplies,
  type EnactmentBindings,
  type EnactmentFact,
  type EffectiveContext,
} from "./enactment";
import { legacyDeclarations, resultOf } from "./legacy-source.test-support";
interface Fixture {
  readonly currentDate: string;
  readonly personOrder: readonly string[];
  readonly trace: readonly unknown[];
  readonly history: {
    readonly legislativeEnactments: readonly EnactmentFact[];
    readonly taxProposals: readonly {
      id: string;
      measureId: string;
      ready: boolean;
    }[];
    readonly publicProgramRecords: readonly { id: string; kind: string }[];
  };
}
function trace(state: Fixture, step: string, extra: unknown = null): Fixture {
  return { ...state, trace: [...state.trace, { step, extra }] };
}
const bindings: EnactmentBindings<Fixture> = {
  enactments: (state) => state.history.legislativeEnactments,
  taxProposal: (state, id) =>
    state.history.taxProposals.find((row) => row.measureId === id),
  taxReady: (state, id) =>
    state.history.taxProposals.find((row) => row.id === id)?.ready === true,
  adoptTax: (state, id) => trace(state, "tax", id),
  appropriationIds: (state) =>
    state.history.publicProgramRecords
      .filter((row) => row.kind === "appropriation")
      .map((row) => row.id),
  appropriate: (state, id) => ({
    ...trace(state, "appropriation", id),
    history: {
      ...state.history,
      publicProgramRecords: [
        ...state.history.publicProgramRecords,
        { id: "generic", kind: "appropriation" },
      ],
    },
  }),
  familyAppropriations: (state, id) => ({
    ...trace(state, "family", id),
    history: {
      ...state.history,
      publicProgramRecords: [
        ...state.history.publicProgramRecords,
        { id: "family", kind: "appropriation" },
      ],
    },
  }),
  openProgramMatters: (state, ids) => trace(state, "program-matters", [...ids]),
  duties: (state, id) => trace(state, "duties", id),
  eligibility: (state, id) => trace(state, "eligibility", id),
  currentDate: (state) => state.currentDate,
  people: (state) => state.personOrder,
  consequences: (state, context) => trace(state, "consequences", context),
};
const old = legacyDeclarations<{
  applyEnactedLawEffects: (state: Fixture, id: string) => Fixture;
  applyNewlyEnactedLawEffects: (before: Fixture, after: Fixture) => Fixture;
}>(
  "enacted-law-effects.ts",
  ["applyEnactedLawEffects", "applyNewlyEnactedLawEffects"],
  {
    taxActivationReadiness: (state: Fixture, id: string) => ({
      kind: bindings.taxReady(state, id) ? "ready" : "refused",
    }),
    adoptEnactedTaxPolicy: bindings.adoptTax,
    appropriationFromEnactedMeasure: bindings.appropriate,
    applyFamilyAppropriations: bindings.familyAppropriations,
    openProgramMattersForAllOffices: bindings.openProgramMatters,
    applyEnactedDuties: bindings.duties,
    applyEnactedEligibility: bindings.eligibility,
    applyLawConsequences: bindings.consequences,
  },
);

describe("enactment golden fan-out at every place and government level", () => {
  it.each(Object.keys(STATES))(
    "retains writer order and every effective context in US-%s",
    (usps) => {
      for (const level of ["local", "state", "federal"])
        for (const ready of [false, true])
          for (const enacted of [false, true])
            for (const existing of [[], ["generic", "family"]]) {
              const measureId = `${level}:US-${usps}`;
              const fixture: Fixture = {
                currentDate: "2026-01-01",
                personOrder: ["p1", "p2"],
                trace: [],
                history: {
                  legislativeEnactments: [
                    {
                      id: "vote",
                      measureId,
                      outcome: enacted ? "enacted" : "failed",
                    },
                  ],
                  taxProposals: [{ id: "tax", measureId, ready }],
                  publicProgramRecords: existing.map((id) => ({
                    id,
                    kind: "appropriation",
                  })),
                },
              };
              const actual = applyEnactedLawEffectsFromReaders(
                fixture,
                measureId,
                bindings,
              );
              expect(actual).toEqual(
                old.applyEnactedLawEffects(fixture, measureId),
              );
              expect(
                applyNewlyEnactedLawEffectsFromReaders(
                  fixture,
                  fixture,
                  bindings,
                ),
              ).toBe(fixture);
              const before = {
                ...fixture,
                history: { ...fixture.history, legislativeEnactments: [] },
              };
              expect(
                applyNewlyEnactedLawEffectsFromReaders(
                  before,
                  fixture,
                  bindings,
                ),
              ).toEqual(old.applyNewlyEnactedLawEffects(before, fixture));
              if (enacted) {
                const last = actual.trace.at(-1) as { extra: EffectiveContext };
                expect(last.extra.subjectIds).toEqual(["p1", "p2"]);
                expect(last.extra.governingLawId).toBe(measureId);
              } else expect(actual).toBe(fixture);
            }
    },
  );
  it("preserves common consequence selection and identity/operative guards", () => {
    // Execute the unchanged entire driver with resolvers/writers bound to trace fixtures.
    const row = { id: "row", kind: "pay", when: "payroll" };
    const context = {
      activity: "payroll",
      activityId: "paycheck",
      onDate: "2026-02-01",
      subjectIds: ["p"],
    };
    for (const effectiveAt of ["2026-01-01", "2026-02-01", "2026-02-02"])
      for (const operativeAt of ["2026-01-01", "2026-02-02"])
        for (const lawId of [undefined, "law", "other"])
          for (const returnedRow of ["row", "bad"]) {
            const input = {
              row: { id: returnedRow },
              questionKey: "question",
              activityId: "paycheck",
              effectiveAt,
              law: { measureId: "law", operativeAt },
            };
            const handler = {
              kind: "pay",
              resolve: () => [input],
              apply: (state: { applied: number }) => ({
                ...state,
                applied: state.applied + 1,
              }),
            };
            const registrations = [handler];
            const legacy = legacyDeclarations<{
              applyLawConsequences: (
                world: unknown,
                context: unknown,
                registrations: unknown[],
              ) => { applied: number };
            }>("enacted-law-effects.ts", ["applyLawConsequences"], {
              lawConsequenceRegistrations: () => registrations,
              createLawConsequenceRegistry: () => ({
                handlers: new Map([["pay", handler]]),
                capabilities: {},
              }),
              validateLawConsequences: () => [],
              MissingLawConsequenceTerm: class extends Error {},
              recordById: () => null,
              createStableId: () => "",
              recordWorldEvent: () => {
                throw new Error("unexpected gap");
              },
              isCountyServiceProgram: () => false,
            }).applyLawConsequences;
            const completeContext = {
              ...context,
              ...(lawId ? { governingLawId: lawId } : {}),
            };
            const actual = resultOf(() =>
              resolvedConsequenceApplies(
                {
                  rowId: returnedRow,
                  questionKey: input.questionKey,
                  activityId: input.activityId,
                  measureId: input.law.measureId,
                  effectiveAt,
                  operativeAt,
                },
                row.id,
                "question",
                completeContext,
              )
                ? 1
                : 0,
            );
            const expected = resultOf(
              () =>
                legacy(
                  {
                    applied: 0,
                    policyCatalog: {
                      propositionOrder: ["q"],
                      propositions: {
                        q: { stableKey: "question", consequences: [row] },
                      },
                    },
                  },
                  completeContext,
                  registrations,
                ).applied,
            );
            expect(actual).toEqual(expected);
          }
    expect(consequenceRowsForActivity("question", [row], context)).toEqual([
      row,
    ]);
    expect(
      consequenceRowsForActivity("question", [row], {
        ...context,
        questionKey: "other",
      }),
    ).toEqual([]);
    expect(
      consequenceRowsForActivity("question", [row], {
        ...context,
        standingAppropriationId: "standing",
      }),
    ).toEqual([]);
  });
});
