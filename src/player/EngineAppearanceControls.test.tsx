import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { CreatorAppearanceStep } from "./CreatorAppearanceStep";
import { EngineAppearanceControls } from "./EngineAppearanceControls";
import { creatorAppearanceDraft } from "../presentation/creator-appearance-preview";
import { NORMAL_APPEARANCE_LIBRARY } from "./SavedAppearance";
import { engineRecipeFor } from "../presentation/appearance-engine/recipe";
import { PEOPLE_PACK } from "../presentation/appearance-engine/runtime";
import type * as AppearanceRuntime from "../presentation/appearance-engine/runtime";

// Exercise the bundled-pack UI branch without decoding private raster assets.
vi.mock(
  "../presentation/appearance-engine/runtime",
  async (importOriginal) => ({
    ...(await importOriginal<typeof AppearanceRuntime>()),
    peoplePackAvailable: () => true,
  }),
);
vi.mock("./EnginePerson", () => ({ EngineFigure: () => null }));

describe("Creator presentation selector visibility", () => {
  it.each(["male", "female", "nonbinary"] as const)(
    "preserves %s setup and shows the body choice only when requested",
    (gender) => {
      const setup = {
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: "2537385",
        startAge: 30,
        seed: "creator-presentation-visibility",
        gender,
      };
      const before = JSON.stringify(setup);
      const html = renderToStaticMarkup(
        <CreatorAppearanceStep
          setup={setup}
          mode="production"
          onBegin={() => {}}
        />,
      );
      expect(html).toContain("<h2>Character appearance</h2>");
      expect(
        html.includes('data-testid="engine-appearance-presentation"'),
      ).toBe(gender === "nonbinary");
      expect(html).toContain('data-testid="engine-appearance-build"');
      expect(html).toContain('data-testid="engine-appearance-outfit"');
      expect(html).toContain('data-testid="begin"');
      expect(JSON.stringify(setup)).toBe(before);
    },
  );

  it("keeps presentation available by default for existing control callers without changing the recipe", () => {
    const world = creatorAppearanceDraft(
      {
        ...DEFAULT_NEW_GAME_SETUP,
        startAge: 30,
        seed: "creator-controls-default",
        gender: "female",
      },
      NORMAL_APPEARANCE_LIBRARY,
    )!;
    const recipe = engineRecipeFor(
      world.people[world.personOrder[0]!]!,
      world.currentDate,
      PEOPLE_PACK,
    );
    if (!recipe) throw new Error("The test preview has no engine recipe.");
    const before = JSON.stringify(recipe);
    const html = renderToStaticMarkup(
      <EngineAppearanceControls recipe={recipe} onChange={() => {}} />,
    );
    expect(html).toContain('data-testid="engine-appearance-presentation"');
    expect(JSON.stringify(recipe)).toBe(before);
  });
});
