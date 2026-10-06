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
  presentationPose,
  type BodyBuild,
  type BodyPose,
  type BodyView,
  type FaceExpression,
  type BodyPresentation,
  type EngineRecipe,
  type OutfitTag,
  type PackOutfit,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";
import { SKIN_RAMPS } from "./skin";
import {
  CHOSEN_ACCESSORY_KINDS,
  accessoriesFor,
  accessoryKindOf,
  facialHairFor,
  glassesFor,
} from "./face-extras";

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

/** The age band a face is painted for, from the face id ("50s-03"). */
export function faceBand(age: number): string {
  return age >= 65 ? "70s" : age >= 45 ? "50s" : "20s30s";
}

/**
 * A person's face: one of the young faces, chosen or drawn from the seed and
 * kept for life, painted for their age. The same person at 30, 55 and 75
 * has the same face, older (faces "20s30s-03", "50s-03", "70s-03").
 */
function faceFor(
  pack: PackPresentation,
  chosen: string | undefined,
  pick: <T>(items: readonly T[], question: string) => T,
  age: number,
): string {
  const young = pack.faces.filter((face) => face.id.startsWith("20s30s-"));
  const number = (
    pack.faces.find((face) => face.id === chosen) ??
    pick(young.length > 0 ? young : pack.faces, "face")
  ).id.slice(-2);
  const aged = pack.faces.find(
    (face) => face.id === `${faceBand(age)}-${number}`,
  );
  return (
    aged ??
    young.find((face) => face.id.endsWith(`-${number}`)) ??
    pack.faces[0]!
  ).id;
}

export interface EngineRecipeOptions {
  /**
   * What the place calls for (src/presentation/dress-code.ts): business or
   * formal clothes at work, a coat outdoors in the cold months.
   */
  readonly wear?: Exclude<OutfitTag, "uniform">;
  /**
   * Seated where the place has a seat for them, or the pose the scene gives
   * them (pose-chooser.ts).
   */
  readonly pose?: BodyPose;
  /** Turned toward something in the scene, rather than facing front. */
  readonly view?: BodyView;
  /** The face they make (expression-chooser.ts); neutral when absent. */
  readonly expression?: FaceExpression;
  /**
   * A work uniform (an outfit id) this person wears here because of their
   * job (src/presentation/work-uniform.ts). It replaces the outfit.
   */
  readonly uniform?: string;
  /** A nonuniform outfit already allocated to this person by room staging. */
  readonly stagedOutfit?: string;
  /**
   * Nonuniform outfits already worn by other people in this room. Scene cast
   * staging uses this to keep two people from arriving in the same clothes;
   * an actual work uniform remains shared by design.
   */
  readonly occupiedOutfits?: ReadonlySet<string>;
  /**
   * They are reading or working at a desk, so someone who wears glasses only
   * to read has them on.
   */
  readonly reading?: boolean;
  /**
   * Whether this person holds a public office now (a lapel pin goes on
   * someone who does). Asked only when a pin could be worn, so a caller may
   * pass an expensive lookup.
   */
  readonly officeholder?: () => boolean;
  /** Whether this person is married now (a wedding ring goes on a married person). */
  readonly married?: () => boolean;
}

/**
 * The outfit a person wears: the one they chose, unless the place calls for
 * another kind; otherwise one of that kind drawn from their seed, so each
 * person keeps their own everyday clothes, their own work clothes, their own
 * formal wear and their own coat. Uniforms are never drawn: they come with a
 * job.
 */
