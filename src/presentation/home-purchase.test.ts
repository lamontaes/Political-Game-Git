import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";

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
import { homeValueForJurisdiction } from "../simulation/county-home-value";
import {
  MORTGAGE_BASIS,
  buyHome,
  homePurchaseReason,
  homePurchaseTerms,
  personOwnsHome,
} from "../simulation/home-purchase";
import { homePriceLevel } from "../simulation/living-world/housing-market";
import { ageOnDate } from "../simulation/dates";
import { ensureMacroEconomyStarted } from "../simulation/macro-economy/producer";
import { startValuesFromLatents } from "../simulation/macro-economy/kernel";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import type { EntityId, World } from "../simulation";
import { letAdultTimePass } from "./adult-life";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { advanceWorld } from "../simulation/world";
import { projectHomePurchase } from "./home-purchase-view";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";

/**
 * Buying a home, asked for by the owner so that money has something to buy.
 * The buyer's place is drawn from all 56 jurisdictions. The shared builder
 * records their household, while each case supplies only the money it needs.
 */
const BUYER_SEED = "home-purchase-fixture-repair-20261001";
const BUYER_PLACE = drawRandomPlace(BUYER_SEED);

function buyerWorld(seed = BUYER_SEED): { world: World; personId: EntityId } {
  const fixture = smallWorld({
    place: BUYER_PLACE.key,
    date: "2026-01-01",
    seed,
    household: true,
  });
  const adults = fixture.world.personOrder.filter(
    (id) =>
      ageOnDate(
        fixture.world.people[id]!.birthDate,
        fixture.world.currentDate,
      ) >= 18,
  );
  const personId = adults.sort((a, b) =>
    fixture.world.people[b]!.birthDate.localeCompare(
      fixture.world.people[a]!.birthDate,
    ),
  )[0];
  if (!personId) throw new Error("The fixture needs an adult buyer.");
  return {
    world: { ...fixture.world, control: { kind: "person", personId } },
    personId,
  };
}

function lifeWithSavings(savingsMinor: number): {
  world: World;
  personId: EntityId;
} {
  const { world: opened, personId } = buyerWorld();
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

const usd = (minor: number) => `$${(minor / 100).toLocaleString("en-US")}`;

/** The terms the buyer faces in their own county. */
const termsFor = (world: World, personId: EntityId) =>
  homePurchaseTerms(world, world.people[personId]!.homeJurisdictionId);

const balanceOf = (world: World, personId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "person", personId },
    money(0, "USD").currency,
  )!.liquidBalance.minorUnits;

