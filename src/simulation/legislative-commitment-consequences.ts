import {
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import { recordWorldEvent } from "./world";
import { personName } from "./people";
import { assessCommitment } from "./legislative-politics";
import type { EntityId, LegislativeVoteRecord, World } from "./types";

/** Apply the shared, record-backed consequence when a recorded vote tests a promise. */
export function resolveCommitmentsAfterVote(
  world: World,
  voteId: EntityId,
): World {
  const vote = (world.history.legislativeVotes ?? []).find(
    (record) => record.id === voteId,
  ) as LegislativeVoteRecord | undefined;
  if (!vote) throw new Error(`Missing legislative vote: ${voteId}`);
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === vote.measureId,
  );
  if (!measure) throw new Error(`Missing measure for vote: ${voteId}`);

  let next = world;
  for (const commitment of world.history.legislativeCommitments ?? []) {
    if (
      commitment.subject.question.measureId !== vote.measureId ||
      (world.history.events ?? []).some(
        (event) => event.stableKey === `commitment-broken:${commitment.id}`,
      )
    )
      continue;
    const assessment = assessCommitment(next, commitment.id);
    if (assessment.standing !== "departed-from") continue;

    const speaker = next.people[commitment.holderPersonId];
    const speakerName = speaker ? personName(speaker) : "The member";
    const heard = commitment.heardByPersonIds.filter(
      (personId) =>
        personId !== commitment.holderPersonId && next.people[personId],
    );
    next = recordWorldEvent(next, {
      stableKey: `commitment-broken:${commitment.id}`,
      type: "legislation.commitment-broken",
      occurredAt: vote.takenAt,
      recordedAt: next.currentDate,
      jurisdictionId: measure.jurisdictionId,
      involvedEntityIds: [commitment.holderPersonId, ...heard, measure.id],
      participants: [
        {
          personId: commitment.holderPersonId,
          role: "agency:promise-holder",
          detail: commitment.statement,
        },
        ...heard.map((personId) => ({
          personId,
          role: "observation:heard-the-promise" as const,
          detail: null,
        })),
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["legislation.commitment-broken", `commitment:${commitment.id}`],
      summary: `${speakerName} voted ${vote.dispositions.find((row) => row.personId === commitment.holderPersonId)?.disposition ?? "against the promise"} after saying: ${commitment.statement}`,
      context: {
        location: null,
        socialContext: "A public roll call tested a recorded promise.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventRecord = next.history.events.at(-1)!;
    for (const personId of heard) {
      next = recordEventKnowledge(next, {
        stableKey: `${eventRecord.stableKey}:knowledge:${personId}`,
        personId,
        eventId: eventRecord.id,
        learnedAt: next.currentDate,
        believedSummary: eventRecord.summary,
        accuracy: "accurate",
        confidence: "high",
        source: {
          kind: "public-record",
          reference: `legislative-vote:${vote.id}`,
        },
      });
      next = recordMemory(next, {
        stableKey: `${eventRecord.stableKey}:memory:${personId}`,
        personId,
        eventId: eventRecord.id,
        formedAt: next.currentDate,
        rememberedSummary: eventRecord.summary,
        interpretation: `${speakerName} did not keep a recorded promise this person had heard.`,
        strength: "moderate",
        relevanceTags: ["legislation.commitment-broken"],
        supersedesMemoryId: null,
      });
      next = recordRelationshipInteraction(next, {
        stableKey: `${eventRecord.stableKey}:strain:${personId}`,
        personIds: [commitment.holderPersonId, personId].sort() as [
          EntityId,
          EntityId,
        ],
        eventId: eventRecord.id,
        occurredAt: vote.takenAt,
        kind: "conflict:misled",
        change: "strained",
        significance: "meaningful",
        summary: `${speakerName} broke a promise ${next.people[personId]?.givenName ?? "this person"} had heard.`,
        tags: ["legislation.commitment-broken"],
      });
    }
  }
  return next;
}
