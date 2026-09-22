/**
 * ANY THREAD CAN SAY A PICTURE IS MISSING.
 *
 * `asset-request.ts` is the durable form of a missing picture, and it is
 * deliberately demanding: it wants the inventory that was searched, a
 * generator-independent recipe and criteria a delivery can fail. That is the
 * right shape for the Art Bench, and the wrong shape for the moment a gap is
 * actually noticed. A playtest that walks a player into a community room with
 * no plate behind it knows four things — what is missing, where it is needed,
 * which jurisdiction it was standing in, and why it mattered — and knows none
 * of the rest. Requiring the rest is how a noticed gap becomes a sentence in a
 * report nobody reconciles.
 *
 * So this module is the front door, not a second queue. An intake record is a
 * PRE-request: strict about the four things the noticer genuinely knows,
 * silent about the things only the bench can establish. `promoteToAssetRequest`
 * is the one documented way out of here, and it carries the record into the
 * existing `AssetRequest` shape rather than around it. There is no second
 * lifecycle, no second validator for bytes, and no second answer to "was this
 * accepted" — `asset-lineage` and `asset-bank` still own that.
 *
 * WHY ONE FILE PER RECORD. These land in `art/requests/incoming/`, one JSON
 * file named for the request id. Threads file concurrently from separate
 * branches; a shared array would conflict on every second write and the
 * conflict would be resolved by whoever merged last, silently dropping an ask.
 * A new file collides with nothing. The directory IS the queue.
 *
 * WHAT IT WILL NOT LET YOU DO. It will not let you file a gap with no place in
 * the game attached to it, because a picture with no consumer is a wish. It
 * will not accept "unknown" as a jurisdiction: a record may honestly say the
 * gap is jurisdiction-independent, but it may not leave the question blank and
 * have that read later as nationwide. And it will not accept a seed, a digest
 * or a single word as a name, for the reasons `asset-request.ts` gives.
 *
 * Browser-safe: no Node imports. The filesystem half is the CLI under
 * `scripts/art-asset-factory/cli-request-intake.ts`.
 */

import type { AssetRequest, AssetRequestPriority } from "./asset-request";
import type { AssetTargetClass } from "./asset-lineage";
import { ASSET_TARGET_CLASSES } from "./asset-lineage";
import type { EnvironmentClass } from "./asset-compatibility";
import { ENVIRONMENT_CLASSES } from "./asset-compatibility";
import type {
  RegionalLandform,
  RegionalSceneKind,
  RegionalSeason,
} from "./regional-scene-coverage";
import {
  REGIONAL_LANDFORMS,
  REGIONAL_SCENE_KINDS,
} from "./regional-scene-coverage";
import type { PosePostureClass } from "../presentation/pose-families";
import { POSE_POSTURE_CLASSES } from "../presentation/pose-families";

export const ART_REQUEST_INTAKE_VERSION = "art-request-intake/v1" as const;

/** Where intake records live, relative to the repository root. */
export const ART_REQUEST_INTAKE_DIRECTORY = "art/requests/incoming";

/**
 * How the gap was noticed. This is provenance, not priority: a gap found by a
 * playtest is not automatically more urgent than one found by reading code, but
 * the two are chased down differently and the difference is worth recording.
 */
export type ArtRequestOrigin =
  /** A person or a thread played the game and hit the gap. */
  | "playtest"
  /** A simulation or presentation surface has a consumer with nothing to paint. */
  | "runtime-gap"
  /** Found by reading the catalog, the bank or the code, not by playing. */
  | "inspection"
  /** The owner asked for it directly. */
  | "owner-request";

export const ART_REQUEST_ORIGINS: readonly ArtRequestOrigin[] = [
  "playtest",
  "runtime-gap",
  "inspection",
  "owner-request",
];

/**
 * The jurisdiction the gap was observed in.
 *
 * `scope: "jurisdiction-independent"` is a real answer and the honest one for a
 * generic doorstep or an interior that looks the same in every state. It is not
 * the same as not knowing, and it is not a licence to reuse one plate
 * everywhere — `asset-compatibility.ts` still decides reuse.
 */
