import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import transit from "../../../data/content/legislation-families/transit.json" with { type: "json" };

const FILES = ["presiding-officers.ts", "law-effect-paths.ts"];

describe("governing values name their provenance", () => {
  it("leaves no placeholder, unresearched or blanket marker in these files", () => {
    for (const file of FILES) {
      const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(text, file).not.toMatch(/placeholder|unresearched|blanket/i);
    }
  });

  it("marks the transit contract hour price as an estimate with its source", () => {
    expect(transit.contractPriceEstimated).toBe(true);
    expect(transit.contractPriceEstimatedFrom).toMatch(
      /ESTIMATED FROM AVERAGE/,
    );
    expect(transit.contractPriceEstimatedFrom).toMatch(
      /National Transit Database/,
    );
  });
});
