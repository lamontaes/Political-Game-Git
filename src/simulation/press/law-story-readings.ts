import type { EntityId, IsoDate, World } from "../types";
import { LAW_EFFECT_EVENT_TYPE } from "./shared";

/** Evidence of one learned story, not personal impact or sustained attention. */
export interface LawStoryReading {
  readonly knowledgeId: EntityId;
  readonly personId: EntityId;
  readonly measureId: EntityId;
  readonly publicationId: EntityId;
  readonly storyEventId: EntityId;
  readonly leadId: EntityId;
  readonly dispositionId: EntityId;
  readonly basisEventId: EntityId;
  readonly learnedAt: IsoDate;
}

/** Read the saved chain only. Publication and residence alone prove no reading. */
export function resolveLawStoryReading(
  world: World,
  input: { readonly knowledgeId: EntityId; readonly basisEventId: EntityId },
): LawStoryReading | null {
  const knowledge = world.history.knowledge.find(
    (record) => record.id === input.knowledgeId,
  );
  if (
    !knowledge ||
    !world.people[knowledge.personId] ||
    knowledge.source.kind !== "media" ||
    !knowledge.source.reference ||
    knowledge.learnedAt > world.currentDate
  )
    return null;
  const publicationId = knowledge.source.reference;
  const publication = world.history.publications?.find(
    (record) => record.id === publicationId,
  );
  if (
    !publication ||
    publication.sourceEventId !== knowledge.eventId ||
    publication.publishedAt > knowledge.learnedAt ||
    publication.recordedAt > knowledge.learnedAt ||
    publication.sequence >= knowledge.sequence
  )
    return null;
  const story = world.history.events.find(
    (event) => event.id === publication.sourceEventId,
  );
  const basis = world.history.events.find(
    (event) => event.id === input.basisEventId,
  );
  if (
    !story ||
    !basis ||
    story.occurredAt > publication.publishedAt ||
    story.recordedAt > publication.recordedAt ||
    story.sequence >= publication.sequence ||
    basis.type !== LAW_EFFECT_EVENT_TYPE ||
    !basis.tags.some((tag) => tag.startsWith("law-effect:outcome:")) ||
    basis.occurredAt > story.occurredAt ||
    basis.recordedAt > story.recordedAt ||
    basis.sequence >= story.sequence
  )
    return null;
  const dispositions = (world.history.pressRecords ?? []).filter(
    (record) =>
      record.kind === "story-disposition" &&
      record.decision === "published" &&
      record.publicationId === publication.id &&
      record.eventId === story.id,
  );
  if (dispositions.length !== 1) return null;
  const disposition = dispositions[0]!;
  if (disposition.kind !== "story-disposition") return null;
  const lead = world.history.pressRecords?.find(
    (record) =>
      record.kind === "story-lead" && record.id === disposition.leadId,
  );
  if (
    !lead ||
    lead.kind !== "story-lead" ||
    !lead.basisEventIds.includes(basis.id) ||
    basis.sequence >= lead.sequence ||
    lead.sequence >= story.sequence ||
    publication.sequence >= disposition.sequence ||
    disposition.sequence >= knowledge.sequence ||
    lead.receivedAt > story.occurredAt ||
    lead.recordedAt > story.recordedAt ||
    disposition.decidedAt > knowledge.learnedAt ||
    disposition.recordedAt > knowledge.learnedAt
  )
    return null;
  const measureTags = basis.tags.filter((tag) =>
    tag.startsWith("law-effect:measure:"),
  );
  if (measureTags.length !== 1) return null;
  const measureId = measureTags[0]!.slice(
    "law-effect:measure:".length,
  ) as EntityId;
  const measure = world.history.legislativeMeasures?.find(
    (record) => record.id === measureId,
  );
  const enactment = world.history.legislativeEnactments?.find(
    (record) =>
      record.measureId === measureId &&
      record.outcome === "enacted" &&
      record.sequence < basis.sequence &&
      record.resolvedAt <= basis.occurredAt &&
      (record.effectiveAt ?? record.resolvedAt) <= basis.occurredAt,
  );
  if (!measure || !enactment || measure.sequence >= enactment.sequence)
    return null;
  return {
    knowledgeId: knowledge.id,
    personId: knowledge.personId,
    measureId,
    publicationId: publication.id,
    storyEventId: story.id,
    leadId: lead.id,
    dispositionId: disposition.id,
    basisEventId: basis.id,
    learnedAt: knowledge.learnedAt,
  };
}
