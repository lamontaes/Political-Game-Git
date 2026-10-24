import { legislatureTraitPack } from "./legislature-trait-pack";
import { peopleTraitPack } from "./people-trait-pack";
import { personalityTraitPack } from "./personality-catalogue";
import { loadTraitPacks, type RegisteredTrait } from "./trait-packs";

let cached: readonly RegisteredTrait[] | null = null;

/**
 * Every trait the opening can seed: the people, legislature and personality
 * packs, with no decision declared. Which traits exist does not depend on the
 * decisions that lean on them, so the opening needs none of those.
 */
export function seedableTraits(): readonly RegisteredTrait[] {
  cached ??= [
    ...loadTraitPacks(
      [peopleTraitPack(), legislatureTraitPack(), personalityTraitPack()],
      [],
    ).traits.values(),
  ];
  return cached;
}
