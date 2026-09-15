import { describe, expect, it } from "vitest";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";
import { createLegislativeScenario } from "../simulation/legislation-scenarios";
import { createTaxTransitionHandlerRegistry } from "../simulation/tax-policy";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../simulation/resources";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
import { daysBetween } from "../simulation/dates";
import { declarePersonalTaxOccurrence } from "./tax-work";
import { projectBudgetEconomy } from "./budget-economy";
import { projectModeledAccountHistory } from "./modeled-account-history";
import type { World } from "../simulation/types";

/** An enacted, effective authored tax with one declared occurrence collected. */
function collectedTax(opening: number | null, baseAmount = 202_100) {
  const fixture = enactedTaxFixture(opening);
  const jurisdictionId = fixture.world.history.taxProposals![0]!.jurisdictionId;
  let world = advanceWorld(
    fixture.world,
    daysBetween(
      fixture.world.currentDate,
      fixture.world.history.taxPolicies![0]!.effectiveAt,
    ),
    createTaxTransitionHandlerRegistry(),
  );
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    stableKey: "account-history:occurrence",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: baseAmount,
    assumptionNote:
      "Explicit fictional taxable occurrence for account history.",
  });
  const beforeCollection = world;
  world = advanceWorld(world, 3, createTaxTransitionHandlerRegistry());
  return { ...fixture, world, beforeCollection, jurisdictionId };
}

describe("modeled public receipts account history", () => {
  it("reports no account as no record, not as a zero balance", () => {
    const scenario = createLegislativeScenario("alaska");
    const jurisdictionId = scenario.world.jurisdictionOrder[0]!;
    const history = projectModeledAccountHistory(
      scenario.world,
      jurisdictionId,
    );
    expect(history.status).toBe("no-account");
    if (history.status !== "no-account") return;
    expect(history.reason).toContain("not a zero balance");
  });

  it("counts only a collected receipt, with an established balance that survives save/reopen", () => {
    const tax = collectedTax(20_000);
    // Assessed but not yet collected: the account moves no money.
    const pending = projectModeledAccountHistory(
      tax.beforeCollection,
      tax.jurisdictionId,
    );
    expect(pending.status).toBe("recorded");
    if (pending.status !== "recorded") return;
    expect(pending.entries).toEqual([]);
    expect(pending.receipts.minorUnits).toBe(0);
    expect(pending.graph).toBeNull();

    const bytes = serializeWorld(tax.world);
    const history = projectModeledAccountHistory(tax.world, tax.jurisdictionId);
    expect(serializeWorld(tax.world)).toBe(bytes);
    expect(history.status).toBe("recorded");
    if (history.status !== "recorded") return;
    const collection = tax.world.history.taxCollections!.at(-1)!;
    const outcome = tax.world.history.resourceTransferOutcomes.find(
      (row) => row.id === collection.resourceOutcomeId,
    )!;
    expect(history.entries.map((entry) => entry.outcomeId)).toEqual([
      collection.resourceOutcomeId,
    ]);
    expect(history.entries[0]!.kind).toBe("tax-receipt");
    expect(history.entries[0]).toMatchObject({
      periodStartsAt: outcome.periodStartsAt,
      periodEndsAt: outcome.periodEndsAt,
    });
    expect(history.asOf).toBe(tax.world.currentDate);
    expect(history.receipts).toEqual(money(10_100, "USD"));
    expect(history.payments).toEqual(money(0, "USD"));
    expect(history.balance).toEqual({
      status: "established",
      asOf: tax.world.currentDate,
      balance: money(10_100, "USD"),
    });
    expect(history.graph!.series.map((series) => series.label).sort()).toEqual([
      "Account balance at end of day",
      "Collected tax receipts",
    ]);
    expect(history.graph!.unit).toBe("USD minor units");

    const reopened = deserializeWorld(bytes);
    expect(projectModeledAccountHistory(reopened, tax.jurisdictionId)).toEqual(
      history,
    );
    // The aggregate Budget reading is unchanged by this account.
    expect(
      projectBudgetEconomy(reopened, tax.jurisdictionId).fiscalGraphs,
    ).toEqual(
      projectBudgetEconomy(tax.beforeCollection, tax.jurisdictionId)
        .fiscalGraphs,
    );
  });

  it("lists a failed collection as an attempt that moved nothing", () => {
    // No payer position: the collection is recorded as blocked.
    const tax = collectedTax(null);
    const history = projectModeledAccountHistory(tax.world, tax.jurisdictionId);
    expect(history.status).toBe("recorded");
    if (history.status !== "recorded") return;
    expect(tax.world.history.taxCollections!.at(-1)!.status).toBe("blocked");
    expect(history.receipts.minorUnits).toBe(0);
    expect(history.graph).toBeNull();
    for (const entry of history.entries)
      expect(entry.transferred.minorUnits).toBe(0);
  });

  it("withholds a balance when an unrecognized transfer touches the account", () => {
    const tax = collectedTax(20_000);
    const account = publicTaxAccountForJurisdiction(
      tax.world,
      tax.jurisdictionId,
    )!;
    let world: World = createResourceFlow(tax.world, {
      stableKey: "account-history:unclassified",
      source: { kind: "organization", organizationId: account.organizationId },
      recipient: { kind: "person", personId: tax.personId },
      startsAt: tax.world.currentDate,
      amount: money(100, "USD"),
      cadenceKind: "custom:test-transfer",
      basisKind: "custom:test-transfer",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: tax.jurisdictionId,
      provenance: {
        kind: "authored",
        note: "Test-only unrecognized transfer.",
      },
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "account-history:unclassified:outcome",
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      attemptedAmount: money(100, "USD"),
      transferredAmount: money(100, "USD"),
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: {
        kind: "authored",
        note: "Test-only unrecognized transfer.",
      },
    });
    const history = projectModeledAccountHistory(world, tax.jurisdictionId);
    expect(history.status).toBe("recorded");
    if (history.status !== "recorded") return;
    expect(history.entries.at(-1)!.kind).toBe("unclassified");
    expect(history.balance.status).toBe("withheld");
    expect(history.receipts).toEqual(money(10_100, "USD"));
  });
});
