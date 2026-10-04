import type {
  BodyBuild,
  BodyPresentation,
  EngineRecipe,
} from "../presentation/appearance-engine/pack";
import {
  BODY_BUILDS,
  HAIR_COLORS,
  PART_PALETTES,
  packOutfit,
} from "../presentation/appearance-engine/pack";
import { fabricRamp } from "../presentation/appearance-engine/fabric";
import {
  CHOSEN_ACCESSORY_KINDS,
  accessoryKindOf,
} from "../presentation/appearance-engine/face-extras";
import { PEOPLE_PACK } from "../presentation/appearance-engine/runtime";
import { SKIN_RAMPS } from "../presentation/appearance-engine/skin";
import "./creator-appearance.css";

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
const FACIAL_HAIR_LABEL: Record<string, string> = {
  none: "None",
  stubble: "Stubble",
  mustache: "Mustache",
  goatee: "Goatee",
  "short-beard": "Short beard",
  "full-beard": "Full beard",
};
const ACCESSORY_LABEL: Record<string, string> = {
  earrings: "Earrings",
  necklace: "Necklace",
  watch: "Watch",
  ring: "Ring",
};
/** "earrings-pearl" is "Pearl"; a kind painted in one variant is just "On". */
const accessoryVariantLabel = (id: string, kind: string) =>
  colorLabel(id.slice(kind.length + 1) || "on");
const glassesLabel = (recipe: EngineRecipe) =>
  recipe.glasses
    ? `${colorLabel(recipe.glasses)}${recipe.glassesWear === "reading" ? ", for reading" : ""}`
    : "None";
const colorLabel = (id: string) =>
  id.replace("-", " ").replace(/^./, (first) => first.toUpperCase());

/** Outfits a player picks from: work uniforms come with a job, not the creator. */
const wearable = <T extends { readonly tags: readonly string[] }>(
  outfits: readonly T[],
): readonly T[] => outfits.filter((outfit) => !outfit.tags.includes("uniform"));

/** The recipe without these fields: a choice of none leaves them unset. */
function without(
  recipe: EngineRecipe,
  keys: readonly (keyof EngineRecipe)[],
): EngineRecipe {
  return Object.fromEntries(
    Object.entries(recipe).filter(
      ([key]) => !keys.includes(key as keyof EngineRecipe),
    ),
  ) as unknown as EngineRecipe;
}

function step<T>(items: readonly T[], current: T, by: number): T {
  const index = Math.max(0, items.indexOf(current));
  return items[(index + by + items.length) % items.length]!;
}

/**
 * The people engine's appearance arrows: body, build, skin tone, face, hair
 * and outfit. Every combination draws, because the engine has every piece for
 * every body. Face and hair rows appear once there is more than one to choose.
 */
