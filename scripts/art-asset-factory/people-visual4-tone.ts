import path from "path";

import visual4Registry from "../../art/manifest/character_candidate_visual4_registry.json";
import type { CharacterComponentCandidateDefinition } from "../../src/presentation/character-components";
import { readPng } from "./pg-modular-intake";

/**
 * The skin tone each body and head is actually painted in.
 *
 * ## Why this is measured rather than read off a name
 *
 * Head families carry words like `light`, `tan` and `olive` in their ids and
 * bodies carry no complexion at all, so there is nothing to compare and the
 * words are not evidence. Worse, treating a family id as a complexion claim
 * would be inferring somebody's appearance from a label. So this reads the
 * pixels: the median opaque colour of a band of bare skin on each raster.
 *
 * For a body that band is the upper thigh, which is bare on every banked body
 * and large enough to median cleanly. For a head it is the centre of the face.
 * Both are sampled from the SAME rasters the compositor draws, so the number is
 * about what a player sees rather than about anything the art was called.
 *
 * ## What this is for
 *
 * Measured over sixty seeded people, the recipe's chosen head and chosen body
 * were a median of 59 apart in RGB, with 43 of 60 more than 40 apart and a
 * worst case of 85 — a face plainly not painted in the same skin as the body
 * carrying it. The compatibility metadata cannot prevent that: every banked
 * head declares every banked body as compatible, so the filter the resolver
 * already applies passes everything.
 *
 * The closest available head is between 2 and 23 away for EVERY body, so a
 * coherent choice exists in every case and this is a selection problem, not a
 * missing-art one.
 *
 * ## What this is NOT
 *
 * It is not a demographic classification and it makes no claim about anybody.
 * It is a measurement of paint, used so a person's face and body are painted in
 * the same skin — an authored game-policy about visual coherence, applied only
 * to newly created appearances.
 */

export const VISUAL4_TONE_SCHEMA = "people-visual4-tone-v1";
export const VISUAL4_TONE_PATH =
  "art/manifest/character_candidate_visual4_tone.json";

/** Where bare skin is sampled on each kind, as canvas fractions. */
export const TONE_SAMPLE_WINDOWS = {
  /** Upper thigh: bare on every banked body, and clear of the undergarment. */
  body: { x0: 0.4, x1: 0.47, y0: 0.62, y1: 0.7 },
  /** Centre of the face, clear of hair, brows and the jaw outline. */
  head: { x0: 0.4, x1: 0.6, y0: 0.45, y1: 0.6 },
} as const;

export interface MeasuredTone {
  readonly family: string;
  readonly kind: "body" | "head";
  readonly rgb: { readonly r: number; readonly g: number; readonly b: number };
  readonly sampledPixels: number;
}

interface RegistryAsset {
  readonly asset_id: string;
  readonly final_path?: string;
  readonly candidate_component?: CharacterComponentCandidateDefinition;
}

async function medianOpaque(
  file: string,
  window: { x0: number; x1: number; y0: number; y1: number },
): Promise<{
  rgb: { r: number; g: number; b: number };
  sampled: number;
} | null> {
  const bitmap = await readPng(file);
  const width = bitmap.width;
  const height = bitmap.height;
  const data = (bitmap as unknown as { data: Uint8Array }).data;
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  for (
    let y = Math.round(height * window.y0);
    y < Math.round(height * window.y1);
    y += 1
  )
    for (
      let x = Math.round(width * window.x0);
      x < Math.round(width * window.x1);
      x += 1
    ) {
      const at = (y * width + x) * 4;
      // Fully opaque only: a blended edge pixel is part background.
      if (data[at + 3]! < 250) continue;
      reds.push(data[at]!);
      greens.push(data[at + 1]!);
      blues.push(data[at + 2]!);
    }
  if (reds.length === 0) return null;
  const median = (values: number[]): number => {
    values.sort((left, right) => left - right);
    return values[Math.floor(values.length / 2)]!;
  };
  return {
    rgb: { r: median(reds), g: median(greens), b: median(blues) },
    sampled: reds.length,
  };
}

export async function measureVisual4Tones(
  repositoryRoot: string,
): Promise<readonly MeasuredTone[]> {
  const assets = (visual4Registry as { assets: RegistryAsset[] }).assets;
  const tones: MeasuredTone[] = [];
  for (const asset of [...assets].sort((a, b) =>
    a.asset_id < b.asset_id ? -1 : 1,
  )) {
    const kind = asset.candidate_component?.kind;
    if (kind !== "body" && kind !== "head") continue;
    const measured = await medianOpaque(
      path.join(repositoryRoot, asset.final_path!),
      TONE_SAMPLE_WINDOWS[kind],
    );
    if (!measured) continue;
    tones.push({
      family: asset.candidate_component!.family,
      kind,
      rgb: measured.rgb,
      sampledPixels: measured.sampled,
    });
  }
  return tones;
}

/** Straight RGB distance. Crude, labelled as such, and enough to separate 7 from 85. */
export function toneDistance(
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
): number {
  return Math.round(
    Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b),
  );
}
