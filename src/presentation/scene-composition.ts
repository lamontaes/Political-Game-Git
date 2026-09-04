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
  resolvePoseForRequest,
  type PoseArtIndex,
  type PoseFamilyDefinition,
  type PoseFamilyRegistry,
  type PoseGap,
  type PoseGapCode,
} from "./pose-families";
import {
  placeSubjectAtAnchor,
  sceneDiagnostic,
  type PlacementBox,
  type PlacementSubject,
  type ScenePlacement,
  type SceneDiagnostic,
  type SceneDiagnosticCode,
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
  /** The pose family this anchor resolved to; null when none could be drawn. */
  readonly poseFamily: PoseFamilyDefinition | null;
  /** Why the pose resolution is imperfect, named. Empty when it is clean. */
  readonly poseGaps: readonly PoseGap[];
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
  readonly poseRegistry: PoseFamilyRegistry;
  readonly poseArt: PoseArtIndex;
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
 * Maps a pose gap onto the shared scene diagnostic family, so the debug
 * overlay shows pose gaps beside placement and slot warnings rather than in a
 * second vocabulary.
 */
const POSE_GAP_DIAGNOSTIC: Readonly<
  Record<
    PoseGapCode,
    { readonly code: SceneDiagnosticCode; readonly warning: string }
  >
> = {
  "anchor-permits-no-registered-pose": {
    code: "pose-family-not-registered",
    warning: "W4",
  },
  "no-released-art-for-permitted-pose": {
    code: "pose-art-missing-for-body-family",
    warning: "W4",
  },
  "no-art-for-body-family": {
    code: "pose-art-missing-for-body-family",
    warning: "W4",
  },
  "preferred-pose-substituted": {
    code: "preferred-pose-substituted",
    warning: "W4",
  },
  "posture-class-mismatch": {
    code: "pose-not-permitted-at-anchor",
    warning: "W4",
  },
  "facing-not-available": {
    code: "facing-not-permitted-at-anchor",
    warning: "W6",
  },
};

/**
 * The pose an anchor falls back to purely to learn a person's body family.
 *
 * Identity resolution is pose-independent by contract — the recipe chooses
 * body, head and garment FAMILIES before it looks at a pose — so resolving
 * once against any pose yields the same body family that the real pose will.
 * That body family is what the pose resolver needs in order to answer "is
 * there art for THIS person here", which is the question a bare
 * "does any body have this pose" check got wrong.
 */
function provisionalPose(anchor: RegisteredSceneAnchor): string {
  return (
    anchor.allowedPoseFamilies?.[0] ??
    (anchor.seatContact ? "seated-at-desk" : "standing-neutral")
  );
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
    poseRegistry,
    poseArt,
  } = request;

  // Identity first, against a provisional pose, so the pose resolver can ask
  // about THIS person's body family rather than about the library in general.
  const identityProbe = resolvePersonCharacterRecipe(
    appearance,
    provisionalPose(anchor),
    library,
  );
  const resolution = resolvePoseForRequest(
    {
      anchorId: anchor.id,
      permittedPoseFamilies: anchor.allowedPoseFamilies ?? [
        provisionalPose(anchor),
      ],
      permittedFacings: anchor.permittedFacings,
      hasSeatContact: anchor.seatContact !== null,
      bodyFamily: identityProbe.identity.bodyFamily,
    },
    poseRegistry,
    poseArt,
  );

  // A pose the anchor never listed is never substituted in. When nothing
  // permitted can be drawn we keep the anchor's preferred pose so the recipe
  // resolves an honest empty context, and the gaps below say exactly why.
  const poseFamilyId =
    resolution.poseFamily?.pose_family_id ?? provisionalPose(anchor);
  const poseFamily = resolution.poseFamily;
  const recipe = resolvePersonCharacterRecipe(
    appearance,
    poseFamilyId,
    library,
  );
  const projected = projectCharacterLayers(recipe, library);

  const diagnostics: SceneDiagnostic[] = recipe.context.diagnostics.map(
    (diagnostic) =>
      fromRecipeDiagnostic(diagnostic, scene.sceneId, anchor.id, personId),
  );
  for (const gap of resolution.gaps) {
    const mapped = POSE_GAP_DIAGNOSTIC[gap.code];
    diagnostics.push(
      sceneDiagnostic(
        mapped.code,
        mapped.warning,
        scene.sceneId,
        anchor.id,
        personId,
        gap.message,
      ),
    );
  }

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
      poseFamily,
      poseGaps: resolution.gaps,
      recipe,
      placement: placeSubjectAtAnchor(scene, anchor, {
        id: personId,
        bodyCanvas: { width: 1, height: 2 },
        root: { x: 0.5, y: 0.5 },
        bodyFamily: recipe.identity.bodyFamily,
        poseFamily: poseFamilyId,
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
    poseFamily: poseFamilyId,
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
    poseFamily,
    poseGaps: resolution.gaps,
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
