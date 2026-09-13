import { indexPoseArt } from "./pose-families";
import matchedRegistry from "../../art/manifest/character_candidate_matched_registry.json";
import coherenceRegistry from "../../art/manifest/character_candidate_coherence_registry.json";
import registry from "../../art/manifest/character_candidate_visual4_registry.json";
import hairRegistry from "../../art/manifest/character_candidate_visual4_hair_registry.json";
import fitData from "../../art/manifest/character_candidate_visual4_fit.json";
import catalog from "../../art/manifest/character_catalog.json";
import generations from "../../art/manifest/character_candidate_visual4_generations.json";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  validateCharacterComponentCandidates,
  type CharacterComponentManifestRecord,
  type CharacterCatalogData,
} from "./character-components";
import { createGarmentFitBank, type GarmentFitBankData } from "./garment-fit";
import toneData from "../../art/manifest/character_candidate_visual4_tone.json";
import type { SkinTone } from "./character-components";
import {
  createRuntimeVisualLibrary,
  repositoryVisualUrls,
  type RuntimeVisualAssetRecord,
} from "./visual-integration";

/** Explicit review-only composition. No production catalog or normal player import. */
export const PEOPLE_VISUAL4_RECORDS = [
  ...registry.assets,
  ...hairRegistry.assets,
  ...coherenceRegistry.assets,
  ...matchedRegistry.assets,
] as readonly CharacterComponentManifestRecord[];
const errors = validateCharacterComponentCandidates(PEOPLE_VISUAL4_RECORDS);
if (errors.length) throw new Error(errors.join("\n"));

/**
 * Which body families anything in this bank can actually dress.
 *
 * The rule below already says it for garments and hair: a part nothing can be
 * combined with is a measured refusal, not a silently eligible choice. It was
 * applied to everything EXCEPT bodies, and a body is the one part that decides
 * whether a person exists at all — so an undressable body stayed selectable and
 * the resolver kept handing identities to it. Measured on this bank, six of
 * eleven body families have no declared top, bottom or footwear between them,
 * and a person whose seed landed on one resolved no complete recipe: the body
 * refused, and `head`, `top`, `bottom` and `footwear` all reported empty behind
 * it. Fifteen of twenty-four seeded people composed nothing for that reason.
 *
 * Required-slot coverage is read from the registry's own declared
 * compatibility, which was checked against the measured per-body fit profiles
 * in `character_candidate_visual4_fit.json` before this was written: every
 * measured (garment, body) pair is already declared, so there is no metadata
 * gap being papered over here. The excluded families are short of PIXELS, not
 * of bookkeeping, and `PEOPLE_VISUAL4_UNDRESSABLE_BODIES` names them with what
 * each one is missing so the gap is reported rather than absorbed.
 *
 * Excluded bodies stay banked in the registry and in evidence, exactly as the
 * garment rule intends. Nothing here promotes anything, and a family becomes
 * selectable again the moment art declares it.
 */
const REQUIRED_GARMENT_KINDS = ["top", "bottom", "footwear"] as const;

function dressableBodyFamilies(): {
  readonly dressable: ReadonlySet<string>;
  readonly refusals: readonly {
    readonly family: string;
    readonly missing: readonly string[];
  }[];
} {
  const covered = new Map<string, Set<string>>();
  for (const record of registry.assets) {
    const component = record.candidate_component;
    if (
      !component ||
      !(REQUIRED_GARMENT_KINDS as readonly string[]).includes(component.kind)
    )
      continue;
    for (const family of component.compatible_body_families ?? []) {
      if (!covered.has(family)) covered.set(family, new Set());
      covered.get(family)!.add(component.kind);
    }
  }
  const dressable = new Set<string>();
  const refusals: { family: string; missing: string[] }[] = [];
  for (const record of registry.assets) {
    const component = record.candidate_component;
    if (component?.kind !== "body") continue;
    const have = covered.get(component.family) ?? new Set<string>();
    const missing = REQUIRED_GARMENT_KINDS.filter((kind) => !have.has(kind));
    if (missing.length === 0) dressable.add(component.family);
    else refusals.push({ family: component.family, missing });
  }
  return { dressable, refusals };
}

const bodyCoverage = dressableBodyFamilies();

/**
 * The banked bodies no complete person can be built from, and what each lacks.
 *
 * Exported so the gap is a thing callers and reports can read and state
 * exactly, rather than a silence. This is the asset request, in the bank's own
 * terms: these families need those garment kinds drawn and fitted.
 */
export const PEOPLE_VISUAL4_UNDRESSABLE_BODIES = bodyCoverage.refusals;

// Noncomposable candidates remain banked in the registry/evidence, not silently
// eligible choices. An empty compatibility list is a measured refusal.
const eligible = PEOPLE_VISUAL4_RECORDS.filter(
  (r) =>
    (r.candidate_component?.kind === "body" &&
      bodyCoverage.dressable.has(r.candidate_component.family)) ||
    (r.candidate_component?.kind !== "body" &&
      (r.candidate_component?.compatible_body_families?.length ?? 0) > 0) ||
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
  { frozenGenerations: generations.generations },
);
/**
 * Measured skin tone, so appearance recipe v2 can keep a face and its body in
 * the same skin. Read from the committed measurement rather than from any
 * family name; see `scripts/art-asset-factory/people-visual4-tone.ts`.
 */
const PEOPLE_VISUAL4_SKIN_TONE: ReadonlyMap<string, SkinTone> = new Map(
  (toneData as { tones: { family: string; rgb: SkinTone }[] }).tones.map(
    (entry) => [entry.family, entry.rgb],
  ),
);

export const PEOPLE_VISUAL4_CHARACTER_LIBRARY = createCharacterComponentLibrary(
  lifted.records,
  lifted.catalog,
  createGarmentFitBank(fitData as GarmentFitBankData),
  PEOPLE_VISUAL4_SKIN_TONE,
);
export const PEOPLE_VISUAL4_VISUAL_LIBRARY = createRuntimeVisualLibrary(
  lifted.records as readonly RuntimeVisualAssetRecord[],
  repositoryVisualUrls(),
);

export const PEOPLE_VISUAL4_POSE_ART = indexPoseArt(lifted.records);
