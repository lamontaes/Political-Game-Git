import { describe, expect, it } from "vitest";
import { nominateAndConfirm, senateSides } from "./appointments";

describe("appointments: nominate and confirm", () => {
  it("the Senate is this world's party makeup, and a majority confirms the appointer's best-suited nominee", () => {
    const sides = senateSides("appointments-test");
    expect(sides).toHaveLength(100);
    const candidates = [
      { id: "a", lean: 0.9, qualification: 0.6, known: false },
      { id: "b", lean: 0.4, qualification: 0.9, known: true },
      { id: "c", lean: -0.6, qualification: 0.95, known: false },
    ];
    const right = nominateAndConfirm({
      seatKey: "governor:1",
      appointerSide: 1,
      candidates,
      confirmingBody: { name: "U.S. Senate", sides },
    });
    expect(right.reasons[0]!.candidateId).toBe("b");
    expect(right.confirmation!.yes + right.confirmation!.no).toBe(100);
    expect(right.confirmation!.yes).toBe(
      sides.filter((s) => s > 0).length + sides.filter((s) => s === 0).length,
    );
    expect(right.nomineeId).toBe("b");
    // A Democratic president's left nominee fails in a Republican Senate, then the next choice is tried.
    const left = nominateAndConfirm({
      seatKey: "governor:2",
      appointerSide: -1,
      candidates,
      confirmingBody: { name: "U.S. Senate", sides },
    });
    expect(left.reasons[0]!.candidateId).toBe("c");
    if (sides.filter((s) => s > 0).length > 50)
      expect(left.nomineeId).not.toBe("c");
    // No confirmation required: the first choice is appointed.
    expect(
      nominateAndConfirm({
        seatKey: "x",
        appointerSide: -1,
        candidates,
        confirmingBody: null,
      }).nomineeId,
    ).toBe("c");
  });
});
