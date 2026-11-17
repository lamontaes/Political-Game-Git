import { describe, expect, it } from "vitest";
import billNames from "../../data/english/bill-names.json" with { type: "json" };
import { composeBill } from "./bill-sections";
import { billLevelWord, billTitleOf, type BillNameBook } from "./bill-names";

/**
 * A bill's composed title names its own level (Words, Nov 17): the one row of
 * the catalog titles a federal House bill, a state bill and a town's ordinance
 * with that body's own level word, never "local" on all three.
 */
const BOOK = billNames as BillNameBook;
const bodies = [
  { level: "federal", kind: "act", word: "federal" },
  { level: "state", kind: "act", word: "state" },
  { level: "city", kind: "ordinance", word: "city" },
] as const;

const provision = (series: string) => ({
  kind: "law-amount",
  series,
  policyId: `law:${series}`,
  value: 5,
  operation: "raise",
});

describe("a bill's title says the level of its body", () => {
  for (const series of ["income-tax", "sales-tax"] as const) {
    for (const body of bodies) {
      it(`${series} before a ${body.level} body`, () => {
        const provisions = [provision(series)];
        const bill = {
          id: `b:${series}:${body.level}`,
          number: "1",
          form: { kind: body.kind, enactingClause: "Be it enacted" },
          level: body.level,
          provisions,
        };
        const tax = series.replace("-tax", "");
        const composed = composeBill(bill)!;
        expect(composed.title).toContain(`the ${body.word} ${tax} tax`);
        expect(composed.sections[0]).toContain(`the ${body.word} ${tax} tax`);
        const titled = billTitleOf(bill, BOOK)!;
        expect(titled.purpose).toBe(`a higher ${body.word} ${tax} tax rate`);
        for (const text of [
          composed.title,
          ...composed.sections,
          titled.purpose,
        ])
          expect(text).not.toMatch(/local|[{}]|\s{2}/);
      });
    }
  }

  it("says no level word where the bill's level is not known", () => {
    const titled = billTitleOf(
      {
        form: { kind: "act" },
        provisions: [provision("income-tax")],
      },
      BOOK,
    )!;
    expect(titled.purpose).toBe("a higher income tax rate");
  });

  // A town's own body goes by its government's class word, from the record's name.
  for (const [name, word] of [
    ["Village of Mutual", "village"],
    ["Pine Borough", "borough"],
    ["Town of Edgar", "town"],
    ["Springfield", "city"],
  ] as const) {
    it(`a body of ${name} says "${word}"`, () => {
      const level = billLevelWord("city", name, BOOK);
      expect(level).toBe(word);
      const bill = {
        id: `b:${word}`,
        number: "1",
        form: { kind: "ordinance", enactingClause: "Be it ordained" },
        level,
        provisions: [provision("income-tax")],
      };
      expect(composeBill(bill)!.title).toBe(
        `An ordinance to set the rate of the ${word} income tax.`,
      );
      expect(billTitleOf(bill, BOOK)!.purpose).toBe(
        `a higher ${word} income tax rate`,
      );
    });
  }

  it("keeps the federal, state, county and township words whatever the government's name", () => {
    expect(billLevelWord("federal", "Village of Mutual", BOOK)).toBe("federal");
    expect(billLevelWord("state", "Pine Borough", BOOK)).toBe("state");
    expect(billLevelWord("county", "Lake County", BOOK)).toBe("county");
    expect(billLevelWord("township", "Town of Edgar", BOOK)).toBe("township");
  });
});
