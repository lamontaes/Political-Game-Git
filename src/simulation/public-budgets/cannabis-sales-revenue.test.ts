import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { enactCostLawFixture } from "../../../tests/fixtures/enacted-cost-law-fixture";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../../tests/fixtures/tax-policy-fixture";
import { declarePersonalTaxOccurrence } from "../../presentation/tax-work";
import { daysBetween, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import { legislatureProfilePackId } from "../legislature-game-profile";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createTaxTransitionHandlerRegistry,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { resourcePositionAt } from "../resource-queries";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld, createWorld } from "../world";
import type { LegislativeMeasureRecord } from "../types";
import { lawInForce } from "../governing/law-in-force";
import { withOpenedBudgets } from "./index";
import { ensureOpeningGovernmentAccounts } from "./opening-government-accounts";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

const emptyStore = (): PublicBudgetStore => ({
  version: PUBLIC_BUDGETS_VERSION,
  cursor: { flows: 0, outcomes: 0 },
  governments: [],
  adjustments: [],
  unknown: [],
});
const storeFor = (government: PublicBudgetGovernment): PublicBudgetStore => ({
  ...emptyStore(),
  governments: [government],
});
const questionKey =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
const first = drawRandomPlace(
  "a16-cannabis-no-invented-receipts:1",
  (place) =>
    place.stateJurisdictionKey !== null &&
    place.stateJurisdictionKey.slice(3) in STATES,
);
const second = drawRandomPlace(
  "a16-cannabis-no-invented-receipts:2",
  (place) =>
    place.stateJurisdictionKey !== null &&
    place.stateJurisdictionKey !== first.stateJurisdictionKey &&
    place.stateJurisdictionKey.slice(3) in STATES,
);

// Authored policy votes use the existing canonical enactment fixture. They do
// not claim researched tax rates, observed purchases, or naturally won ballots.
describe("cannabis policy alone does not invent tax cash", () => {
  it.each([first, second])(
    "legalization and repeal leave receipts unchanged in $stateJurisdictionKey",
    (place) => {
      const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
      const catalog = createProductionPolicyCatalog();
      const proposition = Object.values(catalog.propositions).find(
        (entry) => entry.stableKey === questionKey,
      )!;
      const base = ensureOpeningGovernmentAccounts(
        createWorld({
          seed: `a16:${place.key}`,
          currentDate: makeIsoDate("2026-01-05"),
          jurisdictions: [state],
          people: [],
          policyCatalog: catalog,
        }),
      );
      const government = withOpenedBudgets(
        base,
        emptyStore(),
        base.currentDate,
      ).governments.find((row) => row.key === place.stateJurisdictionKey)!;
      expect(government).toBeDefined();
      for (const answer of ["yes", "no"] as const) {
        const month = makeIsoDate("2027-05-01");
        const input: LegislativeMeasureRecord = {
          id: createStableId(
            "legislative-measure",
            `a16:${place.key}:${answer}`,
          ),
          stableKey: `a16:${place.key}:${answer}`,
          sequence: base.history.nextSequence,
          jurisdictionId: state.id,
          rulePackId: legislatureProfilePackId(place.stateJurisdictionKey!),
          designation: "HB authored cannabis policy",
          shortTitle: "Authored cannabis policy",
          summary: "Policy only; no tax terms or sales occurrence.",
          origin: "member-introduction",
          subjectClass: "general-policy",
          originChamberKey: "house",
          sponsorPersonId: null,
          introducedAt: month,
          sourceDocumentKey: null,
          policyAlternativeIds: [],
          propositionIds: [proposition.id],
          propositionAnswers: [{ propositionId: proposition.id, answer }],
        };
        const fixture = enactCostLawFixture(base, input, {
          effectiveAt: month,
        });
        expect(
          lawInForce(fixture.world, state.id, proposition.id, month)?.measureId,
        ).toBe(fixture.measure.id);
        const baseline = settleGovernmentMonth(
          base,
          government,
          month,
          readMonthFlows(base, storeFor(government)).flows,
        ).government;
        const read = readMonthFlows(fixture.world, storeFor(government));
        const settled = settleGovernmentMonth(
          fixture.world,
          government,
          month,
          read.flows,
        ).government;
        expect(settled.months.at(-1)!.revenue).toEqual(
          baseline.months.at(-1)!.revenue,
        );
        expect(settled.months.at(-1)!.balance).toBe(
          baseline.months.at(-1)!.balance,
        );
        expect(
          settled.months
            .at(-1)!
            .lawEffectStamps?.some(
              (stamp) => stamp.governingLawKey === fixture.measure.id,
            ),
        ).not.toBe(true);
        expect(fixture.world.history.taxCollections ?? []).toEqual(
          base.history.taxCollections ?? [],
        );
        expect(fixture.world.history.resourceTransferOutcomes).toEqual(
          base.history.resourceTransferOutcomes,
        );
        const saved = deserializeWorld(
          serializeWorld({
            ...fixture.world,
            publicBudgets: { ...storeFor(settled), cursor: read.cursor },
          }),
        );
        expect(
          settleGovernmentMonth(
            saved,
            saved.publicBudgets!.governments[0]!,
            month,
            readMonthFlows(saved, saved.publicBudgets!).flows,
          ).government,
        ).toBe(saved.publicBudgets!.governments[0]!);
      }
    },
  );
});

