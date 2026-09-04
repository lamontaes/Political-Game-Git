import {
  COMMITTEE_FIXTURE_SCENE_ID,
  DOMESTIC_CANONICAL_SCENE_ID,
  DOMESTIC_ORDINARY_SCENE_ID,
  HEARING_ROOM_SCENE_ID,
  LEGISLATIVE_CHAMBER_SCENE_ID,
  OFFICE_FIXTURE_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
  SCENE_REGISTRY,
  TITLE_TABLEAU_SCENE_ID,
  type SceneRegistry,
} from "./scene-registry";

/**
 * EVERY PLAYER-FACING SURFACE THAT COULD SHOW A ROOM, AND WHAT IT ACTUALLY
 * SHOWS TODAY.
 *
 * The question "is this background wired?" was previously answerable only by
 * reading React, and the answer was wrong often enough that three rounds of
 * visual review were spent on a development fixture. This module makes the
 * answer data.
 *
 * The disposition of a consumer is NOT typed in. It is derived from three
 * declared facts — which scene it uses, whether that scene has a plate, and
 * which module consumes it — so a consumer cannot claim to be wired to
 * production art while pointing at a scene with no raster, and a scene that
 * loses its plate changes the report rather than lying in it. The one fact
 * that is asserted rather than derived is `wiredThrough`, and a test reads
 * that module and fails if the seam is not actually there.
 */

export type SceneConsumerDisposition =
  /** A production plate resolves and a module paints it. */
  | "wired-to-production-art"
  /** A module paints it, and what it paints is an honest fixture or no plate. */
  | "wired-to-honest-fallback"
  /** Production art exists and is registered; nothing consumes it yet. */
  | "registered-no-current-consumer"
  /** The consumer exists, the art does not, and a request says so. */
  | "blocked-by-missing-art"
  /** The art exists; the canonical fact that would justify showing it does not. */
  | "blocked-by-missing-canonical-state"
  /** The seam is in a module another lane owns. */
  | "blocked-by-owning-lane"
  /** Reachable only from a development route. */
  | "development-fixture-only";

export interface SceneConsumerDeclaration {
  readonly consumerId: string;
  /** What a player is doing when they see it. Never a component name. */
  readonly label: string;
  /** Where the surface lives, so a reviewer can go and look. */
  readonly runtimeComponent: string;
  /** The canonical fact that decides whether this surface appears at all. */
  readonly canonicalGate: string;
  /**
   * The scene it resolves, or null when no scene is resolved today. Null is a
   * statement, not a gap in this file: it means nothing in the runtime picks a
   * room for this surface.
   */
  readonly sceneId: string | null;
  /**
   * The module that actually paints it. Null means nothing does, which is what
   * separates "registered" from "wired".
   */
  readonly wiredThrough: string | null;
  /**
   * Structured ART request ids, from `art/requests/asset-requests.json`.
   * Art only: a picture that does not exist yet.
   */
  readonly openRequestIds: readonly string[];
  /**
   * The integration owed by somebody, when the art is not the blocker.
   *
   * Kept apart from `openRequestIds` because they are answered by different
   * people. An art request is answered by making a picture; a seam is answered
   * by a component calling something that already works, and filing one as the
   * other is how a solved gap keeps being re-commissioned.
   */
  readonly blockedSeam: string | null;
  /** Why this consumer is in the state it is in, for a reviewer. */
  readonly note: string;
}

export interface SceneConsumerReport extends SceneConsumerDeclaration {
  readonly disposition: SceneConsumerDisposition;
  readonly sceneLabel: string | null;
  readonly hasProductionPlate: boolean;
}

/**
 * The declarations.
 *
 * Ordered the way a life runs through them rather than the way the code is laid
 * out, because the question a reviewer asks is "what does the player see", not
 * "what does the bundle contain".
 */
