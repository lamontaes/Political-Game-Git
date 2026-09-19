import manifest from "../../art/manifest/asset_manifest.json";
import { repositoryVisualUrls } from "../presentation/visual-integration";
import { artPreviewMode } from "../presentation/art-preview";
import { gameBuildProfile } from "../presentation/build-profile";

const urls = repositoryVisualUrls();

/** An information illustration, never a location, presence or release grant.
 * The existing manifest owns identity and the existing URL index owns bytes. */
export function candidateEstablishingPlate(assetId: string) {
  if (
    artPreviewMode(
      typeof window === "undefined" ? "" : window.location.search,
      {
        development: import.meta.env.DEV,
        profile: gameBuildProfile(),
      },
    ) !== "candidate-review"
  )
    return null;
  const asset = manifest.assets.find((row) => row.asset_id === assetId);
  if (
    !asset ||
    asset.asset_type !== "environment-plate" ||
    asset.generation_status === "rejected" ||
    asset.qa_status === "rejected" ||
    !asset.final_path ||
    !asset.hash
  )
    return null;
  const url = urls[asset.final_path];
  const native = asset.raster_tiers?.at(-1);
  return url && native
    ? {
        assetId,
        url,
        width: native.width,
        height: native.height,
        hash: asset.hash,
      }
    : null;
}
