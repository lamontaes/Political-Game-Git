import type { BodyAnchors } from "./anchors";
import { OPAQUE_ALPHA } from "./anchors";
import { assemblePerson, type PersonLayer } from "./assemble";
import type { Raster } from "./raster";
import { SKIN_RAMPS, recolorSkin, type MeasuredRamp } from "./skin";

/**
 * THE PEOPLE ENGINE'S RUNTIME PACK (art/people-engine/v1).
 *
 * Built by scripts/appearance/build-people-pack.ts from the art team's
 * paintings: every piece is already extracted, halved to the size the game
 * draws people at, and measured there. The game composes a person from these
 * files and a recipe, and nothing else.
 */

export const PEOPLE_PACK_VERSION = "people-engine-pack-v1";

export type BodyPresentation = "feminine" | "masculine";
export type BodyBuild = "lean" | "average" | "fuller";
export type OutfitKind = "formal" | "casual";

export const BODY_BUILDS: readonly BodyBuild[] = ["lean", "average", "fuller"];
export const OUTFIT_KINDS: readonly OutfitKind[] = ["formal", "casual"];

export interface PackBody {
  readonly file: string;
  readonly anchors: BodyAnchors;
  readonly skin: MeasuredRamp;
}

export interface PackPresentation {
  /** The average body's anchors: every head and hair layer is drawn for them. */
  readonly canonical: BodyAnchors;
  readonly bodies: Readonly<Record<BodyBuild, PackBody>>;
  readonly faces: readonly {
    readonly id: string;
    readonly file: string;
    readonly skin: MeasuredRamp;
  }[];
  readonly hair: readonly {
    readonly id: string;
    readonly back: string;
    readonly front: string;
  }[];
  /** Per outfit and body: the layer, and a mask of the body it hides. */
  readonly outfits: Readonly<
    Record<
      OutfitKind,
      Partial<
        Record<BodyBuild, { readonly file: string; readonly hides: string }>
      >
    >
  >;
}

export interface PeoplePackManifest {
  readonly version: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly presentations: Readonly<Record<BodyPresentation, PackPresentation>>;
}

/** One whole person, as the engine draws them. */
export interface EngineRecipe {
  readonly presentation: BodyPresentation;
  readonly build: BodyBuild;
  /** Skin shade 1 (lightest) to 7 (darkest). */
  readonly shade: number;
  readonly face: string;
  readonly hair: string;
  readonly outfit: OutfitKind;
}

export function engineRecipeKey(recipe: EngineRecipe): string {
  return [
    recipe.presentation,
    recipe.build,
    recipe.shade,
    recipe.face,
    recipe.hair,
    recipe.outfit,
  ].join("|");
}

/** Every file the recipe draws from, so a caller can load them first. */
export function recipeFiles(
  manifest: PeoplePackManifest,
  recipe: EngineRecipe,
): readonly string[] {
  const pack = manifest.presentations[recipe.presentation];
  const face = pack.faces.find((f) => f.id === recipe.face) ?? pack.faces[0]!;
  const hair = pack.hair.find((h) => h.id === recipe.hair) ?? pack.hair[0]!;
  const outfit = pack.outfits[recipe.outfit][recipe.build];
  return [
    pack.bodies[recipe.build].file,
    face.file,
    hair.back,
    hair.front,
    ...(outfit ? [outfit.file, outfit.hides] : []),
  ];
}

/**
 * Compose one person from decoded pack files. Skin on the body, the head and
 * any skin an outfit shows (hands, an open collar) takes the same shade, each
 * read against its own painting's measured shading.
 */
export function composeEnginePerson(
  manifest: PeoplePackManifest,
  image: (file: string) => Raster,
  recipe: EngineRecipe,
): { readonly raster: Raster; readonly anchors: BodyAnchors } {
  const pack = manifest.presentations[recipe.presentation];
  const body = pack.bodies[recipe.build];
  const ramp =
    SKIN_RAMPS[Math.min(SKIN_RAMPS.length, Math.max(1, recipe.shade)) - 1]!;
  const face = pack.faces.find((f) => f.id === recipe.face) ?? pack.faces[0]!;
  const hair = pack.hair.find((h) => h.id === recipe.hair) ?? pack.hair[0]!;
  const outfit = pack.outfits[recipe.outfit][recipe.build];
  const layers: PersonLayer[] = [
    {
      slot: "back-hair",
      raster: image(hair.back),
      authoredFor: pack.canonical,
    },
    { slot: "body", raster: recolorSkin(image(body.file), ramp, body.skin) },
  ];
  if (outfit) {
    const hides = image(outfit.hides);
    const mask = new Uint8Array(hides.width * hides.height);
    for (let p = 0; p < mask.length; p += 1)
      mask[p] = hides.data[p * 4 + 3]! > OPAQUE_ALPHA ? 1 : 0;
    layers.push({
      slot: "outfit",
      raster: recolorSkin(image(outfit.file), ramp, body.skin),
      hidesBody: mask,
    });
  }
  layers.push(
    {
      slot: "head",
      raster: recolorSkin(image(face.file), ramp, face.skin),
      authoredFor: pack.canonical,
    },
    {
      slot: "front-hair",
      raster: image(hair.front),
      authoredFor: pack.canonical,
    },
  );
  return {
    raster: assemblePerson(body.anchors, layers),
    anchors: body.anchors,
  };
}
