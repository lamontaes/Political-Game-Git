import type { PersonRenderSnapshot } from "./person-render-snapshot";
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
import type {
  CharacterComponentLibrary,
  CharacterWardrobeContext,
} from "./character-components";
import type { PoseArtIndex } from "./pose-families";
import type { RuntimeVisualLibrary } from "./visual-integration";
import {
  resolvePersonWardrobeContext,
  type PersonWardrobePreference,
} from "./person-visual-selection";
import { previewArtRefusal } from "./art-preview";
import type { ScenePerson } from "./life-story";
import type { Person, World } from "../simulation";

/**
 * A LOCAL DEVELOPMENT override of which art the room composes against.
 *
 * Absent — which is every production caller — nothing below changes: the
 * production libraries are used, unreleased and fixture art is refused, and an
 * incomplete composition draws nothing. Present, the same compositor runs
 * against the review libraries and the two release gates are lifted, because
 * refusing unreleased art is precisely what the preview exists to suspend.
 *
 * The placement gate is NOT lifted. `complete` also covers a placement the
 * scene warned about, and a preview that hid a misplaced figure would defeat
 * its own purpose; the diagnostics come back named instead, on the person.
 *
 * See `src/presentation/art-preview.ts` for how a page enters this mode and why
 * it cannot exist in a shipped build.
 */
export interface LifeSceneArtPreview {
  readonly characters: CharacterComponentLibrary;
  readonly visuals: RuntimeVisualLibrary;
  readonly poseArt: PoseArtIndex;
}

export interface LifeSceneWardrobeOptions {
  /** Optional shared presentation snapshots; production eligibility still applies. */
  readonly snapshotsByPersonId?: Readonly<Record<string, PersonRenderSnapshot>>;
  /** Development only. Absent leaves every production default exactly as it is. */
  readonly artPreview?: LifeSceneArtPreview;
  readonly wardrobeByPersonId: Readonly<
    Record<string, PersonWardrobePreference>
  >;
  /** A caller with another catalog resolves against that catalog and the anchor's actual pose. */
  readonly resolveWardrobe?: (
    person: Person,
    preference: PersonWardrobePreference,
    context: {
      readonly scene: RegisteredScene;
      readonly anchor: RegisteredSceneAnchor;
      /** The same libraries the composition will use, never a different set. */
      readonly preview?: LifeSceneArtPreview;
    },
  ) => CharacterWardrobeContext;
}

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
  /** Explicit saved choices that cannot resolve suppress this person's art only. */
  readonly wardrobeRefusal?: string;
  /**
   * Why this person is not drawn, in the compositor's own words.
   *
   * Absent when a full picture drew. Every refusal used to collapse into an
   * empty layer list, so "why is my mother a pair of initials" had no answer
   * anywhere on the screen or in the DOM; this carries the real one out. It is
   * a development diagnostic and never player-facing copy.
   */
  readonly artRefusal?: string;
  /**
   * What the compositor objected to, whether or not a picture drew.
   *
   * Separate from `artRefusal` because they answer different questions.
   * A refusal says why there is nothing to look at; these say what is wrong
   * with what you ARE looking at — a substituted pose, a room with no floor
   * calibration, a body that declares no contacts. They were being dropped on
   * exactly the path that matters, the one where a figure drew, so a preview
   * with a known defect reported a clean success. Empty when the compositor
   * had nothing to say. Development diagnostics, never player-facing copy.
   */
  readonly artDiagnostics?: readonly string[];
}

/**
 * One set of libraries for the whole of one person's picture.
 *
 * Production or preview, whichever this call is: the pose probe, the wardrobe
 * resolution and the final composition all read the SAME catalog. They did
 * not. The composition switched to the review libraries under preview and this
 * resolver stayed on the production ones, so a saved outfit was resolved
 * against a catalog that does not contain the garments the figure was about to
 * be drawn in — a preview whose clothing selection could not hold, for a
 * reason nothing on screen could have explained.
 */
function librariesFor(preview?: LifeSceneArtPreview): {
  readonly characters: CharacterComponentLibrary;
  readonly visuals: RuntimeVisualLibrary;
  readonly poseArt: PoseArtIndex;
} {
  return {
    characters: preview?.characters ?? PRODUCTION_CHARACTER_LIBRARY,
    visuals: preview?.visuals ?? PRODUCTION_VISUAL_LIBRARY,
    poseArt: preview?.poseArt ?? PRODUCTION_POSE_ART,
  };
}

