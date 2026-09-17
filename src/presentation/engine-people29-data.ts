import { SeededRng } from "../simulation/rng";
import {
  assertAppearanceMaterial,
  type AppearanceMaterial,
} from "../simulation/appearance-material";
import type { PersonAppearance } from "../simulation/types";
import {
  KIT41_REGISTRY as kit,
  MODULAR41_HEADS_REGISTRY as headRepair,
  MODULAR45_REGISTRY as modular45,
  candidateRegistry,
} from "./private-candidate-manifests";
const input = candidateRegistry("engine29");
const refinement = candidateRegistry("engine34");
const painted = candidateRegistry("engine35");
const painted36 = candidateRegistry("engine36");
const audience40 = candidateRegistry("engine40");
const standing41 = candidateRegistry("engine41");
export type MaterialChannel = keyof AppearanceMaterial["palettes"];
export type FeatureKind = keyof AppearanceMaterial["features"];
export interface PreparedFeature {
  id: string;
  groupId: string;
  origin: { x: number; y: number };
  parameters: Record<
    "x" | "y" | "scaleX" | "scaleY",
    readonly [number, number]
  >;
}
export interface PreparedPart {
  id: string;
  kind: string;
  layer: number;
  svgPath: string;
  sha256: string;
  coverageMaskPath?: string | null;
  introducedGeneration?: number;
  logicalFamily?: string;
  logicalIdentity?: string;
  label?: string;
  /** Authored clothing-specific anatomy, rendered in the existing body slot. */
  anatomyOverride?: string;
  /** Same identity/frame, authored expressive paint; neutral remains default. */
  expressionVariants?: Readonly<
    Record<string, { svgPath: string; sha256: string }>
  >;
  portraitBounds?: { left: number; top: number; right: number; bottom: number };
  materials: readonly {
    channel: MaterialChannel;
    /** Separate authored region sharing a palette (for example lip pigment). */
    mapId?: string;
    neutralId: string;
    lightId: string;
    shadowId: string;
    inkId: string;
    maskId: string;
    ramps: readonly {
      id: string;
      shadow: string;
      neutral: string;
      light: string;
      /** Prepared skin map: gradient-table stops, dark to light. */
      stops?: readonly string[];
    }[];
  }[];
  features?: readonly PreparedFeature[];
}
export interface PreparedFamily {
  id: string;
  bodyType: string;
  /** Optional authored square crop in source pixels; old families retain their frame. */
  portraitFrame?: { x: number; y: number; size: number };
  geometry: { presentation: "masculine" | "feminine" };
  canvas: { width: number; height: number };
  pose: string;
  view: string;
  parts: readonly PreparedPart[];
  recipes: Record<string, readonly string[]>;
}
export const ENGINE_PEOPLE29_FAMILIES =
  input.families as unknown as readonly PreparedFamily[];
export const PREPARED_FAMILIES = [
  ...ENGINE_PEOPLE29_FAMILIES,
  ...(modular45.families as unknown as readonly PreparedFamily[]),
  ...(refinement.families as unknown as readonly PreparedFamily[]),
  ...(painted.families as unknown as readonly PreparedFamily[]),
  ...(painted36.families as unknown as readonly PreparedFamily[]),
  ...(audience40.families as unknown as readonly PreparedFamily[]),
  ...(standing41.families as unknown as readonly PreparedFamily[]),
].map((family) => ({
  ...family,
  parts: [
    ...family.parts,
    ...((headRepair.familyAdditions as Record<string, PreparedPart[]>)[
      family.id
    ] ?? []),
    ...((kit.familyAdditions as Record<string, PreparedPart[]>)[family.id] ??
      []),
    ...((modular45.familyAdditions as Record<string, PreparedPart[]>)[
      family.id
    ] ?? []),
  ],
}));
/** First generation that draws the MODULAR45 corrected parts. */
export const MODULAR45_GENERATION: number | null =
  modular45.generations[0]?.generation ?? null;
const modular45PartIds = new Set(
  Object.values(
    modular45.familyAdditions as Record<string, PreparedPart[]>,
  ).flatMap((parts) => parts.map((p) => p.id)),
);
const supersededAt = new Map<string, number>();
for (const registry of [headRepair, modular45])
  for (const generation of registry.generations)
    for (const asset of registry.assets as readonly {
      asset_id: string;
      candidate_component?: { supersedes_asset_id?: string };
    }[]) {
      const previous = asset.candidate_component?.supersedes_asset_id;
      if (previous && generation.component_ids.includes(asset.asset_id))
        supersededAt.set(
          previous,
          Math.min(
            supersededAt.get(previous) ?? Infinity,
            generation.generation,
          ),
        );
    }
