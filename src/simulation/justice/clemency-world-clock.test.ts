import { describe, expect, it } from "vitest";
import { composeWorldTimeHandlers } from "../campaigns";
import { CLEMENCY_PETITION_TRANSITION_KEY } from "./clemency-transitions";

// A saved clemency petition schedules a due item on the world's own clock.
// Without its handler in the composed world clock, the first petition that
// comes due stops time ("Missing future-transition handler"), which ended
// watched worlds in Louisiana and Indiana about 18 months in.
describe("the world clock carries saved clemency petitions", () => {
  it("composes the clemency petition handler into the world's time handlers", () => {
    expect(
      composeWorldTimeHandlers().get(CLEMENCY_PETITION_TRANSITION_KEY),
    ).toBeTypeOf("function");
  });
});