function resolveSavedWardrobe(
  person: Person,
  preference: PersonWardrobePreference,
  {
    scene,
    anchor,
    preview,
  }: {
    readonly scene: RegisteredScene;
    readonly anchor: RegisteredSceneAnchor;
    readonly preview?: LifeSceneArtPreview;
  },
): CharacterWardrobeContext {
  const appearance = person.appearance ?? derivePersonAppearance(person.id);
  const libraries = librariesFor(preview);
  // Use the compositor's resolved pose, including its permitted-pose fallback.
  const probe = composeSceneCharacter({
    personId: person.id,
    displayName: `${person.givenName} ${person.familyName}`,
    appearance,
    scene,
    anchor,
    library: libraries.characters,
    visualLibrary: libraries.visuals,
    poseRegistry: PRODUCTION_POSE_REGISTRY,
    poseArt: libraries.poseArt,
  });
  return resolvePersonWardrobeContext({ ...person, appearance }, preference, {
    library: libraries.characters,
    poseFamily: probe.recipe.context.poseFamily,
  });
}

/**
 * Scale a composed figure to the height the placement reserved, on its contact
 * point, without distorting it.
 *
 * DEVELOPMENT PREVIEW ONLY, and only for a room that declares no floor
 * calibration. The compositor sizes a body from the scene's measured standard
 * body width; with no such measurement it falls back to something very small,
 * and the banked art rendered as a sixteen-pixel person — a defect of the
 * scene's missing calibration that made the art itself impossible to look at.
 *
 * The first version of this stretched the union bounding box to fill the
 * reserved box on both axes independently. That is two scales, and two scales
 * is a distorted human being: the reserved width is a footprint estimate and
 * the reserved height comes from a standing ratio, so their quotient is not
 * this person's proportions, and everything the preview exists to judge —
 * whether a body reads right, whether a garment sits on it — was being judged
 * through an anisotropic squash nobody asked for.
 *
 * So there is ONE scale, taken from height, because height is the dimension
 * the placement actually derives: the anchor's contact line and the standing
 * ratio produce it. Width then follows from the art's own proportions and may
 * exceed the footprint estimate, which is the honest outcome — a broad figure
 * is broad, and hiding that by squeezing it is the failure.
 *
 * The transform is anchored on the CONTACT POINT rather than on a corner: the
 * figure's own floor line lands on the anchor's contact line and its centre of
 * footprint lands on the anchor's x. Corner-anchoring made a rescaled person
 * float off the floor, which reads as a placement bug in art that has none.
 *
 * This invents no measurement. The height it scales to is the one the
 * placeholder already occupies, derived from the anchor's declared footprint
 * and the scene's own perspective ramp — authored scene data throughout — and
 * `scene-declares-no-floor-calibration` still travels with the person, so a
 * fitted figure is never mistaken for a calibrated room.
 */
export function fitLayersToBox(
  layers: readonly ScenePersonLayer[],
  box: {
    readonly leftPercent: number;
    readonly topPercent: number;
    readonly widthPercent: number;
    readonly heightPercent: number;
  },
): readonly ScenePersonLayer[] {
  if (layers.length === 0) return layers;
  const left = Math.min(...layers.map((layer) => layer.leftPercent));
  const top = Math.min(...layers.map((layer) => layer.topPercent));
  const right = Math.max(
    ...layers.map((layer) => layer.leftPercent + layer.widthPercent),
  );
  const bottom = Math.max(
    ...layers.map((layer) => layer.topPercent + layer.heightPercent),
  );
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return layers;

  /*
   * One scale for both axes.
   *
   * A layer percentage is a percentage of the plate's width on x and of its
   * height on y, and the renderer maps both consistently, so multiplying both
   * by the same number preserves the figure's rendered aspect ratio exactly.
   */
  const scale = box.heightPercent / height;

  // Where the figure must end up: its feet on the anchor's contact line, its
  // footprint centred on the anchor's x.
  const contactY = box.topPercent + box.heightPercent;
  const contactX = box.leftPercent + box.widthPercent / 2;
  // Where the figure's own contact point is, before scaling.
  const figureContactX = left + width / 2;

  return layers.map((layer) => ({
    url: layer.url,
    leftPercent: contactX + (layer.leftPercent - figureContactX) * scale,
    topPercent: contactY + (layer.topPercent - bottom) * scale,
    widthPercent: layer.widthPercent * scale,
    heightPercent: layer.heightPercent * scale,
  }));
}

