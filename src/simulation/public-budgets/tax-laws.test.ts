import { describe, expect, it } from "vitest";
import stateIncomeTax2026 from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetStore,
} from ".";
import { firstOfNextMonth } from "./fiscal";
import {
  readMonthFlows,
  settleGovernmentMonth,
  type MonthFlows,
} from "./month";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../../tests/fixtures/tax-policy-fixture";
import { declarePersonalTaxOccurrence } from "../../presentation/tax-work";
import { createTaxTransitionHandlerRegistry } from "../tax-policy";
import { resourcePositionAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import type { TaxTerms } from "../tax-types";

/*
 * The income-tax controls retain explicit refusal of forecast-only money.
 * The collection fixtures use an explicitly authored declared sale and the
 * existing sourced excise authority fixture. They exercise terms × saved base,
 * not automatic grocery/cannabis law admission or nationwide sales-tax powers.
 */

const INCOME_TAX = "proposition_income_tax" as EntityId;
const QUESTIONS: Readonly<Record<string, EntityId>> = {
  "fiscal.adopt-income-tax": INCOME_TAX,
};

interface Law {
  readonly question: EntityId;
  readonly answer: "yes" | "no";
  readonly effectiveAt: string;
}

function worldWith(stateKey: string, laws: readonly Law[]): World {
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  return {
    id: "world_test" as EntityId,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: Object.fromEntries(
        Object.entries(QUESTIONS).map(([key, id]) => [
          id,
          { id, stableKey: `us-policy-positions:${key}` },
        ]),
      ),
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId,
        propositionIds: [law.question],
        propositionAnswers: [
          { propositionId: law.question, answer: law.answer },
        ],
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

/** The state's budget, opened and settled month by month through `last`. */
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

function drawn(seed: string, keys: readonly string[]): string {
  return keys[new SeededRng(seed).nextUint32() % keys.length]!;
}

const STATE_KEYS = Object.keys(stateIncomeTax2026.places);

describe("tax laws reach state budgets", () => {
  it("does not invent adopted-tax collections for a state without saved cash or recorded payments", () => {
    const without = STATE_KEYS.filter(
      (key) =>
        stateIncomeTax2026.places[key as keyof typeof stateIncomeTax2026.places]
          .wageIncomeTax === "none",
    );
    expect(without).toHaveLength(9);
    for (const stateKey of without) {
      const world = worldWith(stateKey, [
        { question: INCOME_TAX, answer: "yes", effectiveAt: "2026-05-12" },
      ]);
      const government = settled(world, stateKey, "2027-01-01");
      expect(government.months, stateKey).toEqual([]);
    }
  });

  it("neither adoption nor repeal settles money without an actual saved account and payment", () => {
    const stateKey = drawn(
      "b9-adopt-income-tax",
      STATE_KEYS.filter(
        (key) =>
          stateIncomeTax2026.places[
            key as keyof typeof stateIncomeTax2026.places
          ].wageIncomeTax === "none",
      ),
    );
    const world = worldWith(stateKey, [
      { question: INCOME_TAX, answer: "yes", effectiveAt: "2026-05-12" },
      { question: INCOME_TAX, answer: "no", effectiveAt: "2028-06-01" },
    ]);
    const without = worldWith(stateKey, []);
    const lawful = settled(world, stateKey, "2029-06-01");
    const asBegun = settled(without, stateKey, "2029-06-01");
    expect(lawful.months).toEqual([]);
    expect(lawful.balance).toBe(asBegun.balance);
    expect(lawful.reserve).toBe(asBegun.reserve);
  });

  it.each([
    {
      name: "taxable declared sale",
      amount: 2_100,
      exempt: false,
      rate: 5,
      expected: 105,
    },
    {
      name: "enacted sale exemption",
      amount: 2_100,
      exempt: true,
      rate: 5,
      expected: 0,
    },
    {
      name: "explicit zero-rate law",
      amount: 2_100,
      exempt: false,
      rate: 0,
      expected: 0,
    },
  ])(
    "$name reaches the common cash ledger only after actual collection",
    ({ amount, exempt, rate, expected }) => {
      const terms: TaxTerms = {
        ...TEST_TAX_TERMS,
        baseLabel: "explicitly authored test sale",
        assumptionNote:
          "Authored sale base and levy terms; no real grocery/cannabis rate or automatic law binding is asserted.",
        rateNumerator: rate,
        allowanceMinorUnits: 0,
        exemptBaseKeys: exempt ? [TEST_TAX_TERMS.baseKey] : [],
      };
      const fixture = enactedTaxFixture(10_000, terms);
      const registry = createTaxTransitionHandlerRegistry();
      let world = advanceWorld(
        fixture.world,
        daysBetween(
          fixture.world.currentDate,
          fixture.world.history.taxPolicies![0]!.effectiveAt,
        ),
        registry,
      );
      const proposal = world.history.taxProposals!.find(
        (row) => row.id === fixture.proposalId,
      )!;
      const empty: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      };
      const opened = withOpenedBudgets(world, empty, world.currentDate);
      const government = opened.governments.find(
        (row) => row.jurisdictionId === proposal.jurisdictionId,
      )!;
      expect(government).toBeDefined();
      const store: PublicBudgetStore = {
        ...opened,
        governments: [government],
        cursor: { flows: 0, outcomes: 0 },
      };
      const owner = {
        kind: "organization" as const,
        organizationId: proposal.publicOrganizationId,
      };
      const openingCash = resourcePositionAt(world, owner, terms.currency)!
        .liquidBalance.minorUnits;
      const input = {
        personId: fixture.personId,
        stableKey: "a22:declared-sale",
        proposalId: fixture.proposalId,
        baseKey: terms.baseKey,
        amountMinorUnits: amount,
        assumptionNote:
          "Explicit authored declared sale; the existing writer records its occurrence and base.",
      };
      world = declarePersonalTaxOccurrence(world, input);
      const base = world.history.taxBases!.at(-1)!;
      const assessment = world.history.taxAssessments!.at(-1)!;
      expect(base.amount.minorUnits).toBe(amount);
      expect(base.payer).toEqual({
        kind: "person",
        personId: fixture.personId,
      });
      expect(
        world.history.events.some((event) => event.id === base.sourceEventId),
      ).toBe(true);
      expect(assessment.baseId).toBe(base.id);
      expect(assessment.taxAmount.minorUnits).toBe(expected);
      const before = readMonthFlows(world, store);
      expect(
        before.flows.recorded
          ?.get(government.key)
          ?.revenueMinorUnits.reduce((sum, value) => sum + value, 0) ?? 0,
      ).toBe(0);
      expect(
        resourcePositionAt(world, owner, terms.currency)!.liquidBalance
          .minorUnits,
      ).toBe(openingCash);
      world = advanceWorld(world, terms.collectionLagDays, registry);
      const collection = world.history.taxCollections!.at(-1)!;
      expect(collection.assessmentId).toBe(assessment.id);
      expect(collection.transferredAmount.minorUnits).toBe(expected);
      expect(collection.status).toBe(expected === 0 ? "zero" : "collected");
      const transfer = world.history.resourceTransferOutcomes.find(
        (row) => row.id === collection.resourceOutcomeId,
      );
      if (expected > 0) {
        expect(transfer?.status).toBe("completed");
        expect(transfer?.transferredAmount.minorUnits).toBe(expected);
      } else {
        expect(collection.resourceOutcomeId).toBeNull();
        expect(transfer).toBeUndefined();
      }
      const read = readMonthFlows(world, store);
      const receipt = read.flows.recorded?.get(government.key);
      const slot = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
      expect(receipt?.revenueMinorUnits[slot] ?? 0).toBe(expected);
      expect(
        resourcePositionAt(world, owner, terms.currency)!.liquidBalance
          .minorUnits,
      ).toBe(openingCash + expected);
      const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
      const settled = settleGovernmentMonth(
        world,
        government,
        month,
        read.flows,
      ).government;
      expect(
        settled.months.find((row) => row.month === month)!.revenue[slot],
      ).toBe(expected / 100);
      if (transfer) expect(receipt!.sourceRecordIds).toContain(transfer.id);
      const saved = deserializeWorld(serializeWorld(world));
      const repeated = declarePersonalTaxOccurrence(saved, input);
      expect(repeated.history.taxBases).toEqual(world.history.taxBases);
      expect(repeated.history.taxAssessments).toEqual(
        world.history.taxAssessments,
      );
      expect(repeated.history.taxCollections).toEqual(
        world.history.taxCollections,
      );
      expect(repeated.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(
        readMonthFlows(repeated, store).flows.recorded?.get(government.key)
          ?.revenueMinorUnits[slot] ?? 0,
      ).toBe(expected);
    },
  );
});