export type ArtRequestJurisdiction =
  | {
      readonly scope: "jurisdiction-independent";
      /** Why the gap does not depend on where the player is. */
      readonly reason: string;
    }
  | {
      readonly scope: "specific";
      /**
       * The jurisdiction record's own id where one is known, so the record
       * reconciles against real government units rather than a place name
       * somebody typed. Absent when the noticer only had the display name.
       */
      readonly jurisdictionId?: string;
      /** What the game called the place on screen. */
      readonly displayName: string;
      /** USPS state or territory code, when the place has one. */
      readonly stateCode?: string;
    };

/**
 * Where in the game the missing picture belongs.
 *
 * `runtimeComponent` is a real path a reviewer can open. "none" is allowed and
 * means the consumer does not exist yet, which is a different fact from a
 * consumer that exists and paints nothing.
 */
/**
 * What the picture has to show, asked for at the point of asking.
 *
 * The regional scenes are the case that proves the need. Three of them were
 * requested with a season in the prose — "explicitly winter", "green summer
 * canopy" — and nothing in the record a tool could act on, so the constraint
 * survived only as long as somebody remembered reading it. A picture's season
 * belongs in the request, in the same vocabulary the resolver uses, so it can
 * become an acceptance criterion a delivery can fail rather than a sentence in
 * a brief.
 *
 * Every field is optional in the type and required by context: an outdoor plate
 * must declare its seasons, landform and kind of view, and a community room
 * must not be made to classify vegetation to report that it has no art. The
 * validator, not the type, knows which request is which.
 */
export interface ArtRequestVisualContext {
  /** The times of year the delivered picture may show. */
  readonly seasons?: readonly RegionalSeason[];
  readonly landform?: RegionalLandform;
  /** Slugs: `dry-grass`, `moss-draped-conifer`. */
  readonly vegetation?: readonly string[];
  /** Slugs: `brick-commercial-main-street`, `craftsman-bungalow-street`. */
  readonly builtForm?: readonly string[];
  readonly sceneKind?: RegionalSceneKind;
  /** Anything else about the look that a delivery could get wrong. */
  readonly note?: string;
}

/**
 * The environment classes that are outdoors, and so have weather and a season.
 *
 * A civic interior has neither, and asking a playtesting thread to classify the
 * landform of a community room would be the sort of paperwork that stops gaps
 * being reported at all.
 */
export const OUTDOOR_ENVIRONMENT_CLASSES: readonly EnvironmentClass[] = [
  "park-exterior",
  "street-exterior",
  "threshold-exterior",
  "landmark-exterior",
];

/**
 * What a figure request has to declare about the body's posture.
 *
 * The case that proves the need: a person assigned to a chair was drawn by a
 * body plate labelled `seated` that is actually an upright figure with shorter
 * legs. Every contact assertion passed — pelvis on the seat plane, soles on
 * the floor — and it still looked like someone standing behind the chair,
 * because "seated" was a filename rather than a checkable claim. So a figure
 * request names its posture in the same canonical vocabulary the pose families
 * use (`POSE_POSTURE_CLASSES`), and, for a posture that is not plain standing,
 * the visible cues a merely shorter figure would fail.
 */
export interface ArtRequestFigureContext {
  readonly postureClass: PosePostureClass;
  /**
   * The visible marks of the posture, as slugs: `bent-knees`, `thighs-forward`.
   * Required for a non-standing posture, because they are what a reviewer fails
   * a wrong pose on, and what tells a real seated figure from a short standing
   * one. A standing figure needs none.
   */
  readonly postureCues?: readonly string[];
  /** Which way the figure faces, when it matters. Free text. */
  readonly facing?: string;
  /** Anything else about the body a delivery could get wrong. */
  readonly note?: string;
}

/**
 * Postures whose whole point is that the body is not upright.
 *
 * For these, "declared the posture" is not enough: the request must also say
 * what makes it that posture, or the delivery that got it wrong — a short
 * upright figure — satisfies the record.
 */
export const NON_STANDING_POSTURES: readonly PosePostureClass[] =
  POSE_POSTURE_CLASSES.filter((posture) => posture !== "standing");

export interface ArtRequestConsumerSite {
  /** Matches an `AssetRequestConsumer.consumerId` when the consumer has one. */
  readonly consumerId?: string;
  /** A repository path, or "none" when nothing consumes this yet. */
  readonly runtimeComponent: string;
  /** What the player was doing when the gap showed. */
  readonly playerVisibleUse: string;
}

