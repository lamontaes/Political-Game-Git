import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { personName } from "./people";
import {
  CIVIC_PUBLICATION_OUTLET_KEY,
  CIVIC_PUBLICATION_OUTLET_NAME,
  resolvePublicationSource,
} from "./public-information-integrity";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  PublicationKind,
  PublicationRecord,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

export interface PublishPublicEventInput {
  readonly stableKey: string;
  readonly sourceEventId: EntityId;
  readonly publishedAt?: string;
  readonly recordedAt?: string;
}

export interface CorrectPublicationInput {
  readonly stableKey: string;
  /** The latest edition being corrected; correction history is linear. */
  readonly correctsPublicationId: EntityId;
  readonly headline: string;
  readonly body: string;
  readonly correctionNote: string;
  readonly publishedAt?: string;
  readonly recordedAt?: string;
}

export interface PublishedPersonReference {
  readonly kind: "person";
  readonly personId: EntityId;
  readonly label: string;
}

export interface PublicInformationCorrection {
  readonly publicationId: EntityId;
  readonly publishedAt: IsoDate;
  readonly headline: string;
  readonly body: string;
  readonly note: string;
}

export interface PublicInformationDigestItem {
  /** Stable identity of the first edition, retained through corrections. */
  readonly publicationId: EntityId;
  readonly sourceEventId: EntityId;
  readonly sourceRecordIds: readonly EntityId[];
  readonly kind: PublicationKind;
  readonly outletName: string;
  readonly jurisdictionId: EntityId | null;
  readonly jurisdictionName: string | null;
  readonly eventTime: IsoDate;
  readonly publicationTime: IsoDate;
  readonly headline: string;
  readonly body: string;
  readonly people: readonly PublishedPersonReference[];
  readonly corrections: readonly PublicInformationCorrection[];
}

export interface PublicInformationDigest {
  readonly outletKey: typeof CIVIC_PUBLICATION_OUTLET_KEY;
  readonly outletName: typeof CIVIC_PUBLICATION_OUTLET_NAME;
  readonly asOf: IsoDate;
  readonly items: readonly PublicInformationDigestItem[];
}

/**
 * Explicitly publishes one already-recorded public occurrence.
 *
 * This is the mutation boundary. Digest and screen projections never call it.
 */
