import { fnv1a } from "./hash";
import type { CharacterAssetLibrary } from "./types";

/**
 * Derives a canonical, order-independent signature for the selection-relevant
 * contents of an asset library.
 *
 * Adding, removing, or changing an ID mathematically alters the signature,
 * protecting existing persisted character identities from silently
 * shifting due to library growth during modulo-selection.
 */
export function deriveLibrarySignature(library: CharacterAssetLibrary): string {
  // Extract all selection-relevant IDs and canonically sort them.
  // We use code-unit string sorting to ensure cross-platform determinism.

  const sortIds = (ids: string[]) =>
    ids.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const bodyIds = sortIds(library.bodyFamilies.map((b) => b.id));
  const headFamilyIds = sortIds(library.headFamilies.map((h) => h.id));
  const headAssetIds = sortIds(library.headAssets.map((h) => h.id));
  const hairFamilyIds = sortIds(library.hairFamilies.map((h) => h.id));
  const hairAssetIds = sortIds(library.hairAssets.map((h) => h.id));
  const facialHairFamilyIds = sortIds(
    library.facialHairFamilies.map((f) => f.id),
  );
  const facialHairAssetIds = sortIds(library.facialHairAssets.map((f) => f.id));
  const complexionIds = sortIds(library.complexions.map((c) => c.id));
  const accessoryIds = sortIds(library.accessories.map((a) => a.id));
  const wardrobeIds = sortIds(library.wardrobeAssets.map((w) => w.id));
  const poseIds = sortIds(library.poses.map((p) => p.id));

  // Create a combined string block of all sorted IDs.
  // We explicitly include the library.version to guarantee that intentional
  // version bumps produce unique signatures even if content temporarily hasn't changed.
  const payload = [
    `version:${library.version}`,
    `bodies:${bodyIds.join(",")}`,
    `headFamilies:${headFamilyIds.join(",")}`,
    `headAssets:${headAssetIds.join(",")}`,
    `hairFamilies:${hairFamilyIds.join(",")}`,
    `hairAssets:${hairAssetIds.join(",")}`,
    `facialHairFamilies:${facialHairFamilyIds.join(",")}`,
    `facialHairAssets:${facialHairAssetIds.join(",")}`,
    `complexions:${complexionIds.join(",")}`,
    `accessories:${accessoryIds.join(",")}`,
    `wardrobes:${wardrobeIds.join(",")}`,
    `poses:${poseIds.join(",")}`,
  ].join("|");

  return `sig_${fnv1a(payload).toString(16)}`;
}
