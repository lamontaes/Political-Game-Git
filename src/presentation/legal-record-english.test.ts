import { describe, expect, it } from "vitest";

import { legalStandingSentence } from "./legal-record-english";

describe("the Legal tab's standing sentence", () => {
  it("puts a sentence being served first, then a clean record, then pleas", () => {
    expect(
      legalStandingSentence({ serving: "jail", cases: 2, awaitingPlea: 1 }),
    ).toBe("You are serving a jail term.");
    expect(
      legalStandingSentence({
        serving: "probation",
        cases: 1,
        awaitingPlea: 0,
      }),
    ).toBe("You are on probation.");
    expect(
      legalStandingSentence({ serving: null, cases: 0, awaitingPlea: 0 }),
    ).toBe("No one has charged you with a crime.");
    expect(
      legalStandingSentence({ serving: null, cases: 1, awaitingPlea: 1 }),
    ).toBe("One charge against you is waiting for your plea.");
    expect(
      legalStandingSentence({ serving: null, cases: 3, awaitingPlea: 3 }),
    ).toBe("Three charges against you are waiting for your plea.");
    expect(
      legalStandingSentence({ serving: null, cases: 12, awaitingPlea: 12 }),
    ).toBe("12 charges against you are waiting for your plea.");
    // Every charge answered and nothing served: nothing to say.
    expect(
      legalStandingSentence({ serving: null, cases: 2, awaitingPlea: 0 }),
    ).toBeNull();
  });
});
