import { describe, expect, it } from "vitest";
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
  fundingAvailabilityText,
  PUBLIC_FUNDING_DEFAULT_DATE_TEXT,
  settlePublicResourcePayment,
} from "./public-fiscal";
import type {
  PublicFundingResolver,
  PublicPaymentInput,
  PublicFundingMandate,
} from "./public-fiscal";

function fundedFixture() {
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
        "There is appropriated 100 USD for the authored public service.",
        10000,
      ],
      ["administrative-mandate", administrativeMandateText(programKey), null],
      ["effective-date", PUBLIC_FUNDING_DEFAULT_DATE_TEXT, null],
      ["availability", fundingAvailabilityText(null), null],
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
      fiscalExposureLabel: amount === null ? null : "100 USD appropriated",
    });
  const procedure = { ...fixture.procedure, measureId };
  for (
    let step = 0;
    step < 40 && measurePosition(world, measureId).phase !== "enacted";
    step++
  ) {
    const key = availableMeasureSteps(world, measureId).find(
      (row) => row !== "offer-amendment",
    );
    if (!key) throw new Error("No supported next appropriation step.");
    world = applyLegislativeStep(procedure, world, key).world;
  }
  const enactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  )!;
  const mandate: PublicFundingMandate = {
    version: "public-funding-test-v1",
    fundingId: enactment.id,
    measureId,
    jurisdictionId,
    provisionIds: currentMeasureProvisions(world, measureId)
      .map((row) => row.id)
      .sort(),
    amount: money(10000, "USD"),
    availableAt: addDays(enactment.resolvedAt, 90),
    endsAt: null,
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

describe("shared public cash settlement for T", () => {
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
  it("spends actual collected public cash once and reloads with reconciled funding/debit identity", () => {
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