export const SCENE_CONSUMERS: readonly SceneConsumerDeclaration[] = [
  {
    consumerId: "title-no-save",
    label: "The title screen, before any life exists",
    runtimeComponent: "src/player/TitleScreen.tsx",
    canonicalGate: "None. This is the front door.",
    sceneId: TITLE_TABLEAU_SCENE_ID,
    wiredThrough: "src/player/TitleTableau.tsx",
    openRequestIds: [],
    blockedSeam: null,
    note: "The approved community-meeting master, empty. Nothing is composed into it, and the audience in the picture is painted decor rather than characters.",
  },
  {
    consumerId: "title-recent-save",
    label: "The title screen, showing the most recent life",
    runtimeComponent: "src/player/TitleScreen.tsx",
    canonicalGate:
      "The save summary's age and whether a residence is on record. Office and legislature are NOT on the summary and are never inferred.",
    sceneId: DOMESTIC_CANONICAL_SCENE_ID,
    wiredThrough: "src/player/TitleTableau.tsx",
    openRequestIds: ["person-production-standing-body"],
    blockedSeam: null,
    note: "An adult with a residence gets an ordinary living room. No production person art exists, so the room carries their name rather than a figure of them.",
  },
  {
    consumerId: "ordinary-domestic-life",
    label: "An ordinary day at home",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate: "The character has an open ordinary week.",
    sceneId: DOMESTIC_ORDINARY_SCENE_ID,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam:
      "OrdinaryDayView lives in PlayerGame.tsx and paints no backdrop. The seam is one <SceneBackdrop sceneId={...}> around the existing section.",
    note: "The plate is released and the scene is registered, so the art is selectable today. The surface that would paint it lives inside PlayerGame.tsx, which another lane owns; the seam is one component away and is tracked as a request rather than taken here.",
  },
  {
    consumerId: "household-conversation",
    label: "Talking to somebody at home",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate: "A household member is available to talk to.",
    sceneId: DOMESTIC_ORDINARY_SCENE_ID,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam:
      "The household conversation renders inside whatever room the ordinary-day surface resolves, so it lands with the same seam.",
    note: "Same room, same released plate, same owning lane. The conversation does not own the room; it runs inside whatever room the surface above resolves.",
  },
  {
    consumerId: "formative-years",
    label: "The growing-up years",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate: "The character is inside their formative interval.",
    sceneId: DOMESTIC_ORDINARY_SCENE_ID,
    wiredThrough: null,
    openRequestIds: ["person-child-body-morphology"],
    blockedSeam:
      "FormativeYearsView lives in PlayerGame.tsx and paints no backdrop. It takes the same seam as the ordinary day, and must pass no character to it.",
    note: "A domestic plate is admissible as atmosphere. A CHILD FIGURE IS NOT: every banked body is adult, and scaling one down produces a miniature adult. Whatever paints this room paints it empty until child morphology exists.",
  },
  {
    consumerId: "production-office",
    label: "A shared staff workroom",
    runtimeComponent: "src/ui/ProductionOfficeProofView.tsx",
    canonicalGate: "Development route only, at ?view=production-office.",
    sceneId: PRODUCTION_OFFICE_SCENE_ID,
    wiredThrough: "src/ui/ProductionOfficeProofView.tsx",
    openRequestIds: ["person-production-seated-body"],
    blockedSeam: null,
    note: "The production plate paints; every person anchor fails closed and says which anchor and why, rather than drawing a development mannequin on a production plate.",
  },
  {
    consumerId: "council-staff-office",
    label: "A municipal council staff office",
    runtimeComponent: "src/player/PlayerOffice.tsx",
    canonicalGate:
      "A legislative job whose jurisdiction is Lexington-Fayette. Nothing weaker: this plate has a Fayette County map on its wall.",
    sceneId: OFFICE_FIXTURE_SCENE_ID,
    wiredThrough: "src/player/OfficeScene.tsx",
    openRequestIds: [],
    blockedSeam: null,
    note: "Frozen development fixture, kept as regression evidence. It is quarantined from the title screen and from every generic office use.",
  },
  {
    consumerId: "committee-hearing",
    label: "A committee hearing",
    runtimeComponent: "src/ui/ScenePresentationProofView.tsx",
    canonicalGate: "No canonical hearing surface exists in the player runtime.",
    sceneId: HEARING_ROOM_SCENE_ID,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam:
      "A canonical committee proceeding for a player to attend. That is legislation-lane work; the room is ready and waiting for it.",
    note: "This one flipped: a production hearing-room master arrived after the consumer map was written, so the art is no longer the blocker. What is missing is the canonical committee proceeding for a player to attend, which is legislation-lane work and is not invented here.",
  },
  {
    consumerId: "committee-room-fixture",
    label: "A committee room with no picture of it",
    runtimeComponent: "src/ui/ScenePresentationProofView.tsx",
    canonicalGate: "Development route only, at ?view=scene-proof.",
    sceneId: COMMITTEE_FIXTURE_SCENE_ID,
    wiredThrough: "src/ui/ScenePresentationProofView.tsx",
    openRequestIds: [],
    blockedSeam: null,
    note: "Kept deliberately after the hearing room arrived. It is the standing proof that a scene with no raster registers, composes and reports itself honestly instead of borrowing another room's picture.",
  },
  {
    consumerId: "legislative-chamber-floor",
    label: "The chamber floor",
    runtimeComponent: "src/player/LegislationWorkspace.tsx",
    canonicalGate: "A legislative session the character sits in.",
    sceneId: LEGISLATIVE_CHAMBER_SCENE_ID,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam:
      "A canonical floor session for a player to attend, and a backdrop seam in LegislationWorkspace.tsx. Both are legislation-lane work; the room is ready and waiting for them.",
    note: "This one flipped too: a generic chamber master arrived in Packet 71 and is now released and registered, with a rostrum contact measured separately from the well floor. The art is no longer the blocker.",
  },
  {
    consumerId: "executive-private-office",
    label: "An executive's private study",
    runtimeComponent: "none",
    canonicalGate:
      "An executive capability. `resolvePlayerCapabilities` has no such capability, so no life can currently reach this room.",
    sceneId: null,
    wiredThrough: null,
    openRequestIds: ["env-executive-office-4k-master"],
    blockedSeam:
      "An executive capability in `resolvePlayerCapabilities`. That is simulation work and is not invented to give a picture somewhere to go.",
    note: "The master is banked and registered and deliberately unreleased, for two independent reasons: at 1672px it is below the environment master minimum, and no canonical executive state exists to justify showing it. Registering art is not permission to invent the life that would use it.",
  },
  {
    consumerId: "courtroom",
    label: "A courtroom",
    runtimeComponent: "none",
    canonicalGate: "No judicial surface exists in this game.",
    sceneId: null,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam: null,
    note: "The master is banked and registered with no tier derived. It is here so the picture is not lost, not because a courtroom is coming.",
  },
  {
    consumerId: "campaign-field-office",
    label: "A campaign office",
    runtimeComponent: "none",
    canonicalGate: "No campaign surface exists in the player runtime yet.",
    sceneId: null,
    wiredThrough: null,
    openRequestIds: ["env-campaign-storefront"],
    blockedSeam: "A campaign surface in the player runtime.",
    note: "Neither the room nor the surface exists. Both are named so the gap is one record rather than two silences.",
  },
];

