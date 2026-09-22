import { describe, expect, it } from "vitest";

import { configuredArtConsumers } from "./compiled-art-consumers";

describe("configured art consumers without a private character pack", () => {
  // This audit runs inside `npm run build` for the internal-art-review
  // profile, and the packaging workflow states the contract it has to meet:
  // public CI "intentionally has no private candidate pack", so it verifies
  // saved material exactly when present and does not require material the
  // reviewed source is forbidden to contain.
  //
  // It used to throw "No complete configured creator compositions could be
  // verified" whenever it found no prepared body, which on a checkout with no
  // pack is every time. That made the art-review build red on every runner
  // except the owner's own Mac, and red for a reason that was not a defect.
  it("reports the absence and does not fail the build", () => {
    const result = configuredArtConsumers(true);
    expect(result.completePlans).toBe(0);
    // Silence is what made this hard to read the first time. The audit has to
    // say which of the two it hit, so nobody has to guess whether the pack was
    // missing or the renderer could not use it.
    expect(
      result.gaps.some((gap) => gap.includes("no private character pack")),
    ).toBe(true);
  });

  it("still reports the production consumers it can verify without a pack", () => {
    // The early return must not cost the consumers already collected above it;
    // returning an empty projection would be its own silent loss.
    expect(configuredArtConsumers(true).consumers.length).toBeGreaterThan(0);
  });
});
