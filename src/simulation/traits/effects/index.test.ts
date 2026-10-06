import { describe, expect, it } from "vitest";
import { loadedTraitRegistry } from "../../trait-registry";
import { personalityTraitEffects } from "./index";
import { facetProudEffects } from "./facet-proud";
import { facetHumbleEffects } from "./facet-humble";
import { facetSelfConsciousEffects } from "./facet-self-conscious";

describe("public-life readers in the effects index", () => {
  it.each([
    ["proud", facetProudEffects],
    ["humble", facetHumbleEffects],
    ["self-conscious", facetSelfConsciousEffects],
  ] as const)(
    "registers %s's existing decisions once through the catalogue",
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
