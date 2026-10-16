import { describe, expect, it } from "vitest";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { checkAmericanEnglish } from "../../scripts/prose-eval/american-english";
import { billNameFor, billNameOf, billTitleOf } from "./bill-names";

const questions: { question: string; name: string }[] = [];
const walk = (value: unknown): void => {
  if (Array.isArray(value)) value.forEach(walk);
  else if (value && typeof value === "object") {
    const row = value as { kind?: string; name?: string; question?: string };
    if (row.kind === "policy-question" && row.question && row.name)
      questions.push({ question: row.question, name: row.name });
    Object.values(value).forEach(walk);
  }
};
walk(billCatalog);

describe("bill names", () => {
  it("names every policy question a bill can enact or repeal, and never by its description", () => {
    expect(questions.length).toBeGreaterThan(50);
    const titles = new Set<string>();
    for (const { question, name } of questions) {
      for (const repeal of [false, true]) {
        for (const form of ["act", "ordinance"]) {
          const found = billNameFor(question, form, repeal);
          expect(found, `${question} ${form} repeal=${repeal}`).not.toBeNull();
          expect(found!.title.toLowerCase()).not.toBe(name.toLowerCase());
          expect(found!.purpose.trim()).not.toBe("");
          if (form === "act") titles.add(found!.title);
        }
      }
    }
    // Every name is its own: no two policies, enacted or repealed, share one.
    expect(titles.size).toBe(questions.length * 2);
  });

  it("puts the bill's own form word after the name", () => {
    const { question } = questions[0]!;
    expect(billNameFor(question, "act", false)!.title).toMatch(/ Act$/);
    expect(billNameFor(question, "ordinance", false)!.title).toMatch(
      / Ordinance$/,
    );
    expect(billNameFor("no-such-question", "act", false)).toBeNull();
  });

  it("names a bill by its first section that has a name, in the direction the section runs", () => {
    const form = { kind: "ordinance" };
    expect(
      billNameOf({
        form,
        provisions: [
          {
            kind: "law-amount",
            policyId: "law:minimum-wage",
            operation: "raise",
            value: 1500,
          },
        ],
      })?.title,
    ).toBe("Wage Floor Increase Ordinance");
    expect(
      billNameOf({
        form,
        provisions: [
          {
            kind: "budget-line",
            policyId: "budget:parks",
            operation: "restrict",
            value: -1,
          },
        ],
      })?.reverses,
    ).toBe(true);
    // A rate with no recorded direction has no name rather than a guessed one.
    expect(
      billNameOf({
        form,
        provisions: [
          { kind: "law-amount", policyId: "law:minimum-wage", value: 1500 },
        ],
      }),
    ).toBeNull();
  });

  it("is current American English", () => {
    const parts = questions.flatMap(({ question }) => {
      const found = billNameFor(question, "act", false)!;
      const repeal = billNameFor(question, "act", true)!;
      return [found.title, found.purpose, repeal.title, repeal.purpose].map(
        (text, at) => ({
          path: `bill-names:${question}:${at}`,
          text,
          provenance: "authored" as const,
        }),
      );
    });
    expect(checkAmericanEnglish(parts)).toEqual([]);
  });

  it("composes a bill's long-title purpose from every section, each keeping its catalog row", () => {
    const form = { kind: "act" };
    const section = (policyId: string, operation: string) => ({
      kind: "law-amount",
      policyId,
      operation,
      value: 1,
    });
    const one = billTitleOf({
      form,
      provisions: [section("law:minimum-wage", "raise")],
    });
    expect(one?.purpose).toBe("a higher minimum wage");
    const three = billTitleOf({
      form,
      provisions: [
        section("law:minimum-wage", "raise"),
        {
          kind: "budget-line",
          policyId: "budget:parks",
          operation: "expand",
          value: 1,
        },
        section("law:sales-tax", "lower"),
      ],
    });
    expect(three?.title).toBe("Wage Floor Increase Act");
    expect(three?.purpose).toBe(
      "a higher minimum wage, more money for parks, and a lower local sales tax rate",
    );
    expect(three?.sections.map((row) => row.key)).toEqual([
      "law:minimum-wage",
      "budget:parks",
      "law:sales-tax",
    ]);
    expect(
      billTitleOf({ form, provisions: [{ kind: "law-amount", value: 1 }] }),
    ).toBeNull();
    // A budget bill sets amounts on spending lines with no direction.
    const budget = billTitleOf({
      form: { kind: "ordinance" },
      provisions: [
        { kind: "budget-line", line: "police", value: 100 },
        { kind: "budget-line", line: "parks", value: 50 },
      ],
    });
    expect(budget?.title).toBe("Budget Ordinance");
    expect(budget?.sections.map((row) => row.key)).toEqual(["police", "parks"]);
  });
});
