import { describe, expect, it } from "vitest";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import {
  currentSceneAppearance,
  expandSceneAppearance,
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

describe("explicit scene-to-full-record expansion", () => {
  const selected = () =>
    selectSceneAppearance(
      { personId: "person", engine: recipe },
      context.onDate,
      context.sceneKey,
    );
  it("preserves the exact recipe through explicit same-person expansion without mutating selection", () => {
    const original = selected();
    const expanded = expandSceneAppearance(original, context);
    expect(expanded?.appearance).toBe(original?.appearance);
    expect(original).not.toHaveProperty("expanded");
    expect(
      currentSceneAppearance(expanded, {
        ...context,
        inScene: false,
        inExpandedRecord: true,
      })?.recipe,
    ).toBe(recipe);
  });
  it.each([
    { personId: "someone-else" },
    { onDate: "2026-10-05" },
    { sceneKey: "opening:next-step-same-day" },
    { inExpandedRecord: false },
  ])(
    "retires expanded context on changed identity/date/scene/exit: %j",
    (change) => {
      const expanded = expandSceneAppearance(selected(), context);
      expect(
        currentSceneAppearance(expanded, {
          ...context,
          inScene: false,
          inExpandedRecord: true,
          ...change,
        }),
      ).toBeUndefined();
    },
  );
  it("does not carry an unexpanded scene selection into a general person record", () => {
    expect(
      currentSceneAppearance(selected(), {
        ...context,
        inScene: false,
        inExpandedRecord: true,
      }),
    ).toBeUndefined();
    expect(
      expandSceneAppearance(selected(), {
        ...context,
        inScene: false,
        inExpandedRecord: true,
      }),
    ).toBeNull();
  });
  it("rejects a stale or different-person expansion before admitting its context", () => {
    expect(
      expandSceneAppearance(selected(), {
        ...context,
        sceneKey: "ordinary:changed-same-day",
      }),
    ).toBeNull();
    expect(
      expandSceneAppearance(selected(), {
        ...context,
        personId: "someone-else",
      }),
    ).toBeNull();
  });
});
