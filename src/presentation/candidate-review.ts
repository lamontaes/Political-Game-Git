import assetManifest from "../../art/manifest/asset_manifest.json";
import candidateRegistry from "../../art/manifest/character_candidate_registry.json";
import characterCatalog from "../../art/manifest/character_catalog.json";
import { derivePersonAppearance } from "../simulation/person-appearance";
import type { PersonAppearance } from "../simulation/person-appearance";
import {
  liftCandidatesForReview,
  createCharacterComponentLibrary,
  resolveCharacterRecipe,
  validateCharacterComponentCandidates,
  type CharacterCatalogData,
  type CharacterComponentLibrary,
  type CharacterComponentManifestRecord,
  type CharacterRecipe,
} from "./character-components";
import {
  buildCharacterRenderPlan,
  type CharacterRenderPlan,
  type ModularSceneAnchor,
} from "./character-render-plan";
import type { SceneSize } from "./scene-transform";
import {
  createRuntimeVisualLibrary,
  repositoryVisualUrls,
  type RuntimeVisualAssetRecord,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/**
 * Candidate REVIEW admission.
 *
 * `art/manifest/character_candidate_registry.json` holds the Wave A bodies that
 * `npm run admit:wave-a-candidates` measured and admitted. This module is the
 * only thing that reads it, and everything it builds is a review surface:
 *
 * - the registry is a SEPARATE FILE from `asset_manifest.json`, so the
 *   production library cannot see a Wave A body even by accident;
 * - every record in it is a `character-component-candidate`, held unreleased;
 * - the review library is lifted through the accepted `liftCandidatesForReview`
 *   into a throwaway ledger that is written back nowhere.
 *
 * What the reviewer gets is the REAL pipeline: the accepted recipe resolver,
 * the accepted projection, the accepted render plan, the accepted scene
 * transform. Nothing about a person is drawn by a second compositor written for
 * review, because then the review would be of the second compositor.
 */

export const WAVE_A_CANDIDATE_RECORDS =
  candidateRegistry.assets as readonly CharacterComponentManifestRecord[];

const CATALOG = characterCatalog as CharacterCatalogData;

/**
 * Structural check, run at module load rather than only in a test.
 *
 * The registry is generated, and a generator can be wrong. If a record in it
 * ever stops being an honest candidate — released, promoted, carrying a catalog
 * generation — this throws where it is imported instead of quietly composing a
 * candidate as production art.
 */
const registryErrors = validateCharacterComponentCandidates(
  WAVE_A_CANDIDATE_RECORDS,
);
if (registryErrors.length > 0) {
  throw new Error(
    `Candidate registry is not a candidate registry:\n${registryErrors.join("\n")}`,
  );
}

/**
 * The review pool is the WHOLE banked candidate set: the pg-modular parts that
 * were already banked, plus the Wave A bodies admitted here.
 *
 * Reviewing the Wave A bodies against an empty library would answer the wrong
 * question. "No head exists anywhere" is trivially true of a library holding
 * nothing but bodies; what a promotion decision needs to know is that heads DO
 * exist and none of them declares a Wave A morphology. Pooling them makes the
 * refusal say that, and lets the same surface show the two pg bodies finishing
 * a complete person beside the twelve that cannot yet.
 */
const CANDIDATE_POOL_RECORDS: readonly CharacterComponentManifestRecord[] = [
  ...(
    assetManifest.assets as readonly CharacterComponentManifestRecord[]
  ).filter((record) => record.asset_type === "character-component-candidate"),
  ...WAVE_A_CANDIDATE_RECORDS,
];

const waveAReview = liftCandidatesForReview(
  CANDIDATE_POOL_RECORDS,
  CATALOG.slots,
);

/**
 * DEVELOPMENT ONLY. The admitted Wave A bodies, composed so a person can look
 * at them at gameplay scale in the accepted scene transform.
 *
 * Unfitted, like every candidate review: no fit profile exists for a Wave A
 * morphology, and a profile is derived from two measured silhouettes rather
 * than assumed. A garment that has never been measured against one of these
 * bodies is refused, not stretched onto it.
 */
export const WAVE_A_REVIEW_CHARACTER_LIBRARY = createCharacterComponentLibrary(
  waveAReview.records,
  waveAReview.catalog,
);

export const WAVE_A_REVIEW_VISUAL_LIBRARY = createRuntimeVisualLibrary(
  waveAReview.records as readonly RuntimeVisualAssetRecord[],
  repositoryVisualUrls(),
);

// ---------------------------------------------------------------------------
// What the library can and cannot finish
// ---------------------------------------------------------------------------

export interface CandidateSlotAvailability {
  readonly slotId: string;
  readonly kind: string;
  readonly required: boolean;
  /** Component IDs this body family and pose could actually wear. */
  readonly compatible: readonly string[];
  /** Why nothing is compatible, in the contract's own terms. Null when some is. */
  readonly refusal: string | null;
}

export interface CandidateBodyReview {
  readonly assetId: string;
  readonly family: string;
  readonly poseFamily: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly slots: readonly CandidateSlotAvailability[];
  /** True only when every required slot has at least one compatible component. */
  readonly completable: boolean;
}

/**
 * What each catalog slot could put on one admitted body, asked of the library
 * rather than assumed from the art.
 *
 * A slot is compatible when a component of its kind declares this body family
 * AND this pose family. That is the same test `resolveCharacterRecipe` applies,
 * so a slot reported compatible here is a slot the resolver will fill, and a
 * refusal here is the exact reason the resolver leaves it empty.
 */
export function reviewCandidateBody(
  library: CharacterComponentLibrary,
  assetId: string,
): CandidateBodyReview {
  const body = library.components.get(assetId);
  if (!body || body.definition.kind !== "body") {
    throw new Error(`'${assetId}' is not a body in this review library.`);
  }
  const bodyFamily = body.definition.family;
  const poseFamily = body.definition.pose_family ?? "";
  const headOrientation = body.definition.head_orientation ?? "";
  const anchorIds = new Set(
    (body.definition.attachment_anchors ?? []).map((anchor) => anchor.id),
  );

  const slots = library.slots
    .filter((slot) => slot.kind !== "body")
    .map((slot): CandidateSlotAvailability => {
      const ofKind = [...library.components.values()].filter(
        (component) => component.definition.kind === slot.kind,
      );
      const forBody = ofKind.filter(
        (component) =>
          component.definition.compatible_body_families === undefined ||
          component.definition.compatible_body_families.includes(bodyFamily),
      );
      const forPose = forBody.filter(
        (component) =>
          component.definition.compatible_pose_families === undefined ||
          component.definition.compatible_pose_families.includes(poseFamily),
      );
      const forFacing = forPose.filter(
        (component) =>
          component.definition.compatible_head_orientations === undefined ||
          component.definition.compatible_head_orientations.includes(
            headOrientation,
          ),
      );
      const attachable = forFacing.filter(
        (component) =>
          component.definition.attaches_to === undefined ||
          anchorIds.has(component.definition.attaches_to),
      );

      let refusal: string | null = null;
      if (attachable.length === 0) {
        if (ofKind.length === 0) {
          refusal = `No ${slot.kind} component exists in this review library at all.`;
        } else if (forBody.length === 0) {
          refusal = `No ${slot.kind} declares body family '${bodyFamily}' as compatible: the art has never been drawn for this morphology.`;
        } else if (forPose.length === 0) {
          refusal = `No ${slot.kind} for this body declares pose family '${poseFamily}'.`;
        } else if (forFacing.length === 0) {
          refusal = `No ${slot.kind} for this body and pose is drawn facing '${headOrientation}'.`;
        } else {
          const wanted = [
            ...new Set(
              forFacing.map(
                (component) => component.definition.attaches_to ?? "?",
              ),
            ),
          ].sort();
          refusal = `Every candidate ${slot.kind} attaches to an anchor this body does not declare (${wanted.join(", ")}); the measured silhouette carries ${[...anchorIds].sort().join(", ")}.`;
        }
      }

      return {
        slotId: slot.slot_id,
        kind: slot.kind,
        required: slot.required,
        compatible: attachable.map((component) => component.assetId).sort(),
        refusal,
      };
    });

  return {
    assetId,
    family: bodyFamily,
    poseFamily,
    canvas: body.definition.canvas,
    slots,
    completable: slots
      .filter((slot) => slot.required)
      .every((slot) => slot.compatible.length > 0),
  };
}

export function reviewLibraryBodies(
  library: CharacterComponentLibrary,
): readonly CandidateBodyReview[] {
  return [...library.components.values()]
    .filter((component) => component.definition.kind === "body")
    .map((component) => reviewCandidateBody(library, component.assetId))
    .sort((a, b) => (a.assetId < b.assetId ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Selecting a body without inventing an appearance
// ---------------------------------------------------------------------------

export const CANDIDATE_REVIEW_PERSON_PREFIX = "review-subject";

/**
 * Finds the review appearance that resolves to a given body ASSET.
 *
 * A reviewer wants to look at ONE body. Identity, though, is owned by the
 * person and derived from their id — there is no "render this asset" entry
 * point, and adding one would be a second selection path that could disagree
 * with the real one. So this searches the real one: it walks deterministic
 * review person ids through the accepted `derivePersonAppearance` and the
 * accepted resolver until an identity lands on the wanted family.
 *
 * The result is stable for a given library, and the appearance it returns is an
 * ordinary appearance: nothing downstream can tell it was chosen by search.
 */
export function findReviewAppearanceForBody(
  library: CharacterComponentLibrary,
  bodyAssetId: string,
  poseFamily: string,
  limit = 4096,
): PersonAppearance | null {
  for (let index = 0; index < limit; index += 1) {
    const appearance = derivePersonAppearance(
      `${CANDIDATE_REVIEW_PERSON_PREFIX}-${index}`,
    );
    const recipe = resolveCharacterRecipe(
      {
        appearance,
        poseFamily,
        unresolvableRequiredSlots: "diagnose",
      },
      library,
    );
    const resolvedBody = recipe.context.components.find(
      (component) => component.kind === "body",
    );
    if (resolvedBody?.assetId === bodyAssetId) return appearance;
  }
  return null;
}

export interface CandidateReviewSubject {
  readonly personId: string;
  readonly appearance: PersonAppearance;
  readonly recipe: CharacterRecipe;
  readonly plan: CharacterRenderPlan;
  readonly review: CandidateBodyReview;
  readonly placement: ReviewPlacement;
}

export function composeCandidateReviewSubject(options: {
  readonly library: CharacterComponentLibrary;
  readonly visualLibrary: RuntimeVisualLibrary;
  readonly bodyAssetId: string;
  readonly plate: SceneSize;
  /** Horizontal position on the plate; the vertical one is computed. */
  readonly xPercent?: number;
  readonly anchorId?: string;
}): CandidateReviewSubject | null {
  const { library, visualLibrary, bodyAssetId, plate } = options;
  const review = reviewCandidateBody(library, bodyAssetId);
  const placement = reviewPlacementFor(
    library,
    bodyAssetId,
    plate,
    options.xPercent ?? 50,
    CANDIDATE_REVIEW_FLOOR_Y_PERCENT,
    options.anchorId ?? "review-anchor",
  );
  const appearance = findReviewAppearanceForBody(
    library,
    bodyAssetId,
    placement.anchor.poseFamily,
  );
  if (!appearance) return null;
  const personId = `${CANDIDATE_REVIEW_PERSON_PREFIX}:${bodyAssetId}`;
  const plan = buildCharacterRenderPlan({
    personId,
    appearance,
    anchor: placement.anchor,
    plate,
    library,
    visualLibrary,
    unresolvableRequiredSlots: "diagnose",
  });
  const recipe = resolveCharacterRecipe(
    {
      appearance,
      poseFamily: placement.anchor.poseFamily,
      unresolvableRequiredSlots: "diagnose",
    },
    library,
  );
  return { personId, appearance, recipe, plan, review, placement };
}

// ---------------------------------------------------------------------------
// Review placement
// ---------------------------------------------------------------------------

/**
 * Where an admitted body stands or sits for review.
 *
 * These reuse the developer proof's plate, camera and body width, so a Wave A
 * body is painted at the SAME scale a person is painted at in the office: the
 * point of showing it is to see how big it really is, and a review-only scale
 * would answer a question nobody asked. The seated anchor is a guest seat
 * rather than the desk, because `seated-guest-neutral` is the family the
 * propless seated crops were admitted to.
 */
export const CANDIDATE_REVIEW_PLATE: SceneSize = { width: 1024, height: 572 };

export const CANDIDATE_REVIEW_BODY_WIDTH_PERCENT = 20;

export function reviewAnchorFor(
  poseFamily: string,
  id = "review-anchor",
  xPercent = 50,
): ModularSceneAnchor {
  const seated = poseFamily.startsWith("seated");
  return {
    id,
    xPercent,
    yPercent: seated ? 66 : 62,
    scale: 1,
    poseFamily,
    depth: 2,
    bodyWidthPercent: CANDIDATE_REVIEW_BODY_WIDTH_PERCENT,
  };
}

/**
 * The review floor line, in plate percent.
 *
 * It is a REVIEW CONSTANT and not a calibrated scene floor. The developer proof
 * stage has no plate and therefore no floor calibration, so nothing here can
 * claim a body is standing on the office floor. What it can do — and what the
 * number is for — is put the body's OWN MEASURED SOLE on one declared line, so
 * two morphologies of different heights stand on the same ground and the
 * reviewer is comparing bodies rather than comparing placements.
 */
export const CANDIDATE_REVIEW_FLOOR_Y_PERCENT = 92;

export type ReviewPlacementBasis = "measured-foot-contact" | "rig-root";

export interface ReviewPlacement {
  readonly anchor: ModularSceneAnchor;
  readonly basis: ReviewPlacementBasis;
  /** Why contact placement was unavailable, when it was. */
  readonly note: string | null;
}

/**
 * Places a body by the contact it actually declares.
 *
 * The accepted contract is that a scene owns the floor line and a body owns the
 * points that must land on it. This computes the anchor from those two: given
 * where the sole is in the body canvas and how tall the canvas paints on this
 * plate, there is exactly one root position that puts the sole on the line. No
 * per-body number is tuned by eye.
 *
 * A body that declares no contacts is not nudged into looking right. It falls
 * back to root placement and says so, because a body whose feet were never
 * measured is a body nobody can promise is standing on anything.
 */
export function reviewPlacementFor(
  library: CharacterComponentLibrary,
  bodyAssetId: string,
  plate: SceneSize,
  xPercent = 50,
  floorYPercent = CANDIDATE_REVIEW_FLOOR_Y_PERCENT,
  id = "review-anchor",
): ReviewPlacement {
  const body = library.components.get(bodyAssetId);
  if (!body || body.definition.kind !== "body") {
    throw new Error(`'${bodyAssetId}' is not a body in this review library.`);
  }
  const poseFamily = body.definition.pose_family ?? "";
  const base = reviewAnchorFor(poseFamily, id, xPercent);
  const contacts = body.definition.contacts;
  const root = body.definition.root;
  const sole = contacts?.leftFoot ?? contacts?.rightFoot;
  if (!sole || !root) {
    return {
      anchor: base,
      basis: "rig-root",
      note: contacts
        ? `'${bodyAssetId}' declares no rig root, so its sole cannot be placed on a floor line.`
        : `'${bodyAssetId}' declares no foot contacts — the sole band did not resolve two feet — so it is placed by its rig root and its ground contact is unverified.`,
    };
  }
  const canvas = body.definition.canvas;
  const widthPercent = base.bodyWidthPercent * base.scale;
  const heightPercent =
    (widthPercent / (canvas.width / canvas.height)) *
    (plate.width / plate.height);
  return {
    anchor: {
      ...base,
      yPercent: floorYPercent - (sole.y - root.y) * heightPercent,
    },
    basis: "measured-foot-contact",
    note: null,
  };
}

export interface AdmittedCandidateBody {
  readonly assetId: string;
  readonly family: string;
  readonly poseFamily: string;
}

/** Asset ids admitted by this job, as opposed to previously banked ones. */
export const WAVE_A_ADMITTED_ASSET_IDS: ReadonlySet<string> = new Set(
  WAVE_A_CANDIDATE_RECORDS.map((record) => record.asset_id),
);

/** Every reviewable candidate body, in a stable review order: family, then pose. */
export function admittedCandidateBodies(
  library: CharacterComponentLibrary = WAVE_A_REVIEW_CHARACTER_LIBRARY,
): readonly AdmittedCandidateBody[] {
  return [...library.components.values()]
    .filter((component) => component.definition.kind === "body")
    .map((component) => ({
      assetId: component.assetId,
      family: component.definition.family,
      poseFamily: component.definition.pose_family ?? "",
    }))
    .sort((a, b) =>
      a.family === b.family
        ? a.assetId < b.assetId
          ? -1
          : 1
        : a.family < b.family
          ? -1
          : 1,
    );
}
