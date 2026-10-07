import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";

export const DEVELOPMENT_STEP_TRANSITION_KEY = "living-world:development-step";
export const PUBLIC_COMMENT_EVENT = "civic.public-comment-submitted";
const MATTER_TAG = "matter:";
const STAGE_TAG = "stage:";
const FAMILY_TAG = "family:";
export type DevelopmentFamily = "local-matter" | "international";
export type DevelopmentImportance = "minor" | "notable" | "major";

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** Retired synthetic archive entry point. Canonical law, election, business,
 * death and council writers supply the public record instead. The owning
 * opening caller can drop this compatibility entry after its current PR merges.
 */
export function ensureOpeningPriorLocalRecords(world: World): World {
  return world;
}

/** No ready-made news is seeded into a new life. */
export function ensureLivingWorldDevelopments(world: World): World {
  return world;
}

/** Retired synthetic proposals accept no comments. Public meeting comments
 * use the ordinary-meeting writer and its recorded agenda and audience.
 */
export function submitPublicComment(world: World): World {
  return world;
}

/** An already scheduled synthetic continuation cannot manufacture another
 * event or successor. Kept until the campaign registry owner's PR merges.
 */
export function developmentStepTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== DEVELOPMENT_STEP_TRANSITION_KEY)
    throw new Error(
      "The development step handler received another transition.",
    );
  return {
    world,
    status: "cancelled",
    reasonKey: "living-world:synthetic-developments-retired",
    context: null,
    outcomeEventId: null,
  };
}

export interface PublicMatterView {
  readonly matterId: string;
  readonly family: DevelopmentFamily;
  readonly stage: string;
  readonly concluded: boolean;
  readonly latestEventId: EntityId;
  readonly occurredAt: IsoDate;
  readonly summary: string;
  /** Local matters only: whether the life can still comment. */
  readonly openForComment: boolean;
}

/** The public matters this save records, current stage first. Pure. */
export function projectPublicMatters(
  world: World,
): readonly PublicMatterView[] {
  const matters = new Map<string, HistoricalEvent>();
  for (const event of world.history.events) {
    const matterId = tagValue(event, MATTER_TAG);
    if (
      !matterId ||
      !tagValue(event, STAGE_TAG) ||
      event.recordedAt > world.currentDate
    )
      continue;
    const previous = matters.get(matterId);
    if (!previous || event.sequence > previous.sequence)
      matters.set(matterId, event);
  }
  return [...matters.entries()]
    .map(([matterId, latest]) => {
      const family = tagValue(latest, FAMILY_TAG) as DevelopmentFamily;
      const stage = tagValue(latest, STAGE_TAG)!;
      const concluded = [
        "proposal-adopted",
        "proposal-withdrawn",
        "revised-proposal-posted",
        "eased",
      ].includes(stage);
      return {
        matterId,
        family,
        stage,
        concluded,
        latestEventId: latest.id,
        occurredAt: latest.occurredAt,
        summary: latest.summary,
        openForComment: family === "local-matter" && !concluded,
      };
    })
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) ||
        a.matterId.localeCompare(b.matterId),
    );
}

export interface MeaningfulChangeRef {
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly occurredAt: IsoDate;
  readonly family: DevelopmentFamily;
  readonly importance: DevelopmentImportance;
  readonly visibility: "public" | "known" | "public-and-known";
  readonly knownToPerson: boolean;
  readonly publicationId: EntityId | null;
  readonly matterId: string;
  readonly stage: string;
  /** A stable fact handle, so a reader never parses prose. */
  readonly subjectIds: readonly EntityId[];
  readonly status: string;
}

/**
 * Background developments recorded after `sinceSequence`, for any person.
 * "known" comes only from that person's own knowledge records or direct
 * participation; public availability is never treated as knowing. Pure.
 */
export function projectMeaningfulChanges(
  world: World,
  personId: EntityId,
  sinceSequence: number,
): readonly MeaningfulChangeRef[] {
  const publications = world.history.publications ?? [];
  return world.history.events
    .filter(
      (event) =>
        event.sequence >= sinceSequence &&
        event.recordedAt <= world.currentDate &&
        tagValue(event, MATTER_TAG) !== null &&
        tagValue(event, STAGE_TAG) !== null,
    )
    .flatMap((event) => {
      const known =
        event.participants.some(
          (participant) => participant.personId === personId,
        ) ||
        world.history.knowledge.some(
          (record) =>
            record.personId === personId &&
            record.eventId === event.id &&
            record.learnedAt <= world.currentDate,
        );
      const publication = publications.find(
        (row) =>
          row.sourceEventId === event.id &&
          row.correctsPublicationId === null &&
          row.publishedAt <= world.currentDate,
      );
      const isPublic =
        event.visibility === "public" && publication !== undefined;
      if (!isPublic && !known) return [];
      const visibility: MeaningfulChangeRef["visibility"] =
        isPublic && known ? "public-and-known" : isPublic ? "public" : "known";
      return [
        {
          eventId: event.id,
          sequence: event.sequence,
          occurredAt: event.occurredAt,
          family: tagValue(event, FAMILY_TAG) as DevelopmentFamily,
          importance: (tagValue(event, "importance:") ??
            "minor") as DevelopmentImportance,
          visibility,
          knownToPerson: known,
          publicationId: publication?.id ?? null,
          matterId: tagValue(event, MATTER_TAG)!,
          stage: tagValue(event, STAGE_TAG)!,
          subjectIds: event.involvedEntityIds.filter((id) => id !== world.id),
          status: tagValue(event, STAGE_TAG)!,
        },
      ];
    });
}