describe(`buying a home in ${BUYER_PLACE.displayName} (${BUYER_PLACE.key}), seed ${BUYER_SEED}`, () => {
  it("offers nothing to a child, even one with money", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 10,
      placeKey: "0203000",
      questionnaire: "skipped",
      priors: [],
      seed: "home-purchase-child",
    } as NewGameSetup);
    const personId = created.playerPersonId;
    const world = createResourcePosition(created.world, {
      stableKey: "test:child-savings",
      owner: { kind: "person", personId },
      openedAt: created.world.currentDate,
      openingBalance: money(10_000_000, "USD"),
      provenance: { kind: "authored", note: "Test savings." },
    });
    expect(projectHomePurchase(world, personId)).toBeNull();
    expect(homePurchaseReason(world, personId)).toBe(
      "You have to be 18 to buy a home.",
    );
    expect(buyHome(world, personId).status).toBe("not-bought");
  });

  it("offers nothing when the game does not hold the person's money", () => {
    const { world: opened, personId } = buyerWorld();
    expect(projectHomePurchase(opened, personId)).toBeNull();
  });

  it("says what the down payment is when there is not enough saved", () => {
    const { world, personId } = lifeWithSavings(1_000_000);
    expect(homePurchaseReason(world, personId)).toBe(
      `The down payment is ${usd(termsFor(world, personId).downPaymentMinor)}. You have $10,000.`,
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
      10_000_000 - termsFor(world, personId).downPaymentMinor,
    );
    const view = projectHomePurchase(bought, personId);
    expect(view).toEqual({
      kind: "owns",
      headline: "Your household owns its home.",
      mortgageLine: `${usd(
        termsFor(world, personId).priceMinor -
          termsFor(world, personId).downPaymentMinor,
      )} is left on the mortgage.`,
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
    const seeded = lifeWithSavings(10_000_000);
    const { world, personId } = lifeWithSavings(
      termsFor(seeded.world, seeded.personId).downPaymentMinor,
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
      new RegExp(
        `^[A-Z][a-z]+'s mortgage payment was \\${usd(
          termsFor(world, personId).monthlyPaymentMinor,
        )}, and you could not pay any of it\\.$`,
      ),
    );
  });

  // Years of ordinary play, enough for every payment and time after payoff.
  it("takes only what is left in the last month and then stops", () => {
    const { world, personId } = lifeWithSavings(100_000_000);
    const bought = buyHome(world, personId);
    expect(bought.status).toBe("bought");
    // The loan paid at the monthly figure is some full payments and one that
    // is whatever is left.
    const terms = termsFor(world, personId);
    const loan = terms.priceMinor - terms.downPaymentMinor;
    const fullPayments = Math.floor(loan / terms.monthlyPaymentMinor);
    const remainder = loan - fullPayments * terms.monthlyPaymentMinor;
    // Ordinary play bounds the mortality frontiers handled by one request.
    // Advance in monthly stretches so a long request cannot truncate the loan.
    let later = bought.world;
    for (let month = 0; month < fullPayments + 3; month += 1) {
      later = letAdultTimePass(later, 31);
    }
    assertWorldIntegrity(later);
    const mortgage = later.history.resourceFlows.find(
      (flow) => flow.basisKind === MORTGAGE_BASIS,
    )!;
    const payments = later.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === mortgage.id,
    );
    expect(
      payments,
      JSON.stringify({
        started: world.currentDate,
        ended: later.currentDate,
        buyerAge: ageOnDate(
          world.people[personId]!.birthDate,
          world.currentDate,
        ),
        lastPayment: payments.at(-1)?.occurredAt,
        deathEvents: later.history.events
          .filter(
            (event) =>
              event.type.includes("death") || event.type.includes("died"),
          )
          .map((event) => event.summary),
      }),
    ).toHaveLength(fullPayments + (remainder > 0 ? 1 : 0));
    expect(payments.every((payment) => payment.status === "completed")).toBe(
      true,
    );
    expect(payments.at(-1)!.transferredAmount.minorUnits).toBe(
      remainder > 0 ? remainder : terms.monthlyPaymentMinor,
    );
    expect(projectHomePurchase(later, personId)).toMatchObject({
      kind: "owns",
      mortgageLine: "The mortgage is paid off.",
    });
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(serializeWorld(refreshLifeOpportunities(reloaded, personId))).toBe(
      serializeWorld(later),
    );
  }, 60_000);

  it("prices the house in the world's prices, not the first month's", () => {
    const fixture = lifeWithSavings(10_000_000);
    const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
    const start = {
      personId: fixture.personId,
      world: ensureMacroEconomyStarted(fixture.world, {
        contractVersion: "crunch46-macro-start/v1",
        policyVersion: "crunch46-provisional-v1",
        regime: "near-reference",
        volatilityScale: 0,
        latents,
        initial: startValuesFromLatents("near-reference", latents),
        effectiveDate: fixture.world.currentDate,
      }),
    };
    expect(projectHomePurchase(start.world, start.personId)?.kind).toBe(
      "can-buy",
    );
    const home = start.world.people[start.personId]!.homeJurisdictionId;
    // The first month's price is the county's median home value.
    const openingPriceMinor = homeValueForJurisdiction(home).dollars * 100;
    expect(homePurchaseTerms(start.world, home).priceMinor).toBe(
      Math.round(openingPriceMinor / 100_000) * 100_000,
    );
    // The world's own economy runs on the transition clock, as in play.
    const later = advanceWorld(
      start.world,
      60,
      createCampaignElectionTransitionRegistry(),
    );
    const factor = homePriceLevel(later, home, later.currentDate);
    expect(factor).not.toBe(1);
    const terms = homePurchaseTerms(later, home);
    expect(terms.priceMinor).toBe(
      Math.round((openingPriceMinor * factor) / 100_000) * 100_000,
    );
    const shown = projectHomePurchase(later, start.personId);
    if (!shown || shown.kind === "owns")
      throw new Error("Expected the buyer's home purchase quote.");
    expect(shown.terms).toContain(
      `$${(terms.priceMinor / 100).toLocaleString("en-US")}`,
    );
  });
});
