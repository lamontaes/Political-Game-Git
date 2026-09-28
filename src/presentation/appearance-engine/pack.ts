import type { BodyAnchors } from "./anchors";
import { OPAQUE_ALPHA } from "./anchors";
import { assemblePerson, type PersonLayer } from "./assemble";
import type { Raster } from "./raster";
import { SKIN_RAMPS, recolorSkin, type MeasuredRamp } from "./skin";
import {
  fabricRamp,
  measureFabricLuminance,
  recolorFabric,
  type FabricRamp,
} from "./fabric";

/**
 * Hair colors, applied by code to hair painted in dark brown. "natural" keeps
 * the painting. PLACEHOLDER(wave2): picked by eye.
 */
export const HAIR_COLORS: readonly (FabricRamp & { readonly label: string })[] =
  [
    {
      id: "natural",
      label: "Dark brown",
      shadow: "#1c130e",
      base: "#3a271c",
      highlight: "#57402f",
    },
    {
      id: "black",
      label: "Black",
      shadow: "#0c0b0b",
      base: "#1a1818",
      highlight: "#2e2b2a",
    },
    {
      id: "brown",
      label: "Brown",
      shadow: "#2e1c10",
      base: "#5c3a22",
      highlight: "#7d5433",
    },
    {
      id: "auburn",
      label: "Auburn",
      shadow: "#3a130a",
      base: "#7a2f18",
      highlight: "#9e4a28",
    },
    {
      id: "blonde",
      label: "Blonde",
      shadow: "#7a5a2e",
      base: "#b99156",
      highlight: "#d7b57a",
    },
    {
      id: "gray",
      label: "Gray",
      shadow: "#4d4b49",
      base: "#8b8884",
      highlight: "#aaa7a2",
    },
    {
      id: "white",
      label: "White",
      shadow: "#8f8c88",
      base: "#c9c6c1",
      highlight: "#e3e0db",
    },
  ];

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
/**
 * When an outfit is worn: everyday clothes, formal wear (where government is
 * done), or a work uniform (scrubs, a safety vest, a police uniform, a judge's
 * robe), which comes with a job and is never drawn at random.
 */
export type OutfitOccasion = "formal" | "casual" | "work";

export const BODY_BUILDS: readonly BodyBuild[] = ["lean", "average", "fuller"];

/** How the body is posed: standing, or seated facing front on a chair. */
export type BodyPose = "standing" | "seated";

export interface PackBody {
  readonly file: string;
  readonly anchors: BodyAnchors;
  readonly skin: MeasuredRamp;
}

export interface PackPresentation {
  /** The average body's anchors: every head and hair layer is drawn for them. */
  readonly canonical: BodyAnchors;
  readonly bodies: Readonly<Record<BodyBuild, PackBody>>;
  /**
   * The same people seated facing front: the art team's seated bodies,
   * registered so the seat is one row for every build (seatRow).
   */
  readonly seated?: {
    readonly bodies: Readonly<
      Record<BodyBuild, PackBody & { readonly seatRow: number }>
    >;
  };
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
  /** Every outfit style, in the order the creator's arrows step through. */
  readonly outfits: readonly PackOutfit[];
}

export interface PackOutfit {
  readonly id: string;
  /** Player-facing name, for the creator's Outfit arrows. */
  readonly label: string;
  readonly occasion: OutfitOccasion;
  /** The palette (PART_PALETTES) of each garment part that takes its own color. */
  readonly parts: Readonly<Record<string, string>>;
  /**
   * Per body: the layer, a mask of the body it hides, a mask per garment
   * part, and a mask of the skin the outfit shows (hands, legs, an open
   * collar). Without a skin mask, every skin-colored pixel counts as skin.
   */
  readonly builds: OutfitBuilds;
  /** The same outfit on the seated bodies, when it has been painted seated. */
  readonly seated?: OutfitBuilds;
}

