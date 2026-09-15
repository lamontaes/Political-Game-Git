import { describe, expect, it } from "vitest";

import { previewCreatorNames } from "./creator-name-preview";

describe("creator name preview", () => {
  it("draws readable names without a World and repeats for the same presses", () => {
    const first = previewCreatorNames("ui-finish-names", "female", 1);
    expect(first.givenName.length).toBeGreaterThan(0);
    expect(first.familyName.length).toBeGreaterThan(0);
    expect(previewCreatorNames("ui-finish-names", "female", 1)).toEqual(first);
  });

  it("gives a different draw on a later press", () => {
    const draws = new Set(
      [1, 2, 3, 4, 5].map((salt) => {
        const name = previewCreatorNames("ui-finish-names", "male", salt);
        return `${name.givenName} ${name.familyName}`;
      }),
    );
    expect(draws.size).toBeGreaterThan(1);
  });
});
