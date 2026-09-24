import { recordClaim, recordEventKnowledge } from "../simulation/records";
import type {
  ClaimAudience,
  ClaimRelationshipToTruth,
  EntityId,
  World,
} from "../simulation/types";

/**
 * A selected utterance travels through the same claim and hearing records in
 * every conversation family. The caller supplies the actual event and actual
 * listeners; this writer never chooses who heard a line or what they did next.
 */
export function recordSpokenExchange(
  world: World,
  input: {
    readonly stableKey: string;
    readonly eventId: EntityId;
    readonly speakerPersonId: EntityId;
    readonly recipientPersonIds: readonly EntityId[];
    readonly statement: string;
    readonly audience: ClaimAudience;
    readonly relationshipToTruth: ClaimRelationshipToTruth;
  },
): World {
  const event = world.history.events.find(
    (entry) => entry.id === input.eventId,
  );
  if (!event) throw new Error("The spoken exchange has no recorded event.");
  if (!event.involvedEntityIds.includes(input.speakerPersonId))
    throw new Error("The speaker was not part of the recorded exchange.");
  const recipients = [...new Set(input.recipientPersonIds)];
  if (
    recipients.some(
      (personId) =>
        personId === input.speakerPersonId ||
        !event.involvedEntityIds.includes(personId),
    )
  )
    throw new Error("An unrecorded person cannot hear this exchange.");
  let next = recordClaim(world, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: input.speakerPersonId,
    eventId: event.id,
    madeAt: world.currentDate,
    audience: input.audience,
    statement: input.statement,
    relationshipToTruth: input.relationshipToTruth,
    provenance: { kind: "direct-record" },
  });
  const claim = next.history.claims.at(-1)!;
  for (const recipientPersonId of recipients) {
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:heard:${recipientPersonId}`,
      personId: recipientPersonId,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: input.speakerPersonId,
        claimId: claim.id,
      },
    });
  }
  return next;
}
