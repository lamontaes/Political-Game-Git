import type {
  EntityId,
  HistoricalEvent,
  HistoricalCutoff,
  WorkRelationship,
} from "../../simulation/types";
import type { StateLegislatorView } from "../../simulation/nationwide-world/state-legislature-opening";
import type { MemberSeatingEvidence } from "../../simulation/governing/member-seating";
import {
  activeLegislativeTermEvidence,
  type LegislativeEvidenceFacts,
} from "./term-evidence";
import type { institutionOfficeBindingAt } from "../../simulation/enacted-rule-changes";
export interface SeatingEvidenceFacts {
  readonly cutoff: HistoricalCutoff;
  readonly holders: readonly StateLegislatorView[];
  readonly workRelationships: readonly WorkRelationship[];
  readonly binding: ReturnType<typeof institutionOfficeBindingAt>;
  readonly workStatuses: ReadonlyMap<EntityId, { readonly status: string }>;
  readonly events: readonly HistoricalEvent[];
  readonly openingStableKey: string;
  readonly seatStableKey: string;
  readonly lateStableKey: string;
  readonly termEvidenceFacts: LegislativeEvidenceFacts;
}
export function stateMemberSeatingEvidence(
  facts: SeatingEvidenceFacts,
  candidacyPackId: string,
  jurisdictionId: EntityId,
  member: StateLegislatorView,
): MemberSeatingEvidence | null {
  const cutoff = facts.cutoff;
  const holder = facts.holders.find(
    (row) =>
      row.personId === member.personId &&
      row.workRelationshipId === member.workRelationshipId &&
      row.officeKey === member.officeKey &&
      row.ordinal === member.ordinal,
  );
  const work =
    holder &&
    facts.workRelationships.find((row) => row.id === holder.workRelationshipId);
  const binding = facts.binding;
  if (
    !holder ||
    !work ||
    work.personId !== holder.personId ||
    (binding && work.organizationId !== binding.organizationId) ||
    work.kind !== "employment:legislative-member" ||
    work.startedAt > cutoff.asOfDate ||
    work.recordedAt > cutoff.asOfDate ||
    work.sequence >= cutoff.historySequenceExclusive ||
    facts.workStatuses.get(work.id)?.status !== "active"
  )
    return null;
  const visible = (
    event: HistoricalEvent | undefined,
  ): event is HistoricalEvent =>
    !!event &&
    event.occurredAt <= cutoff.asOfDate &&
    event.recordedAt <= cutoff.asOfDate &&
    event.sequence < cutoff.historySequenceExclusive &&
    event.sequence > work.sequence &&
    event.jurisdictionId === jurisdictionId;
  const opening = facts.events.find(
    (row) => row.stableKey === facts.openingStableKey,
  );
  if (
    !holder.byCampaign &&
    binding &&
    work.stableKey === `${facts.seatStableKey}:tenure` &&
    visible(opening) &&
    opening.type === "world.state-legislature-opening" &&
    opening.tags.includes(`pack:${candidacyPackId}`) &&
    opening.involvedEntityIds.includes(binding.organizationId)
  )
    return {
      eventId: opening.id,
      workRelationshipId: work.id,
      occurredAt: opening.occurredAt,
      kind: "opening-seating",
    };
  const late = facts.events.find(
    (row) => row.stableKey === facts.lateStableKey,
  );
  if (!visible(late) || late.type !== "election.term-entered-late") return null;
  const term = activeLegislativeTermEvidence(facts.termEvidenceFacts, work.id);
  if (
    !term ||
    term.pack.packId !== candidacyPackId ||
    term.governing.id !== jurisdictionId ||
    term.contest.office.officeKey !== holder.officeKey ||
    !late.involvedEntityIds.includes(holder.personId) ||
    !late.involvedEntityIds.includes(work.id) ||
    !late.involvedEntityIds.includes(term.contest.id) ||
    !late.participants.some(
      (participant) =>
        participant.personId === holder.personId &&
        participant.role === "focus:officeholder",
    )
  )
    return null;
  return {
    eventId: late.id,
    workRelationshipId: work.id,
    occurredAt: late.occurredAt,
    kind: "late-term-entry",
  };
}
