import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { ageOnDate } from "../simulation/dates";
import {
  buyHome,
  MORTGAGE_BASIS,
  type HomeMortgageInput,
} from "../simulation/home-purchase";
import { householdMembershipsAt } from "../simulation/life-queries";
import { createOrganization } from "../simulation/life";
import { householdLoansOf, loanTermsAt } from "../simulation/household-loans";
import { monthlyInterestMinor } from "../simulation/public-benefit-formulas";
import { outstandingDebtAt } from "../simulation/resource-queries";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  createResourcePosition,
  money,
} from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
import { projectHomePurchase } from "./home-purchase-view";

const seed = "overflow8-a53-shared-mortgage-20261001";
const place = drawRandomPlace(seed);

describe(`A53 shared mortgage in ${place.displayName} (${place.key}), seed ${seed}`, () => {
  // No complete recorded mortgage contract producer is available yet.
  // Retain the purchase-to-servicing assertions until its terms are supplied.
  it.todo(
    "records mortgage terms and services interest and principal through the world clock",
    () => {
      const fixture = smallWorld({
        place: place.key,
        date: "2026-01-01",
        seed,
        household: true,
      });
      const personId = fixture.world.personOrder.find(
        (id) =>
          ageOnDate(
            fixture.world.people[id]!.birthDate,
            fixture.world.currentDate,
          ) >= 18,
      )!;
      expect(personId).toBeDefined();
      const world = createResourcePosition(
        { ...fixture.world, control: { kind: "person", personId } },
        {
          stableKey: "test:a53:buyer-savings",
          owner: { kind: "person", personId },
          openedAt: fixture.world.currentDate,
          openingBalance: money(100_000_000, "USD"),
          provenance: { kind: "authored", note: "Controlled buyer savings." },
        },
      );
      const bought = buyHome(world, personId);
      expect(bought.status).toBe("bought");
      const loans = householdLoansOf(bought.world, {
        kind: "person",
        personId,
      });
      expect(loans).toHaveLength(1);
      const loan = loans[0]!.obligation;
      const terms = loanTermsAt(
        bought.world,
        loan.id,
        bought.world.currentDate,
      )!;
      expect(terms.kind).toBe("mortgage");
      expect(terms.annualRateBasisPoints).toBeGreaterThan(0);
      expect(terms.repayment.kind).toBe("installment");
      const opening = outstandingDebtAt(bought.world, loan.id)!.minorUnits;
      const later = advanceWorld(
        bought.world,
        31,
        createCampaignElectionTransitionRegistry(),
      );
      const charges = (later.history.debtCharges ?? []).filter(
        (row) => row.resourceObligationId === loan.id,
      );
      expect(charges).toHaveLength(1);
      expect(charges[0]!.amount.minorUnits).toBe(
        monthlyInterestMinor(opening, terms.annualRateBasisPoints),
      );
      const payments = later.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === loan.resourceFlowId,
      );
      expect(payments).toHaveLength(1);
      expect(payments[0]!.status).toBe("completed");
      expect(outstandingDebtAt(later, loan.id)!.minorUnits).toBe(
        opening +
          charges[0]!.amount.minorUnits -
          payments[0]!.transferredAmount.minorUnits,
      );
      expect(outstandingDebtAt(later, loan.id)!.minorUnits).toBeLessThan(
        opening,
      );
      const restored = deserializeWorld(serializeWorld(later));
      expect(outstandingDebtAt(restored, loan.id)).toEqual(
        outstandingDebtAt(later, loan.id),
      );
      expect(loanTermsAt(restored, loan.id, restored.currentDate)).toEqual(
        terms,
      );
    },
  );

  it("leaves the world unchanged when no complete mortgage contract is recorded", () => {
    const fixture = smallWorld({
      place: place.key,
      date: "2026-01-01",
      seed,
      household: true,
    });
    const world = createResourcePosition(fixture.world, {
      stableKey: "test:a53:unsupported-buyer-savings",
      owner: { kind: "person", personId: fixture.personId },
      openedAt: fixture.world.currentDate,
      openingBalance: money(100_000_000, "USD"),
      provenance: { kind: "authored", note: "Controlled buyer savings." },
    });
    const before = serializeWorld(world);
    const quote = projectHomePurchase(world, fixture.personId);
    expect(quote?.kind).toBe("cannot-buy");
    if (!quote || quote.kind === "owns")
      throw new Error("Expected unavailable financing.");
    expect(quote.terms).toContain(
      "Financing terms are not available for this purchase.",
    );
    expect(quote.terms).not.toContain("a month on the mortgage");
    expect(serializeWorld(world)).toBe(before);
    const result = buyHome(world, fixture.personId);
    expect(result.status).toBe("not-bought");
    if (result.status !== "not-bought")
      throw new Error("Expected unsupported financing.");
    expect(result.reason).toBe(
      "No complete recorded mortgage contract is available.",
    );
    expect(result.world).toBe(world);
    expect(serializeWorld(result.world)).toBe(before);
    expect(
      householdLoansOf(result.world, {
        kind: "person",
        personId: fixture.personId,
      }),
    ).toHaveLength(0);
  });

  it("rejects incomplete supplied terms without filling in fees or delinquency rules", () => {
    const fixture = smallWorld({
      place: place.key,
      date: "2026-01-01",
      seed,
      household: true,
    });
    const before = serializeWorld(fixture.world);
    const result = buyHome(
      fixture.world,
      fixture.personId,
      {} as HomeMortgageInput,
    );
    expect(result.status).toBe("not-bought");
    if (result.status !== "not-bought")
      throw new Error("Expected unsupported financing.");
    expect(result.reason).toBe(
      "No complete recorded mortgage contract is available.",
    );
    expect(result.world).toBe(fixture.world);
    expect(serializeWorld(result.world)).toBe(before);
  });

  it("preserves a historical mortgage balance and admits its missing payment terms", () => {
    const fixture = smallWorld({
      place: place.key,
      date: "2026-01-01",
      seed,
      household: true,
    });
    const provenance = {
      kind: "authored" as const,
      note: "Controlled historical mortgage record without loan terms.",
    };
    const householdId = householdMembershipsAt(
      fixture.world,
      fixture.personId,
    )[0]!.household.id;
    let world = createDwelling(fixture.world, {
      stableKey: "test:a53:legacy-home",
      establishedAt: fixture.world.currentDate,
      jurisdictionId: fixture.jurisdictionId,
      locationLabel: fixture.place.displayName,
      classification: "residential:house",
      provenance,
    });
    world = createHousingTenure(world, {
      stableKey: "test:a53:legacy-ownership",
      holder: { kind: "household", householdId },
      dwellingId: world.history.dwellings.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "ownership:mortgaged",
      context: null,
      provenance,
    });
    const tenureId = world.history.housingTenures.at(-1)!.id;
    world = createOrganization(world, {
      stableKey: "test:a53:legacy-lender",
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Historical mortgage lender",
        classification: "enterprise:housing-finance",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    world = createResourceFlow(world, {
      stableKey: "test:a53:legacy-mortgage-flow",
      source: { kind: "person", personId: fixture.personId },
      recipient: {
        kind: "organization",
        organizationId: world.history.organizations.at(-1)!.id,
      },
      startsAt: world.currentDate,
      amount: money(120_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: MORTGAGE_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: fixture.jurisdictionId,
      provenance,
    });
    world = createResourceObligation(world, {
      stableKey: "test:a53:legacy-mortgage-debt",
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      establishedAt: world.currentDate,
      basisKind: MORTGAGE_BASIS,
      principal: money(1_000_000, "USD"),
      careResponsibilityId: null,
      housingTenureId: tenureId,
      provenance,
    });
    const obligationId = world.history.resourceObligations.at(-1)!.id;
    const before = serializeWorld(world);
    expect(projectHomePurchase(world, fixture.personId)).toMatchObject({
      kind: "owns",
      mortgageLine:
        "$10,000 is left on the mortgage. Its payment terms are not available.",
    });
    expect(loanTermsAt(world, obligationId, world.currentDate)).toBeUndefined();
    expect(outstandingDebtAt(world, obligationId)!.minorUnits).toBe(1_000_000);
    expect(serializeWorld(world)).toBe(before);
  });
});
