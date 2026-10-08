import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { buyHome, homePurchaseTerms } from "../simulation/home-purchase";
import { withPersonalSavings } from "../../tests/fixtures/personal-money";
import { HomePurchasePanel } from "./HomePurchasePanel";

const usd = (minor: number) => `$${(minor / 100).toLocaleString("en-US")}`;

function life(savingsMinor: number) {
  // The opening records the economy's mortgage rate; a world built without it
  // has no quote to offer.
  const created = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 35,
      placeKey: "3502000",
      questionnaire: "skipped",
      priors: [],
      seed: "home-purchase-panel",
    } as NewGameSetup),
  ).game!;
  const personId = created.playerPersonId;
  const opened = openOrdinaryLife(created.world, personId);
  return {
    personId,
    world: withPersonalSavings(opened, personId, savingsMinor),
  };
}

describe("the home panel on Money and property", () => {
  it("offers the purchase with its terms, and keeps the button off while it is out of reach", () => {
    const { world, personId } = life(1_000_000);
    const html = renderToStaticMarkup(
      <HomePurchasePanel
        world={world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    const terms = homePurchaseTerms(
      world,
      world.people[personId]!.homeJurisdictionId,
    );
    // The panel shows its terms as labeled values and writes no sentence
    // about them; $10,000 of savings is under the down payment.
    expect(terms.downPaymentMinor).toBeGreaterThan(1_000_000);
    expect(html).toContain("<dt>House price</dt>");
    expect(html).toContain(`<dd>${usd(terms.priceMinor)}</dd>`);
    expect(html).toContain("<dt>Down payment</dt>");
    expect(html).toContain(`<dd>${usd(terms.downPaymentMinor)}</dd>`);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Buy a home<\/button>/);
  });

  it("shows the mortgage left once the home is bought", () => {
    const { world, personId } = life(10_000_000);
    const bought = buyHome(world, personId);
    expect(bought.status).toBe("bought");
    const html = renderToStaticMarkup(
      <HomePurchasePanel
        world={bought.world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("<h3>Your home</h3>");
    const terms = homePurchaseTerms(
      world,
      world.people[personId]!.homeJurisdictionId,
    );
    expect(html).toContain("<dt>Mortgage left</dt>");
    expect(html).toContain(
      `<dd>${usd(terms.priceMinor - terms.downPaymentMinor)}</dd>`,
    );
    expect(html).not.toContain("Buy a home</button>");
  });
});
