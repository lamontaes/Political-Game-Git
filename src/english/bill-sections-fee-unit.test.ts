import { describe, expect, it } from "vitest";
import { composeBill, valueWords } from "./bill-sections";

// A fee-level law is a percent of today's fee (src/core2/fee-levels.ts), and a
// bill says so: "125 percent of today's fee", never a bare "125 percent".
describe("a fee-level bill's words", () => {
  const unit = "percent of today's fee";

  it("says a fee value against today's fee", () => {
    expect(valueWords(125, unit)).toBe("125 percent of today's fee");
    expect(valueWords(8.773, "percent")).toBe("8.77 percent");
  });

  it("composes a fee raise that names what it is a percent of", () => {
    const bill = composeBill({
      id: "b:fee-level:parks-and-recreation",
      number: "2026-1",
      form: { kind: "ordinance", enactingClause: "Be it ordained by the Town" },
      provisions: [
        {
          kind: "law-amount",
          series: "fee-level:parks-and-recreation",
          value: 125,
          unit,
        },
      ],
      before: [{ value: 100, unit, statute: null }],
    })!;
    const section = bill.sections[0]!;
    expect(section).toContain("raised");
    expect(section).toContain("of today's fee");
    expect(section).not.toMatch(/[{}]|undefined|NaN/);
  });
});
