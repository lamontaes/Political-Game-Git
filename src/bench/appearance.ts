import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import manifestJson from "../../art/people-engine/v1/manifest.json" with { type: "json" };
import {
  BODY_BUILDS,
  HAIR_COLORS,
  PART_PALETTES,
  composeEnginePerson,
  packOutfit,
  type BodyBuild,
  type BodyPresentation,
  type EngineRecipe,
  type PeoplePackManifest,
} from "../presentation/appearance-engine/pack";
import { fabricRamp } from "../presentation/appearance-engine/fabric";
import { SKIN_RAMPS } from "../presentation/appearance-engine/skin";
import type { Raster } from "../presentation/appearance-engine/raster";

/**
 * The creator's appearance step, as the Oct 12 creator had it
 * (src/player/EngineAppearanceControls.tsx at 29be9982f5^): the people
 * engine's arrows for body, build, skin tone, face, hair, hair color, outfit
 * and the outfit's part colors, and the portrait the engine draws for them.
 */
export const PEOPLE_PACK = manifestJson as unknown as PeoplePackManifest;
const PACK_DIR = new URL("../../art/people-engine/v1/", import.meta.url);

const PRESENTATIONS: readonly BodyPresentation[] = ["feminine", "masculine"];
const PRESENTATION_LABEL: Record<BodyPresentation, string> = {
  feminine: "Feminine",
  masculine: "Masculine",
};
const BUILD_LABEL: Record<BodyBuild, string> = {
  lean: "Lean",
  average: "Average",
  fuller: "Heavier",
};
const PART_LABEL: Record<string, string> = {
  top: "Top color",
  bottom: "Bottom color",
  suit: "Suit color",
  shirt: "Shirt color",
  tie: "Tie color",
  dress: "Dress color",
  jacket: "Jacket color",
  sweater: "Sweater color",
  coat: "Coat color",
  scarf: "Scarf color",
  scrubs: "Scrubs color",
};
const colorLabel = (id: string) =>
  id.replace("-", " ").replace(/^./, (first) => first.toUpperCase());

/** Outfits a player picks from: work uniforms come with a job, not the creator. */
const wearable = <T extends { readonly tags: readonly string[] }>(
  outfits: readonly T[],
): readonly T[] => outfits.filter((outfit) => !outfit.tags.includes("uniform"));

function step<T>(items: readonly T[], current: T, by: number): T {
  const index = Math.max(0, items.indexOf(current));
  return items[(index + by + items.length) % items.length]!;
}

/** A person picks one of the young faces; it ages with them. */
function faceIds(recipe: EngineRecipe): string[] {
  const pack = PEOPLE_PACK.presentations[recipe.presentation];
  const young = pack.faces.filter((f) => f.id.startsWith("20s30s-"));
  return (young.length > 0 ? young : pack.faces).map((f) => f.id);
}

export interface AppearanceRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly swatch?: string;
}

interface Row extends AppearanceRow {
  readonly move: (by: number) => EngineRecipe;
}

function rows(recipe: EngineRecipe, showBody: boolean): Row[] {
  const pack = PEOPLE_PACK.presentations[recipe.presentation];
  const outfit = packOutfit(pack, recipe.outfit);
  const faces = faceIds(recipe);
  const currentFace =
    faces.find((id) => id.slice(-2) === recipe.face.slice(-2)) ?? faces[0]!;
  const shades = SKIN_RAMPS.map((_, index) => index + 1);
  const all: Row[] = [
    {
      id: "presentation",
      label: "Body",
      value: PRESENTATION_LABEL[recipe.presentation],
      move: (by) => {
        const presentation = step(PRESENTATIONS, recipe.presentation, by);
        const next = PEOPLE_PACK.presentations[presentation];
        return {
          ...recipe,
          presentation,
          face: next.faces[0]!.id,
          hair: next.hair[0]!.id,
          outfit: next.outfits.some((o) => o.id === recipe.outfit)
            ? recipe.outfit
            : wearable(next.outfits)[0]!.id,
        };
      },
    },
    {
      id: "build",
      label: "Build",
      value: BUILD_LABEL[recipe.build],
      move: (by) => ({ ...recipe, build: step(BODY_BUILDS, recipe.build, by) }),
    },
    {
      id: "shade",
      label: "Skin tone",
      value: `${recipe.shade} of ${shades.length}`,
      swatch: SKIN_RAMPS[recipe.shade - 1]?.base,
      move: (by) => ({ ...recipe, shade: step(shades, recipe.shade, by) }),
    },
    {
      id: "face",
      label: "Face",
      value: `${faces.indexOf(currentFace) + 1} of ${faces.length}`,
      move: (by) => ({ ...recipe, face: step(faces, currentFace, by) }),
    },
    {
      id: "hair",
      label: "Hair",
      value: `${pack.hair.findIndex((h) => h.id === recipe.hair) + 1} of ${pack.hair.length}`,
      move: (by) => ({
        ...recipe,
        hair: step(
          pack.hair.map((h) => h.id),
          recipe.hair,
          by,
        ),
      }),
    },
    {
      id: "hair-color",
      label: "Hair color",
      value:
        HAIR_COLORS.find((c) => c.id === recipe.hairColor)?.label ??
        "Dark brown",
      swatch: HAIR_COLORS.find((c) => c.id === recipe.hairColor)?.base,
      move: (by) => ({
        ...recipe,
        hairColor: step(
          HAIR_COLORS.map((c) => c.id),
          recipe.hairColor,
          by,
        ),
      }),
    },
    {
      id: "outfit",
      label: "Outfit",
      value: outfit?.label ?? "",
      move: (by) => ({
        ...recipe,
        outfit: step(
          wearable(pack.outfits).map((o) => o.id),
          recipe.outfit,
          by,
        ),
        colors: {},
      }),
    },
    ...Object.entries(outfit?.parts ?? {}).map(([part, paletteId]): Row => {
      const palette = PART_PALETTES[paletteId] ?? [];
      const current = recipe.colors?.[part] ?? palette[0]!;
      return {
        id: `color-${part}`,
        label: PART_LABEL[part] ?? "Color",
        value: colorLabel(current),
        swatch: fabricRamp(current).base,
        move: (by) => ({
          ...recipe,
          colors: { ...recipe.colors, [part]: step(palette, current, by) },
        }),
      };
    }),
  ];
  return all.filter((row) => showBody || row.id !== "presentation");
}

