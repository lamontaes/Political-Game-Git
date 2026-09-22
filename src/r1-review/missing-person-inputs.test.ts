import { expect, it } from "vitest";
import { defaultPreparedMaterial } from "../presentation/engine-people29-data";
import { proposeCorrectedGeneration } from "../presentation/complete-outfit";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "../presentation/engine-people29-review";
import type { PersonAppearance } from "../simulation/types";

it("refuses missing prepared body input with a diagnostic, without throwing or manufacturing material", () => {
  for (const missing of [undefined, null]) {
    const result = defaultPreparedMaterial(missing, 16);
    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining("no compatible body artwork"),
    });
    expect(result).not.toHaveProperty("palettes");
    expect(result).not.toHaveProperty("familyId");
  }
});

it("refuses an artwork update without a saved body choice and preserves the exact old appearance", () => {
  for (const selection of [undefined, {}]) {
    const appearance = {
      seed: "missing-choice-control",
      recipeVersion: "appearance-recipe-v2",
      catalogGeneration: 15,
      ...(selection ? { selection } : {}),
    } as PersonAppearance;
    const before = JSON.stringify(appearance);
    const result = proposeCorrectedGeneration(
      appearance,
      16,
      library,
      "standing-neutral",
    );
    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining("no saved body choice"),
      diagnostics: [expect.stringContaining("appearance.selection.bodyFamily")],
    });
    expect(result).not.toHaveProperty("appearance");
    expect(JSON.stringify(appearance)).toBe(before);
  }
});
