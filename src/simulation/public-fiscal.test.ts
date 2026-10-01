import { recordGovernorDecisionOnMeasure } from "./governing/legislative-clock";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as lawEffects from "./enacted-law-effects";
afterEach(() => vi.restoreAllMocks());
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
} from "./legislation";
import {
  recordFiledProvision,
  currentMeasureProvisions,
} from "./legislative-politics";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { addDays, daysBetween } from "./dates";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import {
  createTaxTransitionHandlerRegistry,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  administrativeMandateText,
  PUBLIC_FUNDING_DEFAULT_DATE_TEXT,
  settlePublicResourcePayment,
} from "./public-fiscal";
import {
  recordAdoptedAppropriation,
  programOperatorOrganization,
} from "./governing/program-governing";
import {
  commitPublicProgram,
  programPosition,
} from "./governing/public-program";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import type {
  PublicFundingResolver,
  PublicPaymentInput,
  PublicFundingMandate,
} from "./public-fiscal";

function fundedFixture(saveAppropriation = true) {
  const fixture = enactedTaxFixture(10000);
  let world = fixture.world;
  const jurisdictionId = world.history.taxProposals![0]!.jurisdictionId;
  world = introduceMeasure(world, {
    stableKey: "public-payment-test:appropriation",
    jurisdictionId,
    rulePackId: fixture.procedure.pack.packId,
    designation: "HB Funding Test (authored)",
    shortTitle: "Authored funding test",
    summary: "Explicit modeled government mandate; no real treasury assertion.",
    origin: "member-introduction",
    subjectClass: "appropriation",
    sponsorPersonId: fixture.personId,
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const programKey = "program:authored-service";
  for (const [index, [key, text, amount]] of (
    [
      [
        "amount-provided",
        "There is appropriated 1 USD for the authored public service.",
        100,
      ],
      ["administrative-mandate", administrativeMandateText(programKey), null],
      ["effective-date", PUBLIC_FUNDING_DEFAULT_DATE_TEXT, null],
      [
        "availability",
        "The appropriation remains available for 365 days after its effective date. No payment may be made before its effective date or after its availability expires.",
        null,
      ],
    ] as const
  ).entries())
    world = recordFiledProvision(world, {
      stableKey: `public-payment-test:${key}`,
      measureId,
      provisionKey: key,
      sectionNumber: index + 1,
      heading: key,
      text,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the authored public service",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      fiscalExposureMinorUnits: amount,
      fiscalExposureLabel: amount === null ? null : "1 USD appropriated",
    });
  const procedure = { ...fixture.procedure, measureId };
  for (
    let step = 0;
    step < 40 && measurePosition(world, measureId).phase !== "enacted";
    step++
  ) {
    if (measurePosition(world, measureId).phase === "awaiting-executive") {
      world = recordGovernorDecisionOnMeasure(
        world,
        measureId,
        "signed",
        "Authored test contract: the governor signs the appropriation.",
      );
      continue;
    }
    const key = availableMeasureSteps(world, measureId).find(
      (row) => row !== "offer-amendment",
    );
    if (!key) throw new Error("No supported next appropriation step.");
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(procedure, world, key).world,
    );
  }
  const enactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  )!;
  if (!enactment) throw new Error("The funding fixture did not enact its appropriation.");
  const availableAt = addDays(enactment.resolvedAt, 90);
  const adopted = saveAppropriation
    ? recordAdoptedAppropriation(world, {
        familyKey: "program",
        stateUsps: "AK",
        jurisdictionId,
        programKey,
        amountMinorUnits: 100,
        adoptedOn: availableAt,
        availableDays: 366,
        edition: "public-funding-test-v1",
        basisNote: "Explicit fictional payment authority; no cash opened.",
        sourceMeasureId: measureId,
      })
    : null;
  if (saveAppropriation && !adopted)
    throw new Error("Test appropriation was not recorded.");
  world = adopted?.world ?? world;
  const mandate: PublicFundingMandate = {
    version: "public-funding-test-v1",
    fundingId: enactment.id,
    measureId,
    jurisdictionId,
    provisionIds: currentMeasureProvisions(world, measureId)
      .map((row) => row.id)
      .sort(),
    amount: money(100, "USD"),
    availableAt,
    endsAt: addDays(availableAt, 365),
    ...(adopted ? { appropriationId: adopted.appropriationId } : {}),
    administrativeEventId: enactment.outcomeEventId,
    programKey,
  };
  const resolver: PublicFundingResolver = (_world, id) =>
    id === measureId
      ? { kind: "available", mandate }
      : { kind: "unavailable", reason: "Missing authored funding." };
  world = advanceWorld(
    world,
    daysBetween(world.currentDate, mandate.availableAt),
    createTaxTransitionHandlerRegistry(),
  );
  const input: PublicPaymentInput = {
    fundingId: mandate.fundingId,
    measureId,
    expectedProvisionIds: mandate.provisionIds,
    operationKey: "service:test-period",
    requestedAmount: money(80, "USD"),
    recipient: { kind: "person", personId: fixture.personId },
  };
  return { ...fixture, world, mandate, resolver, input, jurisdictionId };
}

