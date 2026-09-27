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
  type BodyBuild,
  type BodyPresentation,
  type EngineRecipe,
  type OutfitKind,
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

export interface EngineRecipeOptions {
  /** The occasion decides the outfit when it matters: formal at work in government. */
  readonly occasion?: OutfitKind;
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
    // Everyday clothes unless the person chose otherwise or the occasion is
    // formal (a chamber, an office, a hearing).
    outfit: options.occasion ?? choice?.outfit ?? "casual",
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
    outfit: recipe.outfit,
  };
}
