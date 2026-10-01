import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { ageOnDate } from "../simulation/dates";
import { buyHome } from "../simulation/home-purchase";
import { householdLoansOf, loanTermsAt } from "../simulation/household-loans";
import { monthlyInterestMinor } from "../simulation/public-benefit-formulas";
import { outstandingDebtAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";

const seed = "overflow8-a53-shared-mortgage-20261001";
const place = drawRandomPlace(seed);

describe(`A53 shared mortgage in ${place.displayName} (${place.key}), seed ${seed}`, () => {
  it("records mortgage terms and services interest and principal through the world clock", () => {
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
    const loans = householdLoansOf(bought.world, { kind: "person", personId });
    expect(loans).toHaveLength(1);
    const loan = loans[0]!.obligation;
    const terms = loanTermsAt(bought.world, loan.id, bought.world.currentDate)!;
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
    expect(outstandingDebtAt(later, loan.id)!.minorUnits).toBeLessThan(opening);
    const restored = deserializeWorld(serializeWorld(later));
    expect(outstandingDebtAt(restored, loan.id)).toEqual(
      outstandingDebtAt(later, loan.id),
    );
    expect(loanTermsAt(restored, loan.id, restored.currentDate)).toEqual(terms);
  });
});
