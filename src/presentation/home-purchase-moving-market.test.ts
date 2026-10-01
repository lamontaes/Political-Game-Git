import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { homeValueForJurisdiction } from "../simulation/county-home-value";
import { ageOnDate } from "../simulation/dates";
import {
  buyHome,
  homePurchaseTerms,
  personOwnsHome,
} from "../simulation/home-purchase";
import { homePriceLevel } from "../simulation/living-world/housing-market";
import { createHousehold, startHouseholdMembership } from "../simulation/life";
import { personName } from "../simulation/people";
import { startValuesFromLatents } from "../simulation/macro-economy/kernel";
import { ensureMacroEconomyStarted } from "../simulation/macro-economy/producer";
import { macroMonthHistory } from "../simulation/macro-economy/readers";
import { createResourcePosition, money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
import { projectHomePurchase } from "./home-purchase-view";

const SEED = "overflow8-a54-moving-market-20261001";
const places = Array.from({ length: 3 }, (_, index) => ({
  seed: `${SEED}:${index}`,
  place: drawRandomPlace(`${SEED}:${index}`),
}));
const roundedPrice = (minor: number) =>
  Math.max(100_000, Math.round(minor / 100_000) * 100_000);
const dollars = (minor: number) => `$${(minor / 100).toLocaleString("en-US")}`;

describe("A54 home quotes follow the moving recorded housing market", () => {
  it.each(places)(
    "$place.displayName ($place.key), seed $seed",
    ({ place, seed }) => {
      const fixture = smallWorld({
        place: place.key,
        date: "2026-01-01",
        seed,
      });
      const adult = fixture.world.personOrder.find(
        (id) =>
          ageOnDate(
            fixture.world.people[id]!.birthDate,
            fixture.world.currentDate,
          ) >= 18,
      )!;
      expect(adult).toBeDefined();
      const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
      // Controlled opening conditions; the production monthly producer records
      // all later values through the ordinary transition clock.
      let world = ensureMacroEconomyStarted(
        { ...fixture.world, control: { kind: "person", personId: adult } },
        {
          contractVersion: "crunch46-macro-start/v1",
          policyVersion: "crunch46-provisional-v1",
          regime: "near-reference",
          volatilityScale: 0,
          latents,
          initial: startValuesFromLatents("near-reference", latents),
          effectiveDate: fixture.world.currentDate,
        },
      );
      world = createHousehold(world, {
        stableKey: "test:a54:buyer-household",
        formedAt: world.currentDate,
        label: "Buyer's household",
        provenance: { kind: "authored", note: "Controlled buyer household." },
      });
      world = startHouseholdMembership(world, {
        stableKey: "test:a54:buyer-membership",
        personId: adult,
        householdId: world.history.households.at(-1)!.id,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance: { kind: "authored", note: "Controlled buyer household." },
      });
      world = createResourcePosition(world, {
        stableKey: "test:a54:buyer-savings",
        owner: { kind: "person", personId: adult },
        openedAt: world.currentDate,
        openingBalance: money(100_000_000, "USD"),
        provenance: { kind: "authored", note: "Controlled buyer savings." },
      });
      const town = world.people[adult]!.homeJurisdictionId!;
      const openingMinor = homeValueForJurisdiction(town).dollars * 100;
      expect(homePurchaseTerms(world, town).priceMinor).toBe(
        roundedPrice(openingMinor),
      );
      const openingQuote = projectHomePurchase(world, adult);
      expect(openingQuote?.kind).toBe("can-buy");

      const later = advanceWorld(
        world,
        180,
        createCampaignElectionTransitionRegistry(),
      );
      expect(
        macroMonthHistory(later, "national", later.currentDate).length,
      ).toBeGreaterThan(1);
      const level = homePriceLevel(later, town, later.currentDate);
      expect(level).not.toBe(1);
      const terms = homePurchaseTerms(later, town);
      expect(terms.priceMinor).toBe(roundedPrice(openingMinor * level));
      expect(terms.priceMinor).not.toBe(
        homePurchaseTerms(world, town).priceMinor,
      );
      const beforeRead = serializeWorld(later);
      const quote = projectHomePurchase(later, adult);
      expect(quote?.kind).toBe("can-buy");
      if (!quote || quote.kind === "owns")
        throw new Error("No purchase quote.");
      expect(quote.terms).toContain(
        `A house costs ${dollars(terms.priceMinor)}.`,
      );
      expect(serializeWorld(later)).toBe(beforeRead);
      const reopened = deserializeWorld(beforeRead);
      expect(projectHomePurchase(reopened, adult)).toEqual(quote);

      const bought = buyHome(reopened, adult);
      expect(bought.status).toBe("bought");
      expect(personOwnsHome(bought.world, adult)).toBe(true);
      const event = bought.world.history.events.find(
        (row) => row.type === "life.home-bought",
      );
      expect(event?.summary).toContain(`for ${dollars(terms.priceMinor)},`);
      const purchaseSummary = event!.summary;
      const saved = deserializeWorld(serializeWorld(bought.world));
      const movedAgain = advanceWorld(
        saved,
        30,
        createCampaignElectionTransitionRegistry(),
      );
      expect(homePriceLevel(movedAgain, town, movedAgain.currentDate)).not.toBe(
        level,
      );
      expect(
        movedAgain.history.events.find((row) => row.id === event!.id)?.summary,
      ).toBe(purchaseSummary);
      expect(buyHome(movedAgain, adult).status).toBe("not-bought");
      console.info("A54 watched purchase", {
        place: place.displayName,
        seed,
        personId: adult,
        buyer: personName(later.people[adult]!),
        openingPriceMinor: homePurchaseTerms(world, town).priceMinor,
        housingLevel: level,
        purchasePriceMinor: terms.priceMinor,
        savedPurchase: purchaseSummary,
      });
    },
  );
});
