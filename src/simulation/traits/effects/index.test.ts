import { describe, expect, it } from "vitest";
import { loadedTraitRegistry } from "../../trait-registry";
import { personalityTraitEffects } from "./index";
import { facetProudEffects } from "./facet-proud";
import { facetSelfConsciousEffects } from "./facet-self-conscious";
import { facetThrillSeekingEffects } from "./facet-thrill-seeking";
import { traitActTables } from "../act-pulls";

describe("public-life readers in the effects index", () => {
  it.each([
    ["proud", facetProudEffects],
    ["self-conscious", facetSelfConsciousEffects],
    ["thrill-seeking", facetThrillSeekingEffects],
  ] as const)(
    "registers %s's existing decisions once through the catalog",
    (key, effects) => {
      const indexed = personalityTraitEffects();
      const registry = loadedTraitRegistry();
      for (const effect of effects) {
        expect(indexed).toContain(effect);
        for (const lean of effect.leans) {
          const matching = registry.leans
            .get(effect.decision)
            ?.filter(
              (row) =>
                row.trait === `personality-v1:facet-${key}` &&
                row.option === lean.option &&
                row.pole === lean.pole,
            );
          expect(matching).toEqual([lean]);
        }
      }
    },
  );
});

describe("the facet-humble shared act data", () => {
  it("replaces its per-decision effect declarations with shared pulls", () => {
    const trait = "personality-v1:facet-humble";
    expect(
      personalityTraitEffects()
        .flatMap(({ leans }) => leans)
        .some((lean) => lean.trait === trait),
    ).toBe(false);
    expect([...traitActTables().pulls.get(trait)!.high!.toward]).toEqual(
      expect.arrayContaining(["cooperate", "concede", "stay-quiet"]),
    );
  });
});
