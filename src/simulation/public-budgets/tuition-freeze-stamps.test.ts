import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import type { LawEffectStampedRecord } from "../law-effect-stamp";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from ".";
import { firstOfNextMonth } from "./fiscal";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import {
  TUITION_FREEZE_QUESTION,
  tuitionShareOfCharges,
} from "./tuition-freeze";
import { tuitionFreezeRevenueStamps } from "./tuition-freeze-stamps";
const FREEZE = "proposition_tuition_freeze" as EntityId;

interface Law {
  readonly answer: "yes" | "no";
  readonly effectiveAt: string;
}

function worldWith(
  stateKey: string,
  laws: readonly Law[],
  seed?: string,
): World {
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  return {
    id: "world_test" as EntityId,
    seed,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: {
        [FREEZE]: { id: FREEZE, stableKey: TUITION_FREEZE_QUESTION },
      },
    },
    history: {
      events: [],
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId,
        propositionIds: [FREEZE],
        propositionAnswers: [{ propositionId: FREEZE, answer: law.answer }],
      })),
      legislativeEnactments: laws.map((law, at) => ({
        id: `enactment_${at}` as EntityId,
        sequence: 1000 + at,
        measureId: `measure_${at}` as EntityId,
        resolvedAt: makeIsoDate(law.effectiveAt),
        outcome: "enacted",
        effectiveAt: makeIsoDate(law.effectiveAt),
      })),
    },
  } as unknown as World;
}

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

function settled(world: World, stateKey: string, last: string) {
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const opened = {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
  let current = publicBudgetFor(opened, stateJurisdictionForKey(stateKey)!.id)!;
  let month = makeIsoDate("2026-01-01");
  while (month <= last) {
    current = settleGovernmentMonth(world, current, month, NO_FLOWS).government;
    month = firstOfNextMonth(month);
  }
  return current;
}

const revenueIn = (
  government: PublicBudgetGovernment,
  source: (typeof BUDGET_SOURCES)[number],
  month: string,
) =>
  government.months.find((row) => row.month === month)!.revenue[
    BUDGET_SOURCES.indexOf(source)
  ]!;

describe("saved tuition-freeze revenue attribution", () => {
  it("stamps the existing changed charges in five places sampled from all 56", () => {
    const rng = new SeededRng("tuition-stamp-five-2026");
    const remaining = [...lifePlaceStateIdentities()];
    for (let i = 0; i < 5; i++) {
      const place = rng.pick(remaining);
      remaining.splice(remaining.indexOf(place), 1);
      const key = place.jurisdictionKey;
      const world = worldWith(
        key,
        [{ answer: "yes", effectiveAt: "2026-03-01" }],
        "tuition-stamp-five-2026",
      );
      if (tuitionShareOfCharges(key) === null) {
        const gov = {
          level: "state",
          stateKey: key,
          lawJurisdictionId: stateJurisdictionForKey(key)!.id,
        } as PublicBudgetGovernment;
        expect(
          tuitionFreezeRevenueStamps(
            world,
            gov,
            makeIsoDate("2026-07-01"),
            1000,
          ),
        ).toEqual([]);
        continue;
      }
      const control = settled(
        worldWith(key, [], "tuition-stamp-five-2026"),
        key,
        "2026-07-01",
      );
      const treated = settled(world, key, "2026-07-01");
      expect(
        revenueIn(treated, "chargesAndFees", "2026-07-01"),
        key,
      ).toBeLessThan(revenueIn(control, "chargesAndFees", "2026-07-01"));
      const row = treated.months.at(-1)! as (typeof treated.months)[number] &
        LawEffectStampedRecord;
      expect(
        row.lawEffectStamps?.filter(
          (stamp) => stamp.questionKey === TUITION_FREEZE_QUESTION,
        ),
      ).toEqual([
        expect.objectContaining({
          governingLawKey: "measure_0",
          effectKind: "tuition-freeze-revenue",
          appliedAt: "2026-07-01",
        }),
      ]);
      expect(JSON.parse(JSON.stringify(row)).lawEffectStamps).toEqual(
        row.lawEffectStamps,
      );
      expect(
        settleGovernmentMonth(world, treated, row.month, NO_FLOWS).government,
      ).toBe(treated);
      const before = treated.months.find(
        (value) => value.month === "2026-06-01",
      )! as typeof row;
      expect(
        before.lawEffectStamps?.some(
          (value) => value.questionKey === TUITION_FREEZE_QUESTION,
        ) ?? false,
      ).toBe(false);
      expect(tuitionFreezeRevenueStamps(world, treated, row.month, 0)).toEqual(
        [],
      );
    }
  });
  it("retains the past freezing law rather than attributing its remaining effect to repeal", () => {
    const places = lifePlaceStateIdentities().filter(
      (place) => tuitionShareOfCharges(place.jurisdictionKey) !== null,
    );
    const place = new SeededRng("tuition-repeal-stamp").pick(places);
    const world = worldWith(
      place.jurisdictionKey,
      [
        { answer: "yes", effectiveAt: "2026-03-01" },
        { answer: "no", effectiveAt: "2028-01-01" },
      ],
      "tuition-repeal-stamp",
    );
    const government = settled(world, place.jurisdictionKey, "2028-07-01");
    const row = government.months.at(
      -1,
    )! as (typeof government.months)[number] & LawEffectStampedRecord;
    expect(
      row.lawEffectStamps
        ?.filter((stamp) => stamp.questionKey === TUITION_FREEZE_QUESTION)
        .map((stamp) => stamp.governingLawKey),
    ).toEqual(["measure_0"]);
  });
});