/** Authored skin ramp ids offered by the corrected generation, light to dark. */
export const PREPARED_SKIN_RAMPS: readonly string[] = modular45.skinRamps;
/**
 * The prepared parts a person pinned to `generation` can actually draw.
 * Generations before MODULAR45 (and an unknown pin) keep the historical
 * whole-family view exactly, so their material defaults do not move.
 */
export function preparedPartsAt(
  family: PreparedFamily,
  generation: number | undefined,
): readonly PreparedPart[] {
  if (
    generation === undefined ||
    MODULAR45_GENERATION === null ||
    generation < MODULAR45_GENERATION
  )
    return family.parts.filter((p) => !modular45PartIds.has(p.id));
  return family.parts.filter(
    (p) =>
      (p.introducedGeneration ?? MODULAR45_GENERATION) <= generation &&
      !(supersededAt.has(p.id) && supersededAt.get(p.id)! <= generation),
  );
}
/** Ramps every drawable region of a channel supports at this generation. */
export function preparedRampsAt(
  family: PreparedFamily,
  channel: MaterialChannel,
  generation: number | undefined,
) {
  const regions = preparedPartsAt(family, generation)
    .flatMap((p) => p.materials)
    .filter((m) => m.channel === channel);
  return (regions[0]?.ramps ?? []).filter((r) =>
    regions.every((m) => m.ramps.some((x) => x.id === r.id)),
  );
}
export const ENGINE_PEOPLE29_TEMPLATES = {
  ...input.templates,
  ...headRepair.templates,
  ...modular45.templates,
  ...kit.templates,
  ...refinement.templates,
  ...painted.templates,
  ...painted36.templates,
  ...audience40.templates,
  ...standing41.templates,
} as Readonly<
  Record<
    string,
    { familyId: string; partIds: readonly string[]; sourceSha256: string }
  >
