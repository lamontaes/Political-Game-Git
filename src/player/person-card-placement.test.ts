import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import { projectPersonDossier } from "../presentation/person-dossier";
import { placeAnchoredCard } from "./PersonCard";

const VIEWPORT = { width: 1280, height: 720 };
const CARD = { width: 368, height: 397 };

describe("contextual person card placement", () => {
  it("sits to the right of the clicked person, top-aligned, when it fits", () => {
    const placed = placeAnchoredCard(
      { left: 447, top: 112, width: 284, height: 551 },
      CARD,
      VIEWPORT,
    );
    expect(placed.side).toBe("right");
    expect(placed.left).toBe(447 + 284 + 14);
    expect(placed.top).toBe(112);
  });

  it("flips to the left near the right edge and never leaves the window", () => {
    const placed = placeAnchoredCard(
      { left: 1100, top: 40, width: 150, height: 500 },
      CARD,
      VIEWPORT,
    );
    expect(placed.side).toBe("left");
    expect(placed.left).toBe(1100 - 14 - CARD.width);
    expect(placed.left).toBeGreaterThanOrEqual(12);
    expect(placed.left + CARD.width).toBeLessThanOrEqual(VIEWPORT.width - 12);
  });

  it("keeps the bottom of the window free for choices and corner controls", () => {
    const placed = placeAnchoredCard(
      { left: 100, top: 600, width: 120, height: 100 },
      CARD,
      VIEWPORT,
    );
    const reserve = Math.min(160, Math.round(VIEWPORT.height * 0.22));
    expect(placed.top + CARD.height).toBeLessThanOrEqual(
      VIEWPORT.height - reserve,
    );
    expect(placed.top).toBeGreaterThanOrEqual(12);
  });

  it("clamps a card taller than the window to the top margin", () => {
    const placed = placeAnchoredCard(
      { left: 100, top: 300, width: 120, height: 100 },
      { width: 368, height: 900 },
      { width: 1024, height: 768 },
    );
    expect(placed.top).toBe(12);
  });
});

describe("the player's own card", () => {
  it("never says 'You last spoke' or 'same household' about the player", () => {
    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "ui-follow-self-card",
      givenName: null,
      familyName: null,
    });
    const self = projectPersonDossier(
      game.world,
      game.playerPersonId,
      game.playerPersonId,
    );
    expect(self).not.toBeNull();
    expect(self!.lastInteraction).toBe("This is you.");
    const text = [
      self!.lastInteraction,
      ...self!.details.map((fact) => fact.text),
    ].join(" ");
    expect(text).not.toMatch(
      /You last spoke|You haven't spoken|same household/,
    );
  });
});