export function publishPublicEvent(
  world: World,
  input: PublishPublicEventInput,
): World {
  assertWorldIntegrity(world);
  assertText(input.stableKey, "Publication stable key");
  const sourceEvent = sourceEventById(world, input.sourceEventId);
  const source = resolvePublicationSource(world, sourceEvent);
  if (!source) {
    throw new Error(
      "Only a completed public civic event or recorded legislative action can be published.",
    );
  }
  if (
    (world.history.publications ?? []).some(
      (publication) =>
        publication.stableKey === input.stableKey ||
        (publication.correctsPublicationId === null &&
          publication.sourceEventId === sourceEvent.id),
    )
  ) {
    throw new Error(
      "Publication key or source event already has an initial edition.",
    );
  }

  const publishedAt = makeIsoDate(input.publishedAt ?? world.currentDate);
  const recordedAt = makeIsoDate(input.recordedAt ?? world.currentDate);
  assertPublicationChronology(world, sourceEvent, publishedAt, recordedAt);
  const copy = canonicalPublicationCopy(world, sourceEvent, source.kind);
  const publication: PublicationRecord = {
    id: createStableId("publication", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    kind: source.kind,
    sourceEventId: sourceEvent.id,
    sourceRecordIds: source.sourceRecordIds,
    jurisdictionId: sourceEvent.jurisdictionId,
    outletKey: CIVIC_PUBLICATION_OUTLET_KEY,
    outletName: CIVIC_PUBLICATION_OUTLET_NAME,
    headline: copy.headline,
    body: copy.body,
    publishedAt,
    recordedAt,
    correctsPublicationId: null,
    correctionNote: null,
  };
  return appendPublication(world, publication);
}

/** Appends corrected copy without rewriting any edition the player could know. */
export function correctPublication(
  world: World,
  input: CorrectPublicationInput,
): World {
  assertWorldIntegrity(world);
  assertText(input.stableKey, "Publication stable key");
  assertText(input.headline, "Corrected headline");
  assertText(input.body, "Corrected body");
  assertText(input.correctionNote, "Publication correction note");
  const publications = world.history.publications ?? [];
  const target = publications.find(
    (publication) => publication.id === input.correctsPublicationId,
  );
  if (!target) {
    throw new Error(
      `Cannot correct a missing publication: ${input.correctsPublicationId}`,
    );
  }
  if (
    publications.some(
      (publication) =>
        publication.stableKey === input.stableKey ||
        publication.correctsPublicationId === target.id,
    )
  ) {
    throw new Error(
      "Publication key exists or that edition is already corrected.",
    );
  }
  const sourceEvent = sourceEventById(world, target.sourceEventId);
  const publishedAt = makeIsoDate(input.publishedAt ?? world.currentDate);
  const recordedAt = makeIsoDate(input.recordedAt ?? world.currentDate);
  assertPublicationChronology(world, sourceEvent, publishedAt, recordedAt);
  if (publishedAt < target.publishedAt) {
    throw new Error("A correction cannot predate the edition it corrects.");
  }

  return appendPublication(world, {
    ...target,
    id: createStableId("publication", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    headline: input.headline.trim(),
    body: input.body.trim(),
    publishedAt,
    recordedAt,
    correctsPublicationId: target.id,
    correctionNote: input.correctionNote.trim(),
  });
}

/** One read model used by both the newspaper and every broadcast adapter. */
export function projectPublicInformationDigest(
  world: World,
  jurisdictionId?: EntityId | null,
): PublicInformationDigest {
  assertWorldIntegrity(world);
  const publications = world.history.publications ?? [];
  const correctionByTarget = new Map<EntityId, PublicationRecord>();
  for (const publication of publications) {
    if (publication.correctsPublicationId !== null) {
      correctionByTarget.set(publication.correctsPublicationId, publication);
    }
  }

  const items = publications
    .filter(
      (publication) =>
        publication.correctsPublicationId === null &&
        (jurisdictionId === undefined ||
          publication.jurisdictionId === jurisdictionId),
    )
    .map((root) => projectDigestItem(world, root, correctionByTarget))
    .sort(
      (left, right) =>
        right.publicationTime.localeCompare(left.publicationTime) ||
        right.publicationId.localeCompare(left.publicationId),
    );
  return {
    outletKey: CIVIC_PUBLICATION_OUTLET_KEY,
    outletName: CIVIC_PUBLICATION_OUTLET_NAME,
    asOf: world.currentDate,
    items,
  };
}

function projectDigestItem(
  world: World,
  root: PublicationRecord,
  correctionByTarget: ReadonlyMap<EntityId, PublicationRecord>,
): PublicInformationDigestItem {
  const sourceEvent = sourceEventById(world, root.sourceEventId);
  const editions: PublicationRecord[] = [root];
  let cursor = root;
  while (correctionByTarget.has(cursor.id)) {
    cursor = correctionByTarget.get(cursor.id)!;
    editions.push(cursor);
  }
  const current = editions.at(-1)!;
  const people = [...new Set(sourceEvent.participants.map((p) => p.personId))]
    .map((personId): PublishedPersonReference | null => {
      const person = world.people[personId];
      return person
        ? { kind: "person", personId, label: personName(person) }
        : null;
    })
    .filter((person): person is PublishedPersonReference => person !== null)
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.personId.localeCompare(right.personId),
    );
  return {
    publicationId: root.id,
    sourceEventId: root.sourceEventId,
    sourceRecordIds: [...root.sourceRecordIds],
    kind: root.kind,
    outletName: root.outletName,
    jurisdictionId: root.jurisdictionId,
    jurisdictionName: root.jurisdictionId
      ? (world.jurisdictions[root.jurisdictionId]?.name ?? null)
      : null,
    eventTime: sourceEvent.occurredAt,
    publicationTime: root.publishedAt,
    headline: current.headline,
    body: current.body,
    people,
    corrections: editions.slice(1).map((edition) => ({
      publicationId: edition.id,
      publishedAt: edition.publishedAt,
      headline: edition.headline,
      body: edition.body,
      note: edition.correctionNote!,
    })),
  };
}

function canonicalPublicationCopy(
  world: World,
  event: HistoricalEvent,
  kind: PublicationKind,
): { readonly headline: string; readonly body: string } {
  if (kind === "civic-event") {
    return { headline: event.summary, body: event.summary };
  }
  const action = (world.history.legislativeActions ?? []).find(
    (candidate) => candidate.eventId === event.id,
  )!;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (candidate) => candidate.id === action.measureId,
  )!;
  const identity = `${measure.designation} — ${measure.shortTitle}`;
  if (kind === "legislative-development") {
    return {
      headline: event.summary,
      body: `${identity}. ${event.summary}`,
    };
  }
  const vote = (world.history.legislativeVotes ?? []).find(
    (candidate) => candidate.id === action.voteId,
  )!;
  return {
    headline: event.summary,
    body: `${identity}. ${event.summary} Recorded vote: ${vote.tally.yea} yea, ${vote.tally.nay} nay; ${vote.outcome}.`,
  };
}

function appendPublication(
  world: World,
  publication: PublicationRecord,
): World {
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      publications: [...(world.history.publications ?? []), publication],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function sourceEventById(world: World, eventId: EntityId): HistoricalEvent {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event) throw new Error(`No such publication source event: ${eventId}`);
  return event;
}

function assertPublicationChronology(
  world: World,
  sourceEvent: HistoricalEvent,
  publishedAt: IsoDate,
  recordedAt: IsoDate,
): void {
  if (
    sourceEvent.occurredAt > publishedAt ||
    sourceEvent.recordedAt > publishedAt ||
    publishedAt > recordedAt ||
    recordedAt > world.currentDate
  ) {
    throw new Error(
      "Publication time must follow the event record and cannot exceed the current world date.",
    );
  }
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
