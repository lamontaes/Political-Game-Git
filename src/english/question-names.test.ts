import { describe, expect, it } from "vitest";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { NAMED_QUESTIONS, questionAbout, questionTo } from "./question-names";

/** Every question the bill catalog names, with the catalog's own name. */
function catalogQuestions(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      const row = node as { question?: string; name?: string };
      if (typeof row.question === "string" && typeof row.name === "string")
        found.set(row.question, row.name);
      Object.values(node).forEach(walk);
    }
  };
  walk(billCatalog);
  return found;
}

describe("spoken names of policy questions", () => {
  const catalog = catalogQuestions();

  it("names every question the bill catalog holds, and no other", () => {
    expect(catalog.size).toBeGreaterThan(0);
    expect([...catalog.keys()].sort()).toEqual([...NAMED_QUESTIONS].sort());
  });

  it("gives each a noun phrase and a verb phrase that read as plain talk", () => {
    for (const question of catalog.keys()) {
      const about = questionAbout(question)!;
      const to = questionTo(question)!;
      // Read after "about" and after "to": whole words, no sentence marks, no
      // question marks, nothing left of the catalog's lowercase label.
      for (const phrase of [about, to]) {
        expect(phrase.length, question).toBeGreaterThan(0);
        expect(phrase, question).not.toMatch(/[.?!:;]/);
        expect(phrase, question).toBe(phrase.trim());
        expect(phrase.split(/\s+/).length, question).toBeLessThanOrEqual(12);
      }
      // The verb phrase opens on a verb, never an article or a gerund.
      expect(to, question).not.toMatch(/^(a|an|the)\b/i);
      expect(to.split(" ")[0], question).not.toMatch(/ing$/);
    }
  });

  it("offers no stand for a question it has no name for", () => {
    expect(questionAbout("fixture:unnamed")).toBeNull();
    expect(questionTo("fixture:unnamed")).toBeNull();
  });
});
