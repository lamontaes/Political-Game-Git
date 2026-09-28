import type { EntityId, World } from "../simulation";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import type { OutfitTag } from "./appearance-engine/pack";

/**
 * WHO WEARS A UNIFORM, AND WHEN.
 *
 * A person whose job wears a uniform (Lane B's town jobs: nurses, police
 * officers, construction and quarry laborers) is drawn in it at work and in
 * their own portrait, which is how the player can tell what they do. At home,
 * in the neighborhood and outdoors in winter they wear their own clothes. A
 * police officer on duty in a chamber or courtroom stays in uniform; a nurse
 * at a formal hearing dresses formally.
 *
 * Judges hold an office rather than a job role; their robe waits for the
 * office records to be read here.
 */
type Occasion = Exclude<OutfitTag, "uniform"> | "portrait";

const UNIFORMS: readonly {
  readonly occupations: RegExp;
  readonly outfit: string;
  readonly wornFor: readonly Occasion[];
}[] = [
  {
    occupations:
      /^(profession:(registered|practical)-nurse|occupation:(nursing-assistant|medical-assistant|home-health-aide))$/,
    outfit: "scrubs",
    wornFor: ["portrait", "business"],
  },
  {
    occupations: /^profession:police-officer$/,
    outfit: "police",
    wornFor: ["portrait", "business", "formal"],
  },
  {
    occupations: /^occupation:(construction-laborer|extraction-laborer)$/,
    outfit: "hi-vis",
    wornFor: ["portrait", "business"],
  },
];

/**
 * The uniform outfit (a people-engine outfit id) this person wears in this
 * place, or undefined. `wear` undefined is their own portrait.
 */
export function workUniform(
  world: World,
  personId: EntityId,
  wear: Exclude<OutfitTag, "uniform"> | undefined,
): string | undefined {
  if (!world.people[personId]) return undefined;
  const occasion: Occasion = wear ?? "portrait";
  for (const { role } of activeWorkRelationshipsAt(world, personId)) {
    const occupation = role.occupationClassification ?? "";
    const uniform = UNIFORMS.find(
      (entry) =>
        entry.occupations.test(occupation) && entry.wornFor.includes(occasion),
    );
    if (uniform) return uniform.outfit;
  }
  return undefined;
}
