import { describe, expect, it } from "vitest";
import { loadedTraitRegistry } from "../../trait-registry";
import { leansForDecision } from "../../trait-packs";
import { facetIntimacyGuardedEffects } from "./facet-intimacy-guarded";

describe("the intimacy-guarded trait reader", () => {
  it("loads its closeness leans against the catalog trait and published options", () => {
    const registry = loadedTraitRegistry();

    expect(registry.report.rejections).toEqual([]);
    expect(leansForDecision(registry, "people.couple-answer")).toContainEqual({
      option: "decline",
      trait: "personality-v1:facet-intimacy-guarded",
      pole: "high",
      explanation:
        "They keep some distance as this relationship becomes emotionally close.",
    });
    expect(leansForDecision(registry, "people.couple-stage")).toContainEqual({
      option: "separate",
      trait: "personality-v1:facet-intimacy-guarded",
      pole: "high",
      explanation:
        "They make room for distance as this close relationship changes.",
    });
  });

  it("does not turn an unmarked one-sided trait into an opposite preference", () => {
    const leans = facetIntimacyGuardedEffects.flatMap(({ leans }) => leans);

    expect(leans.every(({ pole }) => pole === "high")).toBe(true);
    expect(leans.some(({ option }) => option === "accept")).toBe(false);
    expect(leans.some(({ option }) => option === "stay")).toBe(false);
  });
});
