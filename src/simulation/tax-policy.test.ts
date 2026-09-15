import { createOrganization } from "./life";
import { recordWorldEvent } from "./world";
import { describe, expect, it } from "vitest";
import {
  TEST_TAX_TERMS,
  proposalFixture,
  enactedTaxFixture,
  enactSecondTaxVersion,
} from "../../tests/fixtures/tax-policy-fixture";
import { createLegislativeScenario } from "./legislation-scenarios";
import {
  fileTaxProposalFromOffice,
  declarePersonalTaxOccurrence,
  readPublicTaxReceipts,
} from "../presentation/tax-work";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { daysBetween } from "./dates";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  adoptEnactedTaxPolicy,
  previewTax,
  assessTaxBase,
  recordTaxBase,
  TAX_COLLECTION_TRANSITION_KEY,
} from "./tax-policy";
import type { World } from "./types";

function onEffectiveDay(fixture: ReturnType<typeof enactedTaxFixture>) {
  const world = advanceWorld(
    fixture.world,
    daysBetween(
      fixture.world.currentDate,
      fixture.world.history.taxPolicies![0]!.effectiveAt,
    ),
    createCampaignElectionTransitionRegistry(),
  );
  return { ...fixture, world };
}
function declare(fixture: ReturnType<typeof enactedTaxFixture>, amount = 2100) {
  return declarePersonalTaxOccurrence(fixture.world, {
    personId: fixture.personId,
    stableKey: "tax-test:occurrence",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: amount,
    assumptionNote:
      "One explicit fictional taxable occurrence; no income or purchase money is created.",
  });
}
function balances(
  world: World,
  personId: ReturnType<typeof enactedTaxFixture>["personId"],
) {
  const publicOrganizationId =
    world.history.taxProposals![0]!.publicOrganizationId;
  return [
    resourcePositionAt(
      world,
      { kind: "person", personId },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits,
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: publicOrganizationId },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits,
  ];
}

