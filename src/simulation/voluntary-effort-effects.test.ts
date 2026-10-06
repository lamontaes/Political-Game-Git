import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANOTHER_TERM_DECISION } from "./careers/another-term-decision";
import { personalityCataloguePack } from "./personality-catalogue";
import { loadTraitPacks, type TraitPack } from "./trait-packs";

const effects = JSON.parse(
  readFileSync(
    new URL("../../data/traits/effects/voluntary-effort.json", import.meta.url),
    "utf8",
  ),
) as TraitPack["effects"];

describe("voluntary-effort effect rows", () => {
  it("resolves against the published another-term choice without inventing weights", () => {
    const catalogue = personalityCataloguePack();
    const registry = loadTraitPacks(
      [{ ...catalogue, effects }],
      [ANOTHER_TERM_DECISION],
    );

    expect(registry.report.rejections).toEqual([]);
    expect(registry.leans.get(ANOTHER_TERM_DECISION.id)).toEqual([
      {
        option: "seek",
        trait: "personality-v1:voluntary-effort",
        pole: "high",
        explanation: "They are willing to keep at the work after choosing it.",
      },
      {
        option: "step-down",
        trait: "personality-v1:voluntary-effort",
        pole: "low",
        explanation:
          "They prefer a less demanding path when the stakes allow it.",
      },
    ]);
  });

  /*
   * STUB: current traitRegistryFor() reads compiled packs, not
   * data/traits/effects/<trait-id>.json. Session 8's first-loader PR owns that
   * seam. This test proves the row fits loadTraitPacks and the published
   * career.consider-another-term options; it does not claim an integrated
   * new-game choice change. The follow-up proof must compare otherwise-equal
   * people with recorded opposite voluntary-effort poles through
   * decideAnotherTerm, whose evaluator already uses randomness: "none".
   */
});
