import { describe, expect, it } from "vitest";
import { outcomeLandingDirection as legacyDirection } from "../../simulation/outcome-web/person-outcome-landings";
import { STATES } from "../../simulation/state-reference";
import { outcomeLandingDirectionFromFacts } from "./landing-direction";

describe("standalone outcome landing direction", () => {
  it.each(Object.keys(STATES))("matches legacy direction for US-%s", (usps) => {
    const previous = 0.5 + (usps.charCodeAt(0) % 5) / 10;
    const current = previous + ((usps.charCodeAt(1) % 3) - 1) / 10;
    for (const direction of ["higher-is-better", "higher-is-worse"] as const) {
      expect(
        outcomeLandingDirectionFromFacts(previous, current, direction),
      ).toBe(legacyDirection(previous, current, direction));
    }
  });
});
