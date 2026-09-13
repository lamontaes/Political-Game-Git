import manifest from "../../art/manifest/asset_manifest.json";
import {
  createRuntimeVisualLibrary,
  PRODUCTION_VISUAL_LIBRARY,
  repositoryVisualUrls,
  type RuntimeVisualAssetRecord,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/** Finite in-memory lift. No manifest writes, release promotion or access grant. */
export const LOCATION_REVIEW_ASSET_IDS = [
  "env_campaign_storefront_5504x3072_v1",
  "env_park_community_pavilion_candidate_5504x3072_v1",
  "env_press_briefing_room_candidate_v1",
] as const;

export function locationReviewVisuals(
  development: boolean,
): RuntimeVisualLibrary {
  if (!development) return PRODUCTION_VISUAL_LIBRARY;
  const records = (manifest.assets as readonly RuntimeVisualAssetRecord[])
    .filter((record) =>
      LOCATION_REVIEW_ASSET_IDS.some((id) => id === record.asset_id),
    )
    .map((record) => ({
      ...record,
      generation_status: "approved" as const,
      qa_status: "approved" as const,
      runtime_release_status: "released" as const,
    }));
  return new Map([
    ...PRODUCTION_VISUAL_LIBRARY,
    ...createRuntimeVisualLibrary(records, repositoryVisualUrls()),
  ]);
}
