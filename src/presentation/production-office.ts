import assetManifest from "../../art/manifest/asset_manifest.json";
import characterCatalog from "../../art/manifest/character_catalog.json";
import { derivePersonAppearance } from "../simulation/person-appearance";
import {
  createCharacterComponentLibrary,
  type CharacterCatalogData,
  type CharacterComponentLibrary,
  type CharacterComponentManifestRecord,
} from "./character-components";
import {
  buildCharacterRenderPlan,
  type CharacterRenderPlan,
} from "./character-render-plan";
import {
  PRODUCTION_OFFICE_SCENE_ID,
  requireScene,
  SCENE_REGISTRY,
  type RegisteredScene,
} from "./scene-registry";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";

/**
 * THE PRODUCTION OFFICE.
 *
 * This module exists to keep one promise: a production scene is composed from
 * production art or it is composed from nothing. The development fixture route
 * is welcome to draw its two authored sitters; this one may not borrow them,
 * and it may not borrow the DEV fixture component bank either.
 *
 * The distinction is not cosmetic. The office review kept judging the fixture's
 * two legacy figures as though they were the game's people, because the only
 * office surface that existed drew exactly those. Separating the paths is what
 * makes the question "is the production art good?" answerable at all.
 */

export const PRODUCTION_OFFICE_SCENE: RegisteredScene = requireScene(
  SCENE_REGISTRY,
  PRODUCTION_OFFICE_SCENE_ID,
);

/**
 * The component library a production scene is allowed to see.
 *
 * `PRODUCTION_CHARACTER_LIBRARY` contains 46 DEV fixture components, and
 * `componentsAtGeneration` will happily hand them out while no released
 * production component of the same kind exists. That fallback is correct for
 * the fixture routes and wrong here: drawing a development mannequin on a
 * production plate is the silent substitution this packet forbids.
 *
 * So this library is filtered to components that are NOT development fixtures.
 * Today that set is empty, which is the honest state of the project: no
 * production body, head, hair, wardrobe or footwear master exists yet. The
 * banked pg-* candidates do not qualify either — they are unreleased, in no
 * catalog generation, and their gray mannequin bodies are reference evidence
 * that must never become player-facing body art.
 */
export const PRODUCTION_ONLY_CHARACTER_LIBRARY: CharacterComponentLibrary =
  createCharacterComponentLibrary(
    (
      assetManifest.assets as readonly CharacterComponentManifestRecord[]
    ).filter((record) => record.availability !== "development-fixture"),
    characterCatalog as CharacterCatalogData,
  );

export type ProductionCharacterPath =
  "modular-production" | "authored-fixture" | "placeholder";

export interface ProductionOfficeCharacter {
  readonly anchorId: string;
  readonly personId: string;
  /** Which of the three rendering paths this anchor actually took. */
  readonly path: ProductionCharacterPath;
  /** Present only on the modular-production path. */
  readonly plan: CharacterRenderPlan | null;
  /**
   * Why this anchor did not produce a person, in words a reviewer can act on.
   * Empty when it did.
   */
  readonly failedClosedBecause: readonly string[];
}

export interface ProductionOfficeComposition {
  readonly scene: RegisteredScene;
  readonly environmentAssetId: string | null;
  readonly characters: readonly ProductionOfficeCharacter[];
  /** True when at least one anchor rendered a production person. */
  readonly hasAnyProductionPerson: boolean;
}

/**
 * Deterministic stand-in identities for the proof, one per anchor.
 *
 * These are person IDs, not art. They exist so the modular contract runs with
 * a real person-owned appearance rather than being skipped, which is how the
 * gap gets reported instead of hidden.
 */
function proofPersonId(anchorId: string): string {
  return `production_office_proof_${anchorId.replace(/-/g, "_")}`;
}

export function composeProductionOffice(
  scene: RegisteredScene = PRODUCTION_OFFICE_SCENE,
  library: CharacterComponentLibrary = PRODUCTION_ONLY_CHARACTER_LIBRARY,
): ProductionOfficeComposition {
  if (scene.standardBodyWidthPercent === null) {
    throw new Error(
      `Scene '${scene.sceneId}' declares no standard body width, so people cannot be placed in it.`,
    );
  }
  const bodyWidthPercent = scene.standardBodyWidthPercent;

  const characters = [...scene.anchors.values()]
    .filter((anchor) => anchor.type !== "prop")
    .map((anchor): ProductionOfficeCharacter => {
      const personId = proofPersonId(anchor.id);
      const poseFamily = anchor.allowedPoseFamilies?.[0] ?? null;
      if (poseFamily === null) {
        return {
          anchorId: anchor.id,
          personId,
          path: "placeholder",
          plan: null,
          failedClosedBecause: [
            `Anchor '${anchor.id}' permits no pose family, so no body can be asked for.`,
          ],
        };
      }
      // The modular contract is asked the real question, every time. When the
      // production library has nothing to answer with it throws rather than
      // returning an empty plan, so the throw is caught and reported as the gap
      // it is. Catching keeps selection going through the shared contract
      // instead of short-circuiting around it, which is the difference between
      // "we asked and there is no art" and "we never asked".
      let plan: CharacterRenderPlan;
      try {
        plan = buildCharacterRenderPlan({
          personId,
          appearance: derivePersonAppearance(personId),
          anchor: {
            id: anchor.id,
            xPercent: anchor.xPercent,
            yPercent:
              anchor.seatContact?.seat_plane_y_percent ??
              anchor.contactFloorYPercent,
            scale: resolveAnchorScale(scene, anchor.contactFloorYPercent),
            poseFamily,
            depth: anchor.zOrder,
            bodyWidthPercent,
          },
          plate: scene.plate,
          library,
          visualLibrary: PRODUCTION_VISUAL_LIBRARY,
        });
      } catch (cause) {
        return {
          anchorId: anchor.id,
          personId,
          path: "placeholder",
          plan: null,
          failedClosedBecause: [
            `Production character resolution failed closed for anchor '${anchor.id}': ${(cause as Error).message}`,
          ],
        };
      }

      if (plan.layers.length > 0 && plan.complete) {
        return {
          anchorId: anchor.id,
          personId,
          path: "modular-production",
          plan,
          failedClosedBecause: [],
        };
      }
      return {
        anchorId: anchor.id,
        personId,
        path: "placeholder",
        plan: null,
        failedClosedBecause:
          plan.missing.length > 0
            ? plan.missing
            : [
                `No released production component resolves pose '${poseFamily}' for anchor '${anchor.id}'.`,
              ],
      };
    });

  return {
    scene,
    environmentAssetId: scene.raster?.assetId ?? null,
    characters,
    hasAnyProductionPerson: characters.some(
      (character) => character.path === "modular-production",
    ),
  };
}

/**
 * Perspective scale from the scene's own floor calibration.
 *
 * Duplicated here rather than imported from the office fixture path so the
 * production scene never depends on fixture code; the ramp itself is the
 * scene's, read off the scene.
 */
function resolveAnchorScale(
  scene: RegisteredScene,
  floorYPercent: number,
): number {
  const calibration = scene.floorCalibration;
  if (!calibration) return 1;
  const { near, far } = calibration;
  const span = near.floor_y_percent - far.floor_y_percent;
  if (span === 0) return far.scale;
  const t = (floorYPercent - far.floor_y_percent) / span;
  return far.scale + t * (near.scale - far.scale);
}