function outfitFor(
  pack: PackPresentation,
  seed: string,
  chosen: string | undefined,
  wear: Exclude<OutfitTag, "uniform"> | undefined,
  occupied: ReadonlySet<string> = new Set(),
): PackOutfit {
  const choice = pack.outfits.find((outfit) => outfit.id === chosen);
  const wanted = wear ?? "casual";
  if (
    choice &&
    !occupied.has(choice.id) &&
    (!wear || choice.tags.includes(wear))
  )
    return choice;
  const kind = pack.outfits.filter(
    (outfit) =>
      outfit.tags.includes(wanted) &&
      !outfit.tags.includes("uniform") &&
      !occupied.has(outfit.id),
  );
  if (kind.length === 0) {
    const available = pack.outfits.filter(
      (outfit) => !outfit.tags.includes("uniform") && !occupied.has(outfit.id),
    );
    return available[0] ?? choice ?? pack.outfits[0]!;
  }
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
  const outfit =
    pack.outfits.find((o) => o.id === options.uniform) ??
    pack.outfits.find((o) => o.id === options.stagedOutfit) ??
    outfitFor(
      pack,
      seed,
      choice?.outfit,
      options.wear,
      options.occupiedOutfits,
    );
  const age =
    Number(onDate.slice(0, 4)) - Number(String(person.birthDate).slice(0, 4));
  const shade =
    choice?.shade ?? 1 + Math.floor(draw(seed, "shade") * SKIN_RAMPS.length);
  const facialHair = facialHairFor(seed, age, presentation, choice);
  const glasses = glassesFor(seed, age, pack, choice);
  const accessories = accessoriesFor(seed, age, presentation, pack, choice, {
    wear: options.wear,
    officeholder: options.officeholder,
    married: options.married,
  });
  return {
    presentation,
    build: choice?.build ?? buildFor(seed),
    shade: Math.min(SKIN_RAMPS.length, Math.max(1, Math.round(shade))),
    face: faceFor(pack, choice?.face, pick, age),
    hair:
      pack.hair.find((h) => h.id === choice?.hair)?.id ??
      pick(pack.hair, "hair").id,
    hairColor:
      HAIR_COLORS.find((c) => c.id === choice?.hairColor)?.id ??
      hairColorFor(seed, age),
    // Everyday clothes unless the person chose otherwise or the place calls
    // for something else (work clothes, formal wear, a coat).
    outfit: outfit.id,
    ...(options.pose &&
    presentationPose(options.pose, presentation) !== "standing"
      ? { pose: presentationPose(options.pose, presentation) }
      : {}),
    ...(options.view && options.view !== "front" ? { view: options.view } : {}),
    ...(options.expression && options.expression !== "neutral"
      ? { expression: options.expression }
      : {}),
    // Only what the pack has painted goes in the recipe, so today's recipes
    // and their keys are unchanged until the art lands.
    ...(facialHair && pack.facialHair?.some((style) => style.id === facialHair)
      ? { facialHair }
      : {}),
    ...(glasses
      ? {
          glasses: glasses.frame,
          ...(glasses.wear === "reading"
            ? { glassesWear: "reading" as const }
            : {}),
          ...(options.reading ? { reading: true } : {}),
        }
      : {}),
    // Only what the pack has painted (accessoriesFor), for the same reason.
    ...(accessories.length > 0 ? { accessories } : {}),
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
export function choiceFromRecipe(
  recipe: EngineRecipe,
  /** The pack the creator offered, which says what could be chosen. */
  manifest?: PeoplePackManifest,
): EngineAppearanceChoice {
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
    ...facialHairChoice(recipe, manifest),
    ...glassesChoice(recipe, manifest),
    ...accessoriesChoice(recipe, manifest),
  };
}

/**
 * The jewelry and watch a recipe saves: what it wears of the kinds a player
 * chooses (a lapel pin comes with an office, so it is never saved), or an
 * empty list once the pack has any to choose from (a choice of none is a
 * choice); nothing before that, so the person's seeded jewelry applies when
 * the art lands.
 */
function accessoriesChoice(
  recipe: EngineRecipe,
  manifest: PeoplePackManifest | undefined,
): Pick<EngineAppearanceChoice, "accessories"> {
  const chosenKinds = (
    manifest?.presentations[recipe.presentation].accessories ?? []
  ).filter((entry) => CHOSEN_ACCESSORY_KINDS.includes(entry.kind));
  if (chosenKinds.length === 0) return {};
  return {
    accessories: (recipe.accessories ?? []).filter((id) => {
      const kind = accessoryKindOf(id);
      return kind !== null && CHOSEN_ACCESSORY_KINDS.includes(kind);
    }),
  };
}

/**
 * The facial hair a recipe saves: its style, or "none" once the pack has
 * styles to choose from (a choice of none is a choice); nothing before that,
 * so the person's seeded style applies when the art lands.
 */
function facialHairChoice(
  recipe: EngineRecipe,
  manifest: PeoplePackManifest | undefined,
): Pick<EngineAppearanceChoice, "facialHair"> {
  if (recipe.facialHair) return { facialHair: recipe.facialHair };
  return recipe.presentation === "masculine" &&
    (manifest?.presentations.masculine.facialHair?.length ?? 0) > 0
    ? { facialHair: "none" }
    : {};
}

function glassesChoice(
  recipe: EngineRecipe,
  manifest: PeoplePackManifest | undefined,
): Pick<EngineAppearanceChoice, "glasses" | "glassesWear"> {
  if (recipe.glasses)
    return {
      glasses: recipe.glasses,
      glassesWear: recipe.glassesWear ?? "always",
    };
  return (manifest?.presentations[recipe.presentation].glasses?.length ?? 0) > 0
    ? { glasses: "none" }
    : {};
}
