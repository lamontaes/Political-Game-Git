import { describe, expect, it } from "vitest";
import { personalityCataloguePack } from "../../personality-catalogue";
import { BUILT_IN_TRAIT_DECISIONS } from "../../trait-registry";
import { leansForDecision, loadTraitPacks } from "../../trait-packs";
import { FACET_AFFECTIONATE_EFFECTS } from "./facet-affectionate";

describe("the affectionate trait reader", () => {
  it("loads every romance lean against the catalog trait and published options", () => {
    const registry = loadTraitPacks(
      [personalityCataloguePack(), FACET_AFFECTIONATE_EFFECTS],
      BUILT_IN_TRAIT_DECISIONS,
    );

    expect(registry.report.rejections).toEqual([]);
    expect(
      registry.report.packs.find(
        ({ pack }) => pack === "personality-effects-facet-affectionate",
      )?.leansRegistered,
    ).toBe(3);
    expect(leansForDecision(registry, "people.date-answer")).toMatchObject([
      {
        option: "accept",
        trait: "personality-v1:facet-affectionate",
        pole: "high",
      },
    ]);
    expect(leansForDecision(registry, "people.couple-answer")).toHaveLength(1);
    expect(leansForDecision(registry, "people.couple-stage")).toHaveLength(1);
  });

  it("never invents an opposite effect for an unmarked one-sided trait", () => {
    const leans = FACET_AFFECTIONATE_EFFECTS.effects.flatMap(
      (effect) => effect.leans,
    );

    expect(leans.every(({ pole }) => pole === "high")).toBe(true);
    expect(leans.some(({ option }) => option === "decline")).toBe(false);
    expect(leans.some(({ option }) => option === "break-up")).toBe(false);
    expect(leans.some(({ option }) => option === "separate")).toBe(false);
  });
});
