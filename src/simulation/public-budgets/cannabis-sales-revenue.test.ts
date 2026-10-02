import {
  QUESTION,
  fixture,
  dispatch,
  balances,
} from "../../../tests/fixtures/cannabis-tax-fixture";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { withOpenedBudgets } from "../public-budgets";
import { readMonthFlows, settleGovernmentMonth } from "../public-budgets/month";
import {
  PUBLIC_BUDGETS_VERSION,
  BUDGET_SOURCES,
} from "../public-budgets/store";
import { typedTaxQuestionRow } from "../law-consequences/typed-tax-question-data";
import { describe, expect, it } from "vitest";
import { TEST_TAX_TERMS } from "../../../tests/fixtures/tax-policy-fixture";

import { advanceWorld, assertWorldIntegrity } from "../world";
import { makeIsoDate } from "../dates";

import { serializeWorld, deserializeWorld } from "../serialization";

import {
  createTaxTransitionHandlerRegistry,
  recordTaxBase,
  taxBaseOccurrenceSource,
} from "../tax-policy";
import { createOrganization } from "../life";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
  currentResourceCutoff,
} from "../resource-queries";
import { paymentFromDatedCash } from "../resource-payments";

describe("recorded cannabis receipts replace population forecasts", () => {
  it("recorded cannabis purchases use the enacted tax rate and credit actual paid cash once", () => {
    const f = fixture(10000, 0, true, QUESTION, false);
    expect(f.world.history.taxBases ?? []).toHaveLength(0);
    expect(
      dispatch(f.world, f.context).history.taxAssessments ?? [],
    ).toHaveLength(0);
    const seed = "overflow3:a16:typed-tax-new-game";
    const place = drawRandomPlace(seed);
    const { world: opened } = smallWorld({ place: place.key, seed, people: 3 });
    assertWorldIntegrity(opened);
    const reopened = deserializeWorld(serializeWorld(opened));
    expect(reopened.seed).toBe(seed);
    console.info(
      `A16 new game: ${place.key}; ${place.stateJurisdictionKey}; seed ${seed}`,
    );
    const question = Object.values(reopened.policyCatalog.propositions).find(
      (row) => row.stableKey === QUESTION,
    )!;
    expect(question.consequences).toContainEqual(typedTaxQuestionRow(QUESTION));
    let world = {
      ...f.world,
      policyCatalog: {
        ...f.world.policyCatalog,
        propositions: {
          ...f.world.policyCatalog.propositions,
          [f.propositionId]: {
            ...f.world.policyCatalog.propositions[f.propositionId]!,
            consequences: question.consequences,
          },
        },
      },
    };
    const provenance = {
      kind: "authored" as const,
      note: "Controlled buyer and seller agree this purchase; amounts below are actual recorded transfers, not a sales-level forecast.",
    };
    world = createOrganization(world, {
      stableKey: "paid-sale:retailer",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Controlled retail seller",
        classification: "enterprise:retail",
        locationJurisdictionId: world.history.taxProposals![0]!.jurisdictionId,
      },
    });
    const sellerId = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: "paid-sale:seller-cash",
      owner: { kind: "organization", organizationId: sellerId },
      openedAt: world.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    world = createResourceFlow(world, {
      stableKey: "paid-sale:purchase",
      source: { kind: "person", personId: f.personId },
      recipient: { kind: "organization", organizationId: sellerId },
      startsAt: world.currentDate,
      initialStatus: "active",
      amount: money(2100, "USD"),
      cadenceKind: "schedule:one-time",
      basisKind: "custom:retail-purchase",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: world.history.taxProposals![0]!.jurisdictionId,
      provenance,
    });
    const sale = world.history.resourceFlows.at(-1)!;
    const terms = resourceFlowTermsAt(
      world,
      sale.id,
      currentResourceCutoff(world),
    )!;
    expect(taxBaseOccurrenceSource(world, sale.id)).toBeNull();
    const payment = paymentFromDatedCash(
      world,
      { kind: "person", personId: f.personId },
      terms.amount,
      world.currentDate,
    );
    world = recordResourceTransferOutcome(world, {
      stableKey: "paid-sale:receipt",
      resourceFlowId: sale.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: payment.status,
      attemptedAmount: terms.amount,
      transferredAmount: payment.transferredAmount,
      reasonKind: payment.reasonKind,
      note: "Actual paid purchase",
      provenance,
    });
    const receipt = world.history.resourceTransferOutcomes.at(-1)!;
    expect(receipt.status).toBe("completed");
    expect(
      taxBaseOccurrenceSource(world, receipt.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: receipt.sequence,
      }),
    ).toBeNull();
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: sellerId },
        terms.amount.currency,
        currentResourceCutoff(world),
      )!.liquidBalance.minorUnits,
    ).toBe(receipt.transferredAmount.minorUnits);
    const saleBase = {
      stableKey: "paid-sale:tax-base",
      jurisdictionId: sale.jurisdictionId!,
      payer: sale.source as { kind: "person"; personId: typeof f.personId },
      baseKey: TEST_TAX_TERMS.baseKey,
      occurredAt: receipt.occurredAt,
      amount: receipt.transferredAmount,
      sourceEventId: receipt.id,
      assumptionNote:
        "Existing fictional levy applied to the actual paid purchase, never estimated or attempted sales.",
    };
    expect(() =>
      recordTaxBase(world, {
        ...saleBase,
        amount: money(receipt.transferredAmount.minorUnits + 1, "USD"),
      }),
    ).toThrow(/exact visible occurrence/);
    world = recordTaxBase(world, saleBase);
    expect(() => recordTaxBase(world, saleBase)).toThrow(
      /already has a recorded tax base/,
    );
    const context = {
      ...f.context,
      activityId: world.history.taxBases!.at(-1)!.id,
    };
    const assessed = dispatch(world, context);
    expect(assessed.history.taxAssessments).toHaveLength(1);
    expect(assessed.history.taxAssessments![0]!.taxAmount.minorUnits).toBe(100);
    expect(
      assessed.history.taxAssessments![0]!.lawEffectStamps![0]!.questionKey,
    ).toBe(QUESTION);
    expect(
      dispatch(deserializeWorld(serializeWorld(assessed)), context).history
        .taxAssessments,
    ).toHaveLength(1);
    // The loaded cannabis row applies the saved levy to the actual paid sale.
    // Legalization alone supplies neither a purchase nor a legal tax rate.
    const paid = advanceWorld(
      assessed,
      TEST_TAX_TERMS.collectionLagDays,
      createTaxTransitionHandlerRegistry(),
    );
    const collection = paid.history.taxCollections!.at(-1)!;
    expect(collection.transferredAmount.minorUnits).toBe(100);
    expect(balances(paid, f.personId)).toEqual([7800, 100]);
    const empty = {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    };
    const month = makeIsoDate(`${paid.currentDate.slice(0, 7)}-01`);
    const government = withOpenedBudgets(paid, empty, month).governments.find(
      (row) =>
        row.lawJurisdictionId === paid.history.taxProposals![0]!.jurisdictionId,
    )!;
    expect(government).toBeDefined();
    const store = { ...empty, governments: [government] };
    const read = readMonthFlows(paid, store);
    const recorded = read.flows.recorded!.get(government.key)!;
    expect(
      recorded.revenueMinorUnits[BUDGET_SOURCES.indexOf("selectiveSalesTaxes")],
    ).toBe(100);
    expect(recorded.sourceRecordIds).toContain(collection.resourceOutcomeId);
    const stamp = recorded.lawEffectStamps.find(
      (s) => s.questionKey === QUESTION,
    );
    expect(stamp?.effectKind).toBe("tax-collection");
    expect(stamp?.governingLawKey).toBe(f.measureId);
    expect(stamp?.appliedAt).toBe(paid.currentDate);
    expect(stamp?.sourceRecordIds).toContain(collection.assessmentId);
    expect(stamp?.sourceRecordIds).toContain(paid.history.taxBases![0]!.id);

    const settled = settleGovernmentMonth(
      paid,
      government,
      month,
      read.flows,
    ).government;
    expect(
      settled.months.at(-1)!.revenue[
        BUDGET_SOURCES.indexOf("selectiveSalesTaxes")
      ],
    ).toBe(1);
    expect(settled.months.at(-1)!.lawEffectStamps).toContainEqual(stamp);
    const saved = deserializeWorld(
      serializeWorld({
        ...paid,
        publicBudgets: {
          ...store,
          governments: [settled],
          cursor: read.cursor,
        },
      }),
    );
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
  });
});