// The existing typed-tax fixture admits Alaska's acquired excise authority.
// This tests shared receipt accounting, not a sourced cannabis tax binding.
describe("recorded typed-tax collections reach the exact saved public account", () => {
  it("records only the collected cents and survives Save/Continue without duplicate credit", () => {
    const fixture = enactedTaxFixture(10_000);
    const registry = createTaxTransitionHandlerRegistry();
    let world = advanceWorld(
      fixture.world,
      daysBetween(
        fixture.world.currentDate,
        fixture.world.history.taxPolicies![0]!.effectiveAt,
      ),
      registry,
    );
    const jurisdictionId = world.history.taxProposals![0]!.jurisdictionId;
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId)!;
    const before = resourcePositionAt(
      world,
      { kind: "organization", organizationId: account.organizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    world = declarePersonalTaxOccurrence(world, {
      personId: fixture.personId,
      stableKey: "a16:recorded-occurrence",
      proposalId: fixture.proposalId,
      baseKey: TEST_TAX_TERMS.baseKey,
      amountMinorUnits: 2_100,
      assumptionNote:
        "Explicit fictional occurrence under existing enacted test terms; no cannabis sales inferred.",
    });
    world = advanceWorld(world, TEST_TAX_TERMS.collectionLagDays, registry);
    const collection = world.history.taxCollections!.at(-1)!;
    expect(collection.transferredAmount.minorUnits).toBe(100);
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: account.organizationId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(before + 100);
    const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
    const opened = withOpenedBudgets(world, emptyStore(), month);
    const government = opened.governments.find(
      (row) =>
        row.lawJurisdictionId === jurisdictionId ||
        row.jurisdictionId === jurisdictionId,
    )!;
    expect(government).toBeDefined();
    const read = readMonthFlows(world, storeFor(government));
    const cash = read.flows.cash!.get(government.key)!;
    expect(cash.organizationId).toBe(account.organizationId);
    expect(
      read.flows
        .recorded!.get(government.key)!
        .revenueMinorUnits.reduce((sum, amount) => sum + amount, 0),
    ).toBe(100);
    const settled = settleGovernmentMonth(
      world,
      government,
      month,
      read.flows,
    ).government;
    expect(
      settled.months.at(-1)!.revenue.reduce((sum, amount) => sum + amount, 0),
    ).toBe(1);
    expect(settled.months.at(-1)!.cashSettlement?.organizationId).toBe(
      account.organizationId,
    );
    expect(
      settleGovernmentMonth(world, settled, month, read.flows).government,
    ).toBe(settled);
    const bytes = serializeWorld({
      ...world,
      publicBudgets: { ...storeFor(settled), cursor: read.cursor },
    });
    const saved = deserializeWorld(bytes);
    const repeated = readMonthFlows(saved, saved.publicBudgets!);
    expect(repeated.flows.recorded?.size).toBe(0);
    expect(
      settleGovernmentMonth(
        saved,
        saved.publicBudgets!.governments[0]!,
        month,
        repeated.flows,
      ).government,
    ).toBe(saved.publicBudgets!.governments[0]!);
    expect(saved.history.taxCollections).toEqual(world.history.taxCollections);
    expect(saved.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(serializeWorld(saved)).toBe(bytes);
  });
});