>;
export function preparedFamily(bodyFamily: string | undefined) {
  return PREPARED_FAMILIES.find((f) =>
    f.parts.some(
      (p) =>
        p.kind === "body" &&
        (p.id === bodyFamily || p.logicalFamily === bodyFamily),
    ),
  );
}
/** New calibrated derivatives frame the resolved head/hair; legacy frames stay exact. */
export function preparedPortraitFrame(
  family: PreparedFamily,
  assetIds: readonly string[],
) {
  const boxes = family.parts
    .filter((p) => assetIds.includes(p.id))
    .flatMap((p) => (p.portraitBounds ? [p.portraitBounds] : []));
  if (!boxes.length) return family.portraitFrame;
  const left = Math.min(...boxes.map((b) => b.left)) - 14;
  const right = Math.max(...boxes.map((b) => b.right)) + 14;
  const top = Math.min(...boxes.map((b) => b.top)) - 14;
  const bottom = Math.max(...boxes.map((b) => b.bottom)) + 14;
  const size = Math.max(right - left, bottom - top);
  return { x: (left + right - size) / 2, y: (top + bottom - size) / 2, size };
}
export function defaultPreparedMaterial(
  family: PreparedFamily,
  generation?: number,
): AppearanceMaterial {
  const palettes = {} as Record<MaterialChannel, string>;
  for (const p of preparedPartsAt(family, generation))
    for (const m of p.materials) palettes[m.channel] ??= m.ramps[0]!.id;
  const swatches = preparedRampsAt(family, "skin", generation).filter((r) =>
    PREPARED_SKIN_RAMPS.includes(r.id),
  );
  // Middle of the authored range: a neutral default, not an estimate of anyone.
  if (swatches.length)
    palettes.skin = swatches[Math.floor(swatches.length / 2)]!.id;
  const features = {} as Record<
    FeatureKind,
    AppearanceMaterial["features"]["eyes"]
  >;
  for (const id of family.recipes.default!) {
    const p = family.parts.find((p) => p.id === id)!;
    if (p.kind !== "face-feature") continue;
    const kind = p.features![0]!.id.split("-")[0] as FeatureKind;
    features[kind] = { variant: id, x: 0, y: 0, scaleX: 1, scaleY: 1 };
  }
  return {
    version: "engine-people29-v1",
    familyId: family.id,
    palettes,
    features,
  };
}
export function validatePreparedAppearance(appearance: PersonAppearance): void {
  if (!appearance.material) return;
  assertAppearanceMaterial(appearance.material);
  const family = preparedFamily(appearance.selection?.bodyFamily);
  if (!family || family.id !== appearance.material.familyId)
    throw new Error("Prepared material belongs to another body family.");
  for (const p of preparedPartsAt(family, appearance.catalogGeneration))
    for (const m of p.materials)
      if (
        !m.ramps.some((r) => r.id === appearance.material!.palettes[m.channel])
      )
        throw new Error("Unsupported authored tone ramp.");
  for (const [kind, value] of Object.entries(appearance.material.features)) {
    const p = family.parts.find((p) => p.id === value.variant);
    const f = p?.features?.[0];
    if (!f || !f.id.startsWith(kind + "-"))
      throw new Error("Unsupported prepared feature.");
    for (const parameter of ["x", "y", "scaleX", "scaleY"] as const) {
      const [min, max] = f.parameters[parameter];
      if (value[parameter] < min || value[parameter] > max)
        throw new Error("Feature exceeds its authored safe range.");
    }
  }
}
/** Matching authored vocabulary retains feature and hair choices on an explicit body edit. */
export function selectPreparedBody(
  appearance: PersonAppearance,
  bodyFamily: string,
): PersonAppearance | undefined {
  const family = preparedFamily(bodyFamily);
  if (!family) return undefined;
  const previous = preparedFamily(appearance.selection?.bodyFamily);
  const currentParts = previous
    ? preparedPartsAt(previous, appearance.catalogGeneration)
    : [];
  const destinationParts = preparedPartsAt(
    family,
    appearance.catalogGeneration,
  );
  const logical = (id: string | undefined | null, kind: string) => {
    const part = currentParts.find(
      (p) => p.kind === kind && (p.id === id || p.logicalFamily === id),
    );
    if (!part?.logicalIdentity) return undefined;
    return destinationParts.find(
      (p) => p.kind === kind && p.logicalIdentity === part.logicalIdentity,
    )?.logicalFamily;
  };
  const calibrated = currentParts.some((p) => p.logicalIdentity);
  if (
    calibrated &&
    (!logical(appearance.selection?.headFamily, "head") ||
      (appearance.selection?.hairFamily !== null &&
        !logical(appearance.selection?.hairFamily, "hair-front")))
  )
    return undefined;
  const translate = (id: string | undefined | null, kind: string) =>
    id && previous
      ? destinationParts.find(
          (p) =>
            p.kind === kind &&
            p.id.endsWith(
              id.replace(
                previous.parts
                  .find((p) => p.kind === "body")!
                  .id.replace(/-body$/, ""),
                "",
              ),
            ),
        )?.id
      : undefined;
  const head =
    logical(appearance.selection?.headFamily, "head") ??
    translate(appearance.selection?.headFamily, "head");
  const hair =
    appearance.selection?.hairFamily === null
      ? null
      : (logical(appearance.selection?.hairFamily, "hair-front") ??
        translate(appearance.selection?.hairFamily, "hair-front"));
  if (!head || hair === undefined) return undefined;
  const base = defaultPreparedMaterial(family, appearance.catalogGeneration);
  const material =
    appearance.material && previous
      ? {
          ...base,
          palettes: appearance.material.palettes,
          features: Object.fromEntries(
            Object.entries(appearance.material.features).map(([k, v]) => [
              k,
              {
                ...v,
                variant:
                  translate(v.variant, "face-feature") ??
                  base.features[k as FeatureKind].variant,
              },
            ]),
          ) as unknown as AppearanceMaterial["features"],
        }
      : base;
  return {
    ...appearance,
    selection: { bodyFamily, headFamily: head, hairFamily: hair },
    material,
  };
}

/** Uniform choices among supported authored options, not demographic estimates. */
export function generatedPreparedMaterial(
  family: PreparedFamily,
  seed: string,
  generation?: number,
): AppearanceMaterial {
  const base = defaultPreparedMaterial(family, generation);
  const rng = new SeededRng(seed).fork("prepared-material-defaults-v1");
  const palettes = { ...base.palettes };
  for (const channel of ["skin", "hair", "top", "bottom"] as const) {
    const regions = preparedPartsAt(family, generation)
      .flatMap((p) => p.materials)
      .filter((m) => m.channel === channel);
    if (!regions.length) {
      palettes[channel] = "source-colour";
      continue;
    }
    let choices = regions[0]!.ramps
      .map((r) => r.id)
      .filter((id) => regions.every((m) => m.ramps.some((r) => r.id === id)))
      .sort();
    // A corrected skin map offers authored swatches. The unmapped painting
    // stays drawable for old saves but is not a new person's complexion.
    if (choices.some((id) => id !== "source-colour"))
      choices = choices.filter((id) => id !== "source-colour");
    palettes[channel] = rng.fork(channel).pick(choices);
  }
  const features = { ...base.features };
  for (const kind of ["eyes", "brows", "nose", "mouth"] as const) {
    const choices = family.parts
      .filter((p) => p.features?.[0]?.id.startsWith(kind + "-"))
      .map((p) => p.id)
      .sort();
    features[kind] = {
      ...features[kind],
      variant: rng.fork(kind).pick(choices),
    };
  }
  return { ...base, palettes, features };
}
