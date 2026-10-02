import { describe, expect, it } from "vitest";
import { createWorld } from "../world";
import { CANNABIS_TAX_EFFECT, TAX_QUESTION_EFFECTS } from "./rules";
describe("retired cannabis module retains its sourced tax-row terms", () => {
  it("preserves the exact existing amount, lag, question, source and basis", () => {
    expect(typeof createWorld).toBe("function");
    expect(
      TAX_QUESTION_EFFECTS.filter((row) => row === CANNABIS_TAX_EFFECT),
    ).toHaveLength(1);
    expect(CANNABIS_TAX_EFFECT.questionKey).toBe(
      "us-policy-positions:business-commerce.legalize-cannabis-sales",
    );
    expect(CANNABIS_TAX_EFFECT.source).toBe("selectiveSalesTaxes");
    expect(CANNABIS_TAX_EFFECT.perResidentRevenue).toEqual({
      annualAmount: 40.7,
      firstSaleLagMonths: 11,
    });
    expect(CANNABIS_TAX_EFFECT.toYes).toBeNull();
    expect(CANNABIS_TAX_EFFECT.toNo).toBeNull();
    expect(CANNABIS_TAX_EFFECT.basis).toBe(
      "Legal adult cannabis sales pay the state $40.7 a resident a year in cannabis excise and sales tax, the 2025 average of the ten states with stores open three years or more (Marijuana Policy Project), from the first store opening 11 months after the law takes effect; a law ending legal sales ends it the day it takes effect.",
    );
  });
});
