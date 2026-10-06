import { optionalGlob } from "../../presentation/optional-glob";
import type { TraitEffectDeclaration } from "../trait-packs";
import thrillSeekingEffects from "./effects/facet-thrill-seeking";

type EffectModule = {
  readonly default: readonly TraitEffectDeclaration[];
};

/**
 * Trait-owned decision readers, discovered without a shared import list.
 *
 * Vite and Vitest expand the eager glob. Plain Node entrypoints do not offer
 * `import.meta.glob`, so the first reader is also the fallback until those
 * entrypoints gain the same compiled-module manifest.
 */
export function loadedPersonalityTraitEffects(): readonly TraitEffectDeclaration[] {
  const modules = optionalGlob(() =>
    import.meta.glob<EffectModule>("./effects/*.ts", { eager: true }),
  );
  const discovered = Object.keys(modules)
    .sort()
    .flatMap((path) => modules[path]!.default);
  return discovered.length > 0 ? discovered : thrillSeekingEffects;
}
