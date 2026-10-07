import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../simulation/dates";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { createProductionPolicyCatalog } from "../simulation/production-catalog";
import { createWorld } from "../simulation/world";
import { SeededRng } from "../simulation/rng";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { lawInForceAtStart } from "../simulation/governing/law-in-force";
import { isLawEffectStamp } from "../simulation/law-effect-stamp";
import { withOpenedBudgets } from "../simulation/public-budgets/index";
import {
  settleGovernmentMonth,
  type MonthFlows,
} from "../simulation/public-budgets/month";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
} from "../simulation/public-budgets/store";
import { mileageBudgetStamp } from "../simulation/public-budgets/mileage-law-stamp";
import { MILEAGE_FEE_QUESTION } from "../simulation/public-budgets/road-usage-charge";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../simulation/types";

const flows: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
const seed = "team6-mileage-stamp-five-state-20260930";
const candidates = [...US_STATE_USPS];
const sample = new SeededRng(seed);
for (let index = candidates.length - 1; index > 0; index--) {
  const swap = sample.integer(0, index);
  [candidates[index], candidates[swap]] = [
    candidates[swap]!,
    candidates[index]!,
  ];
}

function fixture(usps: string) {
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const catalog = createProductionPolicyCatalog();
  const question = Object.values(catalog.propositions).find(
    (row) => row.stableKey === MILEAGE_FEE_QUESTION,
  )!;
  const base = createWorld({
    seed: `${seed}:${usps}`,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: [state],
    people: [],
    policyCatalog: catalog,
  });
  const government = withOpenedBudgets(
    base,
    {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    },
    base.currentDate,
  ).governments.find((row) => row.key === `US-${usps}`)!;
  const date = makeIsoDate("2026-02-01");
  const measure: LegislativeMeasureRecord = {
    id: `measure_mileage_${usps}` as EntityId,
    stableKey: `mileage:${usps}`,
    sequence: base.history.nextSequence,
    jurisdictionId: state.id,
    rulePackId: "authored-stamp-fixture",
    designation: "HB mileage",
    shortTitle: "Authored mileage stamp fixture",
    summary: "A legal change for attribution checks.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: date,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_mileage_${usps}` as EntityId,
    stableKey: `mileage:${usps}:enacted`,
    sequence: base.history.nextSequence + 1,
    measureId: measure.id,
    resolvedAt: date,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: date,
    outcomeEventId: `event_mileage_${usps}` as EntityId,
  };
  const world: World = {
    ...base,
    currentDate: makeIsoDate("2029-03-01"),
    history: {
      ...base.history,
      nextSequence: base.history.nextSequence + 2,
      legislativeMeasures: [measure],
      legislativeEnactments: [enactment],
    },
  };
  return { base, world, government, measure, question };
}

describe("mileage attribution helper uses the existing saved budget source", () => {
  it.each(candidates.slice(0, 5))(
    "%s retains the operative identity without changing revenue or creating a driver payment",
    (usps) => {
      const { world, government, measure, question } = fixture(usps);
      const month = makeIsoDate("2029-02-01");
      const settled = settleGovernmentMonth(
        world,
        government,
        month,
        flows,
      ).government.months.at(-1)!;
      const before = JSON.stringify(settled);
      const historyBefore = JSON.stringify(world.history);
      const stamp = mileageBudgetStamp(
        world,
        government,
        month,
        settled.revenue,
      );
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp).toMatchObject({
        governingLawKey: measure.id,
        questionKey: MILEAGE_FEE_QUESTION,
        jurisdictionId: government.lawJurisdictionId,
        appliedAt: month,
        effectKind: "modeled-road-charge-budget-revenue",
      });
      expect(JSON.stringify(settled)).toBe(before);
      expect(JSON.stringify(world.history)).toBe(historyBefore);
      expect(JSON.parse(JSON.stringify(stamp))).toEqual(stamp);
      const selective = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
      const zeroRevenue = [...settled.revenue];
      zeroRevenue[selective] = 0;
      expect(
        mileageBudgetStamp(world, government, month, zeroRevenue),
      ).toBeNull();
      expect(
        mileageBudgetStamp(
          world,
          { ...government, level: "county" },
          month,
          settled.revenue,
        ),
      ).toBeNull();
      const earlyMonth = makeIsoDate("2026-03-01");
      const early = mileageBudgetStamp(
        world,
        government,
        earlyMonth,
        settled.revenue,
      );
      const proposition = question.id;
      if (
        lawInForceAtStart(
          world,
          government.lawJurisdictionId,
          proposition,
          earlyMonth,
        ) === "yes"
      )
        expect(isLawEffectStamp(early)).toBe(true);
      else expect(early).toBeNull();
      const repealed: World = {
        ...world,
        history: {
          ...world.history,
          legislativeMeasures: [
            {
              ...measure,
              propositionAnswers: [
                { propositionId: question.id, answer: "no" },
              ],
            },
          ],
        },
      };
      expect(
        mileageBudgetStamp(repealed, government, month, settled.revenue),
      ).toBeNull();
      const missing: World = {
        ...world,
        policyCatalog: { ...world.policyCatalog, propositions: {} },
      };
      expect(
        mileageBudgetStamp(missing, government, month, settled.revenue),
      ).toBeNull();
    },
  );
});
