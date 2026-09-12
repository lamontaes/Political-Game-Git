import {
  COMMITTEE_FIXTURE_SCENE_ID,
  COURTROOM_SCENE_ID,
  DOMESTIC_CANONICAL_SCENE_ID,
  DOMESTIC_ORDINARY_SCENE_ID,
  HEARING_ROOM_SCENE_ID,
  LEGISLATIVE_CHAMBER_SCENE_ID,
  OFFICE_FIXTURE_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
  PUBLIC_MEETING_ROOM_SCENE_ID,
  CAMPAIGN_STOREFRONT_SCENE_ID,
  PARK_COMMUNITY_PAVILION_SCENE_ID,
  EXECUTIVE_OFFICE_SCENE_ID,
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
    wiredThrough: "src/player/SceneBackdrop.tsx",
    openRequestIds: [],
    blockedSeam: null,
    note: "CLOSED. This entry read 'paints no backdrop' long after it stopped being true: PlayerGame.tsx calls `resolveLifeScene` and wraps the moment in <SceneBackdrop>. Corrected by ENV-ALL1 rather than left as a request for work already done, which is how a solved gap keeps being re-commissioned.",
  },
  {
    consumerId: "household-conversation",
    label: "Talking to somebody at home",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate: "A household member is available to talk to.",
    sceneId: DOMESTIC_ORDINARY_SCENE_ID,
    wiredThrough: "src/player/SceneBackdrop.tsx",
    openRequestIds: [],
    blockedSeam: null,
    note: "Closed with the surface above, and for the same reason: the conversation does not own the room, it runs inside whatever room that surface resolves.",
  },
  {
    consumerId: "formative-years",
    label: "The growing-up years",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate: "The character is inside their formative interval.",
    sceneId: DOMESTIC_ORDINARY_SCENE_ID,
    wiredThrough: null,
    openRequestIds: ["person-child-body-morphology"],
    blockedSeam: null,
    note: "The ROOM is wired, through the same backdrop as the ordinary day. The PERSON is not, and that half is unchanged: a domestic plate is admissible as atmosphere, and A CHILD FIGURE IS NOT. Every banked body is adult, scaling one down produces a miniature adult, and this room stays empty until child morphology exists. The art request is the live half of this entry.",
  },
  {
    consumerId: "ordinary-public-meeting",
    label: "Going to the posted public meeting",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate:
      "Actual completed attendance at `ordinary-life:meeting-room`, with canonical completion-event participant evidence at the current instant. Calendar presence alone is insufficient.",
    sceneId: PUBLIC_MEETING_ROOM_SCENE_ID,
    wiredThrough: "src/presentation/scene-venues.ts",
    openRequestIds: [],
    blockedSeam: null,
    note: "The released community-hall plate supports the immediate aftermath of actual attendance. The feature-local VenueActivityPanel and canonical execution adapter are implemented; normal-root integration is delivered in docs/integration/env-all1-ui-core.patch. This does not establish persistent location or travel.",
  },
  {
    consumerId: "legislative-staff-workroom",
    label: "A day of legislative staff work",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate:
      "A completed activity with participant evidence at the canonical location `lexington-legislative-office`. Today that key is written ONLY by `createRunDLiteFixture`, so this is reachable from `?view=office-fixture` and from no ordinary life.",
    sceneId: PRODUCTION_OFFICE_SCENE_ID,
    wiredThrough: "src/presentation/scene-venues.ts",
    openRequestIds: ["person-production-seated-body"],
    blockedSeam:
      "A PRODUCTION path that schedules a located day of legislative staff work. The room, the plate and the venue mapping are all in place and proven; nothing outside the Run D-Lite development fixture writes the location key that reaches them.",
    note: "The UNSCOPED production workroom, deliberately, and not the council-staff fixture: that plate has a Fayette County map on its wall and is quarantined to its own consumer. This entry was written claiming ordinary play and CORRECTED when the review page's own exercise ran on the real build and returned no room for a fresh legislative start. That is what the exercise is for.",
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
      "A LOCATED committee hearing. The proceeding itself is no longer missing — `scheduleCommitteeHearing`, `COMMITTEE_HEARING_TRANSITION_KEY` and `recordCommitteeDisposition` are all canonical — but a hearing is scheduled as a future due item, which carries no `location.locationKey`. The venue table in `scene-venues.ts` maps location keys to rooms and has nothing to map. An explicit room kind, actual attendance and a player consumer remain necessary.",
    note: "This one narrowed twice. The art stopped being the blocker when the production master arrived; the PROCEEDING stopped being the blocker when committee hearings became canonical. What is left is smaller than either: a hearing that says where it happens. Legislation-lane work, not invented here.",
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
      "A LOCATED floor session, exactly as for the hearing room above. `takeFloorVote` is canonical; nothing about it declares a room, so the venue table cannot reach the chamber.",
    note: "The art has not been the blocker since Packet 71 released the generic chamber master with a rostrum contact measured separately from the well floor. A located session, actual participant evidence and a player consumer remain necessary; the existing members’ room must retain its separate meaning.",
  },
  {
    consumerId: "executive-private-office",
    label: "An executive's private study",
    runtimeComponent: "none",
    canonicalGate:
      "Candidate preview surface. A source-confirmed executive workplace and released production scene remain needed for gameplay.",
    sceneId: EXECUTIVE_OFFICE_SCENE_ID,
    wiredThrough: null,
    openRequestIds: ["env-executive-office-4k-master"],
    blockedSeam:
      "Owner visual acceptance of candidate IMG_5189.JPG and executive owner workplace activity integration.",
    note: "CANDIDATE FIXTURE. Authored against swept 5504x3072 master IMG_5189.JPG and registered as candidate fixture 'executive-office-candidate' answering request 'env-executive-office-4k-master'. Kept candidate-isolated pending human visual acceptance.",
  },
  {
    consumerId: "courtroom",
    label: "A courtroom",
    runtimeComponent: "none",
    canonicalGate:
      "The JUD-WORK2 transfer provides office preparation, but no source-confirmed courtroom kind or proceeding attendance.",
    sceneId: COURTROOM_SCENE_ID,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam:
      "A source-confirmed courtroom consumer, actual participant evidence and explicit art release. The JUD-WORK2 office preparation location cannot establish a courtroom.",
    note: "CARRIED, NOT RELEASED. ENV-ALL1 derived the two runtime tiers, authored the anchors, occluders and slots against the plate, and registered `courtroom-empty-production`. The manifest entry stays `unreleased`. Recovered geometry is visual-estimate evidence; no calibrated floor, measured body width, alpha furniture mask or human visual acceptance is claimed.",
  },
  {
    consumerId: "campaign-field-office",
    label: "A campaign office",
    runtimeComponent: "src/player/PlayerGame.tsx",
    canonicalGate:
      "A completed activity with participant evidence at canonical location `campaign-office` or `campaign-call-desk`.",
    sceneId: CAMPAIGN_STOREFRONT_SCENE_ID,
    wiredThrough: "src/presentation/scene-venues.ts",
    openRequestIds: [],
    blockedSeam: null,
    note: "The campaign storefront field office is authored as production art and registered as `campaign-storefront-production`. Canonical activities `campaign-office` and `campaign-call-desk` resolve to this room via `scene-venues.ts` and compose through `resolveLifeScene` into <SceneBackdrop>.",
  },
  {
    consumerId: "park-community-pavilion",
    label: "A community park pavilion shelter",
    runtimeComponent: "none",
    canonicalGate:
      "Candidate preview surface. Normal-play reachability is isolated pending human visual acceptance.",
    sceneId: PARK_COMMUNITY_PAVILION_SCENE_ID,
    wiredThrough: null,
    openRequestIds: [],
    blockedSeam:
      "Human visual acceptance and an exterior location activity producer in normal play.",
    note: "CANDIDATE ART. Preserves AX-92B1 intake invariants. The scene is authored and registered under candidate isolation, deliberately unreached by canonical venue keys.",
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