describe("SYSTEMS30-F sourced proposal to enacted policy to due collection", () => {
  it("keeps preview pure, distinguishes absent/zero and rounds exact cents half up", () => {
    const fixture = proposalFixture();
    const bytes = serializeWorld(fixture.world);
    expect(
      previewTax(TEST_TAX_TERMS, TEST_TAX_TERMS.baseKey, null).status,
    ).toBe("unavailable");
    expect(
      previewTax(TEST_TAX_TERMS, TEST_TAX_TERMS.baseKey, money(0, "USD")),
    ).toMatchObject({ status: "available", taxAmount: money(0, "USD") });
    expect(
      previewTax(
        {
          ...TEST_TAX_TERMS,
          allowanceMinorUnits: 0,
          rateNumerator: 1,
          rateDenominator: 2,
        },
        TEST_TAX_TERMS.baseKey,
        money(1, "USD"),
      ),
    ).toMatchObject({ taxAmount: money(1, "USD") });
    expect(
      previewTax(TEST_TAX_TERMS, "tax-base:excluded", money(999, "USD")),
    ).toMatchObject({
      taxAmount: money(0, "USD"),
      exemptionReason: "excluded-base",
    });
    expect(
      previewTax(TEST_TAX_TERMS, TEST_TAX_TERMS.baseKey, money(99, "USD")),
    ).toMatchObject({
      taxAmount: money(0, "USD"),
      exemptionReason: "allowance",
    });
    expect(() =>
      previewTax(
        { ...TEST_TAX_TERMS, rateDenominator: 0 },
        TEST_TAX_TERMS.baseKey,
        money(1, "USD"),
      ),
    ).toThrow();
    expect(serializeWorld(fixture.world)).toBe(bytes);
  });
  it("refuses unenacted policy and ordinary filing without the actual current seat", () => {
    const fixture = proposalFixture();
    const bytes = serializeWorld(fixture.world);
    expect(() =>
      adoptEnactedTaxPolicy(fixture.world, fixture.proposalId),
    ).toThrow(/enacted/);
    expect(() =>
      fileTaxProposalFromOffice(fixture.world, {
        personId: fixture.personId,
        stableKey: "tax:unauthorized",
        terms: TEST_TAX_TERMS,
      }),
    ).toThrow();
    expect(serializeWorld(fixture.world)).toBe(bytes);
  });
  it("records enactment before effect and never treats passage or time as money", () => {
    const fixture = enactedTaxFixture();
    expect(worldDateGap(fixture.world)).toBeGreaterThan(0);
    expect(() => declare(fixture)).toThrow(/not effective/);
    expect(fixture.world.history.taxCollections ?? []).toHaveLength(0);
    expect(balances(fixture.world, fixture.personId)).toEqual([10000, 0]);
    expect(adoptEnactedTaxPolicy(fixture.world, fixture.proposalId)).toBe(
      fixture.world,
    );
  });
  it("freezes one assessment, collects only on due date and conserves existing payer/public money through reload", () => {
    const fixture = onEffectiveDay(enactedTaxFixture());
    let world = declare(fixture);
    expect(world.history.taxAssessments).toHaveLength(1);
    expect(world.history.taxAssessments![0]!.taxAmount.minorUnits).toBe(100);
    expect(balances(world, fixture.personId)).toEqual([10000, 0]);
    expect(
      assessTaxBase(
        world,
        world.history.taxBases![0]!.id,
        TEST_TAX_TERMS.seriesKey,
      ),
    ).toBe(world);
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(balances(world, fixture.personId)).toEqual([10000, 0]);
    world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
    expect(balances(world, fixture.personId)).toEqual([9900, 100]);
    expect(world.history.taxCollections).toHaveLength(1);
    expect(
      readPublicTaxReceipts(
        world,
        fixture.world.history.taxProposals![0]!.jurisdictionId,
      ),
    ).toMatchObject([{ amount: money(100, "USD") }]);
    expect(
      readPublicTaxReceipts(
        world,
        fixture.world.history.taxProposals![0]!.jurisdictionId,
      )[0],
    ).not.toHaveProperty("payer");
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      3,
      createCampaignElectionTransitionRegistry(),
    );
    expect(world.history.taxCollections).toHaveLength(1);
    expect(balances(world, fixture.personId)).toEqual([9900, 100]);
    assertWorldIntegrity(world);
  });
  it.each([null, 20])(
    "records a terminal failure without fake public receipt or negative payer funds (%s)",
    (opening) => {
      const fixture = onEffectiveDay(enactedTaxFixture(opening));
      const world = advanceWorld(
        declare(fixture),
        2,
        createCampaignElectionTransitionRegistry(),
      );
      expect(world.history.taxCollections![0]).toMatchObject({
        status: "blocked",
        transferredAmount: money(0, "USD"),
        reason:
          opening === null ? "missing-payer-position" : "insufficient-funds",
      });
      expect(balances(world, fixture.personId)).toEqual([
        opening === null ? undefined : opening,
        0,
      ]);
      expect(
        readPublicTaxReceipts(
          world,
          fixture.world.history.taxProposals![0]!.jurisdictionId,
        ),
      ).toEqual([]);
      expect(
        advanceWorld(
          deserializeWorld(serializeWorld(world)),
          3,
          createCampaignElectionTransitionRegistry(),
        ).history.taxCollections,
      ).toHaveLength(1);
    },
  );
  it("records zero explicitly without minting a transfer", () => {
    const fixture = onEffectiveDay(
      enactedTaxFixture(null, { ...TEST_TAX_TERMS, rateNumerator: 0 }),
    );
    const world = advanceWorld(
      declare(fixture),
      2,
      createCampaignElectionTransitionRegistry(),
    );
    expect(world.history.taxCollections![0]).toMatchObject({
      status: "zero",
      resourceOutcomeId: null,
      transferredAmount: money(0, "USD"),
    });
    expect(world.history.resourceTransferOutcomes).toHaveLength(0);
  });
  it("rejects save tampering with due date, assessment amount, scope and double occurrence", () => {
    const fixture = onEffectiveDay(enactedTaxFixture());
    const world = declare(fixture);
    const variants: World[] = [
      {
        ...world,
        history: {
          ...world.history,
          taxAssessments: world.history.taxAssessments!.map((row) => ({
            ...row,
            taxAmount: money(101, "USD"),
          })),
        },
      },
      {
        ...world,
        history: {
          ...world.history,
          futureDueItems: world.history.futureDueItems.map((row) =>
            row.transitionKey === TAX_COLLECTION_TRANSITION_KEY
              ? { ...row, dueAt: world.currentDate }
              : row,
          ),
        },
      },
      {
        ...world,
        history: {
          ...world.history,
          taxProposals: world.history.taxProposals!.map((row) => ({
            ...row,
            power: { ...row.power, jurisdictionKey: "US-KY" },
          })),
        },
      },
    ];
    for (const variant of variants)
      expect(() => assertWorldIntegrity(variant)).toThrow();
    const before = serializeWorld(world);
    expect(() =>
      declarePersonalTaxOccurrence(world, {
        personId: fixture.personId,
        stableKey: "tax-test:occurrence",
        proposalId: fixture.proposalId,
        baseKey: TEST_TAX_TERMS.baseKey,
        amountMinorUnits: 99,
        assumptionNote: "Different base",
      }),
    ).toThrow(/overwritten/);
    expect(serializeWorld(world)).toBe(before);
  });
  it("preserves older saves with absent optional tax histories", () => {
    const world = createLegislativeScenario("alaska").world;
    expect(deserializeWorld(serializeWorld(world))).toEqual(world);
    expect(world.history).not.toHaveProperty("taxProposals");
  });
  it("freezes an earlier occurrence across a genuinely enacted new rate version", () => {
    const fixture = enactSecondTaxVersion(enactedTaxFixture(), {
      ...TEST_TAX_TERMS,
      rateNumerator: 10,
    });
    let world = advanceWorld(
      fixture.world,
      daysBetween(
        fixture.world.currentDate,
        fixture.world.history.taxPolicies![0]!.effectiveAt,
      ),
      createCampaignElectionTransitionRegistry(),
    );
    world = declare({ ...fixture, world });
    const firstBaseId = world.history.taxBases![0]!.id;
    world = advanceWorld(world, 2, createCampaignElectionTransitionRegistry());
    expect(world.history.taxCollections![0]!.transferredAmount.minorUnits).toBe(
      100,
    );
    expect(assessTaxBase(world, firstBaseId, TEST_TAX_TERMS.seriesKey)).toBe(
      world,
    );
    world = advanceWorld(
      world,
      daysBetween(
        world.currentDate,
        world.history.taxPolicies![1]!.effectiveAt,
      ),
      createCampaignElectionTransitionRegistry(),
    );
    world = declarePersonalTaxOccurrence(world, {
      personId: fixture.personId,
      stableKey: "tax-test:new-version-occurrence",
      proposalId: fixture.secondProposalId,
      baseKey: TEST_TAX_TERMS.baseKey,
      amountMinorUnits: 2100,
      assumptionNote:
        "A distinct fictional occurrence after the second effective date.",
    });
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      2,
      createCampaignElectionTransitionRegistry(),
    );
    expect(
      world.history.taxCollections!.map(
        (row) => row.transferredAmount.minorUnits,
      ),
    ).toEqual([100, 200]);
    expect(world.history.taxAssessments).toHaveLength(2);
    expect(balances(world, fixture.personId)).toEqual([9700, 300]);
  });
  it("keeps campaign cash separate and refuses using its classified account as the payer", () => {
    const fixture = onEffectiveDay(enactedTaxFixture(20));
    let world = createOrganization(fixture.world, {
      stableKey: "tax-test:campaign-account",
      formedAt: fixture.world.currentDate,
      provenance: {
        kind: "authored",
        note: "Explicitly fictional campaign-funds separation fixture.",
      },
      initialProfile: {
        name: "Authored campaign committee",
        classification: "custom:political-campaign",
        locationJurisdictionId:
          fixture.world.history.taxProposals![0]!.jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: "tax-test:campaign-cash",
      owner: { kind: "organization", organizationId },
      openedAt: world.currentDate,
      openingBalance: money(10000, "USD"),
      provenance: {
        kind: "authored",
        note: "Known fictional campaign cash, separate from the person's cash.",
      },
    });
    world = advanceWorld(
      declare({ ...fixture, world }),
      2,
      createCampaignElectionTransitionRegistry(),
    );
    expect(world.history.taxCollections![0]!.status).toBe("blocked");
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(10000);
    const jurisdictionId = world.history.taxProposals![0]!.jurisdictionId;
    const eventWorld = recordWorldEvent(world, {
      stableKey: "event:tax-test:campaign-attempt",
      type: "tax.declared-occurrence",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [organizationId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["tax"],
      summary:
        "An explicit fictional attempted campaign-funded tax occurrence.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(() =>
      recordTaxBase(eventWorld, {
        stableKey: "tax-test:campaign-base",
        jurisdictionId,
        payer: { kind: "organization", organizationId },
        baseKey: TEST_TAX_TERMS.baseKey,
        occurredAt: eventWorld.currentDate,
        amount: money(2100, "USD"),
        assumptionNote: "This fixture must refuse campaign funding.",
        sourceEventId: eventWorld.history.events.at(-1)!.id,
      }),
    ).toThrow(/campaign/);
  });
});
function worldDateGap(world: World) {
  return daysBetween(
    world.currentDate,
    world.history.taxPolicies![0]!.effectiveAt,
  );
}
