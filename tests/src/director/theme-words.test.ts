import { describe, expect, it } from "vitest";
import { themeNameBy } from "../../../src/director/theme-words";

/** The speaker's traits choose the theme's wording, never a draw (W1, Nov 24). */
const leaning = (facet: string) => ({ [`personality-v1:facet-${facet}`]: 2 });

describe("a theme as its speaker words it", () => {
  it("gives different speakers different wordings of one theme, and one speaker the same each time", () => {
    const said = ["studious", "practical", "nurturing"].map((facet) =>
      themeNameBy(leaning(facet), "safety-net"),
    );
    expect(new Set(said).size).toBe(3);
    expect(themeNameBy(leaning("practical"), "safety-net")).toBe(said[1]);
    // No lean says the full phrase.
    expect(themeNameBy({}, "safety-net")).toBe(said[0]);
    // A theme with one wording says it for everyone.
    expect(themeNameBy(leaning("practical"), "abortion")).toBe("abortion");
    expect(themeNameBy({}, "no-such-theme")).toBeNull();
  });
});
