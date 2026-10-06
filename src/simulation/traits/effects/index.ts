import type { TraitEffectDeclaration } from "../../trait-packs";
import * as cockyReader from "./facet-cocky";

interface TraitEffectReader {
  readonly effects: readonly TraitEffectDeclaration[];
}

/**
 * The build-time reader for independently owned trait-effect files.
 *
 * Vite resolves this literal glob into static module imports. Adding another
 * trait therefore adds only that trait's reader file; it does not create a
 * shared registry-edit bottleneck or inspect the host filesystem at runtime.
 */
const readers: Readonly<Record<string, TraitEffectReader>> =
  typeof import.meta.glob === "function"
    ? import.meta.glob<TraitEffectReader>("./facet-*.ts", { eager: true })
    : { "./facet-cocky.ts": cockyReader };

export function compiledPersonalityTraitEffects(): readonly TraitEffectDeclaration[] {
  return Object.entries(readers)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, reader]) => reader.effects);
}