export interface ArtRequestIntakeRecord {
  readonly intakeVersion: typeof ART_REQUEST_INTAKE_VERSION;
  /** A stable semantic slug. Never a seed, a hash or a generator id. */
  readonly requestId: string;
  /** One line, in the terms an art brief would use. */
  readonly title: string;
  /** What is missing, in the noticer's own words. */
  readonly missing: string;
  readonly consumerSite: ArtRequestConsumerSite;
  readonly jurisdiction: ArtRequestJurisdiction;
  /** Why the gap matters for play. Not a restatement of `missing`. */
  readonly whyNeeded: string;
  readonly origin: ArtRequestOrigin;
  /** The thread, session or person filing this. Never blank. */
  readonly requestedBy: string;
  /** ISO 8601 instant the record was filed. */
  readonly filedAt: string;
  readonly priority: AssetRequestPriority;
  /** What the noticer believes is wanted. The bench may correct it. */
  readonly targetClass?: AssetTargetClass;
  readonly environmentClass?: EnvironmentClass;
  /**
   * What the picture must show. Required for an outdoor environment plate,
   * optional everywhere else.
   */
  readonly visualContext?: ArtRequestVisualContext;
  /**
   * What the body's posture is. Present on a figure request; its presence is
   * what tells the validator this is a figure rather than a plate, since the
   * intake's target vocabulary does not yet name a figure class.
   */
  readonly figureContext?: ArtRequestFigureContext;
  /**
   * Anything already looked at. Optional here, unlike on a bench request: a
   * noticer is not expected to sweep the catalog, and a promotion that carries
   * an empty check is refused until somebody does.
   */
  readonly alreadySearched?: readonly string[];
  /** Free-form notes: what it should contain, what it must not.  */
  readonly notes?: readonly string[];
  /**
   * The bench request this was promoted into, once it has been. Present means
   * finished: the record stays as history and is not worked again.
   */
  readonly promotedToRequestId?: string;
}

export type ArtRequestIntakeFindingCode =
  | "unknown-intake-version"
  | "seed-shaped-request-id"
  | "non-semantic-request-id"
  | "duplicate-request-id"
  | "missing-title"
  | "missing-what-is-missing"
  | "missing-why-needed"
  | "why-needed-restates-missing"
  | "missing-consumer-site"
  | "missing-player-visible-use"
  | "missing-jurisdiction-reason"
  | "blank-jurisdiction-display-name"
  | "unknown-state-code"
  | "missing-requested-by"
  | "invalid-filed-at"
  | "unknown-origin"
  | "unknown-priority"
  | "unknown-target-class"
  | "unknown-environment-class"
  | "environment-plate-without-environment-class"
  | "outdoor-plate-without-seasons"
  | "outdoor-plate-without-landform"
  | "outdoor-plate-without-scene-kind"
  | "outdoor-plate-without-vegetation-or-built-form"
  | "unknown-season"
  | "unknown-landform"
  | "unknown-scene-kind"
  | "unknown-posture-class"
  | "non-standing-posture-without-cues"
  | "figure-and-environment-context-together"
  | "promoted-record-still-open";

export interface ArtRequestIntakeFinding {
  readonly code: ArtRequestIntakeFindingCode;
  readonly severity: "error" | "warning";
  readonly requestId: string;
  readonly message: string;
}

export interface ArtRequestIntakeValidation {
  readonly valid: boolean;
  readonly findings: readonly ArtRequestIntakeFinding[];
}

const SEED_SHAPED = /^(?:seed[-_]?)?\d{4,}$/i;
const DIGEST_SHAPED = /^[0-9a-f]{16,}$/i;
const SEMANTIC_SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
const PRIORITIES: readonly AssetRequestPriority[] = ["P0", "P1", "P2"];
const SEASONS: readonly RegionalSeason[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

/** USPS codes for the fifty states, D.C. and the five inhabited territories. */
const STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  "AS",
  "GU",
  "MP",
  "PR",
  "VI",
]);

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Validate one batch of intake records.
 *
 * Every rule here is about whether somebody else can act on the record without
 * coming back to ask the author a question. Nothing here judges the art.
 */
