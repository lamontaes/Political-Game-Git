import type { PersonAppearance } from "../simulation/person-appearance";
import {
  projectCharacterLayers,
  type CharacterComponentKind,
  type CharacterComponentLibrary,
  type CharacterRecipe,
  type CharacterRecipeDiagnostic,
} from "./character-components";
import { resolvePersonCharacterRecipe } from "./character-render-plan";
import {
  placeSubjectAtAnchor,
  sceneDiagnostic,
  type PlacementBox,
  type PlacementSubject,
  type ScenePlacement,
  type SceneDiagnostic,
} from "./scene-placement";
import type { RegisteredScene, RegisteredSceneAnchor } from "./scene-registry";
import type { RuntimeVisualLibrary } from "./visual-integration";

/**
 * Places a person in a registered scene, from metadata only.
 *
 * This is where the two halves meet: the modular recipe decides WHICH art a
 * person is made of, the scene and the body's contacts decide WHERE it goes.
 * Neither half knows about the other, and nothing here is tuned per character.
 *
 * Every reason the result is imperfect is collected rather than thrown, so the
 * development overlay can show a wrong-looking person and name the contract
 * that was broken in the same view.
 */

export interface SceneCharacterLayer {
  readonly assetId: string;
  readonly kind: CharacterComponentKind;
  readonly slotId: string;
  readonly layer: number;
  readonly url: string | null;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

export interface SceneCharacterPresentation {
  readonly personId: string;
  readonly displayName: string;
  readonly sceneId: string;
  readonly anchorId: string;
  readonly recipe: CharacterRecipe;
  readonly placement: ScenePlacement;
  readonly box: PlacementBox;
  /** Ordered by layer ascending; render in this order. */
  readonly layers: readonly SceneCharacterLayer[];
  /**
   * True when a body resolved, every required slot is filled, every layer is
   * runtime eligible, and nothing about the placement warned.
   */
  readonly complete: boolean;
  readonly diagnostics: readonly SceneDiagnostic[];
  /**
   * One player-facing sentence for surfaces that must degrade honestly. It
   * says what is actually being shown, never why in implementation terms.
   */
  readonly fallbackDescription: string | null;
}

export interface SceneCharacterRequest {
  readonly personId: string;
  readonly displayName: string;
  readonly appearance: PersonAppearance;
  readonly scene: RegisteredScene;
  readonly anchor: RegisteredSceneAnchor;
  readonly library: CharacterComponentLibrary;
  readonly visualLibrary: RuntimeVisualLibrary;
}

/** Maps a recipe diagnostic onto the shared 10A warning family. */
function fromRecipeDiagnostic(
  diagnostic: CharacterRecipeDiagnostic,
  sceneId: string,
  anchorId: string,
  subject: string,
): SceneDiagnostic {
  const warning =
    diagnostic.code === "required-slot-empty"
      ? "W9"
      : diagnostic.code === "slot-conflict"
        ? "W8"
        : diagnostic.code === "slot-family-has-no-art-for-facing"
          ? "W6"
          : "—";
  const code =
    diagnostic.code === "required-slot-empty"
      ? "required-slot-empty"
      : diagnostic.code === "slot-conflict"
        ? "incompatible-slot-combination"
        : "incompatible-slot-combination";
  return sceneDiagnostic(
    code,
    warning,
    sceneId,
    anchorId,
    subject,
    diagnostic.message,
  );
}

/**
 * Which pose to resolve at an anchor.
 *
 * An anchor may permit several poses; the library decides which of them it can
 * actually draw. Taking the first permitted pose blindly is how a seat that
 * lists a pose nobody has art for silently produces an empty person, so the
 * first permitted pose WITH ART wins, and the first permitted pose is the
 * honest fallback when the library has none of them.
 */
function resolvePoseForAnchor(
  anchor: RegisteredSceneAnchor,
  library: CharacterComponentLibrary,
): string {
  const permitted = anchor.allowedPoseFamilies ?? [
    anchor.seatContact ? "seated-at-desk" : "standing-neutral",
  ];
  const posesWithArt = new Set(
    [...library.components.values()]
      .filter((component) => component.definition.kind === "body")
      .map((component) => component.definition.pose_family)
      .filter((pose): pose is string => pose !== undefined),
  );
  return permitted.find((pose) => posesWithArt.has(pose)) ?? permitted[0]!;
}

export function composeSceneCharacter(
  request: SceneCharacterRequest,
): SceneCharacterPresentation {
  const {
    personId,
    displayName,
    appearance,
    scene,
    anchor,
    library,
    visualLibrary,
  } = request;

  const poseFamily = resolvePoseForAnchor(anchor, library);
  const recipe = resolvePersonCharacterRecipe(appearance, poseFamily, library);
  const projected = projectCharacterLayers(recipe, library);

  const diagnostics: SceneDiagnostic[] = recipe.context.diagnostics.map(
    (diagnostic) =>
      fromRecipeDiagnostic(diagnostic, scene.sceneId, anchor.id, personId),
  );

  if (scene.standardBodyWidthPercent === null) {
    diagnostics.push(
      sceneDiagnostic(
        "scene-declares-no-floor-calibration",
        "—",
        scene.sceneId,
        anchor.id,
        personId,
        `Scene '${scene.sceneId}' declares no standard body width, so a modular body cannot be sized on this plate.`,
      ),
    );
  }

  const bodyEntry = recipe.context.components.find(
    (component) => component.kind === "body",
  );
  const bodyComponent = bodyEntry
    ? library.components.get(bodyEntry.assetId)
    : undefined;

  if (!projected || !bodyComponent) {
    return {
      personId,
      displayName,
      sceneId: scene.sceneId,
      anchorId: anchor.id,
      recipe,
      placement: placeSubjectAtAnchor(scene, anchor, {
        id: personId,
        bodyCanvas: { width: 1, height: 2 },
        root: { x: 0.5, y: 0.5 },
        bodyFamily: recipe.identity.bodyFamily,
        poseFamily,
        facing: null,
        referenceWidthPercent: scene.standardBodyWidthPercent ?? 1,
      }),
      box: {
        leftPercent: anchor.xPercent,
        topPercent: anchor.contactFloorYPercent,
        widthPercent: 0,
        heightPercent: 0,
      },
      layers: [],
      complete: false,
      diagnostics,
      fallbackDescription: `${displayName} is here, but there is no picture of them yet.`,
    };
  }

  const subject: PlacementSubject = {
    id: personId,
    bodyCanvas: projected.bodyCanvas,
    root: { x: projected.root.x, y: projected.root.y },
    ...(bodyComponent.definition.contacts
      ? { contacts: bodyComponent.definition.contacts }
      : {}),
    bodyFamily: recipe.identity.bodyFamily,
    poseFamily,
    facing: recipe.context.headOrientation,
    referenceWidthPercent: scene.standardBodyWidthPercent ?? 1,
  };

  const placement = placeSubjectAtAnchor(scene, anchor, subject);
  diagnostics.push(...placement.diagnostics);

  const { leftPercent, topPercent, widthPercent, heightPercent } =
    placement.box;

  const layers: SceneCharacterLayer[] = projected.layers.map((layer) => {
    const asset = visualLibrary.get(layer.assetId);
    if (!layer.released || !asset) {
      diagnostics.push(
        sceneDiagnostic(
          "asset-not-runtime-approved",
          "W10",
          scene.sceneId,
          anchor.id,
          personId,
          `Component '${layer.assetId}' (${layer.kind}) is not runtime approved, so its layer is not drawn.`,
        ),
      );
    }
    return {
      assetId: layer.assetId,
      kind: layer.kind,
      slotId: layer.slotId,
      layer: layer.layer,
      url: layer.released ? (asset?.url ?? null) : null,
      leftPercent: leftPercent + layer.left * widthPercent,
      topPercent: topPercent + layer.top * heightPercent,
      widthPercent: layer.width * widthPercent,
      heightPercent: layer.height * heightPercent,
    };
  });

  const complete = diagnostics.length === 0;

  return {
    personId,
    displayName,
    sceneId: scene.sceneId,
    anchorId: anchor.id,
    recipe,
    placement,
    box: placement.box,
    layers,
    complete,
    diagnostics,
    fallbackDescription: complete
      ? null
      : describeHonestly(displayName, diagnostics),
  };
}

/**
 * Player-facing degradation copy. It names the person and says plainly what is
 * or is not shown. It never mentions slots, assets, anchors or contracts — a
 * player is owed the truth, not the implementation.
 */
function describeHonestly(
  displayName: string,
  diagnostics: readonly SceneDiagnostic[],
): string {
  if (
    diagnostics.some(
      (diagnostic) => diagnostic.code === "asset-not-runtime-approved",
    )
  ) {
    return `${displayName} is shown in part; some of their appearance is still being drawn.`;
  }
  if (
    diagnostics.some((diagnostic) => diagnostic.code === "required-slot-empty")
  ) {
    return `${displayName} is shown, though their outfit is not finished.`;
  }
  return `${displayName} is shown, though their picture does not sit quite right here yet.`;
}
