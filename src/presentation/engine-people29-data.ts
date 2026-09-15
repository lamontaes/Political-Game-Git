import { SeededRng } from "../simulation/rng";
import {
  assertAppearanceMaterial,
  type AppearanceMaterial,
} from "../simulation/appearance-material";
import type { PersonAppearance } from "../simulation/types";
import {
  KIT41_REGISTRY as kit,
  MODULAR41_HEADS_REGISTRY as headRepair,
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
  materials: readonly {
    channel: MaterialChannel;
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
  ],
}));
export const ENGINE_PEOPLE29_TEMPLATES = {
  ...input.templates,
  ...headRepair.templates,
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
    f.parts.some((p) => p.kind === "body" && p.id === bodyFamily),
  );
}
export function defaultPreparedMaterial(
  family: PreparedFamily,
): AppearanceMaterial {
  const palettes = {} as Record<MaterialChannel, string>;
  for (const p of family.parts)
    for (const m of p.materials) palettes[m.channel] ??= m.ramps[0]!.id;
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
  for (const p of family.parts)
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
  const translate = (id: string | undefined | null, kind: string) =>
    id && previous
      ? family.parts.find(
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
    translate(appearance.selection?.headFamily, "head") ??
    family.parts.find((p) => p.kind === "head")!.id;
  const hair =
    appearance.selection?.hairFamily === null
      ? null
      : (translate(appearance.selection?.hairFamily, "hair-front") ??
        family.parts.find((p) => p.kind === "hair-front")!.id);
  const base = defaultPreparedMaterial(family);
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
): AppearanceMaterial {
  const base = defaultPreparedMaterial(family);
  const rng = new SeededRng(seed).fork("prepared-material-defaults-v1");
  const palettes = { ...base.palettes };
  for (const channel of ["skin", "hair", "top", "bottom"] as const) {
    const regions = family.parts
      .flatMap((p) => p.materials)
      .filter((m) => m.channel === channel);
    const choices = regions[0]!.ramps
      .map((r) => r.id)
      .filter((id) => regions.every((m) => m.ramps.some((r) => r.id === id)))
      .sort();
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
