import { describe, expect, it } from "vitest";

import { lieMarkerFor } from "./lie-marker";

describe("Lie marker", () => {
  it("marks only a choice that declares deliberate deception", () => {
    expect(lieMarkerFor({ truthIntent: "deliberate-deception" })?.label).toBe(
      "Lie",
    );
  });

  it("never marks a sincere choice, even one that may prove mistaken", () => {
    expect(lieMarkerFor({ truthIntent: "sincere" })).toBeNull();
  });

  it("never guesses when a choice declares nothing", () => {
    expect(lieMarkerFor({})).toBeNull();
  });
});