function fundedWithCashForBothRoutes() {
  const fixture = fundedFixture();
  let world = declarePersonalTaxOccurrence(fixture.world, {
    personId: fixture.personId,
    stableKey: "public-payment-test:shared-cap-tax-base",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: 4100,
    assumptionNote:
      "One fictional test occurrence funds 2 USD cash, separate from the 1 USD appropriation.",
  });
  world = advanceWorld(world, 2, createTaxTransitionHandlerRegistry());
  world = ensureStateExecutiveIncumbent(world, fixture.personId, "AK");
  const governor = currentStateExecutiveHolders(world).find(
    (holder) => holder.stateUsps === "AK",
  );
  if (!governor) throw new Error("The Alaska governor was not seated.");
  const operator = programOperatorOrganization(
    world,
    fixture.mandate.programKey,
    fixture.jurisdictionId,
  );
  return {
    ...fixture,
    world: operator.world,
    governor: governor.personId,
    operatorId: operator.organizationId,
  };
}

function commitEighty(
  world: ReturnType<typeof fundedWithCashForBothRoutes>["world"],
  fixture: ReturnType<typeof fundedWithCashForBothRoutes>,
) {
  return commitPublicProgram(world, {
    appropriationId: fixture.mandate.appropriationId!,
    alternative: {
      key: "shared-cap-operate-eighty",
      title: "Operate the authored service for eighty cents",
      installments: [
        { afterDays: 0, amount: money(80, "USD"), purpose: "operating" },
      ],
      deliveryLeadDays: null,
    },
    personId: fixture.governor,
    office: { kind: "state-executive" },
    recipientOrganizationId: fixture.operatorId,
  });
}