export type OutfitBuilds = Partial<
  Readonly<
    Record<
      BodyBuild,
      {
        readonly file: string;
        readonly hides: string;
        readonly regions?: Readonly<Record<string, string>>;
        readonly skin?: string;
      }
    >
  >
>;

/**
 * The body and outfit pieces a recipe draws from, in its pose. A seated
 * recipe falls back to standing where the pack has no seated art.
 */
export function posedPieces(pack: PackPresentation, recipe: EngineRecipe) {
  const outfit = packOutfit(pack, recipe.outfit);
  const seated =
    recipe.pose === "seated" &&
    pack.seated !== undefined &&
    outfit?.seated?.[recipe.build] !== undefined;
  return {
    body: seated
      ? pack.seated!.bodies[recipe.build]
      : pack.bodies[recipe.build],
    outfit: seated
      ? outfit!.seated![recipe.build]
      : outfit?.builds[recipe.build],
    seated,
  };
}

export interface PeoplePackManifest {
  readonly version: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly presentations: Readonly<Record<BodyPresentation, PackPresentation>>;
}

/**
 * The colors a garment part may take, by palette, from fabric.ts. Each
 * outfit names a palette for each of its parts. PLACEHOLDER(wave2): picked by
 * eye for variety; suits, shirts and ties stay in conservative colors.
 */
export const PART_PALETTES: Readonly<Record<string, readonly string[]>> = {
  top: [
    "burgundy",
    "forest",
    "navy",
    "slate-blue",
    "light-blue",
    "white",
    "gray",
    "teal",
    "plum",
    "mustard",
    "cream",
    "pink",
    "olive",
    "black",
  ],
  bottom: [
    "gray",
    "charcoal",
    "navy",
    "black",
    "khaki",
    "denim",
    "brown",
    "olive",
  ],
  suit: ["navy", "charcoal", "black", "gray", "slate-blue", "brown"],
  shirt: ["white", "light-blue", "cream", "pink", "gray"],
  tie: ["navy", "burgundy", "forest", "black", "slate-blue"],
  dress: [
    "burgundy",
    "navy",
    "black",
    "forest",
    "plum",
    "teal",
    "slate-blue",
    "charcoal",
  ],
  sweater: [
    "mustard",
    "burgundy",
    "forest",
    "navy",
    "gray",
    "cream",
    "olive",
    "teal",
    "plum",
    "slate-blue",
  ],
  coat: [
    "brown",
    "khaki",
    "charcoal",
    "navy",
    "black",
    "burgundy",
    "olive",
    "gray",
    "cream",
  ],
  scarf: [
    "burgundy",
    "navy",
    "forest",
    "mustard",
    "gray",
    "cream",
    "plum",
    "teal",
  ],
  scrubs: ["light-blue", "navy", "teal", "plum", "forest", "black", "burgundy"],
};

/** The outfit a recipe names, or the first one when it names none known. */
export function packOutfit(
  pack: PackPresentation,
  id: string,
): PackOutfit | undefined {
  return pack.outfits.find((outfit) => outfit.id === id) ?? pack.outfits[0];
}

/** One whole person, as the engine draws them. */
export interface EngineRecipe {
  readonly presentation: BodyPresentation;
  readonly build: BodyBuild;
  /** Skin shade 1 (lightest) to 7 (darkest). */
  readonly shade: number;
  readonly face: string;
  readonly hair: string;
  /** One of HAIR_COLORS. */
  readonly hairColor: string;
  /** One of the presentation's outfit ids (PackOutfit). */
  readonly outfit: string;
  /** Fabric color per garment part of the outfit (PART_PALETTES). */
  readonly colors?: Readonly<Record<string, string>>;
  /** Standing unless the place calls for sitting. */
  readonly pose?: BodyPose;
}

