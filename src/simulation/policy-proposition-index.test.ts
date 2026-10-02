import { describe, expect, it } from "vitest";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "./law-consequences/pay-rows";
import { policyPropositionsByKey } from "./policy-proposition-index";
import { createProductionPolicyCatalog } from "./production-catalog";
import type { PolicyCatalog } from "./types";

const propositions = createProductionPolicyCatalog().propositions;
const question = Object.values(propositions).find(
  (record) => record.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
)!;

describe("saved catalog proposition lookup", () => {
  it("isolates replaced authority rows across catalog objects", () => {
    expect(question.consequences?.length).toBeGreaterThan(0);
    const original = policyPropositionsByKey(propositions);
    const replacedQuestion = { ...question, consequences: [] };
    const replaced: PolicyCatalog["propositions"] = Object.freeze({
      ...propositions,
      [question.id]: replacedQuestion,
    });
    const replacement = policyPropositionsByKey(replaced);

    expect(replacement).not.toBe(original);
    expect(replacement.get(question.stableKey)).toBe(replacedQuestion);
    expect(replacement.get(question.stableKey)?.consequences).toEqual([]);
    expect(original.get(question.stableKey)).toBe(question);
    expect(original.get(question.stableKey)?.consequences).toBe(
      question.consequences,
    );
    expect(policyPropositionsByKey(propositions)).toBe(original);
    expect(policyPropositionsByKey(replaced)).toBe(replacement);
  });

  it("retains the first binding when saved rows have the same stable key", () => {
    const duplicate = { ...question, consequences: [] };
    const records = Object.freeze({ first: question, second: duplicate });
    const first = Object.values(records).find(
      (record) => record.stableKey === question.stableKey,
    );
    expect(policyPropositionsByKey(records).get(question.stableKey)).toBe(
      first,
    );
    expect(policyPropositionsByKey(records).get(question.stableKey)).toBe(
      question,
    );
  });

  it("does not carry a key into a distinct catalog where it is absent", () => {
    const withoutQuestion = Object.freeze(
      Object.fromEntries(
        Object.entries(propositions).filter(
          ([, record]) => record.stableKey !== question.stableKey,
        ),
      ),
    );
    expect(policyPropositionsByKey(propositions).get(question.stableKey)).toBe(
      question,
    );
    expect(
      policyPropositionsByKey(withoutQuestion).get(question.stableKey),
    ).toBeUndefined();
  });
});
