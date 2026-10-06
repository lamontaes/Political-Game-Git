import { recordEvidenceArtifact } from "../evidence";
import { eventById } from "../event-index";
import { validateMindSourceReferences } from "../mind";
import { currentHistoricalCutoff } from "../queries";
import type {
  DecisionSourceSnapshot,
  EntityId,
  HistoricalCutoff,
  World,
} from "../types";
import type { ChamberVoteMemberEvaluation } from "./chamber-votes";

const KIND = "executive:appointment-vote-reasons";

export interface ExecutiveAppointmentVoteEvidence {
  readonly version: 1;
  readonly nominationEventId: EntityId;
  readonly attemptKey: string;
  readonly cutoff: HistoricalCutoff;
  readonly members: readonly ChamberVoteMemberEvaluation[];
}

/** Structural/identity admission for a stored packet. This never evaluates a
 * ballot or reconstructs its reasons from the present world. */
function parsePacket(
  world: World,
  text: string | null,
): ExecutiveAppointmentVoteEvidence | null {
  try {
    const packet = JSON.parse(text ?? "") as ExecutiveAppointmentVoteEvidence;
    const nomination = eventById(world, packet.nominationEventId);
    if (
      packet.version !== 1 ||
      !nomination ||
      nomination.type !== "executive.appointment-nominated" ||
      typeof packet.attemptKey !== "string" ||
      !packet.attemptKey.startsWith(`${nomination.stableKey}:confirmation:`) ||
      packet.cutoff.asOfDate > world.currentDate ||
      nomination.recordedAt > packet.cutoff.asOfDate ||
      !Number.isSafeInteger(packet.cutoff.historySequenceExclusive) ||
      packet.cutoff.historySequenceExclusive <= nomination.sequence ||
      packet.cutoff.historySequenceExclusive > world.history.nextSequence ||
      !Array.isArray(packet.members) ||
      !packet.members.length ||
      new Set(packet.members.map((row) => row.disposition.memberKey)).size !==
        packet.members.length
    )
      return null;
    for (const row of packet.members) {
      const disposition = row.disposition;
      if (
        !disposition.memberKey ||
        !["yea", "nay", "absent", "present-not-voting"].includes(
          disposition.disposition,
        ) ||
        (disposition.personId !== null &&
          !world.people[disposition.personId]) ||
        !Array.isArray(row.sourceRefs)
      )
        return null;
      if (row.evaluation === null) {
        if (row.sourceRefs.length) return null;
        continue;
      }
      const evaluation = row.evaluation;
      const context = evaluation.context;
      const expectedDisposition =
        evaluation.outcomeKind === "selected" &&
        evaluation.selectedOptionKey === "vote-yea"
          ? "yea"
          : evaluation.outcomeKind === "selected" &&
              evaluation.selectedOptionKey === "vote-nay"
            ? "nay"
            : "present-not-voting";
      if (
        context.actorPersonId !== disposition.personId ||
        context.decisionType !== "legislation.member-vote" ||
        context.stableKey !==
          `${packet.attemptKey}:${disposition.memberKey}:decision` ||
        context.subject.kind !== "context:executive-appointment-nomination" ||
        context.subject.entityId !== nomination.id ||
        context.subject.key !== nomination.stableKey ||
        context.cutoff.asOfDate !== packet.cutoff.asOfDate ||
        context.cutoff.historySequenceExclusive !==
          packet.cutoff.historySequenceExclusive ||
        context.retention !== "ephemeral" ||
        context.randomness !== "none" ||
        !Array.isArray(context.considerations) ||
        !Array.isArray(context.constraints) ||
        !Array.isArray(context.options) ||
        !Array.isArray(evaluation.optionEvaluations) ||
        !Array.isArray(evaluation.sourceSnapshots) ||
        disposition.disposition !== expectedDisposition ||
        JSON.stringify(row.sourceRefs) !==
          JSON.stringify(
            evaluation.sourceSnapshots.map(
              (snapshot: DecisionSourceSnapshot) => snapshot.reference,
            ),
          )
      )
        return null;
    }
    return packet;
  } catch {
    return null;
  }
}

/** Retain the exact callback packet through the existing private artifact
 * writer. It stays an ephemeral ballot receipt, not a durable decision trace.
 * No evidence discovery, public reasoning, or knowledge is written. */
