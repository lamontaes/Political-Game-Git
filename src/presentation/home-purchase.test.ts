import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  refreshLifeOpportunities,
  serializeWorld,
} from "../simulation";
import {
  LIVING_COSTS_PLACEHOLDER,
  livingCostsFlowFor,
} from "../simulation/cost-of-living";
import {
  HOME_PURCHASE_PLACEHOLDER,
  MORTGAGE_BASIS,
  buyHome,
  homePurchaseReason,
  personOwnsHome,
} from "../simulation/home-purchase";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import type { EntityId, World } from "../simulation";
import { letAdultTimePass } from "./adult-life";
import { projectHomePurchase } from "./home-purchase-view";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Buying a home, asked for by the owner so that money has something to buy.
 * Played in Albuquerque so the proof does not lean on the Kentucky fixture.
 */
function lifeWithSavings(savingsMinor: number): {
  world: World;
  personId: EntityId;
} {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 35,
    placeKey: "3502000",
    questionnaire: "skipped",
    priors: [],
    seed: "home-purchase",
  } as NewGameSetup);
  const personId = created.playerPersonId;
  const opened = openOrdinaryLife(created.world, personId);
  return {
    world: createResourcePosition(opened, {
      stableKey: "test:opening-savings",
      owner: { kind: "person", personId },
      openedAt: opened.currentDate,
      openingBalance: money(savingsMinor, "USD"),
      provenance: { kind: "authored", note: "Test savings." },
    }),
    personId,
  };
}

const balanceOf = (world: World, personId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "person", personId },
    money(0, "USD").currency,
  )!.liquidBalance.minorUnits;

describe("buying a home", () => {
  it("says what the down payment is when there is not enough saved", () => {
    const { world, personId } = lifeWithSavings(1_000_000);
    expect(homePurchaseReason(world, personId)).toBe(
      "The down payment is $50,000.00. You have $10,000.00.",
    );
    const result = buyHome(world, personId);
    expect(result.status).toBe("not-bought");
    expect(result.world).toBe(world);
    expect(projectHomePurchase(world, personId)?.kind).toBe("cannot-buy");
  });

  it("takes the down payment, records the home and owes the rest", () => {
    const { world, personId } = lifeWithSavings(10_000_000);
    expect(projectHomePurchase(world, personId)?.kind).toBe("can-buy");
    const result = buyHome(world, personId);
    expect(result.status).toBe("bought");
    const bought = result.world;
    assertWorldIntegrity(bought);
    expect(personOwnsHome(bought, personId)).toBe(true);
    expect(balanceOf(bought, personId)).toBe(
      10_000_000 - HOME_PURCHASE_PLACEHOLDER.downPaymentMinor,
    );
    const view = projectHomePurchase(bought, personId);
    expect(view).toEqual({
      kind: "owns",
      headline: "Your household owns its home.",
      mortgageLine: "$200,000.00 is left on the mortgage.",
    });
    expect(homePurchaseReason(bought, personId)).toBe(
      "Your household already owns its home.",
    );
    // A save holds the home.
    expect(
      personOwnsHome(deserializeWorld(serializeWorld(bought)), personId),
    ).toBe(true);
  });

  it("charges the mortgage instead of rent on each first of the month", () => {
    const { world, personId } = lifeWithSavings(10_000_000);
    // Living costs start at the full figure, rent included.
    const started = letAdultTimePass(world, 1);
    expect(livingCostsFlowFor(started, personId)).not.toBeNull();
    const bought = buyHome(started, personId);
    expect(bought.status).toBe("bought");
    const later = letAdultTimePass(bought.world, 70);
    assertWorldIntegrity(later);
    const mortgage = later.history.resourceFlows.find(
      (flow) => flow.basisKind === MORTGAGE_BASIS,
    )!;
    const payments = later.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === mortgage.id,
    );
    expect(payments.length).toBeGreaterThanOrEqual(2);
    for (const payment of payments) {
      expect(payment.occurredAt.endsWith("-01")).toBe(true);
      expect(payment.status).toBe("completed");
    }
    const living = livingCostsFlowFor(later, personId)!;
    const afterPurchase = later.history.resourceTransferOutcomes.filter(
      (outcome) =>
        outcome.resourceFlowId === living.id &&
        outcome.occurredAt > bought.world.currentDate,
    );
    expect(afterPurchase.length).toBe(payments.length);
    for (const charge of afterPurchase) {
      expect(charge.transferredAmount.minorUnits).toBe(
        LIVING_COSTS_PLACEHOLDER.monthlyPerAdultMinor -
          LIVING_COSTS_PLACEHOLDER.housingShareMinor,
      );
      expect(charge.note).toMatch(/^Food and bills for /);
    }
    // Settling again, or after a reload, writes nothing.
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(serializeWorld(refreshLifeOpportunities(reloaded, personId))).toBe(
      serializeWorld(later),
    );
  });

  it("notes the first missed mortgage payment once", () => {
    const { world, personId } = lifeWithSavings(
      HOME_PURCHASE_PLACEHOLDER.downPaymentMinor,
    );
    const bought = buyHome(world, personId);
    expect(bought.status).toBe("bought");
    const later = letAdultTimePass(bought.world, 100);
    assertWorldIntegrity(later);
    const missed = later.history.events.filter(
      (event) => event.type === "life.mortgage-missed",
    );
    expect(missed).toHaveLength(1);
    expect(missed[0]!.summary).toMatch(
      /^[A-Z][a-z]+'s mortgage payment was \$1,200\.00, and you could not pay any of it\.$/,
    );
  });

  it("takes only what is left in the last month and then stops", () => {
    const { world, personId } = lifeWithSavings(100_000_000);
    const bought = buyHome(world, personId);
    expect(bought.status).toBe("bought");
    // $200,000 at $1,200 a month is 166 full payments and one of $800.
    const later = letAdultTimePass(bought.world, 5_200);
    assertWorldIntegrity(later);
    const mortgage = later.history.resourceFlows.find(
      (flow) => flow.basisKind === MORTGAGE_BASIS,
    )!;
    const payments = later.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === mortgage.id,
    );
    expect(payments).toHaveLength(167);
    expect(payments.every((payment) => payment.status === "completed")).toBe(
      true,
    );
    expect(payments.at(-1)!.transferredAmount.minorUnits).toBe(80_000);
    expect(projectHomePurchase(later, personId)).toMatchObject({
      kind: "owns",
      mortgageLine: "The mortgage is paid off.",
    });
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(serializeWorld(refreshLifeOpportunities(reloaded, personId))).toBe(
      serializeWorld(later),
    );
  });
});
