import { indexPoseArt } from "./pose-families";
import registry from "../../art/manifest/character_candidate_visual4_registry.json";
import hairRegistry from "../../art/manifest/character_candidate_visual4_hair_registry.json";
import fitData from "../../art/manifest/character_candidate_visual4_fit.json";
import catalog from "../../art/manifest/character_catalog.json";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  validateCharacterComponentCandidates,
  type CharacterComponentManifestRecord,
  type CharacterCatalogData,
} from "./character-components";
import { createGarmentFitBank, type GarmentFitBankData } from "./garment-fit";
import {
  createRuntimeVisualLibrary,
  repositoryVisualUrls,
  type RuntimeVisualAssetRecord,
} from "./visual-integration";

/** Explicit review-only composition. No production catalog or normal player import. */
export const PEOPLE_VISUAL4_RECORDS = [
  ...registry.assets,
  ...hairRegistry.assets,
] as readonly CharacterComponentManifestRecord[];
const errors = validateCharacterComponentCandidates(PEOPLE_VISUAL4_RECORDS);
if (errors.length) throw new Error(errors.join("\n"));
// Noncomposable candidates remain banked in the registry/evidence, not silently
// eligible choices. An empty compatibility list is a measured refusal.
const eligible = PEOPLE_VISUAL4_RECORDS.filter(
  (r) =>
    r.candidate_component?.kind === "body" ||
    (r.candidate_component?.compatible_body_families?.length ?? 0) > 0 ||
    ((r.candidate_component?.kind === "hair-front" ||
      r.candidate_component?.kind === "hair-back") &&
      (r.candidate_component?.compatible_head_families?.some((family) =>
        registry.assets.some(
          (head) =>
            head.candidate_component.kind === "head" &&
            head.candidate_component.family === family,
        ),
      ) ??
        false)),
);
const lifted = liftCandidatesForReview(
  eligible,
  (catalog as CharacterCatalogData).slots,
);
export const PEOPLE_VISUAL4_CHARACTER_LIBRARY = createCharacterComponentLibrary(
  lifted.records,
  lifted.catalog,
  createGarmentFitBank(fitData as GarmentFitBankData),
);
export const PEOPLE_VISUAL4_VISUAL_LIBRARY = createRuntimeVisualLibrary(
  lifted.records as readonly RuntimeVisualAssetRecord[],
  repositoryVisualUrls(),
);

export const PEOPLE_VISUAL4_POSE_ART = indexPoseArt(lifted.records);