export function recordExecutiveAppointmentVoteEvidence(
  world: World,
  input: ExecutiveAppointmentVoteEvidence,
): { readonly world: World; readonly evidenceArtifactId: EntityId } {
  const text = JSON.stringify(input);
  const packet = parsePacket(world, text);
  if (!packet) throw new Error("Invalid executive vote evidence packet.");
  const stableKey = `${packet.attemptKey}:private-member-evaluations`;
  const previous = world.history.evidenceArtifacts.find(
    (artifact) => artifact.stableKey === stableKey,
  );
  if (previous) {
    if (
      previous.access !== "private" ||
      previous.evidenceKind !== KIND ||
      previous.description !== text
    )
      throw new Error("Recorded executive vote evidence cannot be replaced.");
    return { world, evidenceArtifactId: previous.id };
  }
  const cutoff = currentHistoricalCutoff(world);
  if (
    packet.cutoff.asOfDate !== cutoff.asOfDate ||
    packet.cutoff.historySequenceExclusive !== cutoff.historySequenceExclusive
  )
    throw new Error(
      "Executive vote evidence must be the actual current callback packet.",
    );
  for (const row of packet.members) {
    if (!row.evaluation) continue;
    validateMindSourceReferences(
      world,
      row.evaluation.context.actorPersonId,
      cutoff.asOfDate,
      row.sourceRefs,
      cutoff.historySequenceExclusive,
    );
  }
  // The generic evidence contract binds event/incident records, not bare
  // person IDs. Member identity stays in the exact private callback packet.
  const relatedEntityIds = [packet.nominationEventId];
  const next = recordEvidenceArtifact(world, {
    stableKey,
    evidenceKind: KIND,
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    relatedEntityIds,
    access: "private",
    description: text,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [...new Set(relatedEntityIds)].sort(),
    },
  });
  return {
    world: next,
    evidenceArtifactId: next.history.evidenceArtifacts.at(-1)!.id,
  };
}

/** Return only the requested actual member's rows. Generic artifact access
 * metadata is insufficient: this reader validates the single public roll call
 * and its exact recorded roster before exposing any member's private reasons. */
export function executiveAppointmentVoteEvidence(
  world: World,
  evidenceArtifactId: EntityId,
  memberPersonId: EntityId,
):
  | (ExecutiveAppointmentVoteEvidence & { readonly rollCallEventId: EntityId })
  | null {
  if (!world.people[memberPersonId]) return null;
  const artifact = world.history.evidenceArtifacts.find(
    (row) => row.id === evidenceArtifactId,
  );
  if (
    !artifact ||
    artifact.access !== "private" ||
    artifact.evidenceKind !== KIND ||
    artifact.recordedAt > world.currentDate
  )
    return null;
  const packet = parsePacket(world, artifact.description);
  if (
    !packet ||
    packet.cutoff.historySequenceExclusive !== artifact.sequence ||
    artifact.createdAt !== packet.cutoff.asOfDate ||
    !artifact.relatedEntityIds.includes(packet.nominationEventId) ||
    artifact.provenance.kind !== "simulated" ||
    !artifact.provenance.sourceEntityIds.includes(packet.nominationEventId)
  )
    return null;
  const rollCall = world.history.events.find(
    (event) =>
      event.type === "executive.appointment-confirmation" &&
      event.stableKey === packet.attemptKey &&
      event.tags.includes(`source-event:${packet.nominationEventId}`) &&
      event.tags.includes(`member-evidence:${artifact.id}`) &&
      event.involvedEntityIds.includes(artifact.id),
  );
  if (
    !rollCall ||
    rollCall.sequence <= artifact.sequence ||
    rollCall.recordedAt !== artifact.recordedAt ||
    rollCall.tags.filter((tag) => tag.startsWith("confirmation-member:"))
      .length !== packet.members.length ||
    rollCall.participants.filter(
      (row) => row.role === "agency:confirmation-vote",
    ).length !==
      packet.members.filter((row) => row.disposition.personId !== null).length
  )
    return null;
  for (const { disposition } of packet.members) {
    if (
      !rollCall.tags.includes(
        `confirmation-member:${disposition.memberKey}|${disposition.personId ?? "vacant"}`,
      ) ||
      (disposition.personId !== null &&
        !rollCall.participants.some(
          (row) =>
            row.role === "agency:confirmation-vote" &&
            row.personId === disposition.personId &&
            row.detail ===
              `${disposition.memberKey}|${disposition.disposition}|${disposition.reason ?? "member:no-reason"}`,
        ))
    )
      return null;
  }
  const members = packet.members.filter(
    (row) => row.disposition.personId === memberPersonId,
  );
  try {
    for (const row of members) {
      if (!row.evaluation) continue;
      // Biography facts have no append history. Their exact original values
      // remain frozen in the callback snapshots validated at capture; do not
      // reconstruct them from today's person. All append-backed references
      // must still exist and belong to this member at the original cutoff.
      validateMindSourceReferences(
        world,
        memberPersonId,
        packet.cutoff.asOfDate,
        row.sourceRefs.filter((reference) => reference.kind !== "person-fact"),
        packet.cutoff.historySequenceExclusive,
      );
    }
  } catch {
    return null;
  }
  return members.length
    ? { ...packet, members, rollCallEventId: rollCall.id }
    : null;
}
