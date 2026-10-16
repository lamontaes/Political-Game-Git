import { describe, expect, it } from "vitest";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { checkAmericanEnglish } from "../../scripts/prose-eval/american-english";
import { billNameFor } from "./bill-names";

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
});