/** A standing figure is roughly this many times as tall as it is wide. */
const STANDING_HEIGHT_RATIO = 2.55;
/** A seated figure occupies less height above its contact line. */
const SEATED_HEIGHT_RATIO = 1.5;

function placeableAnchors(
  scene: RegisteredScene,
  preview?: LifeSceneArtPreview,
): readonly RegisteredSceneAnchor[] {
  const anchors = [...scene.anchors.values()].filter(
    (anchor) =>
      (anchor.kind === "seat" || anchor.kind === "floor-standing") &&
      (anchor.footprintPercent ?? scene.standardBodyWidthPercent ?? 0) > 0,
  );
  // Seats first, then floor spots; each group left-to-right, so a fuller room
  // reads front-to-back and the assignment is deterministic.
  const ordered = anchors.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "seat" ? -1 : 1;
    return left.xPercent - right.xPercent;
  });
  if (!preview) return ordered;
  /*
   * Development preview only: put the spots this art can actually fill first.
   *
   * The banked review bodies carry `standing-neutral` and nothing else, and
   * seats come first in the production order, so the first household member is
   * assigned a sofa the bank cannot draw and the room stays empty — a preview
   * that shows nothing because of an assignment rule rather than because of
   * the art. The pose-art index answers which anchors are fillable, so the
   * question is asked rather than assumed, and the day a seated body is banked
   * this reorders itself back.
   *
   * Order within each group is unchanged, so the assignment stays
   * deterministic and nobody is placed anywhere the registry did not offer.
   */
  const fillable = (anchor: RegisteredSceneAnchor): boolean =>
    (anchor.allowedPoseFamilies ?? []).some((family) =>
      preview.poseArt.bodyFamiliesByPose.has(family),
    );
  return [...ordered.filter(fillable), ...ordered.filter((a) => !fillable(a))];
}

