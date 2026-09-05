import {
  SCENE_REGISTRY,
  type RegisteredScene,
  type RegisteredSceneAnchor,
} from "./scene-registry";
import { resolvePerspectiveScale } from "./scene-placement";
import { composeSceneCharacter } from "./scene-composition";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_POSE_ART,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
} from "./visual-integration";
import { derivePersonAppearance } from "../simulation";
import type { ScenePerson } from "./life-story";
import type { World } from "../simulation";

/**
 * Standing the generated household in the room, from the accepted systems.
 *
 * This is the convergence seam the fourth human play asked for: the people the
 * world actually generated, placed on the scene's own anchors, resolved through
 * #86's character compositor, and failing closed to an honest, spatially-correct
 * placeholder when — as today — no production person art has been released. It
 * builds no second compositor and no second scene model. It reads the registry
 * for where a person may stand or sit, asks the resolver for their picture, and
 * when there is no picture yet it still puts a named presence in the right place
 * so the room is populated rather than empty.
 *
 * Every number below is the registry's: the anchor's x, its floor or seat
 * contact line, its footprint, and the scene's own perspective ramp and
 * standard body width. Nothing here is hand-tuned per person, so the day a body
 * master is released the same placement carries the real sprite.
 */

/** A layer of released character art, positioned in plate percentages. */
export interface ScenePersonLayer {
  readonly url: string;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

export interface PlacedScenePerson {
  readonly personId: string;
  readonly name: string;
  /** "your mom", "who is in your class", or null. */
  readonly relationship: string | null;
  readonly anchorId: string;
  readonly seated: boolean;
  /** Placeholder geometry, all in plate percentages. */
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  /** Released art, when it exists. Empty until a body master is released. */
  readonly layers: readonly ScenePersonLayer[];
  /** True only when real art drew; false means the placeholder is showing. */
  readonly hasArt: boolean;
  /** One honest player-facing sentence for the placeholder. */
  readonly presence: string;
}

/** A standing figure is roughly this many times as tall as it is wide. */
const STANDING_HEIGHT_RATIO = 2.55;
/** A seated figure occupies less height above its contact line. */
const SEATED_HEIGHT_RATIO = 1.5;
const DEFAULT_BODY_WIDTH_PERCENT = 14;
const MAX_SCENE_PEOPLE = 3;

function placeableAnchors(
  scene: RegisteredScene,
): readonly RegisteredSceneAnchor[] {
  const anchors = [...scene.anchors.values()].filter(
    (anchor) => anchor.kind === "seat" || anchor.kind === "floor-standing",
  );
  // Seats first, then floor spots; each group left-to-right, so a fuller room
  // reads front-to-back and the assignment is deterministic.
  return anchors.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "seat" ? -1 : 1;
    return left.xPercent - right.xPercent;
  });
}

function releasedLayers(
  world: World,
  person: { readonly id: string; readonly displayName: string },
  scene: RegisteredScene,
  anchor: RegisteredSceneAnchor,
): readonly ScenePersonLayer[] {
  // Ask #86's resolver for a real picture. Today this returns nothing — no body
  // master is released — but the call is the seam the released art lands on, so
  // it is made rather than assumed. Any throw from an unresolvable recipe is an
  // absent picture, not a broken screen.
  try {
    const record = world.people[person.id];
    const appearance = record?.appearance ?? derivePersonAppearance(person.id);
    const presentation = composeSceneCharacter({
      personId: person.id,
      displayName: person.displayName,
      appearance,
      scene,
      anchor,
      library: PRODUCTION_CHARACTER_LIBRARY,
      visualLibrary: PRODUCTION_VISUAL_LIBRARY,
      poseRegistry: PRODUCTION_POSE_REGISTRY,
      poseArt: PRODUCTION_POSE_ART,
    });
    if (!presentation.complete) return [];
    return presentation.layers
      .filter((layer): layer is typeof layer & { url: string } =>
        Boolean(layer.url),
      )
      .map((layer) => ({
        url: layer.url,
        leftPercent: layer.leftPercent,
        topPercent: layer.topPercent,
        widthPercent: layer.widthPercent,
        heightPercent: layer.heightPercent,
      }));
  } catch {
    return [];
  }
}

/**
 * The people to draw in the current room, in paint order (back to front).
 *
 * `present` is the current moment's own list of who is here; nobody is invented.
 * The player is the viewpoint and is never placed. When the room has no plate,
 * there is nothing to stand people in, so the list is empty and the People rail
 * carries them instead.
 */
export function planLifeScenePeople(
  world: World,
  present: readonly ScenePerson[],
  sceneId: string | null,
): readonly PlacedScenePerson[] {
  if (!sceneId) return [];
  const scene = SCENE_REGISTRY.scenes.get(sceneId);
  if (!scene || !scene.raster) return [];
  const anchors = placeableAnchors(scene);
  if (anchors.length === 0) return [];

  const people = [...present]
    .sort((left, right) => left.personId.localeCompare(right.personId))
    .slice(0, Math.min(MAX_SCENE_PEOPLE, anchors.length));

  const plateAspect = scene.plate.width / scene.plate.height;

  const placed = people.map((person, index) => {
    const anchor = anchors[index]!;
    const seated = anchor.kind === "seat";
    const scale = resolvePerspectiveScale(scene, anchor.contactFloorYPercent);
    const bodyWidth =
      anchor.footprintPercent ??
      scene.standardBodyWidthPercent ??
      DEFAULT_BODY_WIDTH_PERCENT;
    const widthPercent = Math.min(30, Math.max(6, bodyWidth * scale));
    const ratio = seated ? SEATED_HEIGHT_RATIO : STANDING_HEIGHT_RATIO;
    const heightPercent = widthPercent * plateAspect * ratio;
    const leftPercent = anchor.xPercent - widthPercent / 2;
    const topPercent = Math.max(0, anchor.contactFloorYPercent - heightPercent);
    const layers = releasedLayers(
      world,
      { id: person.personId, displayName: person.name },
      scene,
      anchor,
    );
    return {
      personId: person.personId,
      name: person.name,
      relationship: person.relationship,
      anchorId: anchor.id,
      seated,
      leftPercent,
      topPercent,
      widthPercent,
      heightPercent,
      layers,
      hasArt: layers.length > 0,
      presence: person.relationship
        ? `${person.name}, ${person.relationship}`
        : person.name,
    } satisfies PlacedScenePerson;
  });

  // Back to front: a smaller floor line is further away and paints first.
  return placed.sort((left, right) => left.topPercent - right.topPercent);
}
