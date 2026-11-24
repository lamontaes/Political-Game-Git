// Every question a debate, town hall or candidate card can ask has a spoken name on the bill
// catalog, and no name reads as a key (pool item play-debate-card-names-a-federal-question-by-its-key).
// It reads the game's own question table, so it covers every question key at every place.
import { describe, expect, it } from "vitest";
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { policyNames } from "./words";

describe("policy question names", () => {
  const names = policyNames();
  const keys = Object.keys(POLICY_QUESTIONS);
  it("names every question the game can ask", () => {
    expect(keys.filter((key) => !names[key])).toEqual([]);
  });
  it("says no question as a key with a group before a dot", () => {
    expect(
      keys.filter((key) => /[a-z]\.[a-z]{2,}/.test(names[key] ?? "")),
    ).toEqual([]);
  });
});