function releasedLayers(
  world: World,
  person: { readonly id: string; readonly displayName: string },
  scene: RegisteredScene,
  anchor: RegisteredSceneAnchor,
  wardrobe?: CharacterWardrobeContext,
  snapshot?: PersonRenderSnapshot,
  preview?: LifeSceneArtPreview,
): {
  readonly layers: readonly ScenePersonLayer[];
  /** Why nothing drew. Empty when a picture drew. */
  readonly refusal: string;
  /** What the compositor objected to, drawn or not. Never dropped on success. */
  readonly notes: readonly string[];
} {
  // Ask #86's resolver for a real picture. Today this returns nothing — no body
  // master is released — but the call is the seam the released art lands on, so
  // it is made rather than assumed. Any throw from an unresolvable recipe is an
  // absent picture, not a broken screen.
  const uncalibrated =
    !scene.floorCalibration || scene.standardBodyWidthPercent === null;
  /*
   * An uncalibrated room refuses everybody, in production, on purpose: a
   * figure placed without the plate's measured floor ramp and standard body
   * width is a figure at a guessed size, and a guessed size is exactly the
   * fabricated measurement this project does not allow into the game.
   *
   * It is worth naming what that means today, because it is not an art
   * problem: every residence scene in the registry — the room a life actually
   * starts in — declares no floor calibration and no standard body width, so
   * releasing a body master would still not put anybody in the player's living
   * room. That is authoring work on the scene, measured from its plate, and
   * nothing here may invent it.
   *
   * The preview goes on anyway and says so. The compositor has its own
   * fallback and reports `scene-declares-no-floor-calibration` when it uses
   * it; carrying the figure out with that attached is the whole point of a
   * review surface, because a wrongly-sized person the owner can see and
   * reject is worth more than an empty room they cannot diagnose.
   */
  if (uncalibrated && !preview)
    return {
      layers: [],
      refusal: "scene-declares-no-floor-calibration",
      notes: ["scene-declares-no-floor-calibration"],
    };
  const libraries = librariesFor(preview);
  const library = libraries.characters;
  if (preview) {
    // The compositor is age-blind, and the banked bodies are adult bodies.
    // Nobody's child gets an adult body just because a preview is on.
    const known = world.people[person.id];
    const refused = known
      ? previewArtRefusal(known, world.currentDate)
      : "candidate-bank: no canonical person to check age";
    if (refused) return { layers: [], refusal: refused, notes: [refused] };
  }
  try {
    const record = world.people[person.id];
    const appearance = record?.appearance ?? derivePersonAppearance(person.id);
    const presentation = composeSceneCharacter({
      /*
       * A shared render snapshot is bound to the library that produced it, and
       * it validates that binding: handing a production-derived snapshot to a
       * composition against the review libraries is rejected outright, which
       * turned every previewed adult into a thrown mismatch. The preview
       * composes fresh instead. It costs the snapshot's cross-surface identity
       * guarantee, which is a production guarantee about production art, and
       * the person, their appearance and their wardrobe are unchanged either
       * way.
       */
      snapshot: preview ? undefined : snapshot,
      wardrobe,
      personId: person.id,
      displayName: person.displayName,
      appearance,
      scene,
      anchor,
      library,
      visualLibrary: libraries.visuals,
      poseRegistry: PRODUCTION_POSE_REGISTRY,
      poseArt: libraries.poseArt,
    });
    /*
     * The compositor already knows why it could not draw somebody, and every
     * one of these branches used to discard that and return an empty array.
     * That is the whole reason a household member could only ever be initials
     * with no way to ask why. The refusal is carried out now instead.
     *
     * These are computed BEFORE any branch, and returned on every path
     * including the successful one. The version that only built them on the
     * way to refusing dropped them the moment the preview actually drew
     * somebody, which is precisely when they matter most: a figure that
     * composed against an uncalibrated room, or with a pose substituted, came
     * back looking like a clean success with nothing recorded anywhere. That
     * made a preview claim more than it had measured.
     */
    const named = [
      ...presentation.poseGaps.map((gap) => gap.code),
      ...presentation.diagnostics.map((entry) => entry.code),
    ].filter(Boolean);
    const notes = [...new Set(named)];
    const fixtures = presentation.layers.filter(
      (layer) => library.components.get(layer.assetId)?.fixture,
    );
    if (!presentation.complete) {
      const refusal = notes.length
        ? `incomplete-composition: ${notes.join(", ")}`
        : "incomplete-composition";
      // A preview shows the defect rather than hiding it, as long as there is
      // anything drawable to show; that judgement is the owner's to make.
      if (!preview || presentation.layers.every((layer) => !layer.url)) {
        return { layers: [], refusal, notes };
      }
    } else if (fixtures.length > 0 && !preview) {
      return {
        layers: [],
        refusal: `development-fixture-only: ${fixtures.length} of ${presentation.layers.length} layer(s)`,
        notes,
      };
    }
    const drawn = presentation.layers
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
    return {
      layers: drawn,
      refusal: drawn.length === 0 ? "composition-drew-no-layers" : "",
      notes,
    };
  } catch (error) {
    // The compositor's own message, not a flattened one. An unresolvable recipe
    // is still an absent picture rather than a broken screen, but now it says
    // which recipe and why.
    const thrown = `composition-threw: ${error instanceof Error ? error.message : String(error)}`;
    return { layers: [], refusal: thrown, notes: [thrown] };
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
  wardrobe?: CharacterWardrobeContext,
  savedWardrobes?: LifeSceneWardrobeOptions,
): readonly PlacedScenePerson[] {
  if (!sceneId) return [];
  const scene = SCENE_REGISTRY.scenes.get(sceneId);
  if (!scene || !scene.raster) return [];
  const anchors = placeableAnchors(scene, savedWardrobes?.artPreview);
  if (anchors.length === 0) return [];

  const people = [...present]
    .sort((left, right) => left.personId.localeCompare(right.personId))
    .slice(0, anchors.length);

  const plateAspect = scene.plate.width / scene.plate.height;

  const placed = people.map((person, index) => {
    const anchor = anchors[index]!;
    const seated = anchor.kind === "seat";
    const scale = resolvePerspectiveScale(scene, anchor.contactFloorYPercent);
    const bodyWidth =
      anchor.footprintPercent ?? scene.standardBodyWidthPercent!;
    const widthPercent = Math.min(30, Math.max(6, bodyWidth * scale));
    const ratio = seated ? SEATED_HEIGHT_RATIO : STANDING_HEIGHT_RATIO;
    const heightPercent = widthPercent * plateAspect * ratio;
    const leftPercent = anchor.xPercent - widthPercent / 2;
    /*
     * The contact line is authored truth and the height is an estimate, so
     * when they disagree the estimate gives way — never the floor.
     *
     * This used to read `Math.max(0, contactFloorY - height)`. The clamp looks
     * harmless: keep the box on the plate. What it actually did was move the
     * BOTTOM of the box, because everything downstream places the figure's
     * feet at `top + height` — so in any room where the reserved height
     * exceeds the distance from the top of the plate to the contact line, the
     * whole person was pushed down through the floor by exactly the amount
     * clamped away. Measured: 5.5% of the plate in an ordinary residence
     * living room, 9.6% and 20.7% at two anchors of the staff office, 4.3%
     * and 41.6% in the shared workroom. A figure standing knee-deep in the
     * floorboards reads as broken art, and the art was fine.
     *
     * Unclamped, the feet land on the declared contact line in every room and
     * a figure too tall for the space above it is cropped at the head by the
     * viewport, which is what a camera in a small room does. The height that
     * overflowed is reported below rather than absorbed silently, because a
     * cropped figure is still a thing a reviewer should be told about.
     */
    const topPercent = anchor.contactFloorYPercent - heightPercent;
    const overflowPercent = Math.max(0, -topPercent);
    let personWardrobe = wardrobe;
    let wardrobeRefusal: string | undefined;
    if (
      savedWardrobes &&
      Object.prototype.hasOwnProperty.call(
        savedWardrobes.wardrobeByPersonId,
        person.personId,
      )
    ) {
      try {
        const record = world.people[person.personId];
        const preference = savedWardrobes.wardrobeByPersonId[person.personId];
        if (!record)
          throw new Error(
            `No canonical person '${person.personId}' exists for the saved wardrobe.`,
          );
        if (!preference || preference.personId !== record.id)
          throw new Error(
            "Wardrobe preference must belong to the canonical person being rendered.",
          );
        personWardrobe = (
          savedWardrobes.resolveWardrobe ?? resolveSavedWardrobe
        )(record, preference, {
          scene,
          anchor,
          preview: savedWardrobes.artPreview,
        });
      } catch (error) {
        wardrobeRefusal =
          error instanceof Error ? error.message : String(error);
      }
    }
    const drawing =
      wardrobeRefusal !== undefined
        ? { layers: [], refusal: wardrobeRefusal, notes: [wardrobeRefusal] }
        : releasedLayers(
            world,
            { id: person.personId, displayName: person.name },
            scene,
            anchor,
            personWardrobe,
            savedWardrobes?.snapshotsByPersonId?.[person.personId],
            savedWardrobes?.artPreview,
          );
    /*
     * An uncalibrated room only reaches here in the preview; production
     * refused it above. Fitting is what makes the art visible enough to judge.
     */
    const layers =
      savedWardrobes?.artPreview &&
      (!scene.floorCalibration || scene.standardBodyWidthPercent === null)
        ? fitLayersToBox(drawing.layers, {
            leftPercent,
            topPercent,
            widthPercent,
            heightPercent,
          })
        : drawing.layers;
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
      ...(wardrobeRefusal !== undefined ? { wardrobeRefusal } : {}),
      ...(drawing.refusal ? { artRefusal: drawing.refusal } : {}),
      ...(drawing.notes.length || overflowPercent > 0
        ? {
            artDiagnostics: [
              ...drawing.notes,
              ...(overflowPercent > 0
                ? [
                    `figure-taller-than-space-above-contact-line: ${overflowPercent.toFixed(1)}% of the plate is above the top edge, so this figure is cropped at the head.`,
                  ]
                : []),
            ],
          }
        : {}),
    } satisfies PlacedScenePerson;
  });

  // Back to front: a smaller floor line is further away and paints first.
  return placed.sort((left, right) => left.topPercent - right.topPercent);
}
