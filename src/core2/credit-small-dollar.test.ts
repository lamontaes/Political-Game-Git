/**
 * The small-dollar lender table and the law that opens it: every state whose
 * starting answer to the consumer-loan cap question is no has a lender (a
 * printed rate, else the national typical rate as an estimate), every state
 * with a row says no, each rate is a figure its source prints, and each
 * source carries its tag, citation, quoted line and spread.
 */
import { describe, expect, it } from "vitest";
import startingLaw from "../../data/research/laws/starting-law-2026/business-commerce.json";
import table from "./data/credit/small-dollar.json";
import { CREDIT_PARAMETERS, smallDollarTerms } from "./modules/credit";

const answers = (
  startingLaw.questions as Record<
    string,
    { answers: Record<string, { answer?: string }> }
  >
)[table.question]!.answers;
const states = table.states as Record<
  string,
  { apr: number; product: string; source: string }
>;
const sources = table.sources as Record<
  string,
  {
    tag: string;
    citation: string;
    quote: string;
    spread: { low: number; high: number };
  }
>;

describe("the small-dollar lender table", () => {
  it("has a lender exactly where the starting law says the cap question is no", () => {
    for (const [state, row] of Object.entries(answers)) {
      const terms = smallDollarTerms(state);
      if (row.answer === table.allowedWhenStartingAnswer) {
        expect(terms, state).toBeDefined();
        expect(terms!.annualRate, state).toBe(
          states[state]?.apr ?? CREDIT_PARAMETERS.smallDollarFallbackApr!.value,
        );
      } else expect(terms, `${state} ends them`).toBeUndefined();
    }
    for (const state of Object.keys(states))
      expect(answers[state]?.answer, `${state} has a row`).toBe(
        table.allowedWhenStartingAnswer,
      );
  });

  it("marks a state the sources print no rate for as an estimate at the national typical rate", () => {
    const missing = Object.keys(answers).filter(
      (state) =>
        answers[state]!.answer === table.allowedWhenStartingAnswer &&
        !states[state],
    );
    expect(missing.length).toBeGreaterThan(0);
    for (const state of missing) {
      const terms = smallDollarTerms(state)!;
      expect(terms.source).toBe("fallback");
      expect(terms.tag).toBe("ESTIMATED");
      expect(terms.annualRate).toBe(3.91);
    }
  });

  it("keeps each rate inside its source's printed spread, with the source's tag, citation and quoted line", () => {
    for (const [state, row] of Object.entries(states)) {
      const source = sources[row.source];
      expect(source, `${state} source`).toBeDefined();
      expect(row.apr, state).toBeGreaterThanOrEqual(source!.spread.low);
      expect(row.apr, state).toBeLessThanOrEqual(source!.spread.high);
      expect(["payday", "installment"], state).toContain(row.product);
    }
    for (const [key, source] of Object.entries(sources)) {
      expect(source.tag, key).toBe("SOURCED");
      expect(source.citation, key).toContain("https://");
      expect(source.quote.length, key).toBeGreaterThan(40);
      const rates = Object.values(states)
        .filter((row) => row.source === key)
        .map((row) => row.apr);
      expect(Math.min(...rates), key).toBe(source.spread.low);
      expect(Math.max(...rates), key).toBe(source.spread.high);
    }
  });

  it("carries a tag, a citation and a spread on every number it reads", () => {
    for (const [key, row] of Object.entries(CREDIT_PARAMETERS)) {
      if (!key.startsWith("smallDollar")) continue;
      expect(row.citation.length, key).toBeGreaterThan(40);
      expect(["SOURCED", "ESTIMATED", "TUNABLE"], key).toContain(row.tag);
      expect(row.spread, key).toBeDefined();
    }
  });
});
