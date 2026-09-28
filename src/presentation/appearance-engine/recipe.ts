import { stableHash } from "../../simulation/ids";
import { DEFAULT_APPEARANCE_RECIPE_VERSION } from "../../simulation/person-appearance";
import type {
  EngineAppearanceChoice,
  Person,
  World,
} from "../../simulation/types";
import { appearanceAgeState } from "../appearance-lifecycle";
import {
  BODY_BUILDS,
  HAIR_COLORS,
  PART_PALETTES,
  type BodyBuild,
  type BodyPresentation,
  type EngineRecipe,
  type OutfitOccasion,
  type PackOutfit,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";
import { SKIN_RAMPS } from "./skin";

/**
 * WHO LOOKS LIKE WHAT.
 *
 * A person's engine recipe comes from what the player chose (saved on the
 * appearance), and every choice left open comes from the person's own seed,
 * so the same person looks the same on every screen and after every load.
 * Nothing here decides anything else about a person.
 */

/** Share of adults in each build, drawn from the seed. PLACEHOLDER(wave2). */
const BUILD_SHARE: Readonly<Record<BodyBuild, number>> = {
  lean: 0.3,
  average: 0.45,
  fuller: 0.25,
};

/** A number in [0, 1) from the person's seed and one named question. */
function draw(seed: string, question: string): number {
  return (
    Number.parseInt(stableHash(`${seed}:${question}`).slice(0, 8), 16) /
    0x100000000
  );
}

function presentationFor(person: Person, seed: string): BodyPresentation {
  const chosen = person.appearance?.engine?.presentation;
  if (chosen) return chosen;
  // The person's own recorded gender, never a guess from a name.
  if (person.identity?.gender === "female") return "feminine";
  if (person.identity?.gender === "male") return "masculine";
  const legacy = person.appearance?.selection?.bodyFamily ?? "";
  if (/masc/i.test(legacy)) return "masculine";
  if (/fem/i.test(legacy)) return "feminine";
  return draw(seed, "presentation") < 0.5 ? "feminine" : "masculine";
}

function buildFor(seed: string): BodyBuild {
  const roll = draw(seed, "build");
  let edge = 0;
  for (const build of BODY_BUILDS) {
    edge += BUILD_SHARE[build];
    if (roll < edge) return build;
  }
  return "average";
}

/**
 * Hair color from the seed, independent of skin and face (Lamontae: hair,
 * face and skin are separate). Gray and white grow likelier with age.
 * PLACEHOLDER(wave2) shares.
 */
function hairColorFor(seed: string, age: number): string {
  const roll = draw(seed, "hair-color");
  const gray =
    age >= 70
      ? 0.75
      : age >= 60
        ? 0.5
        : age >= 50
          ? 0.25
          : age >= 40
            ? 0.08
            : 0;
  if (roll < gray)
    return draw(seed, "white") < (age >= 70 ? 0.5 : 0.2) ? "white" : "gray";
  const rest = (roll - gray) / (1 - gray);
  const shares: readonly (readonly [string, number])[] = [
    ["black", 0.3],
    ["natural", 0.32],
    ["brown", 0.2],
    ["auburn", 0.06],
    ["blonde", 0.12],
  ];
  let edge = 0;
  for (const [id, share] of shares) {
    edge += share;
    if (rest < edge) return id;
  }
  return "natural";
}

export interface EngineRecipeOptions {
  /** The occasion decides the outfit when it matters: formal at work in government. */
  readonly occasion?: Exclude<OutfitOccasion, "work">;
}

/**
 * The outfit a person wears: the one they chose, unless the occasion calls
 * for another kind; otherwise one of that kind drawn from their seed, so each
 * person keeps their own everyday clothes and their own formal wear. Work
 * uniforms are never drawn: they come with a job.
 */
function outfitFor(
  pack: PackPresentation,
  seed: string,
  chosen: string | undefined,
  occasion: Exclude<OutfitOccasion, "work"> | undefined,
): PackOutfit {
  const choice = pack.outfits.find((outfit) => outfit.id === chosen);
  const wanted = occasion ?? "casual";
  if (choice && (!occasion || choice.occasion === occasion)) return choice;
  const kind = pack.outfits.filter((outfit) => outfit.occasion === wanted);
  if (kind.length === 0) return pack.outfits[0]!;
  return kind[Math.floor(draw(seed, `outfit:${wanted}`) * kind.length)]!;
}

/**
 * The recipe for a person, or null when the engine cannot draw them yet
 * (children: the engine has adult bodies only).
 */
export function engineRecipeFor(
  person: Person,
  onDate: string,
  manifest: PeoplePackManifest,
  options: EngineRecipeOptions = {},
): EngineRecipe | null {
  if (!appearanceAgeState(person, onDate).supported) return null;
  const choice = person.appearance?.engine;
  const seed = person.appearance?.seed ?? person.id;
  const presentation = presentationFor(person, seed);
  const pack = manifest.presentations[presentation];
  const pick = <T>(items: readonly T[], question: string): T =>
    items[Math.floor(draw(seed, question) * items.length)]!;
  const outfit = outfitFor(pack, seed, choice?.outfit, options.occasion);
  const shade =
    choice?.shade ?? 1 + Math.floor(draw(seed, "shade") * SKIN_RAMPS.length);
  return {
    presentation,
    build: choice?.build ?? buildFor(seed),
    shade: Math.min(SKIN_RAMPS.length, Math.max(1, Math.round(shade))),
    face:
      pack.faces.find((f) => f.id === choice?.face)?.id ??
      pick(pack.faces, "face").id,
    hair:
      pack.hair.find((h) => h.id === choice?.hair)?.id ??
      pick(pack.hair, "hair").id,
    hairColor:
      HAIR_COLORS.find((c) => c.id === choice?.hairColor)?.id ??
      hairColorFor(
        seed,
        Number(onDate.slice(0, 4)) -
          Number(String(person.birthDate).slice(0, 4)),
      ),
    // Everyday clothes unless the person chose otherwise or the occasion is
    // formal (a chamber, an office, a hearing).
    outfit: outfit.id,
    // Each garment part in a color of its own, kept per person.
    colors: Object.fromEntries(
      Object.entries(outfit.parts).map(([part, paletteId]) => {
        const palette = PART_PALETTES[paletteId] ?? [];
        return [
          part,
          palette.includes(choice?.colors?.[part] ?? "")
            ? choice!.colors![part]!
            : palette[
                Math.floor(
                  draw(seed, `color:${outfit.id}:${part}`) * palette.length,
                )
              ]!,
        ];
      }),
    ),
  };
}

/** The world with this person's saved engine choice replaced. */
export function withEngineChoice(
  world: World,
  personId: string,
  choice: EngineAppearanceChoice,
): World {
  const person = world.people[personId];
  if (!person) return world;
  const appearance = person.appearance ?? {
    seed: person.id,
    recipeVersion: DEFAULT_APPEARANCE_RECIPE_VERSION,
  };
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: { ...person, appearance: { ...appearance, engine: choice } },
    },
  };
}

/** A recipe written back as a complete saved choice. */
export function choiceFromRecipe(recipe: EngineRecipe): EngineAppearanceChoice {
  return {
    version: "people-engine-v1",
    presentation: recipe.presentation,
    build: recipe.build,
    shade: recipe.shade,
    face: recipe.face,
    hair: recipe.hair,
    hairColor: recipe.hairColor,
    outfit: recipe.outfit,
    colors: { ...recipe.colors },
  };
}
