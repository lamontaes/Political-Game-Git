import { describe, expect, it } from "vitest";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import {
  currentSceneAppearance,
  selectSceneAppearance,
} from "./scene-dossier-appearance";

const recipe: EngineRecipe = {
  presentation: "masculine",
  build: "average",
  shade: 3,
  face: "recorded-face",
  hair: "recorded-hair",
  hairColor: "black",
  outfit: "recorded-scene-outfit",
  colors: { shirt: "recorded-color" },
};
const context = {
  personId: "person",
  onDate: "2026-10-04",
  sceneKey: "opening:executive",
  inScene: true,
};

describe("selected scene appearance forwarding", () => {
  it("forwards the exact selected recipe object without resolving clothing again", () => {
    const selected = selectSceneAppearance(
      { personId: "person", engine: recipe },
      context.onDate,
      context.sceneKey,
    );
    expect(selected?.appearance.recipe).toBe(recipe);
    expect(currentSceneAppearance(selected, context)).toBe(
      selected?.appearance,
    );
  });
  it.each([
    { personId: "someone-else" },
    { onDate: "2026-10-05" },
    { sceneKey: "ordinary:new-scene" },
    { inScene: false },
  ])("omits stale selected context: %j", (change) => {
    const selected = selectSceneAppearance(
      { personId: "person", engine: recipe },
      context.onDate,
      context.sceneKey,
    );
    expect(
      currentSceneAppearance(selected, { ...context, ...change }),
    ).toBeUndefined();
  });
  it("does not invent appearance for an absent entry or an entry without an engine recipe", () => {
    expect(
      selectSceneAppearance(undefined, context.onDate, context.sceneKey),
    ).toBeNull();
    expect(
      selectSceneAppearance(
        { personId: "person" },
        context.onDate,
        context.sceneKey,
      ),
    ).toBeNull();
  });
});
