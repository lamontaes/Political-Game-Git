import { legislatureTraitPack } from "./legislature-trait-pack";
import { peopleTraitPack } from "./people-trait-pack";
import { personalityCataloguePack } from "./personality-catalogue";
import type { TraitPack } from "./trait-packs";

/**
 * The trait packs this build compiles in, in load order, and the one place a
 * new one is added. The trait registry and the save check both read this list,
 * because when they read two lists that disagreed — the save check once named
 * the people pack alone — a legislator's recorded manner was a trait the game
 * wrote and the save check then refused, so the life could not be saved again.
 *
 * A pack added here is seeded for everybody (when it says it is seeded), shown
 * on the person card once written, argues in the decisions its effects name and
 * is moved by what happens to people, with no other code naming it.
 */
export function compiledTraitPacks(): readonly TraitPack[] {
  return [
    peopleTraitPack(),
    legislatureTraitPack(),
    personalityCataloguePack(),
  ];
}
