// @vitest-environment node
// The calendar offers "Go to this day" only when the clock is free: a stop that is open holds
// it, and the server refuses a jump then (BenchPlayer.advance, "Answer the open choice or stop
// first."). The rule is the one function the calendar's plate reads.
import { describe, expect, it } from "vitest";
import { offersJump } from "./ui/calendar.mjs";

describe("the calendar's jump to a day", () => {
  it("is offered for a later day when no stop is open", () => {
    expect(
      offersJump({ selected: "2026-05-16", date: "2026-05-02", held: false }),
    ).toBe(true);
  });
  it("is not offered while a stop is open", () => {
    expect(
      offersJump({ selected: "2026-05-16", date: "2026-05-02", held: true }),
    ).toBe(false);
  });
  it("is never offered for today or an earlier day", () => {
    for (const held of [false, true]) {
      expect(
        offersJump({ selected: "2026-05-02", date: "2026-05-02", held }),
      ).toBe(false);
      expect(
        offersJump({ selected: "2026-04-30", date: "2026-05-02", held }),
      ).toBe(false);
    }
  });
});
