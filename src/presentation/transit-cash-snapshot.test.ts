import { expect, it } from "vitest";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";
import { transitAppropriationFixture } from "../../tests/fixtures/transit-service-fixture";
import { declarePersonalTaxOccurrence } from "./tax-work";
import { projectTransitCashSnapshot } from "./transit-cash-snapshot";
import { advanceWorld, assertWorldIntegrity } from "../simulation/world";
import { daysBetween } from "../simulation/dates";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { requestTransitImplementation } from "../simulation/transit-service";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";

// Explicit canonical procedural inputs, not an ordinary tax enactment producer.
// Public opening cash is never supplied: only the existing actual tax receipt
// changes the public balance. The payer's opening cash is declared fixture data.
function cashFixture(opening = 10_000, baseAmount = 200_100) {
  const tax = enactedTaxFixture(opening);
  const contract = transitAppropriationFixture(
    {
      world: tax.world,
      personId: tax.personId,
      procedure: tax.procedure,
    },
    20_001,
  );
  const unfunded = advanceWorld(
    contract.world,
    daysBetween(contract.world.currentDate, contract.availableAt),
    createCampaignElectionTransitionRegistry(),
  );
  const declared = declarePersonalTaxOccurrence(unfunded, {
    personId: contract.personId,
    stableKey: "transit-cash-snapshot:occurrence",
    proposalId: tax.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: baseAmount,
    assumptionNote:
      "Explicit fictional taxable occurrence; only the due actual transfer changes public cash, not this declaration.",
  });
  return {
    ...contract,
    unfunded,
    declared,
    collected: advanceWorld(
      declared,
      2,
      createCampaignElectionTransitionRegistry(),
    ),
  };
}

it("changes cash coverage only after an actual receipt, with exact odd-cent period costs and pure reopen inspection", () => {
  const f = cashFixture();
  const zero = projectTransitCashSnapshot(f.unfunded, f.measureId);
  expect(zero).toMatchObject({
    kind: "recorded-cash",
    recordedLiquidBalance: { minorUnits: 0 },
    firstPeriodCash: "insufficient",
    firstPeriodAmount: { minorUnits: 10_000 },
    secondPeriodAmount: { minorUnits: 10_001 },
  });
  expect(projectTransitCashSnapshot(f.declared, f.measureId)).toEqual(zero);
  expect(
    f.collected.history.taxCollections!.at(-1)!.transferredAmount.minorUnits,
  ).toBe(10_000);
  const before = serializeWorld(f.collected);
  const paidCash = projectTransitCashSnapshot(f.collected, f.measureId);
  expect(paidCash).toMatchObject({
    kind: "recorded-cash",
    recordedLiquidBalance: { minorUnits: 10_000 },
    firstPeriodCash: "sufficient",
    asOf: f.collected.currentDate,
  });
  expect(serializeWorld(f.collected)).toBe(before);
  expect(
    projectTransitCashSnapshot(deserializeWorld(before), f.measureId),
  ).toEqual(paidCash);
  expect(f.collected.history.policyRealizations).toHaveLength(0);
  expect(f.collected.history.effectActivations).toHaveLength(0);
  assertWorldIntegrity(f.collected);
});

it("keeps a missing account distinct from an actual insufficient receipt", () => {
  const contract = transitAppropriationFixture();
  const operative = advanceWorld(
    contract.world,
    daysBetween(contract.world.currentDate, contract.availableAt),
    createCampaignElectionTransitionRegistry(),
  );
  const before = serializeWorld(operative);
  expect(
    projectTransitCashSnapshot(operative, contract.measureId),
  ).toMatchObject({ kind: "account-missing" });
  expect(serializeWorld(operative)).toBe(before);
  const f = cashFixture(5_000, 100_100);
  expect(projectTransitCashSnapshot(f.collected, f.measureId)).toMatchObject({
    kind: "recorded-cash",
    recordedLiquidBalance: { minorUnits: 5_000 },
    firstPeriodCash: "insufficient",
  });
});

it("does not reinterpret an already requested contract as another funding request", () => {
  const f = cashFixture();
  const requested = requestTransitImplementation(f.collected, f);
  const before = serializeWorld(requested);
  const snapshot = projectTransitCashSnapshot(requested, f.measureId);
  expect(snapshot).toMatchObject({ kind: "already-requested" });
  expect(snapshot).not.toHaveProperty("recordedLiquidBalance");
  expect(snapshot).not.toHaveProperty("firstPeriodAmount");
  expect(serializeWorld(requested)).toBe(before);
  expect(
    projectTransitCashSnapshot(deserializeWorld(before), f.measureId),
  ).toEqual(snapshot);
});

it("preserves an omitted position as missing rather than fabricating zero cash", () => {
  const f = cashFixture();
  const known = projectTransitCashSnapshot(f.collected, f.measureId);
  if (known.kind !== "recorded-cash")
    throw new Error("Expected a real receipt account.");
  // Incomplete read input only: this is not a valid saved World or a supported
  // way to edit the fiscal ledger. Ordinary loading still enforces integrity.
  const incomplete = {
    ...f.collected,
    history: {
      ...f.collected.history,
      resourcePositions: f.collected.history.resourcePositions.filter(
        (position) =>
          position.owner.kind !== "organization" ||
          position.owner.organizationId !== known.publicOrganizationId,
      ),
    },
  };
  const snapshot = projectTransitCashSnapshot(incomplete, f.measureId);
  expect(snapshot.kind).toBe("balance-missing");
  expect(snapshot).not.toHaveProperty("recordedLiquidBalance");
});

it("refuses cash inspection for nonoperative or unknown mandates before reading account facts", () => {
  const contract = transitAppropriationFixture();
  expect(
    projectTransitCashSnapshot(contract.world, contract.measureId),
  ).toMatchObject({ kind: "authority-unavailable" });
  expect(
    projectTransitCashSnapshot(contract.world, contract.personId),
  ).toMatchObject({ kind: "authority-unavailable" });
});
