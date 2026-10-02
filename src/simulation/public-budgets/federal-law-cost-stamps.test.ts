import { describe, expect, it } from "vitest";
import federalBudget from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import { observerPlace } from "../../presentation/observer-world";
import { createWorld } from "../world";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { CUT_FARM_SUBSIDIES_QUESTION } from "../federal-farm-subsidy-law";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../federal-outlay-laws";
import { GROW_DEFENSE_SPENDING_QUESTION } from "../federal-defense-spending";
import { isLawEffectStamp } from "../law-effect-stamp";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  LegislativeProvisionRecord,
  World,
} from "../types";
import { PUBLIC_BUDGETS_VERSION } from "./store";
import {
  FEDERAL_OUTLAYS,
  openFederalTreasury,
  settleFederalTreasuryMonth,
} from "./federal-treasury";

/** Archived forecast compatibility only; the live budget pass no longer invokes it. */
function settleArchivedForecast(world: World, month: IsoDate): World {
  const store = world.publicBudgets!;
  return {
    ...world,
    publicBudgets: {
      ...store,
      federal: settleFederalTreasuryMonth(world, store.federal!, month),
    },
  };
}

function enact(
  world: World,
  answer: "yes" | "no",
  at: IsoDate,
  n = 1,
  questionKey = GROW_DEFENSE_SPENDING_QUESTION,
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === questionKey,
  )!;
  const measure: LegislativeMeasureRecord = {
    id: `measure_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}`,
    sequence: n * 2,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${n}`,
    shortTitle: "Controlled defense act",
    summary: "Controlled defense act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: at,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}:enactment`,
    sequence: n * 2 + 1,
    measureId: measure.id,
    resolvedAt: at,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: at,
    outcomeEventId: `event_defense_${n}` as EntityId,
  };
  // Controlled adopted amounts, not production defaults or cash payments.
  const term =
    questionKey === DEBT_LIMIT_CUTS_QUESTION
      ? { key: "offset", value: 1200 }
      : questionKey === GROW_DEFENSE_SPENDING_QUESTION
        ? {
            key: "appropriation",
            value: federalBudget.outlays.nationalDefense + 1200,
          }
        : questionKey === INCREASE_FOREIGN_AID_QUESTION
          ? {
              key: "appropriation",
              value: federalBudget.outlays.internationalAffairs + 1200,
            }
          : null;
  const provision: LegislativeProvisionRecord | null =
    answer === "yes" && term
      ? {
          id: `provision_defense_${n}` as EntityId,
          stableKey: `test:defense:${n}:annual-amount`,
          sequence: measure.sequence,
          measureId: measure.id,
          provisionKey: term.key,
          sectionNumber: 1,
          heading: "Controlled annual amount",
          text: "Explicit annual amount for the archived budget reader fixture.",
          beneficiary: {
            kind: "general-application",
            appliesToLabel: "Federal budget",
          },
          applicationScope: {
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            segmentKey: null,
          },
          fiscalExposureLabel: null,
          fiscalExposureMinorUnits: null,
          recordedAt: at,
          supersedesProvisionId: null,
          originAmendmentId: null,
          eventId: `event_provision_defense_${n}` as EntityId,
          lawTerms: [{ questionKey, ...term, unit: "dollars/year" }],
        }
      : null;
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
      legislativeProvisions: [
        ...(world.history.legislativeProvisions ?? []),
        ...(provision ? [provision] : []),
      ],
    },
  };
}
const seen = new Set<string>();
const cases: { seed: string; place: ReturnType<typeof observerPlace> }[] = [];
for (let n = 0; cases.length < 5 && n < 100; n += 1) {
  const seed = `team1-defense-cost-${n}`;
  const place = observerPlace(seed);
  if (!place.stateJurisdictionKey || seen.has(place.stateJurisdictionKey))
    continue;
  seen.add(place.stateJurisdictionKey);
  cases.push({ seed, place });
}
function fixture(seed: string, stateKey: string): World {
  const world = createWorld({
    seed,
    currentDate: makeIsoDate("2026-07-01"),
    jurisdictions: [
      NATIONAL_ELECTION_JURISDICTION,
      stateJurisdictionForKey(stateKey)!,
    ],
    people: [],
    lineage: "production",
  });
  return {
    ...world,
    publicBudgets: {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
      federal: openFederalTreasury(makeIsoDate("2026-01-05")),
      // Explicit saved spending inputs to this archived compatibility reader.
      // These do not claim a production settlement or actual cash receipt.
      federalGovernment: {
        months: Array.from({ length: 12 }, (_, index) => ({
          month: makeIsoDate(`2025-${String(index + 1).padStart(2, "0")}-01`),
          spending: FEDERAL_OUTLAYS.map(
            (key) => federalBudget.outlays[key] / 12,
          ),
        })),
      },
    },
  } as unknown as World;
}
const questions = [
  { questionKey: GROW_DEFENSE_SPENDING_QUESTION, sign: 1 },
  { questionKey: INCREASE_FOREIGN_AID_QUESTION, sign: 1 },
  { questionKey: DEBT_LIMIT_CUTS_QUESTION, sign: -1 },
  { questionKey: CUT_FARM_SUBSIDIES_QUESTION, sign: -1 },
];
// Minimal budget-reader fixtures, not ordinary political passage or residents.
// Adopted terms and saved bases are mandatory; yes/no alone creates no cost.
describe("archived federal forecast laws retain compatibility stamps across five seeded states", () => {
  it.each(
    cases.flatMap((place) =>
      questions.map((question) => ({ ...place, ...question })),
    ),
  )(
    "$questionKey saves a changed federal budget row in $place.displayName ($seed)",
    ({ seed, place, questionKey, sign }) => {
      const world = fixture(seed, place.stateJurisdictionKey!);
      const month = makeIsoDate("2026-07-01");
      const baseline = settleArchivedForecast(
        world,
        month,
      ).publicBudgets!.federal!.months.at(-1)!;
      const passed = enact(
        world,
        "yes",
        makeIsoDate("2026-01-05"),
        1,
        questionKey,
      );
      const saved = settleArchivedForecast(passed, month);
      const after = saved.publicBudgets!.federal!.months.at(-1)!;
      const costs = after.laws.filter((l) => l.questionKey === questionKey);
      expect(costs.length).toBeGreaterThan(0);
      for (const cost of costs) {
        expect(cost.amount * sign).toBeGreaterThan(0);
        const index = FEDERAL_OUTLAYS.indexOf(
          cost.line as (typeof FEDERAL_OUTLAYS)[number],
        );
        expect(index).toBeGreaterThanOrEqual(0);
        expect(
          Math.abs(
            after.outlays[index]! - baseline.outlays[index]! - cost.amount,
          ),
        ).toBeLessThanOrEqual(1);
        expect(cost.lawEffectStamps).toHaveLength(1);
        const stamp = cost.lawEffectStamps![0]!;
        expect(isLawEffectStamp(stamp)).toBe(true);
        expect(stamp).toMatchObject({
          governingLawKey: "measure_defense_1",
          effectKind: "government-outlay-change",
          questionKey,
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          operativeAt: "2026-01-05",
          appliedAt: month,
          sourceRecordIds: ["measure_defense_1"],
        });
      }
      const changed = after.outlays.reduce(
        (sum, value, i) => sum + value - baseline.outlays[i]!,
        0,
      );
      expect(after.deficit - baseline.deficit).toBe(changed);
      expect(after.debtHeldByPublic - baseline.debtHeldByPublic).toBe(changed);
      const reload = JSON.parse(JSON.stringify(saved)) as World;
      expect(reload.publicBudgets!.federal!.months).toEqual(
        saved.publicBudgets!.federal!.months,
      );
      const repealed = enact(
        reload,
        "no",
        makeIsoDate("2026-08-01"),
        2,
        questionKey,
      );
      const next = settleArchivedForecast(repealed, makeIsoDate("2026-08-01"));
      expect(
        next
          .publicBudgets!.federal!.months.at(-1)!
          .laws.some((l) => l.questionKey === questionKey),
      ).toBe(false);
      expect(next.publicBudgets!.federal!.months[0]!.laws).toEqual(after.laws);
      console.log(
        JSON.stringify({
          seed,
          place: place.displayName,
          state: place.stateJurisdictionKey,
          questionKey,
          month,
          changedOutlays: changed,
          extraBorrowing: after.deficit - baseline.deficit,
          stampedRows: costs.length,
          scope:
            "controlled archived budget fixture; adopted terms and saved base, not actual cash",
          reloadAndRepeal: "PASS",
        }),
      );
    },
  );
  it.each(questions)(
    "$questionKey saves no cost before the law is operative",
    ({ questionKey }) => {
      const world = fixture(
        "team1-cost-future",
        cases[0]!.place.stateJurisdictionKey!,
      );
      const future = enact(
        world,
        "yes",
        makeIsoDate("2027-01-01"),
        1,
        questionKey,
      );
      const saved = settleArchivedForecast(future, makeIsoDate("2026-07-01"));
      expect(saved.publicBudgets!.federal!.months.at(-1)!.laws).toEqual([]);
    },
  );
});