export function validateArtRequestIntake(
  records: readonly ArtRequestIntakeRecord[],
): ArtRequestIntakeValidation {
  const findings: ArtRequestIntakeFinding[] = [];
  const seen = new Set<string>();

  const error = (
    code: ArtRequestIntakeFindingCode,
    requestId: string,
    message: string,
  ) => findings.push({ code, severity: "error", requestId, message });
  const warn = (
    code: ArtRequestIntakeFindingCode,
    requestId: string,
    message: string,
  ) => findings.push({ code, severity: "warning", requestId, message });

  for (const record of records) {
    const { requestId } = record;

    if (record.intakeVersion !== ART_REQUEST_INTAKE_VERSION) {
      error(
        "unknown-intake-version",
        requestId,
        `Intake version '${String(record.intakeVersion)}' is not ${ART_REQUEST_INTAKE_VERSION}.`,
      );
    }

    if (seen.has(requestId)) {
      error(
        "duplicate-request-id",
        requestId,
        `Two intake records share the id '${requestId}'. An id is how a gap is reconciled; two of them is two gaps.`,
      );
    }
    seen.add(requestId);

    if (SEED_SHAPED.test(requestId) || DIGEST_SHAPED.test(requestId)) {
      error(
        "seed-shaped-request-id",
        requestId,
        `'${requestId}' reads as a generator seed or digest. Identity is semantic and searchable, never a roll of a model's dice.`,
      );
    } else if (!SEMANTIC_SLUG.test(requestId)) {
      error(
        "non-semantic-request-id",
        requestId,
        `'${requestId}' is not a lowercase hyphenated slug of at least two words. A one-word id is not searchable and will collide.`,
      );
    }

    if (!record.title?.trim()) {
      error("missing-title", requestId, `A record needs a one-line title.`);
    }
    if (!record.missing?.trim()) {
      error(
        "missing-what-is-missing",
        requestId,
        `Say what picture is absent. This is the whole point of the record.`,
      );
    }
    if (!record.whyNeeded?.trim()) {
      error(
        "missing-why-needed",
        requestId,
        `Say why the gap matters for play, so somebody can rank it against other gaps.`,
      );
    } else if (
      record.missing?.trim() &&
      normalize(record.whyNeeded) === normalize(record.missing)
    ) {
      warn(
        "why-needed-restates-missing",
        requestId,
        `'whyNeeded' repeats 'missing'. What is absent and why it matters are different facts.`,
      );
    }

    const site = record.consumerSite;
    if (!site?.runtimeComponent?.trim()) {
      error(
        "missing-consumer-site",
        requestId,
        `Name the runtime component the picture belongs to, or "none" when no consumer exists yet. A picture with no place in the game is a wish.`,
      );
    }
    if (!site?.playerVisibleUse?.trim()) {
      error(
        "missing-player-visible-use",
        requestId,
        `Say what the player would be doing when they saw it.`,
      );
    }

    const jurisdiction = record.jurisdiction;
    if (jurisdiction?.scope === "jurisdiction-independent") {
      if (!jurisdiction.reason?.trim()) {
        error(
          "missing-jurisdiction-reason",
          requestId,
          `Jurisdiction-independent is a claim and needs its reason. Unknown is not independent, and a blank answer reads later as nationwide.`,
        );
      }
    } else if (jurisdiction?.scope === "specific") {
      if (!jurisdiction.displayName?.trim()) {
        error(
          "blank-jurisdiction-display-name",
          requestId,
          `A specific jurisdiction needs the name the game showed the player.`,
        );
      }
      const code = jurisdiction.stateCode;
      if (code !== undefined && !STATE_CODES.has(code.toUpperCase())) {
        error(
          "unknown-state-code",
          requestId,
          `'${code}' is not a USPS state, district or territory code.`,
        );
      }
      if (!jurisdiction.jurisdictionId?.trim()) {
        warn(
          "blank-jurisdiction-display-name",
          requestId,
          `No jurisdiction id recorded, only the display name. The record still reconciles by hand, but not automatically.`,
        );
      }
    } else {
      error(
        "missing-jurisdiction-reason",
        requestId,
        `Every record answers the jurisdiction question, as "specific" or as "jurisdiction-independent" with its reason.`,
      );
    }

    if (!record.requestedBy?.trim()) {
      error(
        "missing-requested-by",
        requestId,
        `Record who filed this, so the bench can come back with a question.`,
      );
    }

    if (
      !record.filedAt ||
      Number.isNaN(Date.parse(record.filedAt)) ||
      !/^\d{4}-\d{2}-\d{2}T/.test(record.filedAt)
    ) {
      error(
        "invalid-filed-at",
        requestId,
        `'filedAt' must be an ISO 8601 instant.`,
      );
    }

    if (!ART_REQUEST_ORIGINS.includes(record.origin)) {
      error(
        "unknown-origin",
        requestId,
        `Origin '${String(record.origin)}' is not one of ${ART_REQUEST_ORIGINS.join(", ")}.`,
      );
    }
    if (!PRIORITIES.includes(record.priority)) {
      error(
        "unknown-priority",
        requestId,
        `Priority '${String(record.priority)}' is not P0, P1 or P2.`,
      );
    }
    if (
      record.targetClass !== undefined &&
      !ASSET_TARGET_CLASSES.includes(record.targetClass)
    ) {
      error(
        "unknown-target-class",
        requestId,
        `Target class '${record.targetClass}' is not one of ${ASSET_TARGET_CLASSES.join(", ")}.`,
      );
    }
    if (
      record.environmentClass !== undefined &&
      !ENVIRONMENT_CLASSES.includes(record.environmentClass)
    ) {
      error(
        "unknown-environment-class",
        requestId,
        `Environment class '${record.environmentClass}' is not in the closed set.`,
      );
    }

    /**
     * An outdoor plate has to say what it shows, here and not later.
     *
     * This is the gap that let three regional scenes be requested with their
     * season only in the prose. Indoors none of it applies, and a thread
     * reporting that a community room has no art is not asked to classify
     * vegetation to be taken seriously.
     */
    const context = record.visualContext;
    for (const season of context?.seasons ?? []) {
      if (!SEASONS.includes(season)) {
        error("unknown-season", requestId, `'${season}' is not a season.`);
      }
    }
    if (context?.landform && !REGIONAL_LANDFORMS.includes(context.landform)) {
      error(
        "unknown-landform",
        requestId,
        `'${context.landform}' is not a landform in the shared vocabulary.`,
      );
    }
    if (
      context?.sceneKind &&
      !REGIONAL_SCENE_KINDS.includes(context.sceneKind)
    ) {
      error(
        "unknown-scene-kind",
        requestId,
        `'${context.sceneKind}' is not a kind of view.`,
      );
    }

    if (record.targetClass === "environment-plate") {
      if (!record.environmentClass) {
        error(
          "environment-plate-without-environment-class",
          requestId,
          `An environment plate must say which kind of environment it is. Indoors and outdoors are asked different questions, and the answer decides which.`,
        );
      } else if (
        OUTDOOR_ENVIRONMENT_CLASSES.includes(record.environmentClass)
      ) {
        if (!context?.seasons?.length) {
          error(
            "outdoor-plate-without-seasons",
            requestId,
            `An outdoor plate must name the seasons it may show. A season written only in prose is how a winter scene ends up standing in for July: nothing can act on it.`,
          );
        }
        if (!context?.landform) {
          error(
            "outdoor-plate-without-landform",
            requestId,
            `An outdoor plate must name its landform. It is what tells two pictures of one place apart from two pictures of different places.`,
          );
        }
        if (!context?.sceneKind) {
          error(
            "outdoor-plate-without-scene-kind",
            requestId,
            `An outdoor plate must say whether it is an open landscape, a street or a shoreline, because that decides how it may be captioned.`,
          );
        }
        if (
          !(context?.vegetation?.length ?? 0) &&
          !(context?.builtForm?.length ?? 0)
        ) {
          warn(
            "outdoor-plate-without-vegetation-or-built-form",
            requestId,
            `Neither vegetation nor built form is named, so nothing in this record says what the picture should actually contain. Honest if the noticer could not tell; a thin brief either way.`,
          );
        }
      }
    }

    /**
     * A figure request declares its posture, and a non-standing one says what
     * makes it that posture.
     *
     * This is the seated-chair case: a plate labelled `seated` that is really
     * a short upright figure passed every geometric contact check. The cues
     * are what a reviewer fails the wrong pose on, so a seated request without
     * them is a filename again.
     */
    const figure = record.figureContext;
    if (figure) {
      if (record.visualContext) {
        error(
          "figure-and-environment-context-together",
          requestId,
          `A record carries both a figure posture and an environment context. One request is a body or a plate, not both; split them.`,
        );
      }
      if (!POSE_POSTURE_CLASSES.includes(figure.postureClass)) {
        error(
          "unknown-posture-class",
          requestId,
          `'${figure.postureClass}' is not a posture class. The pose families own the closed set, so a body request speaks the same words as the poses it will fill.`,
        );
      } else if (
        NON_STANDING_POSTURES.includes(figure.postureClass) &&
        !(figure.postureCues?.length ?? 0)
      ) {
        error(
          "non-standing-posture-without-cues",
          requestId,
          `A '${figure.postureClass}' request must name the visible cues that make it that posture, such as bent knees and thighs forward. Without them a shorter upright figure satisfies the request, which is exactly the delivery this field exists to reject.`,
        );
      }
    }

    if (record.promotedToRequestId !== undefined) {
      if (!record.promotedToRequestId.trim()) {
        error(
          "promoted-record-still-open",
          requestId,
          `'promotedToRequestId' is present but blank. Either it was promoted and names the bench request, or the field is absent.`,
        );
      }
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

/** Records still wanting something. Promoted records are history. */
export function openIntakeRecords(
  records: readonly ArtRequestIntakeRecord[],
): readonly ArtRequestIntakeRecord[] {
  return records.filter((record) => !record.promotedToRequestId);
}

export interface ArtRequestIntakeSummary {
  readonly total: number;
  readonly open: number;
  readonly byPriority: Readonly<Record<AssetRequestPriority, number>>;
  readonly byOrigin: Readonly<Partial<Record<ArtRequestOrigin, number>>>;
  /** How many open records name a specific jurisdiction. */
  readonly jurisdictionSpecific: number;
}

export function summarizeArtRequestIntake(
  records: readonly ArtRequestIntakeRecord[],
): ArtRequestIntakeSummary {
  const open = openIntakeRecords(records);
  const byPriority: Record<AssetRequestPriority, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
  };
  const byOrigin: Partial<Record<ArtRequestOrigin, number>> = {};
  for (const record of open) {
    if (PRIORITIES.includes(record.priority)) byPriority[record.priority] += 1;
    byOrigin[record.origin] = (byOrigin[record.origin] ?? 0) + 1;
  }
  return {
    total: records.length,
    open: open.length,
    byPriority,
    byOrigin,
    jurisdictionSpecific: open.filter(
      (record) => record.jurisdiction.scope === "specific",
    ).length,
  };
}

/** The file an intake record belongs in, relative to the repository root. */
export function intakeRecordPath(requestId: string): string {
  return `${ART_REQUEST_INTAKE_DIRECTORY}/${requestId}.json`;
}

export interface PromotionInputs {
  /** What was actually searched. A promotion with nothing searched is refused. */
  readonly repositoryPathsSearched: readonly string[];
  readonly driveLocationsSearched: readonly string[];
  /** What was found, including "nothing". */
  readonly found: string;
  /** Why what was found does not answer the record. */
  readonly shortfall: string;
  /** Generator-independent: what must be in the picture. */
  readonly generationRecipe: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly target: {
    readonly targetClass: AssetTargetClass;
    readonly minimumWidth: number;
    readonly aspectRatio: string;
    readonly alphaRequired: boolean;
    readonly container: "png" | "jpeg" | "either";
    readonly styleAuthority: string;
  };
}

export class IntakePromotionError extends Error {}

/**
 * Carry an intake record into the bench's own `AssetRequest` shape.
 *
 * This is the only documented way out of the intake queue, and it deliberately
 * demands the things intake did not: the inventory that was searched, a recipe
 * and criteria a delivery can fail. Promotion is where somebody takes
 * responsibility for the ask, which is why it cannot be done from the record
 * alone. The jurisdiction and the noticer survive into `whyNeeded`, because the
 * bench's reader is usually not the person who saw the gap.
 */
export function promoteToAssetRequest(
  record: ArtRequestIntakeRecord,
  inputs: PromotionInputs,
): AssetRequest {
  if (
    inputs.repositoryPathsSearched.length === 0 &&
    inputs.driveLocationsSearched.length === 0
  ) {
    throw new IntakePromotionError(
      `Cannot promote '${record.requestId}': nothing was searched. Commissioning art the project already owns is the failure the inventory check exists to stop.`,
    );
  }
  if (inputs.generationRecipe.length === 0) {
    throw new IntakePromotionError(
      `Cannot promote '${record.requestId}': a request with no recipe cannot be worked by anyone but its author.`,
    );
  }
  if (inputs.acceptanceCriteria.length === 0) {
    throw new IntakePromotionError(
      `Cannot promote '${record.requestId}': without acceptance criteria there is no way to say a delivery is wrong.`,
    );
  }

  const where =
    record.jurisdiction.scope === "specific"
      ? `Observed in ${record.jurisdiction.displayName}${
          record.jurisdiction.stateCode
            ? `, ${record.jurisdiction.stateCode.toUpperCase()}`
            : ""
        }.`
      : `Jurisdiction-independent: ${record.jurisdiction.reason}`;

  return {
    requestId: record.requestId,
    requestVersion: 1,
    priority: record.priority,
    status: "queued",
    title: record.title.trim(),
    consumer: {
      consumerId: record.consumerSite.consumerId?.trim() || "unassigned",
      runtimeComponent: record.consumerSite.runtimeComponent.trim(),
      playerVisibleUse: record.consumerSite.playerVisibleUse.trim(),
    },
    whyNeeded: `${record.whyNeeded.trim()} ${where} Filed by ${record.requestedBy.trim()} on ${record.filedAt} (${record.origin}).`,
    inventoryCheck: {
      repositoryPathsSearched: [...inputs.repositoryPathsSearched],
      driveLocationsSearched: [...inputs.driveLocationsSearched],
      found: inputs.found,
      shortfall: inputs.shortfall,
    },
    target: { ...inputs.target },
    generationRecipe: [...inputs.generationRecipe],
    acceptanceCriteria: [
      ...visualCriteria(record.visualContext),
      ...postureCriteria(record.figureContext),
      ...inputs.acceptanceCriteria,
    ],
    dependsOn: [],
  };
}

/**
 * Turn the declared look into criteria a delivery can fail.
 *
 * This is the whole point of carrying the tags. "Explicitly winter" in a brief
 * is a hope; "a delivery showing any other time of year is wrong" at the top of
 * the acceptance criteria is a test. They are stated first because they are the
 * ones a reviewer can check without opening anything else.
 */
function visualCriteria(
  context: ArtRequestVisualContext | undefined,
): readonly string[] {
  if (!context) return [];
  const criteria: string[] = [];
  if (context.seasons?.length) {
    criteria.push(
      `Shows ${context.seasons.join(" or ")}. A delivery showing any other time of year is wrong, whatever else is right about it.`,
    );
  }
  if (context.landform) {
    criteria.push(`The land reads as ${context.landform}.`);
  }
  if (context.vegetation?.length) {
    criteria.push(`Vegetation shows ${context.vegetation.join(", ")}.`);
  }
  if (context.builtForm?.length) {
    criteria.push(`Built form shows ${context.builtForm.join(", ")}.`);
  }
  if (context.sceneKind) {
    criteria.push(
      `The view is ${context.sceneKind.replace(/-/g, " ")}, not another kind of view of the same place.`,
    );
  }
  if (context.note?.trim()) criteria.push(context.note.trim());
  return criteria;
}

/**
 * Turn the declared posture into criteria a delivery can fail.
 *
 * The seated case is the whole reason this exists: "shows a seated posture" is
 * not enough, because a short upright figure reads as standing behind the
 * chair and still lands its contacts. So the cues go in as the test — bent
 * knees, thighs forward — and the failure it names is the exact wrong delivery.
 */
function postureCriteria(
  figure: ArtRequestFigureContext | undefined,
): readonly string[] {
  if (!figure) return [];
  const criteria: string[] = [];
  const cues = figure.postureCues?.length
    ? ` The posture reads through ${figure.postureCues.join(", ")}.`
    : "";
  if (NON_STANDING_POSTURES.includes(figure.postureClass)) {
    criteria.push(
      `Shows a ${figure.postureClass} posture.${cues} A figure that merely stands, or an upright figure with shorter legs, is wrong even when its contact points land correctly.`,
    );
  } else {
    criteria.push(`Shows a ${figure.postureClass} posture.${cues}`);
  }
  if (figure.facing?.trim()) {
    criteria.push(`The figure faces ${figure.facing.trim()}.`);
  }
  if (figure.note?.trim()) criteria.push(figure.note.trim());
  return criteria;
}
