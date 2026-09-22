import { componentUrls as urls } from "./bundled-art";
import catalog from "../../art/manifest/character_catalog.json";
import garmentFitProfiles from "../../art/manifest/garment_fit_profiles.json";
import {
  KIT41_REGISTRY as kit,
  MODULAR41_HEADS_REGISTRY as headRepair,
  MODULAR45_REGISTRY as modular45,
  candidateGenerations,
  candidateRegistry,
} from "./private-candidate-manifests";
import type { CharacterCatalogData } from "./character-components";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  type CharacterComponentManifestRecord,
  type CharacterComponentLibrary,
} from "./character-components";
import { createGarmentFitBank, type GarmentFitBankData } from "./garment-fit";
import { createRuntimeVisualLibrary } from "./visual-integration";
import { indexPoseArt } from "./pose-families";
import { runtimeArtUrls } from "./runtime-art";
const data = candidateRegistry("engine29");
const refinement = candidateRegistry("engine34");
const painted = candidateRegistry("engine35");
const painted36 = candidateRegistry("engine36");
const audience40 = candidateRegistry("engine40");
const standing41 = candidateRegistry("engine41");
// Existing review-only lift, called only by the explicitly gated candidate provider.
// Input manifests remain draft/pending/unreleased; the production registry is untouched.
// Invalid candidate input refuses candidate people while keeping saves and the
// shell available. Never substitute another catalog's person after validation fails.
//
// The retired Visual4 cast used to supply the slots, the fit bank's base and a
// skin-tone table. It is permanently removed, so the slots come from the
// production catalog they were always read from, the base fit comes from the
// production garment profiles, and there is no skin-tone table — production
// composes without one too. MODULAR45 is unaffected by that removal and stays.
const loaded = (() => {
  try {
    const review = liftCandidatesForReview(
      [
        ...(headRepair.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(modular45.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(kit.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(data.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(refinement.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(painted.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(painted36.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(audience40.assets as unknown as readonly CharacterComponentManifestRecord[]),
        ...(standing41.assets as unknown as readonly CharacterComponentManifestRecord[]),
      ],
      (catalog as CharacterCatalogData).slots,
      {
        frozenGenerations: [
          ...candidateGenerations("engine41"),
          ...headRepair.generations,
          ...modular45.generations,
          ...kit.generations,
          ...candidateGenerations(
            "engine29",
            "engine34",
            "engine35",
            "engine36",
            "engine40",
          ),
        ],
      },
    );
    const library = createCharacterComponentLibrary(
      review.records,
      {
        ...review.catalog,
        prepared_profiles: modular45.preparedProfiles,
        profile_layer_changes: modular45.profileLayerChanges,
      },
      createGarmentFitBank({
        ...garmentFitProfiles,
        garments: [
          ...kit.garments,
          ...data.garments,
          ...refinement.garments,
          ...painted.garments,
          ...painted36.garments,
          ...audience40.garments,
          ...standing41.garments,
          ...modular45.garments,
        ],
      } as GarmentFitBankData),
    );
    return { review, library, inputError: null };
  } catch (error) {
    const library: CharacterComponentLibrary = {
      catalogGeneration: 0,
      slots: (catalog as CharacterCatalogData).slots,
      generations: [],
      components: new Map(),
      fit: null,
      skinTone: null,
    };
    return {
      review: { records: [] as CharacterComponentManifestRecord[] },
      library,
      inputError: `Character artwork unavailable: the installed candidate library is invalid (${error instanceof Error ? error.message : String(error)}).`,
    };
  }
})();
const review = loaded.review;
export const ENGINE_PEOPLE29_CHARACTER_LIBRARY = loaded.library;
export const ENGINE_PEOPLE29_INPUT_ERROR = loaded.inputError;

export const ENGINE_PEOPLE29_VISUAL_LIBRARY = new Map([
  ...createRuntimeVisualLibrary(
    review.records.filter(
      (r) =>
        r.asset_id.startsWith("kit41-") ||
        /^ep(29|34|35|36|40|41)-/.test(r.asset_id) ||
        modular45.assets.some((asset) => asset.asset_id === r.asset_id),
    ),
    {
      ...Object.fromEntries(
        Object.entries(urls).map(([p, u]) => [
          p.replace(/^\.\.\/\.\.\//, ""),
          u,
        ]),
      ),
      ...runtimeArtUrls(),
    },
  ),
]);
export const ENGINE_PEOPLE29_POSE_ART = indexPoseArt(review.records);
