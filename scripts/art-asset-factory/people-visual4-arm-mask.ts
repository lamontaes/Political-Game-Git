import path from "path";

import { opaqueBounds, readPng, writePng } from "./pg-modular-intake";
import type { Bitmap } from "pureimage";

/**
 * Lifting baked skin out of a garment that has it painted in.
 *
 * ## The one garment this is for, and why it is blocked
 *
 * `wave_a_female_top_burgundy_short_sleeve_polo_v1` is the only wardrobe crop
 * in the Visual4 bank that reaches the registry and fits nobody. It is not a
 * fit failure — measured against `average-woman-standing-neutral-front-a` it
 * scores a worst edge error of ZERO across all 285 compared rows, a perfect
 * pairing. `people-visual4.ts` blocks it by name, and the authoring manifest
 * says exactly why:
 *
 *   "Painted light-skin forearms are baked into this source below both short
 *    sleeves and end at cut wrists."
 *   "Exclude unmasked use as a complexion-independent garment. Author arm masks
 *    or declare exact compatible body, complexion and pose before using."
 *
 * That block is correct. Drawing this garment on anyone would paint one
 * complexion's forearms onto them, whatever their own. It is the
 * layer-separation case, not a silhouette case.
 *
 * ## What this does
 *
 * The manifest names the remedy — author arm masks — and the separation is
 * measurable rather than guessed: the fabric sits at rgb(112,53,62) and the
 * baked skin at rgb(223,179,155), which are not near each other in any channel.
 * So the skin is classified by colour, the mask is grown by a few pixels to
 * take the outline and anti-aliased fringe that borders it, and those pixels
 * are cleared to fully transparent. The garment keeps its sleeves and its
 * torso; the arms it should never have carried are gone, and the body's own
 * arms show through where they always should have.
 *
 * ## What this does NOT do
 *
 * It writes an ADDITIVE candidate beside the original and touches nothing else.
 * The original crop, its hash and its lineage are untouched; no manifest is
 * rewritten, no registry entry is added, and the block in `people-visual4.ts`
 * stays exactly where it is.
 *
 * Removing that block is a visual decision about a garment, and it is the
 * owner's. The measured fit was already perfect, so what is left to judge is
 * whether this mask looks right — the sleeve hem especially, where the grown
 * mask runs closest to fabric that must survive. The evidence overlay is in
 * `docs/agent/evidence/modular-gen14/`.
 */

export const ARM_MASK_SOURCE =
  "art/generated/candidates/recent-drive-sweep/female-tops/wave_a_female_top_burgundy_short_sleeve_polo_v1.png";

export const ARM_MASK_OUTPUT =
  "art/generated/candidates/people-visual4-masked/wave_a_female_top_burgundy_short_sleeve_polo_v1_armmasked.png";

/**
 * How far the skin mask grows before it is cleared.
 *
 * Four pixels at this crop's ~1100px scale takes the ink outline and the
 * anti-aliased blend that border the painted arm without reaching the sleeve
 * hem. It is a visual estimate of an edge width, labelled as one; it is not a
 * measurement of anything physical.
 */
export const ARM_MASK_FRINGE_PX = 4;

/** Skin as this source paints it, kept deliberately narrow. */
export function isBakedSkin(
  red: number,
  green: number,
  blue: number,
  alpha: number,
): boolean {
  return (
    alpha > 8 &&
    red > 175 &&
    green > 115 &&
    blue > 95 &&
    red - blue > 25 &&
    red > green &&
    green > blue
  );
}

export interface ArmMaskResult {
  readonly clearedPixels: number;
  readonly opaqueBefore: number;
  readonly opaqueAfter: number;
  readonly boundsBefore: { width: number; height: number };
  readonly boundsAfter: { width: number; height: number };
}

export async function buildArmMaskedCandidate(
  repositoryRoot: string,
  outputPath = ARM_MASK_OUTPUT,
): Promise<ArmMaskResult> {
  const bitmap: Bitmap = await readPng(
    path.join(repositoryRoot, ARM_MASK_SOURCE),
  );
  const width = bitmap.width;
  const height = bitmap.height;
  const data = (bitmap as unknown as { data: Uint8Array }).data;

  const before = opaqueBounds(bitmap, 8);
  let opaqueBefore = 0;
  const seed = new Uint8Array(width * height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const at = pixel * 4;
    if (data[at + 3]! > 8) opaqueBefore += 1;
    if (isBakedSkin(data[at]!, data[at + 1]!, data[at + 2]!, data[at + 3]!))
      seed[pixel] = 1;
  }

  const grown = new Uint8Array(seed);
  const reach = ARM_MASK_FRINGE_PX;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (!seed[y * width + x]) continue;
      for (let dy = -reach; dy <= reach; dy += 1)
        for (let dx = -reach; dx <= reach; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height)
            grown[ny * width + nx] = 1;
        }
    }

  let cleared = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (!grown[pixel]) continue;
    const at = pixel * 4;
    if (data[at + 3]! > 0) cleared += 1;
    // RGB is cleared with the alpha so nothing is left hiding under a
    // transparent pixel for a compositor that ignores alpha to find.
    data[at] = 0;
    data[at + 1] = 0;
    data[at + 2] = 0;
    data[at + 3] = 0;
  }

  await writePng(path.join(repositoryRoot, outputPath), bitmap);
  const after = opaqueBounds(bitmap, 8);
  let opaqueAfter = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1)
    if (data[pixel * 4 + 3]! > 8) opaqueAfter += 1;

  return {
    clearedPixels: cleared,
    opaqueBefore,
    opaqueAfter,
    boundsBefore: { width: before.width, height: before.height },
    boundsAfter: { width: after.width, height: after.height },
  };
}
