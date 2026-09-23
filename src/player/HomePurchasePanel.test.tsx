import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { buyHome } from "../simulation/home-purchase";
import { createResourcePosition, money } from "../simulation/resources";
import { HomePurchasePanel } from "./HomePurchasePanel";

function life(savingsMinor: number) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 35,
    placeKey: "3502000",
    questionnaire: "skipped",
    priors: [],
    seed: "home-purchase-panel",
  } as NewGameSetup);
  const personId = created.playerPersonId;
  const opened = openOrdinaryLife(created.world, personId);
  return {
    personId,
    world: createResourcePosition(opened, {
      stableKey: "test:opening-savings",
      owner: { kind: "person", personId },
      openedAt: opened.currentDate,
      openingBalance: money(savingsMinor, "USD"),
      provenance: { kind: "authored", note: "Test savings." },
    }),
  };
}

describe("the home panel on Money and property", () => {
  it("offers the purchase with its terms, and says why it is out of reach", () => {
    const { world, personId } = life(1_000_000);
    const html = renderToStaticMarkup(
      <HomePurchasePanel
        world={world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("A house costs $250,000.");
    expect(html).toContain("The down payment is $50,000. You have $10,000.");
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
    expect(html).toContain("Your household owns its home.");
    expect(html).toContain("$200,000 is left on the mortgage.");
    expect(html).not.toContain("Buy a home</button>");
  });
});
