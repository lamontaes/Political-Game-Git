import { personName, type EntityId, type World } from "../simulation";
import { readableDate } from "../simulation/press/editorial";

export type PublicDeathSpeechKey =
  "matter:ask-death" | "matter:report-death" | "matter:read-death";

export interface PublicDeathSpeechOption {
  readonly key: PublicDeathSpeechKey;
  readonly spokenWords: string;
}

/** Exact player words only when the saved event and this person's source support them. */
export function publicDeathSpeechOptions(
  world: World,
  speakerPersonId: EntityId,
  eventId: EntityId,
): readonly PublicDeathSpeechOption[] {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (
    event?.type !== "crisis.officeholder-died" ||
    event.visibility !== "public"
  )
    return [];
  const officeholder = event.participants.find(
    (participant) => participant.role === "focus:officeholder",
  );
  const person = officeholder && world.people[officeholder.personId];
  const title = officeholder?.detail;
  if (
    !person ||
    !title ||
    !/^(Governor|President|Mayor|Senator|Representative)$/.test(title)
  )
    return [];
  const learned = world.history.knowledge.filter(
    (record) =>
      record.personId === speakerPersonId &&
      record.eventId === event.id &&
      record.learnedAt <= world.currentDate,
  );
  if (
    learned.length === 0 ||
    !learned.some(
      (record) =>
        record.accuracy === "accurate" ||
        record.source.kind === "media" ||
        record.source.kind === "public-record",
    )
  )
    return [];

  const subject = `${title} ${person.familyName}`;
  const options: PublicDeathSpeechOption[] = [
    { key: "matter:ask-death", spokenWords: `Did you hear ${subject} died?` },
  ];
  const media = learned.find(
    (record) => record.source.kind === "media" && record.source.reference,
  );
  if (!media || media.source.kind !== "media" || !media.source.reference)
    return options;
  const publicationId = media.source.reference;
  const publication = world.history.publications?.find(
    (record) => record.id === publicationId,
  );
  if (
    !publication ||
    publication.kind !== "press-story" ||
    publication.publishedAt > world.currentDate
  )
    return options;
  const source = world.history.events.find(
    (record) => record.id === publication.sourceEventId,
  );
  const lead = publication.sourceRecordIds
    .map((id) => world.history.pressRecords?.find((record) => record.id === id))
    .find((record) => record?.kind === "story-lead");
  if (
    source?.type !== "press.story-published" ||
    !lead ||
    !lead.basisEventIds.includes(event.id)
  )
    return options;

  options.push({
    key: "matter:report-death",
    spokenWords: `${publication.outletName} reported that ${subject} died.`,
  });

  const selectedRead = world.history.knowledge.some(
    (record) =>
      record.personId === speakerPersonId &&
      record.eventId === publication.sourceEventId &&
      record.source.kind === "media" &&
      record.source.reference === publication.id &&
      record.stableKey.includes(":selected-read:"),
  );
  const date = readableDate(event.occurredAt, publication.publishedAt);
  if (
    selectedRead &&
    publication.body.includes(personName(person)) &&
    publication.body.includes(date)
  ) {
    options.push({
      key: "matter:read-death",
      spokenWords: `I read that ${subject} died on ${date}.`,
    });
  }
  return options;
}

export function isPublicDeathSpeechKey(
  intent: string,
): intent is PublicDeathSpeechKey {
  return (
    intent === "matter:ask-death" ||
    intent === "matter:report-death" ||
    intent === "matter:read-death"
  );
}