/** The body row shows only where the gender does not settle the body. */
const showsBody = (gender: string) => gender !== "male" && gender !== "female";

export function appearanceRows(
  recipe: EngineRecipe,
  gender: string,
): AppearanceRow[] {
  return rows(recipe, showsBody(gender)).map(
    ({ id, label, value, swatch }) => ({
      id,
      label,
      value,
      ...(swatch ? { swatch } : {}),
    }),
  );
}

/** Every part of the outfit carries its color, so the label is what is drawn. */
function colored(recipe: EngineRecipe): EngineRecipe {
  const outfit = packOutfit(
    PEOPLE_PACK.presentations[recipe.presentation],
    recipe.outfit,
  );
  const colors: Record<string, string> = {};
  for (const [part, paletteId] of Object.entries(outfit?.parts ?? {})) {
    const palette = PART_PALETTES[paletteId] ?? [];
    const now = recipe.colors?.[part];
    colors[part] = now && palette.includes(now) ? now : palette[0]!;
  }
  return { ...recipe, colors };
}

export function moveAppearance(
  recipe: EngineRecipe,
  gender: string,
  rowId: string,
  by: number,
): EngineRecipe {
  const row = rows(recipe, showsBody(gender)).find((r) => r.id === rowId);
  if (!row) throw new Error("No such appearance row.");
  return colored(row.move(by < 0 ? -1 : 1));
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * A whole look drawn from a seed and a draw number (the Randomize button, and
 * the first look a new character is shown). It decides who someone looks
 * like, never what anyone does.
 */
export function drawnAppearance(
  gender: string,
  seed: string,
  draw: number,
): EngineRecipe {
  const presentation: BodyPresentation =
    gender === "male"
      ? "masculine"
      : gender === "female"
        ? "feminine"
        : PRESENTATIONS[hash(`${seed}:${draw}:body`) % 2]!;
  const pack = PEOPLE_PACK.presentations[presentation];
  const pick = <T>(items: readonly T[], key: string) =>
    items[hash(`${seed}:${draw}:${key}`) % items.length]!;
  const base: EngineRecipe = {
    presentation,
    build: pick(BODY_BUILDS, "build"),
    shade: 1 + (hash(`${seed}:${draw}:shade`) % SKIN_RAMPS.length),
    face: pack.faces[0]!.id,
    hair: pick(pack.hair, "hair").id,
    hairColor: pick(HAIR_COLORS, "hairColor").id,
    outfit: pick(wearable(pack.outfits), "outfit").id,
    colors: {},
  };
  return colored({ ...base, face: pick(faceIds(base), "face") });
}

/** A recipe from the page, checked against the pack. */
export function readRecipe(text: string): EngineRecipe {
  const recipe = JSON.parse(text) as EngineRecipe;
  const pack = PEOPLE_PACK.presentations[recipe.presentation];
  if (
    !pack ||
    !BODY_BUILDS.includes(recipe.build) ||
    !Number.isInteger(recipe.shade) ||
    recipe.shade < 1 ||
    recipe.shade > SKIN_RAMPS.length ||
    !pack.faces.some((f) => f.id === recipe.face) ||
    !pack.hair.some((h) => h.id === recipe.hair) ||
    !HAIR_COLORS.some((c) => c.id === recipe.hairColor) ||
    !pack.outfits.some((o) => o.id === recipe.outfit)
  )
    throw new Error("No such appearance.");
  return colored({
    presentation: recipe.presentation,
    build: recipe.build,
    shade: recipe.shade,
    face: recipe.face,
    hair: recipe.hair,
    hairColor: recipe.hairColor,
    outfit: recipe.outfit,
    colors: Object.fromEntries(
      Object.entries(recipe.colors ?? {}).filter(([, id]) =>
        Object.values(PART_PALETTES).some((palette) => palette.includes(id)),
      ),
    ),
  });
}

const rasters = new Map<string, Raster>();
function packImage(file: string): Raster {
  let raster = rasters.get(file);
  if (!raster) {
    const png = PNG.sync.read(readFileSync(new URL(file, PACK_DIR)));
    raster = {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
    rasters.set(file, raster);
  }
  return raster;
}
const packFile = (file: string) => existsSync(new URL(file, PACK_DIR));

const portraits = new Map<string, Buffer>();
/** The engine's drawing of one recipe, standing, as a PNG. */
export function portraitPng(recipe: EngineRecipe): Buffer {
  const key = JSON.stringify(recipe);
  let png = portraits.get(key);
  if (!png) {
    const { raster } = composeEnginePerson(
      PEOPLE_PACK,
      packImage,
      recipe,
      packFile,
    );
    const out = new PNG({ width: raster.width, height: raster.height });
    out.data = Buffer.from(raster.data.buffer);
    png = PNG.sync.write(out);
    if (portraits.size > 200) portraits.clear();
    portraits.set(key, png);
  }
  return png;
}
