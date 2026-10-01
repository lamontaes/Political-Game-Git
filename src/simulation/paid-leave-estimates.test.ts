import { describe, expect, it } from "vitest";
import { rankedPaidLeaveEstimate } from "./paid-leave-estimates";
import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import { createPolicyCatalog } from "./policy";
import { loadedPolicyRegistry } from "./policy-pack-registry";
import { createOrganization } from "./life";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import {
  paidLeaveBenefitRate,
  paidLeaveBenefitMinor,
  payPaidLeaveClaims,
} from "./paid-leave-benefits";
import { serializeWorld, deserializeWorld } from "./serialization";
import { personName } from "./people";
import { pay } from "../../tests/fixtures/public-program-fixture";

describe("paid-leave fallback rates read sourced peers without a draw", () => {
  it("ranks the same-program sources and retains actual employee zero shares", () => {
    const estimate = rankedPaidLeaveEstimate("US-RI", "employee-premium");
    expect(estimate.references).toHaveLength(13);
    expect(estimate.references.slice(0, 4).map((row) => row.stateKey)).toEqual([
      "US-NY",
      "US-ME",
      "US-NJ",
      "US-CT",
    ]);
    expect(Math.round(estimate.percent * 10_000)).toBe(4_709);
    expect(
      estimate.references.find((row) => row.stateKey === "US-DC")?.percent,
    ).toBe(0);
    expect(rankedPaidLeaveEstimate("US-RI", "employee-premium")).toBe(estimate);
  });

  it("does not invent territory income or region; unread comparison facts use a labeled plain mean", () => {
    const estimate = rankedPaidLeaveEstimate("US-AS", "low-wage-benefit");
    expect(estimate.references).toHaveLength(12);
    expect(
      estimate.references.every((row) => row.rank === 1 && row.weight === 1),
    ).toBe(true);
    expect(estimate.percent).toBeCloseTo(1027 / 12, 10);
    expect(estimate.method).toContain("plain mean");
    // This comparison is not a claim that a program exists in this territory.
  });

  it("the existing benefit writer pays a named saved recipient from actual fixture cash and repeats after reload", () => {
    const seed = "team6-a45-paid-leave";
    const place = requireLifePlace("4177250");
    const state = chiefExecutiveJurisdiction("OR")!;
    let world = createScenarioWorld(seed, place.context, { peopleCount: 3 });
    const recipient = world.personOrder[0]!;
    world = {
      ...world,
      jurisdictions: { ...world.jurisdictions, [state.id]: state },
      jurisdictionOrder: [...world.jurisdictionOrder, state.id],
      policyCatalog: createPolicyCatalog({
        ...loadedPolicyRegistry(),
        catalogVersion: "team6-a45-fixture/v1",
      }),
    };
    world = ensureTaxPublicAccount(world, state.id);
    const account = publicTaxAccountForJurisdiction(world, state.id)!;
    // Explicit financial fixture: not observed premium revenue or natural eligibility.
    world = createOrganization(world, {
      stableKey: `${seed}:fixture-payer`,
      formedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "A45 explicit cash fixture, not a real budget.",
      },
      initialProfile: {
        name: "Authored paid-leave cash fixture",
        classification: "sector:private",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    });
    const payer = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: `${seed}:payer:USD`,
      owner: { kind: "organization", organizationId: payer },
      openedAt: world.currentDate,
      openingBalance: money(100_000, "USD"),
      provenance: {
        kind: "authored",
        note: "A45 explicit cash fixture, not a real budget.",
      },
    });
    world = pay(
      world,
      `${seed}:receipt`,
      payer,
      account.organizationId,
      100_000,
    );
    const beforeRead = serializeWorld(world);
    const rate = paidLeaveBenefitRate(world, "US-OR", world.currentDate);
    expect(rate).not.toBeNull();
    if (!rate)
      throw new Error("Existing Oregon program must supply a benefit rate.");
    expect(rate.percent).toBeCloseTo(87.7396798456191, 10);
    expect(rate.estimatedFromAverage).toContain(
      "authored reciprocal-rank weights",
    );
    expect(
      paidLeaveBenefitRate(
        { ...world, seed: "another-identity-seed" },
        "US-OR",
        world.currentDate,
      ),
    ).toEqual(rate);
    expect(serializeWorld(world)).toBe(beforeRead);
    // Authored claim input, not a fabricated work absence or a natural claim decision.
    const amountMinor = paidLeaveBenefitMinor(rate, 100_000, 5, 1);
    expect(amountMinor).toBe(17_548);
    const claims = [
      {
        paycheckKey: `${seed}:authored-claim`,
        personId: recipient,
        stateKey: "US-OR",
        coveredDays: 1,
        caring: true,
        amountMinor,
        rate,
      },
    ];
    const paid = payPaidLeaveClaims(world, claims);
    const outcome = paid.history.resourceTransferOutcomes.at(-1)!;
    const flow = paid.history.resourceFlows.at(-1)!;
    expect(flow.recipient).toEqual({ kind: "person", personId: recipient });
    expect(flow.source).toEqual({
      kind: "organization",
      organizationId: account.organizationId,
    });
    expect(outcome).toMatchObject({
      status: "completed",
      transferredAmount: money(17_548, "USD"),
      lawEffectStamps: [
        expect.objectContaining({
          effectKind: "paid-leave-benefit",
          jurisdictionId: state.id,
        }),
      ],
    });
    expect(
      resourcePositionAt(paid, flow.source, money(0, "USD").currency)
        ?.liquidBalance,
    ).toEqual(money(82_452, "USD"));
    const bytes = serializeWorld(paid);
    const restored = deserializeWorld(bytes);
    expect(serializeWorld(restored)).toBe(bytes);
    expect(serializeWorld(payPaidLeaveClaims(restored, claims))).toBe(bytes);
    console.log(
      "A45_SAVED_PAYMENT",
      personName(paid.people[recipient]!),
      recipient,
      flow.id,
      outcome.id,
      amountMinor,
    );
  });
});
