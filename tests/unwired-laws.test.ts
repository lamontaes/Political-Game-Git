import { describe, expect, it } from "vitest";

import {
  compareWithAllowlist,
  readAllowlist,
} from "../scripts/unwired-laws/run";
import {
  lawEffectPaths,
  unwiredQuestions,
} from "../src/simulation/governing/law-effect-paths";
import { createProductionPolicyCatalog } from "../src/simulation/production-catalog";

/**
 * Every policy question in the catalog, state, federal and local, needs a
 * sized, built path by which its law acts in the world. The questions that
 * had none on September 29, 2026 are allowlisted, and the list only shrinks.
 */
describe("laws that act in the world", () => {
  const catalog = createProductionPolicyCatalog();
  const unwired = unwiredQuestions(catalog).map((question) => question.key);
  const allowlist = readAllowlist();

  it("leaves no policy question without an effect path unless it is on today's list", () => {
    expect(compareWithAllowlist(unwired, allowlist.questions).added).toEqual(
      [],
    );
  });

  it("drops a question from the list once it is wired (npm run unwired-laws -- --update)", () => {
    expect(compareWithAllowlist(unwired, allowlist.questions).nowWired).toEqual(
      [],
    );
  });

  it("names only questions the catalog asks", () => {
    const keys = new Set(
      catalog.propositionOrder.map((id) => catalog.propositions[id]!.stableKey),
    );
    expect(allowlist.questions.filter((key) => !keys.has(key))).toEqual([]);
    expect(
      lawEffectPaths()
        .map((path) => path.questionKey)
        .filter((key) => !keys.has(key)),
    ).toEqual([]);
  });
});