/** Derives the disposition of one consumer from what is actually registered. */
export function reportSceneConsumer(
  declaration: SceneConsumerDeclaration,
  registry: SceneRegistry = SCENE_REGISTRY,
): SceneConsumerReport {
  const scene =
    declaration.sceneId === null
      ? null
      : (registry.scenes.get(declaration.sceneId) ?? null);
  const hasProductionPlate =
    scene !== null &&
    scene.presentationStatus === "production" &&
    scene.raster !== null;

  const disposition = ((): SceneConsumerDisposition => {
    if (scene === null) {
      // Nothing resolves a room. Which silence it is depends on whether the
      // missing thing is the picture or the fact that would justify it.
      return declaration.openRequestIds.some((id) => id.startsWith("env-"))
        ? "blocked-by-missing-art"
        : "blocked-by-missing-canonical-state";
    }
    if (declaration.wiredThrough === null) {
      return declaration.runtimeComponent.startsWith("src/player/PlayerGame")
        ? "blocked-by-owning-lane"
        : hasProductionPlate
          ? "registered-no-current-consumer"
          : "blocked-by-missing-canonical-state";
    }
    if (hasProductionPlate) return "wired-to-production-art";
    if (declaration.canonicalGate.includes("Development route only")) {
      return "development-fixture-only";
    }
    return "wired-to-honest-fallback";
  })();

  return {
    ...declaration,
    disposition,
    sceneLabel: scene?.label ?? null,
    hasProductionPlate,
  };
}

export function reportSceneConsumers(
  registry: SceneRegistry = SCENE_REGISTRY,
): readonly SceneConsumerReport[] {
  return SCENE_CONSUMERS.map((declaration) =>
    reportSceneConsumer(declaration, registry),
  );
}

/**
 * Registered production scenes that no consumer names.
 *
 * This is the check that stops an approved plate from being ingested, hashed,
 * registered — and then quietly forgotten, which is the failure the whole
 * inventory discipline exists to prevent.
 */
export function unconsumedProductionScenes(
  registry: SceneRegistry = SCENE_REGISTRY,
): readonly string[] {
  const named = new Set(
    SCENE_CONSUMERS.map((consumer) => consumer.sceneId).filter(
      (sceneId): sceneId is string => sceneId !== null,
    ),
  );
  return [...registry.scenes.values()]
    .filter(
      (scene) =>
        scene.presentationStatus === "production" && !named.has(scene.sceneId),
    )
    .map((scene) => scene.sceneId)
    .sort();
}