describe("shared public cash settlement for T", () => {
  it("counts pinned payment before an executive commitment against one appropriation", () => {
    const fixture = fundedWithCashForBothRoutes();
    const first = settlePublicResourcePayment(
      fixture.world,
      fixture.input,
      fixture.resolver,
    );
    expect(first.kind).toBe("paid");
    if (first.kind !== "paid") throw new Error(first.reason);
    const attempted = commitPublicProgram(first.world, {
      appropriationId: fixture.mandate.appropriationId!,
      alternative: {
        key: "shared-cap-operate-thirty",
        title: "Operate for thirty cents",
        installments: [
          { afterDays: 0, amount: money(30, "USD"), purpose: "operating" },
        ],
        deliveryLeadDays: null,
      },
      personId: fixture.governor,
      office: { kind: "state-executive" },
      recipientOrganizationId: fixture.operatorId,
    });
    expect(attempted.ok).toBe(false);
    expect(attempted.world).toBe(first.world);
    const position = programPosition(
      first.world,
      fixture.mandate.programKey,
      fixture.mandate.appropriationId,
    );
    expect(position.committed.minorUnits).toBe(80);
    expect(position.posted.minorUnits).toBe(80);
    expect(position.uncommitted.minorUnits).toBe(20);
    assertWorldIntegrity(deserializeWorld(serializeWorld(first.world)));
  });

  it("counts an executive reservation and posted installment once before a pinned payment", () => {
    const fixture = fundedWithCashForBothRoutes();
    const committed = commitEighty(fixture.world, fixture);
    expect(committed.ok).toBe(true);
    if (!committed.ok) throw new Error(committed.reason);
    const position = programPosition(
      committed.world,
      fixture.mandate.programKey,
      fixture.mandate.appropriationId,
    );
    expect(position.committed.minorUnits).toBe(80);
    expect(position.posted.minorUnits).toBe(80);
    expect(position.uncommitted.minorUnits).toBe(20);
    const refused = settlePublicResourcePayment(
      committed.world,
      {
        ...fixture.input,
        operationKey: "service:after-program-commitment",
        requestedAmount: money(30, "USD"),
      },
      fixture.resolver,
    );
    expect(refused).toMatchObject({ kind: "refused", world: committed.world });
    expect(serializeWorld(refused.world)).toBe(serializeWorld(committed.world));
    assertWorldIntegrity(deserializeWorld(serializeWorld(committed.world)));
  });
  it("requires operative funding AND actual tax receipts; appropriation never opens cash", () => {
    const fixture = fundedFixture();
    const before = serializeWorld(fixture.world);
    const refused = settlePublicResourcePayment(
      fixture.world,
      fixture.input,
      fixture.resolver,
    );
    expect(refused).toMatchObject({ kind: "refused" });
    expect(refused.world).toBe(fixture.world);
    expect(serializeWorld(fixture.world)).toBe(before);
    const account = publicTaxAccountForJurisdiction(
      fixture.world,
      fixture.jurisdictionId,
    )!;
    expect(
      resourcePositionAt(
        fixture.world,
        { kind: "organization", organizationId: account.organizationId },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(0);
  });
  it("refuses a paid delivery without a saved appropriation even when receipts exist", () => {
    const fixture = fundedFixture(false);
    let world = declarePersonalTaxOccurrence(fixture.world, {
      personId: fixture.personId,
      stableKey: "public-payment-test:unfunded-tax-base",
      proposalId: fixture.proposalId,
      baseKey: TEST_TAX_TERMS.baseKey,
      amountMinorUnits: 2100,
      assumptionNote:
        "One fictional test occurrence; no income or purchase money.",
    });
    world = advanceWorld(world, 2, createTaxTransitionHandlerRegistry());
    const before = serializeWorld(world);
    expect(
      settlePublicResourcePayment(world, fixture.input, fixture.resolver),
    ).toMatchObject({
      kind: "refused",
      world,
      reason: "This payment has no saved program appropriation.",
    });
    expect(serializeWorld(world)).toBe(before);
  });
  it("spends actual collected public cash once and reloads with reconciled funding/debit identity", () => {
    const activity = vi.spyOn(lawEffects, "applyLawConsequences");
    const fixture = fundedFixture();
    let world = declarePersonalTaxOccurrence(fixture.world, {
      personId: fixture.personId,
      stableKey: "public-payment-test:tax-base",
      proposalId: fixture.proposalId,
      baseKey: TEST_TAX_TERMS.baseKey,
      amountMinorUnits: 2100,
      assumptionNote:
        "One fictional test occurrence; no income or purchase money.",
    });
    world = advanceWorld(world, 2, createTaxTransitionHandlerRegistry());
    const result = settlePublicResourcePayment(
      world,
      fixture.input,
      fixture.resolver,
    );
    expect(result.kind).toBe("paid");
    if (result.kind !== "paid") throw new Error(result.reason);
    const paymentHooks = () =>
      activity.mock.calls.filter(
        ([, context]) => context.activityId === result.outcomeId,
      );
    expect(paymentHooks()).toHaveLength(1);
    expect(paymentHooks()[0]![1]).toEqual({
      onDate: result.world.currentDate,
      activity: "payment",
      activityId: result.outcomeId,
      subjectIds: [result.publicOrganizationId, fixture.personId],
      governingLawId: fixture.mandate.measureId,
    });
    expect(
      paymentHooks()[0]![0].history.resourceTransferOutcomes.some(
        (row) => row.id === result.outcomeId,
      ),
    ).toBe(true);
    expect(
      resourcePositionAt(
        result.world,
        { kind: "organization", organizationId: result.publicOrganizationId },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(20);
    expect(
      resourcePositionAt(
        result.world,
        { kind: "person", personId: fixture.personId },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(9980);
    const loaded = deserializeWorld(serializeWorld(result.world));
    const replay = settlePublicResourcePayment(loaded, fixture.input, () => ({
      kind: "unavailable",
      reason:
        "Expiry after an already-completed payment does not create a second debit.",
    }));
    expect(replay).toMatchObject({ kind: "paid", outcomeId: result.outcomeId });
    expect(replay.world).toBe(loaded);
    expect(paymentHooks()).toHaveLength(1);
    expect(
      settlePublicResourcePayment(
        loaded,
        { ...fixture.input, requestedAmount: money(79, "USD") },
        fixture.resolver,
      ),
    ).toMatchObject({ kind: "refused" });
    assertWorldIntegrity(loaded);
  });
  it("refuses false canonical funding identity and changed adopted terms without writing", () => {
    const fixture = fundedFixture();
    const before = serializeWorld(fixture.world);
    expect(
      settlePublicResourcePayment(
        fixture.world,
        { ...fixture.input, expectedProvisionIds: [] },
        fixture.resolver,
      ),
    ).toMatchObject({ kind: "refused" });
    expect(
      settlePublicResourcePayment(fixture.world, fixture.input, () => ({
        kind: "unavailable",
        reason: "Administrative authority is unknown.",
      })),
    ).toMatchObject({ kind: "refused" });
    expect(serializeWorld(fixture.world)).toBe(before);
  });
});
