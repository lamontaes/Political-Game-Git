import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { NORMAL_APPEARANCE_LIBRARY } from "./SavedAppearance";
import { CreatorAppearanceStep } from "./CreatorAppearanceStep";

/**
 * The ordinary production build, which is what any checkout without the
 * private people pack plays. Every released character component today is a
 * development fixture, and fixtures are never offered as a choice, so there is
 * nothing to choose from. That is the art gap, not a defect: the step has to
 * say so in the player's words and still let them begin.
 */
describe("creator appearance step with no approved artwork", () => {
  const markup = renderToStaticMarkup(
    <CreatorAppearanceStep
      setup={{
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "creator-no-art",
        startAge: 30,
      }}
      mode="production"
      onBegin={() => {}}
    />,
  );

  it("offers nothing because nothing approved exists, not because of a fault", () => {
    expect(NORMAL_APPEARANCE_LIBRARY.components.size).toBe(0);
    expect(markup).toContain('data-testid="creator-artwork-status"');
  });

  it("says so in words a player understands", () => {
    expect(markup).toContain(
      "Choosing how you look is not available yet. Your character can still begin.",
    );
    expect(markup).not.toMatch(/catalog|compatible artwork/i);
    // Nothing on the step invites a choice that does not exist.
    expect(markup).not.toContain("Choose your appearance before beginning");
  });

  it("gives the whole step to the text when there is no figure to draw", () => {
    expect(markup).toContain("kit41-creator-layout--no-figure");
  });

  it("still lets the player begin", () => {
    expect(markup).toMatch(/data-testid="begin"/);
    expect(markup).not.toMatch(/data-testid="begin"[^>]*disabled/);
  });
});
