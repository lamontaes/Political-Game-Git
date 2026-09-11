import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  PublicationKind,
  PublicationRecord,
  World,
} from "./types";

export const CIVIC_PUBLICATION_OUTLET_KEY = "civic-ledger" as const;
export const CIVIC_PUBLICATION_OUTLET_NAME = "Civic Ledger" as const;

const UNSUPPORTED_PUBLIC_EVENT_PREFIXES = [
  "evidence.",
  "information.",
  "setup.",
  "simulation.",
] as const;

export interface ResolvedPublicationSource {
  readonly kind: PublicationKind;
  readonly sourceRecordIds: readonly EntityId[];
}

/**
 * Resolves only completed, public canonical occurrences.
 *
 * A legislative commitment cannot satisfy this path because only an action's
 * own `eventId` resolves as a legislative development, and only an action with
 * a stored `voteId` resolves as a recorded vote.
 */
export function resolvePublicationSource(
  world: World,
  event: HistoricalEvent,
): ResolvedPublicationSource | null {
  if (event.visibility !== "public") return null;

  const action = (world.history.legislativeActions ?? []).find(
    (candidate) => candidate.eventId === event.id,
  );
  if (action) {
    const measure = (world.history.legislativeMeasures ?? []).find(
      (candidate) => candidate.id === action.measureId,
    );
    if (!measure) return null;
    const vote = action.voteId
      ? (world.history.legislativeVotes ?? []).find(
          (candidate) => candidate.id === action.voteId,
        )
      : null;
    if (action.voteId && !vote) return null;
    return {
      kind: vote ? "recorded-vote" : "legislative-development",
      sourceRecordIds: canonicalIds([
        measure.id,
        action.id,
        ...(vote ? [vote.id] : []),
      ]),
    };
  }

  if (
    UNSUPPORTED_PUBLIC_EVENT_PREFIXES.some((prefix) =>
      event.type.startsWith(prefix),
    )
  ) {
    return null;
  }
  return { kind: "civic-event", sourceRecordIds: [] };
}

export function publicInformationHistoryRecords(
  world: World,
): readonly PublicationRecord[] {
  return world.history.publications ?? [];
}

export function publicInformationEntityExists(
  world: World,
  entityId: EntityId,
): boolean {
  return (world.history.publications ?? []).some(
    (publication) => publication.id === entityId,
  );
}

export function publicInformationEntityAvailableAt(
  world: World,
  entityId: EntityId,
  asOfDate: IsoDate,
  historySequenceExclusive: number,
): boolean {
  return (world.history.publications ?? []).some(
    (publication) =>
      publication.id === entityId &&
      publication.publishedAt <= asOfDate &&
      publication.sequence < historySequenceExclusive,
  );
}

export function assertPublicInformationIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const publications = world.history.publications ?? [];
  const events = new Map(
    world.history.events.map((event) => [event.id, event] as const),
  );
  const byId = new Map<EntityId, PublicationRecord>();
  const stableKeys = new Set<string>();
  const rootSources = new Set<EntityId>();
  const corrected = new Set<EntityId>();
  let previousSequence = -1;

  for (const publication of publications) {
    if (publication.sequence <= previousSequence) {
      throw new Error(
        "Publication history is not stored in append-sequence order.",
      );
    }
    previousSequence = publication.sequence;
    if (ids.has(publication.id)) {
      throw new Error(`Duplicate entity ID: ${publication.id}`);
    }
    ids.add(publication.id);
    if (
      publication.id !==
      createStableId("publication", `${world.id}:${publication.stableKey}`)
    ) {
      throw new Error(
        `Publication ID does not match its key: ${publication.id}`,
      );
    }
    if (!publication.stableKey.trim()) {
      throw new Error("Publication stable key must not be empty.");
    }
    if (stableKeys.has(publication.stableKey)) {
      throw new Error(`Duplicate publication key: ${publication.stableKey}`);
    }
    stableKeys.add(publication.stableKey);
    if (
      publication.outletKey !== CIVIC_PUBLICATION_OUTLET_KEY ||
      publication.outletName !== CIVIC_PUBLICATION_OUTLET_NAME
    ) {
      throw new Error(
        `Publication has an unsupported outlet: ${publication.id}`,
      );
    }
    assertText(publication.headline, "Publication headline");
    assertText(publication.body, "Publication body");

    const publishedAt = makeIsoDate(publication.publishedAt);
    const recordedAt = makeIsoDate(publication.recordedAt);
    const sourceEvent = events.get(publication.sourceEventId);
    if (!sourceEvent || sourceEvent.sequence >= publication.sequence) {
      throw new Error(
        `Publication source event is unavailable: ${publication.id}`,
      );
    }
    if (
      sourceEvent.occurredAt > publishedAt ||
      sourceEvent.recordedAt > publishedAt ||
      publishedAt > recordedAt ||
      recordedAt > world.currentDate
    ) {
      throw new Error(`Publication has invalid chronology: ${publication.id}`);
    }
    if (publication.jurisdictionId !== sourceEvent.jurisdictionId) {
      throw new Error(
        `Publication jurisdiction disagrees with its source: ${publication.id}`,
      );
    }
    const resolved = resolvePublicationSource(world, sourceEvent);
    if (!resolved) {
      throw new Error(
        `Publication source is not publishable: ${publication.id}`,
      );
    }
    if (
      publication.kind !== resolved.kind ||
      JSON.stringify(publication.sourceRecordIds) !==
        JSON.stringify(resolved.sourceRecordIds)
    ) {
      throw new Error(
        `Publication source records disagree with canonical truth: ${publication.id}`,
      );
    }
    for (const sourceRecordId of publication.sourceRecordIds) {
      const sequence = sourceRecordSequence(world, sourceRecordId);
      if (sequence === null || sequence >= publication.sequence) {
        throw new Error(
          `Publication source record is unavailable: ${sourceRecordId}`,
        );
      }
    }

    if (publication.correctsPublicationId === null) {
      if (publication.correctionNote !== null) {
        throw new Error(
          `Initial publication carries a correction note: ${publication.id}`,
        );
      }
      if (rootSources.has(publication.sourceEventId)) {
        throw new Error(
          `Source event already has a publication: ${publication.sourceEventId}`,
        );
      }
      rootSources.add(publication.sourceEventId);
    } else {
      const correctedPublication = byId.get(publication.correctsPublicationId);
      if (!correctedPublication) {
        throw new Error(`Correction target is unavailable: ${publication.id}`);
      }
      if (corrected.has(correctedPublication.id)) {
        throw new Error(
          `Publication correction history branches: ${correctedPublication.id}`,
        );
      }
      corrected.add(correctedPublication.id);
      if (
        correctedPublication.sourceEventId !== publication.sourceEventId ||
        correctedPublication.kind !== publication.kind ||
        correctedPublication.jurisdictionId !== publication.jurisdictionId
      ) {
        throw new Error(
          `Correction changes publication identity: ${publication.id}`,
        );
      }
      assertText(publication.correctionNote, "Publication correction note");
      if (
        correctedPublication.headline === publication.headline &&
        correctedPublication.body === publication.body
      ) {
        throw new Error(
          `Publication correction changes no copy: ${publication.id}`,
        );
      }
    }
    byId.set(publication.id, publication);
  }
}

function sourceRecordSequence(world: World, id: EntityId): number | null {
  const record = [
    ...(world.history.legislativeMeasures ?? []),
    ...(world.history.legislativeActions ?? []),
    ...(world.history.legislativeVotes ?? []),
  ].find((candidate) => candidate.id === id);
  return record?.sequence ?? null;
}

function canonicalIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function assertText(
  value: string | null,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}
