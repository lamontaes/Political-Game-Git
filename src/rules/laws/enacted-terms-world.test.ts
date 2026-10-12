import type { RuleChangeProvisionRecord } from "../../simulation/enacted-rule-changes";
import { measureAnswersAt as nativeAnswers } from "../../simulation/vote-bundle";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import {
  readFinalEnactedLawTerm,
  readFinalEnactedLawSchedule,
  readFinalEnactedLawCategories,
} from "../../simulation/governing/final-law-term-query";
import { startingLawInForce as nativeStarting } from "../../simulation/governing/law-in-force";
import * as nativeMinimum from "../../simulation/minimum-wage";
import { consumerLoanCapAt as nativeCap } from "../../simulation/consumer-loan-law";
import * as nativeOutlay from "../../simulation/federal-outlay-laws";
import { defenseBuildUpShare as nativeDefense } from "../../simulation/federal-defense-spending";
import { stateIncomeTaxUnderLaw as nativeTax } from "../../simulation/state-income-tax-law";
import { censusRegionOf } from "../../simulation/world-setup/census-regions";
import { chiefExecutiveJurisdiction } from "../../simulation/nationwide-world/government-jurisdiction";
import { FEDERAL_OUTLAYS } from "../../simulation/public-budgets/federal-budget-categories";
import { lawFacts } from "./test-support/law-facts";
import { lawInForce } from "./dated-law";
import {
  stateMinimumSettingAt,
  legalTermReceiptKey,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  type MinimumAuthorityFacts,
} from "./minimum-authority";
import { minimumHourlyAt } from "./minimum-hourly";
import { consumerLoanCapAt, CONSUMER_LOAN_CAP_QUESTION } from "./consumer-cap";
import * as outlay from "./recorded-outlays";
import {
  stateIncomeTaxUnderLaw,
  finalTermReceiptKey,
  ADOPT_STATE_INCOME_TAX_QUESTION as ADOPT,
  GRADUATED_STATE_INCOME_TAX_QUESTION as GRADUATED,
  type TaxLawFacts,
} from "./tax-law-schedules";
import { measureAnswersAt } from "./bill-answers";
import stateTaxes from "../../../data/research/money/state-income-tax-2026.json";
import incomes from "../../../data/research/money/state-household-income-cps-2023.json";
import outlayData from "../../../data/research/federal/federal-outlay-terms-fy2025.json";
import type {
  World,
  EntityId,
  LegislativeEnactmentRecord,
} from "../../simulation/types";
import type { RecordFiledProvisionInput } from "../../simulation/legislative-politics";
// Explicitly authored saved measure/provision/enactment controls; no ordinary passage claim.
function saveLaw(
  world: World,
  questionKey: string,
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  terms: RecordFiledProvisionInput["lawTerms"] = [],
  categories: RecordFiledProvisionInput["lawCategories"] = [],
) {
  const q = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === questionKey,
  )!;
  const key = `rules2:positive:${questionKey}`,
    seq = world.history.nextSequence;
  const measure = {
    id: createStableId("legislative-measure", world.id + key),
    stableKey: key,
    sequence: seq,
    jurisdictionId,
    rulePackId:
      jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
        ? "US:congress"
        : "fixture:state",
    designation: "HB 920",
    shortTitle: "Authored saved-law control",
    summary: "Read-only law mathematics; no ordinary enactment claim.",
    origin: "member-introduction" as const,
    subjectClass: "general-policy" as const,
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [q.id],
    propositionAnswers: [{ propositionId: q.id, answer }],
  };
  const provision = {
    id: createStableId("legislative-provision", world.id + key + ":terms"),
    stableKey: key + ":terms",
    sequence: seq + 1,
    measureId: measure.id,
    provisionKey: "positive",
    sectionNumber: 1,
    heading: "Authored term",
    text: "Controlled adopted terms.",
    beneficiary: {
      kind: "general-application" as const,
      appliesToLabel: "Covered public",
    },
    applicationScope: { jurisdictionId, segmentKey: null },
    lawTerms: terms,
    lawCategories: categories,
    answers: { propositionId: q.id, answer },
    filedAt: world.currentDate,
    supersedesProvisionId: null,
    originAmendmentId: null,
    fiscalExposureLabel: null,
    fiscalExposureMinorUnits: null,
    recordedAt: world.currentDate,
    eventId: createStableId("event", world.id + key + ":provision"),
  };
  const enactment: LegislativeEnactmentRecord = {
    id: createStableId("legislative-enactment", world.id + key),
    stableKey: key + ":enactment",
    sequence: seq + 2,
    measureId: measure.id,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: world.currentDate,
    outcomeEventId: createStableId("event", world.id + key),
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: seq + 3,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeProvisions: [
        ...(world.history.legislativeProvisions ?? []),
        provision,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}
function capture(call: () => unknown) {
  try {
    return { value: call() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}
describe("laws: positive adopted terms and saved-history boundaries", () => {
  it.each(Object.keys(STATES))("matches public law callers in %s", (usps) => {
    const base = smallWorld({
      place: `US-${usps}`,
      date: makeIsoDate("2026-01-01"),
      seed: `rules2:positive:${usps}`,
    });
    const world = ensureNationalElectionJurisdiction(base.world),
      date = world.currentDate;
    const stateId = base.stateJurisdictionId;
    for (const wages of [false, true, "saved-rule"] as const) {
      let saved = wages
        ? saveLaw(world, STATE_MINIMUM_WAGE_QUESTION_KEY, stateId, "yes", [
            {
              questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
              key: "target",
              unit: "minor/hour",
              value: 1875,
            },
          ])
        : world;
      if (wages === "saved-rule") {
        const measure = saved.history.legislativeMeasures!.at(-1)!;
        const rule = {
          id: createStableId("rule-change-provision", saved.id + ":wage-rule"),
          stableKey: "fixture:saved:wage-rule",
          sequence: saved.history.nextSequence,
          measureId: measure.id,
          filedAt: date,
          stateUsps: usps,
          officeKey: `us-${usps.toLowerCase()}-labor-law`,
          field: "labor.minimumWage.hourlyCents",
          value: 2100,
          applicability: {
            appliesTo: "all-current-and-future",
            ambiguity: "silent",
          },
        } as unknown as RuleChangeProvisionRecord;
        saved = {
          ...saved,
          history: {
            ...saved.history,
            nextSequence: saved.history.nextSequence + 1,
            ruleChangeProvisions: [rule],
          },
        };
      }
      const q = Object.values(saved.policyCatalog.propositions).find(
        (q) => q.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
      )!;
      const cutoff = {
        asOfDate: date,
        historySequenceExclusive: saved.history.nextSequence,
      };
      const raw = lawFacts(
        saved,
        [q.id],
        [date, saved.startedAt],
        [undefined, cutoff],
      );
      const finalTerms = new Map<
        string,
        ReturnType<typeof readFinalEnactedLawTerm>
      >();
      for (const c of [undefined, cutoff])
        for (const d of [date, saved.startedAt])
          for (const scope of ["all", "enacted-only"] as const) {
            for (const law of [
              lawInForce(raw, stateId, q.id, d, scope, c),
              nativeStarting(saved, stateId, q.id, d, c),
            ])
              if (law) {
                const query = {
                  questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
                  termKey: "target",
                  unit: "minor/hour" as const,
                  onDate: d,
                  cutoff: c,
                };
                finalTerms.set(
                  legalTermReceiptKey(law, query),
                  readFinalEnactedLawTerm(saved, law, query),
                );
              }
          }
      const facts: MinimumAuthorityFacts = {
        ...raw,
        startedAt: saved.startedAt,
        bindings: saved.history.ruleChangeConsequenceBindings ?? [],
        ruleProvisions: saved.history.ruleChangeProvisions ?? [],
        finalTerms,
      };
      for (const c of [undefined, cutoff])
        expect(stateMinimumSettingAt(facts, `US-${usps}`, date, c)).toEqual(
          nativeMinimum.stateMinimumSettingAt(saved, `US-${usps}`, date, c),
        );
      if (wages)
        expect(
          stateMinimumSettingAt(facts, `US-${usps}`, date)?.hourlyMinor,
        ).toBe(wages === "saved-rule" ? 2100 : 1875);
      for (const id of [base.jurisdictionId, stateId, null]) {
        const setting = nativeMinimum.minimumWageSettingAt(saved, id, date);
        expect(
          minimumHourlyAt(
            { settings: new Map([[`${id}:${date}`, setting]]) },
            id,
            date,
          ),
        ).toEqual(nativeMinimum.minimumHourlyAt(saved, id, date));
      }
    }
    for (const amount of [0, 1200]) {
      const saved = saveLaw(
        world,
        CONSUMER_LOAN_CAP_QUESTION,
        NATIONAL_ELECTION_JURISDICTION.id,
        "yes",
        [
          {
            questionKey: CONSUMER_LOAN_CAP_QUESTION,
            key: "cap",
            unit: "basis-points",
            value: amount,
          },
        ],
        [
          {
            questionKey: CONSUMER_LOAN_CAP_QUESTION,
            key: "coverage",
            values: ["personal"],
          },
        ],
      );
      const q = Object.values(saved.policyCatalog.propositions).find(
        (q) => q.stableKey === CONSUMER_LOAN_CAP_QUESTION,
      )!;
      const raw = lawFacts(saved, [q.id], [date], [undefined]);
      const law = lawInForce(raw, raw.federalId, q.id, date)!;
      const coverage = readFinalEnactedLawCategories(saved, law, {
        questionKey: CONSUMER_LOAN_CAP_QUESTION,
        termKey: "coverage",
        onDate: date,
      });
      const term = readFinalEnactedLawTerm(saved, law, {
        questionKey: CONSUMER_LOAN_CAP_QUESTION,
        termKey: "cap",
        unit: "basis-points",
        onDate: date,
      });
      for (const kind of ["personal", "student"] as const)
        expect(consumerLoanCapAt({ law, coverage, term }, kind, date)).toEqual(
          nativeCap(saved, kind, date),
        );
      expect(
        consumerLoanCapAt({ law, coverage, term }, "personal", date)
          ?.capBasisPoints,
      ).toBe(amount);
      const m = saved.history.legislativeMeasures!.at(-1)!,
        p = saved.history.legislativeProvisions!.at(-1)!;
      // Read-only section supersession control: exercise own helper through both public answer readers.
      const revision = {
        ...p,
        id: createStableId("legislative-provision", p.id + ":revision"),
        sequence: saved.history.nextSequence,
        supersedesProvisionId: p.id,
        answers: { propositionId: q.id, answer: "no" as const },
      };
      const revised = {
        ...saved,
        history: {
          ...saved.history,
          nextSequence: saved.history.nextSequence + 1,
          legislativeProvisions: [
            ...saved.history.legislativeProvisions!,
            revision,
          ],
        },
      };
      for (const seq of [p.sequence, revision.sequence, revision.sequence + 1])
        expect(
          measureAnswersAt(
            {
              nextSequence: revised.history.nextSequence,
              measures: revised.history.legislativeMeasures!,
              provisions: revised.history.legislativeProvisions!,
              itemVetoes: revised.history.itemVetoes ?? [],
            },
            m.id,
            seq,
          ),
        ).toEqual(nativeAnswers(revised, m.id, seq));
      const vetoed = {
        ...revised,
        history: {
          ...revised.history,
          itemVetoes: [
            {
              measureId: m.id,
              provisionId: revision.id,
              dispositionSequence: revision.sequence + 1,
            },
          ] as unknown as NonNullable<World["history"]["itemVetoes"]>,
        },
      };
      for (const seq of [revision.sequence + 1, revision.sequence + 2])
        expect(
          measureAnswersAt(
            {
              nextSequence: seq,
              measures: vetoed.history.legislativeMeasures!,
              provisions: vetoed.history.legislativeProvisions!,
              itemVetoes: vetoed.history.itemVetoes!,
            },
            m.id,
            seq,
          ),
        ).toEqual(nativeAnswers(vetoed, m.id, seq));
    }
    for (const adoptAnswer of ["yes", "no"] as const)
      for (const shape of ["yes", "no"] as const) {
        let saved = saveLaw(world, ADOPT, stateId, adoptAnswer, [
          { questionKey: ADOPT, key: "rate", unit: "ratio", value: 0.04 },
          {
            questionKey: ADOPT,
            key: "threshold",
            unit: "minor",
            value: 1000000,
          },
        ]);
        saved = saveLaw(saved, GRADUATED, stateId, shape);
        const qs = Object.values(saved.policyCatalog.propositions).filter((q) =>
          [ADOPT, GRADUATED].includes(q.stableKey),
        );
        const raw = lawFacts(
          saved,
          qs.map((q) => q.id),
          [date],
          [undefined],
        );
        const finalTerms = new Map<
            string,
            ReturnType<typeof readFinalEnactedLawTerm>
          >(),
          finalSchedules = new Map<
            string,
            ReturnType<typeof readFinalEnactedLawSchedule>
          >();
        for (const q of qs)
          for (const scope of ["all", "enacted-only"] as const) {
            const law = lawInForce(raw, stateId, q.id, date, scope);
            if (!law) continue;
            for (const [termKey, unit] of [
              ["rate", "ratio"],
              ["threshold", "minor"],
            ] as const) {
              const query = {
                questionKey: q.stableKey,
                termKey,
                unit,
                onDate: date,
              };
              finalTerms.set(
                finalTermReceiptKey(law.measureId, query),
                readFinalEnactedLawTerm(saved, law, query),
              );
            }
            for (const termKey of ["rate", "brackets"]) {
              const query = { questionKey: q.stableKey, termKey, onDate: date };
              finalSchedules.set(
                finalTermReceiptKey(law.measureId, query),
                readFinalEnactedLawSchedule(saved, law, query),
              );
            }
          }
        const facts: TaxLawFacts = {
          ...raw,
          places: stateTaxes.places,
          householdIncomes: incomes.medianHouseholdIncomeDollarsByState,
          regions: new Map(
            Object.keys(stateTaxes.places).map((k) => [
              k.slice(3),
              censusRegionOf(k.slice(3)),
            ]),
          ),
          sourceUrl: stateTaxes.source.url,
          governingJurisdictions: new Map(
            Object.keys(STATES).flatMap((k) => {
              const j = chiefExecutiveJurisdiction(k);
              return j ? [[k, j] as const] : [];
            }),
          ),
          finalTerms,
          finalSchedules,
        };
        for (const status of [
          "single",
          "married-filing-jointly",
          "head-of-household",
        ] as const)
          expect(
            capture(() =>
              stateIncomeTaxUnderLaw(facts, `US-${usps}`, status, date),
            ),
          ).toEqual(
            capture(() => nativeTax(saved, `US-${usps}`, status, date)),
          );
      }
    let saved = world;
    const keys = [
      outlay.DEBT_LIMIT_CUTS_QUESTION,
      outlay.INCREASE_FOREIGN_AID_QUESTION,
      outlay.GROW_DEFENSE_SPENDING_QUESTION,
    ];
    for (const key of keys)
      saved = saveLaw(saved, key, NATIONAL_ELECTION_JURISDICTION.id, "yes", [
        {
          questionKey: key,
          key:
            key === outlay.DEBT_LIMIT_CUTS_QUESTION
              ? "offset"
              : "appropriation",
          unit: "dollars/year",
          value: 50000,
        },
      ]);
    const qs = Object.values(saved.policyCatalog.propositions).filter((q) =>
      keys.includes(q.stableKey),
    );
    const raw = lawFacts(
      saved,
      qs.map((q) => q.id),
      [date],
      [undefined],
    );
    const laws = new Map(
      keys.map((key) => {
        const q = qs.find((q) => q.stableKey === key)!;
        return [
          `${key}:${date}`,
          lawInForce(raw, raw.federalId, q.id, date),
        ] as const;
      }),
    );
    const terms = new Map<string, ReturnType<typeof readFinalEnactedLawTerm>>();
    for (const key of keys) {
      const law = laws.get(`${key}:${date}`)!;
      for (const termKey of ["offset", "appropriation"])
        terms.set(
          `${law.measureId}:${key}:${termKey}:${date}`,
          readFinalEnactedLawTerm(saved, law, {
            questionKey: key,
            termKey,
            unit: "dollars/year",
            onDate: date,
          }),
        );
    }
    for (const count of [11, 12]) {
      const months = Array.from({ length: count }, (_, i) => ({
        month: makeIsoDate(`2025-${String(i + 1).padStart(2, "0")}-01`),
        spending: FEDERAL_OUTLAYS.map((_, line) => 100 + line + i),
      }));
      const observed = {
        ...saved,
        publicBudgets: {
          ...saved.publicBudgets,
          federalGovernment: {
            ...saved.publicBudgets?.federalGovernment,
            months,
          },
        } as unknown as World["publicBudgets"],
      };
      const facts = {
        onDate: date,
        months,
        lines: FEDERAL_OUTLAYS,
        nationalGdp: outlayData.nationalGdp2025,
        laws,
        terms,
      };
      expect(outlay.federalOutlayChangeAt(facts, date)).toEqual(
        nativeOutlay.federalOutlayChangeAt(observed, date),
      );
      expect(outlay.federalOutlayLawLineChangesAt(facts, date)).toEqual(
        nativeOutlay.federalOutlayLawLineChangesAt(observed, date),
      );
      expect(outlay.federalDeficitChangePctOfGdp(facts, date)).toEqual(
        nativeOutlay.federalDeficitChangePctOfGdp(observed, date),
      );
      expect(outlay.federalAidFactor(facts, date)).toEqual(
        nativeOutlay.federalAidFactor(observed, date),
      );
      expect(outlay.defenseBuildUpShare(facts, date)).toEqual(
        nativeDefense(observed, date),
      );
    }
  });
});
