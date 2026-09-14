import { describe, expect, it } from "vitest";
import { previewCreatorNames } from "./creator-name-preview";

describe("creator name preview", () => {
  it("fills visible given and family names without needing a World", () => {
    const first = previewCreatorNames("ux39-names", "female", 1);
    const second = previewCreatorNames("ux39-names", "female", 2);
    expect(first.givenName.length).toBeGreaterThan(0);
    expect(first.familyName.length).toBeGreaterThan(0);
    expect(`${first.givenName} ${first.familyName}`).not.toBe(
      `${second.givenName} ${second.familyName}`,
    );
  });
});
