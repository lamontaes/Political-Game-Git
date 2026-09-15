import fit from "../../art/manifest/character_candidate_visual4_fit.json";
import {
  KIT41_REGISTRY as kit,
  MODULAR41_HEADS_REGISTRY as headRepair,
  candidateGenerations,
  candidateRegistry,
} from "./private-candidate-manifests";
import {
  eligible,
  lifted as frozen,
  PEOPLE_VISUAL4_CHARACTER_LIBRARY,
  PEOPLE_VISUAL4_VISUAL_LIBRARY,
} from "./people-visual4-review";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  type CharacterComponentManifestRecord,
} from "./character-components";
import { createGarmentFitBank, type GarmentFitBankData } from "./garment-fit";
import { createRuntimeVisualLibrary } from "./visual-integration";
import { indexPoseArt } from "./pose-families";
import { optionalGlob } from "./optional-glob";
const data = candidateRegistry("engine29");
const refinement = candidateRegistry("engine34");
const painted = candidateRegistry("engine35");
const painted36 = candidateRegistry("engine36");
const audience40 = candidateRegistry("engine40");
const standing41 = candidateRegistry("engine41");
// Existing review-only lift, called only by the explicitly gated candidate provider.
// Input manifests remain draft/pending/unreleased; the production registry is untouched.
const review = liftCandidatesForReview(
  [
    ...eligible,
    ...(headRepair.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(kit.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(data.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(refinement.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(painted.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(painted36.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(audience40.assets as unknown as readonly CharacterComponentManifestRecord[]),
    ...(standing41.assets as unknown as readonly CharacterComponentManifestRecord[]),
  ],
  frozen.catalog.slots,
  {
    frozenGenerations: [
      ...frozen.catalog.generations,
      ...candidateGenerations("engine41"),
      ...headRepair.generations,
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
export const ENGINE_PEOPLE29_CHARACTER_LIBRARY =
  createCharacterComponentLibrary(
    review.records,
    review.catalog,
    createGarmentFitBank({
      ...fit,
      garments: [
        ...fit.garments,
        ...kit.garments,
        ...data.garments,
        ...refinement.garments,
        ...painted.garments,
        ...painted36.garments,
        ...audience40.garments,
        ...standing41.garments,
      ],
    } as GarmentFitBankData),
    PEOPLE_VISUAL4_CHARACTER_LIBRARY.skinTone,
  );
const urls = optionalGlob(() =>
  import.meta.glob<string>(
    [
      "../../art/generated/candidates/kit41/*.svg",
      "../../art/generated/candidates/engine-people29/*.svg",
      "../../art/generated/candidates/engine-people34/*.svg",
      "../../art/generated/candidates/engine-people35/*.svg",
      "../../art/generated/candidates/engine-people36/*.svg",
      "../../art/generated/candidates/engine-people40/*.svg",
      "../../art/generated/candidates/engine-people41/*.svg",
    ],
    { eager: true, query: "?url", import: "default" },
  ),
);
export const ENGINE_PEOPLE29_VISUAL_LIBRARY = new Map([
  ...PEOPLE_VISUAL4_VISUAL_LIBRARY,
  ...createRuntimeVisualLibrary(
    review.records.filter(
      (r) =>
        r.asset_id.startsWith("kit41-") ||
        /^ep(29|34|35|36|40|41)-/.test(r.asset_id),
    ),
    Object.fromEntries(
      Object.entries(urls).map(([p, u]) => [p.replace(/^\.\.\/\.\.\//, ""), u]),
    ),
  ),
]);
export const ENGINE_PEOPLE29_POSE_ART = indexPoseArt(review.records);