export function engineRecipeKey(recipe: EngineRecipe): string {
  return [
    recipe.presentation,
    recipe.build,
    recipe.shade,
    recipe.face,
    recipe.hair,
    recipe.hairColor,
    recipe.outfit,
    recipe.pose ?? "standing",
    ...Object.entries(recipe.colors ?? {})
      .sort()
      .map(([part, color]) => `${part}=${color}`),
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
  const { body, outfit } = posedPieces(pack, recipe);
  return [
    body.file,
    face.file,
    hair.back,
    hair.front,
    ...(outfit
      ? [
          outfit.file,
          outfit.hides,
          ...Object.values(outfit.regions ?? {}),
          ...(outfit.skin ? [outfit.skin] : []),
        ]
      : []),
  ];
}

/** The layer with one garment part (its mask's opaque pixels) recolored. */
function recolorPart(layer: Raster, mask: Raster, color: FabricRamp): Raster {
  const part = new Uint8ClampedArray(layer.data.length);
  for (let i = 3; i < part.length; i += 4)
    if (mask.data[i]! > OPAQUE_ALPHA) {
      part.set(layer.data.subarray(i - 3, i + 1), i - 3);
    }
  const source = measureFabricLuminance({
    width: layer.width,
    height: layer.height,
    data: part,
  });
  const tinted = recolorFabric(layer, color, source);
  const out = new Uint8ClampedArray(layer.data);
  for (let i = 3; i < out.length; i += 4) {
    const t = mask.data[i]! / 255;
    if (t === 0) continue;
    for (let c = 1; c <= 3; c += 1)
      out[i - c] = out[i - c]! * (1 - t) + tinted.data[i - c]! * t;
  }
  return { width: layer.width, height: layer.height, data: out };
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
): {
  readonly raster: Raster;
  readonly anchors: BodyAnchors;
  /** For a seated person: the row the seat is at. */
  readonly seatRow?: number;
} {
  const pack = manifest.presentations[recipe.presentation];
  const { body, outfit, seated } = posedPieces(pack, recipe);
  const ramp =
    SKIN_RAMPS[Math.min(SKIN_RAMPS.length, Math.max(1, recipe.shade)) - 1]!;
  const face = pack.faces.find((f) => f.id === recipe.face) ?? pack.faces[0]!;
  const hair = pack.hair.find((h) => h.id === recipe.hair) ?? pack.hair[0]!;
  const color = HAIR_COLORS.find((c) => c.id === recipe.hairColor);
  const front = image(hair.front);
  const tint = (layer: Raster) =>
    color && color.id !== "natural"
      ? recolorFabric(layer, color, measureFabricLuminance(front))
      : layer;
  const layers: PersonLayer[] = [
    {
      slot: "back-hair",
      raster: tint(image(hair.back)),
      authoredFor: pack.canonical,
    },
    { slot: "body", raster: recolorSkin(image(body.file), ramp, body.skin) },
  ];
  if (outfit) {
    const hides = image(outfit.hides);
    const mask = new Uint8Array(hides.width * hides.height);
    for (let p = 0; p < mask.length; p += 1)
      mask[p] = hides.data[p * 4 + 3]! > OPAQUE_ALPHA ? 1 : 0;
    let clothes = recolorSkin(
      image(outfit.file),
      ramp,
      body.skin,
      outfit.skin ? image(outfit.skin) : undefined,
    );
    for (const [part, file] of Object.entries(outfit.regions ?? {})) {
      const color = recipe.colors?.[part];
      if (color) clothes = recolorPart(clothes, image(file), fabricRamp(color));
    }
    layers.push({ slot: "outfit", raster: clothes, hidesBody: mask });
  }
  layers.push(
    {
      slot: "head",
      raster: recolorSkin(image(face.file), ramp, face.skin),
      authoredFor: pack.canonical,
    },
    {
      slot: "front-hair",
      raster: tint(front),
      authoredFor: pack.canonical,
    },
  );
  return {
    raster: assemblePerson(body.anchors, layers),
    anchors: body.anchors,
    ...(seated ? { seatRow: pack.seated!.bodies[recipe.build].seatRow } : {}),
  };
}