export function EngineAppearanceControls({
  recipe,
  onChange,
  onRandomize,
  showBodyChoice = true,
}: {
  readonly recipe: EngineRecipe;
  readonly onChange: (recipe: EngineRecipe) => void;
  readonly onRandomize?: () => void;
  readonly showBodyChoice?: boolean;
}) {
  const pack = PEOPLE_PACK.presentations[recipe.presentation];
  const outfit = packOutfit(pack, recipe.outfit);
  const young = pack.faces.filter((f) => f.id.startsWith("20s30s-"));
  const faceIds = (young.length > 0 ? young : pack.faces).map((f) => f.id);
  const currentFace =
    faceIds.find((id) => id.slice(-2) === recipe.face.slice(-2)) ?? faceIds[0]!;
  const shades = SKIN_RAMPS.map((_, index) => index + 1);
  const rows: {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly swatch?: string;
    readonly move: (by: number) => EngineRecipe;
  }[] = [
    {
      id: "presentation",
      label: "Body",
      value: PRESENTATION_LABEL[recipe.presentation],
      move: (by) => {
        const presentation = step(PRESENTATIONS, recipe.presentation, by);
        const next = PEOPLE_PACK.presentations[presentation];
        return {
          ...without(recipe, ["accessories"]),
          presentation,
          face: next.faces[0]!.id,
          hair: next.hair[0]!.id,
          outfit: next.outfits.some((outfit) => outfit.id === recipe.outfit)
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
    ...(faceIds.length > 1
      ? [
          {
            id: "face",
            label: "Face",
            value: `${faceIds.indexOf(currentFace) + 1} of ${faceIds.length}`,
            // A person picks one of the young faces; it ages with them.
            move: (by: number) => ({
              ...recipe,
              face: step(faceIds, currentFace, by),
            }),
          },
        ]
      : []),
    ...(pack.hair.length > 1
      ? [
          {
            id: "hair",
            label: "Hair",
            value: `${pack.hair.findIndex((h) => h.id === recipe.hair) + 1} of ${pack.hair.length}`,
            move: (by: number) => ({
              ...recipe,
              hair: step(
                pack.hair.map((h) => h.id),
                recipe.hair,
                by,
              ),
            }),
          },
        ]
      : []),
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
    ...(recipe.presentation === "masculine" &&
    (pack.facialHair?.length ?? 0) > 0
      ? [
          {
            id: "facial-hair",
            label: "Facial hair",
            value: FACIAL_HAIR_LABEL[recipe.facialHair ?? "none"] ?? "None",
            move: (by: number) => {
              const next = step(
                ["none", ...pack.facialHair!.map((style) => style.id)],
                recipe.facialHair ?? "none",
                by,
              );
              const rest = without(recipe, ["facialHair"]);
              return next === "none" ? rest : { ...rest, facialHair: next };
            },
          },
        ]
      : []),
    ...((pack.glasses?.length ?? 0) > 0
      ? [
          {
            id: "glasses",
            label: "Glasses",
            value: glassesLabel(recipe),
            move: (by: number) => {
              // None, then each frame worn all day, then each only to read.
              const options = [
                "none",
                ...pack.glasses!.map((frame) => `${frame.id}|always`),
                ...pack.glasses!.map((frame) => `${frame.id}|reading`),
              ];
              const current = recipe.glasses
                ? `${recipe.glasses}|${recipe.glassesWear ?? "always"}`
                : "none";
              const next = step(options, current, by);
              const rest = without(recipe, ["glasses", "glassesWear"]);
              if (next === "none") return rest;
              const [frame, wear] = next.split("|");
              return {
                ...rest,
                glasses: frame!,
                ...(wear === "reading"
                  ? { glassesWear: "reading" as const }
                  : {}),
              };
            },
          },
        ]
      : []),
    ...CHOSEN_ACCESSORY_KINDS.flatMap((kind) => {
      const variants = (pack.accessories ?? [])
        .filter((entry) => entry.kind === kind)
        .map((entry) => entry.id);
      if (variants.length === 0) return [];
      const worn = (recipe.accessories ?? []).find(
        (id) => accessoryKindOf(id) === kind,
      );
      return [
        {
          id: `accessory-${kind}`,
          label: ACCESSORY_LABEL[kind] ?? colorLabel(kind),
          value: worn ? accessoryVariantLabel(worn, kind) : "None",
          move: (by: number) => {
            const next = step(["none", ...variants], worn ?? "none", by);
            const rest = (recipe.accessories ?? []).filter(
              (id) => accessoryKindOf(id) !== kind,
            );
            const accessories = next === "none" ? rest : [...rest, next];
            return accessories.length > 0
              ? { ...recipe, accessories }
              : without(recipe, ["accessories"]);
          },
        },
      ];
    }),
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
      }),
    },
    ...Object.entries(outfit?.parts ?? {}).map(([part, paletteId]) => {
      const palette = PART_PALETTES[paletteId] ?? [];
      const current = recipe.colors?.[part] ?? palette[0]!;
      return {
        id: `color-${part}`,
        label: PART_LABEL[part] ?? "Color",
        value: colorLabel(current),
        swatch: fabricRamp(current).base,
        move: (by: number) => ({
          ...recipe,
          colors: { ...recipe.colors, [part]: step(palette, current, by) },
        }),
      };
    }),
  ];
  return (
    <div
      className="engine-appearance-controls"
      data-testid="engine-appearance-controls"
    >
      {rows
        .filter((row) => showBodyChoice || row.id !== "presentation")
        .map((row) => (
          <div
            key={row.id}
            className="engine-appearance-row"
            data-testid={`engine-appearance-${row.id}`}
          >
            <span className="engine-appearance-label">{row.label}</span>
            <button
              type="button"
              aria-label={`Previous ${row.label.toLowerCase()}`}
              onClick={() => onChange(row.move(-1))}
            >
              ‹
            </button>
            <span className="engine-appearance-value">
              {row.swatch ? (
                <span
                  aria-hidden="true"
                  className="engine-appearance-swatch"
                  style={{ background: row.swatch }}
                />
              ) : null}
              {row.value}
            </span>
            <button
              type="button"
              aria-label={`Next ${row.label.toLowerCase()}`}
              onClick={() => onChange(row.move(1))}
            >
              ›
            </button>
          </div>
        ))}
      {onRandomize ? (
        <button
          type="button"
          className="engine-appearance-randomize"
          onClick={onRandomize}
        >
          Randomize
        </button>
      ) : null}
    </div>
  );
}
