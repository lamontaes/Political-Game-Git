import { runtimeArtMetadata } from "../presentation/runtime-art";
import bundledManifest from "../../art/manifest/asset_manifest.json";
import { repositoryVisualUrls } from "../presentation/visual-integration";
import { artPreviewMode } from "../presentation/art-preview";
import { gameBuildProfile } from "../presentation/build-profile";

const manifest = runtimeArtMetadata(
  "art/manifest/asset_manifest.json",
  bundledManifest,
);
const urls = repositoryVisualUrls();

interface EncodedPreviewRaster {
  readonly width: number;
  readonly height: number;
  readonly hash: string;
  readonly nativeDetailState: "unverified";
}

/** An information illustration, never a location, presence or release grant.
 * The existing manifest owns identity and the existing URL index owns bytes. */
export function candidateEstablishingPlate(
  assetId: string,
  previewRaster?: EncodedPreviewRaster,
) {
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
  if (
    previewRaster &&
    (previewRaster.hash !== asset.hash ||
      previewRaster.nativeDetailState !== "unverified" ||
      !Number.isInteger(previewRaster.width) ||
      !Number.isInteger(previewRaster.height) ||
      previewRaster.width <= 0 ||
      previewRaster.height <= 0)
  )
    return null;
  const url = urls[asset.final_path];
  // A reviewed descriptor may record encoded dimensions without pretending
  // that an owner return is a native master or synthesizing a raster tier.
  const raster = asset.raster_tiers?.at(-1) ?? previewRaster;
  return url && raster
    ? {
        assetId,
        url,
        width: raster.width,
        height: raster.height,
        hash: asset.hash,
      }
    : null;
}
