import { describe, expect, it } from "vitest";
import spending from "../core2/data/budgets/treasury-spending.json" with { type: "json" };
import { contractSaid } from "./contract-words";

// Every line a government buys work on (the treasury's providers, which the
// contracts engine awards) is said by its own word, never by a budget
// heading; a line with no word is "the contract".
describe("contract words", () => {
  it("has a word for every line the contracts engine awards", () => {
    const lines = Object.keys(
      (spending as unknown as { providers: { lines: Record<string, unknown> } })
        .providers.lines,
    );
    expect(lines.length).toBeGreaterThan(0);
    const missing = lines.filter(
      (line) => contractSaid(line) === "the contract",
    );
    expect(missing).toEqual([]);
  });

  it("says a line it has no word for as the contract", () => {
    expect(contractSaid("schools")).toBe("the school contract");
    expect(contractSaid("no-such-line")).toBe("the contract");
  });
});
