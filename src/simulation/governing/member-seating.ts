import { institutionOfficeBindingAt } from "../enacted-rule-changes";
import { recordById, recordByStableKey } from "../history-index";
import { currentHistoricalCutoff } from "../queries";
import { workStatusAt } from "../life-queries";
import { activeLegislativeTermEvidence } from "../legislative-office-terms";
import { LATE_TERM_ENTRY, lateTermEntryKey } from "../late-term-entry-events";
import {
  STATE_LEGISLATURE_KEYS,
  stateLegislators,
  type StateLegislatorView,
} from "../nationwide-world/state-legislature-opening";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";

/** A view of saved seating evidence. Reading it creates no tenure or event. */
export interface MemberSeatingEvidence {
  readonly eventId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly occurredAt: IsoDate;
  readonly kind: "opening-seating" | "late-term-entry";
}

/**
 * An opening event seats its original saved cohort together. Its date is not
 * the generated service start, and never belongs to a later replacement.
 * Late entry needs its own recorded event and validated actual term chain.
 * Ordinary elected-term entry currently emits no seating event: return null.
 */
export function stateMemberSeatingEvidence(
  world: World,
  candidacyPackId: string,
  jurisdictionId: EntityId,
  member: StateLegislatorView,
): MemberSeatingEvidence | null {
  const cutoff = currentHistoricalCutoff(world);
  const holder = stateLegislators(world, candidacyPackId).find(
    (row) =>
      row.personId === member.personId &&
      row.workRelationshipId === member.workRelationshipId &&
      row.officeKey === member.officeKey &&
      row.ordinal === member.ordinal,
  );
  const work =
    holder &&
    recordById(world.history.workRelationships, holder.workRelationshipId);
  const binding = institutionOfficeBindingAt(
    world,
    member.officeKey,
    jurisdictionId,
    cutoff,
  );
  if (
    !holder ||
    !work ||
    !binding ||
    work.personId !== holder.personId ||
    work.organizationId !== binding.organizationId ||
    work.kind !== "employment:legislative-member" ||
    work.startedAt > cutoff.asOfDate ||
    work.recordedAt > cutoff.asOfDate ||
    work.sequence >= cutoff.historySequenceExclusive ||
    workStatusAt(world, work.id, cutoff)?.status !== "active"
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

  const opening = recordByStableKey(
    world.history.events,
    STATE_LEGISLATURE_KEYS.opening(candidacyPackId),
  );
  if (
    !holder.byCampaign &&
    work.stableKey ===
      `${STATE_LEGISLATURE_KEYS.seat(holder.officeKey, holder.ordinal)}:tenure` &&
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

  const late = recordByStableKey(
    world.history.events,
    lateTermEntryKey(work.id),
  );
  if (!visible(late) || late.type !== LATE_TERM_ENTRY) return null;
  const term = activeLegislativeTermEvidence(world, work.id);
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
