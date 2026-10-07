import { currentHistoricalCutoff } from "../simulation/queries";
import { futureDueItemStateAt } from "../simulation/future-transitions";
import { councilSeatsHeldBy } from "../simulation/living-world/council-seat-office";
import {
  LOCAL_COUNCIL_MEETING,
  meetingItemsThatMatter,
  type CouncilMeetingMatterReason,
} from "../simulation/living-world/local-council-meetings";
import { currentOfficeWorkflowPreference } from "../simulation/office-workflow";
import type {
  EntityId,
  LegislativeMeasureRecord,
  OfficeMeetingDepth,
  World,
} from "../simulation/types";

export interface CouncilMeetingAgendaPreviewItem {
  readonly measure: LegislativeMeasureRecord;
  readonly reasons: readonly CouncilMeetingMatterReason[];
  readonly marked: boolean;
}

export interface CouncilMeetingAgendaPreview {
  readonly dueItemId: EntityId;
  readonly dueAt: string;
  readonly depth: OfficeMeetingDepth;
  readonly items: readonly CouncilMeetingAgendaPreviewItem[];
}

/**
 * Read the next recorded council agenda for its seated player. The preview
 * carries records and reason keys only; wording and the per-meeting control
 * belong to the player surface that consumes it.
 */
export function projectUpcomingCouncilMeetingAgenda(
  world: World,
  playerId: EntityId,
): CouncilMeetingAgendaPreview | null {
  if (world.control.kind !== "person" || world.control.personId !== playerId)
    return null;

  const seat = councilSeatsHeldBy(world, playerId)[0];
  if (!seat) return null;

  const cutoff = currentHistoricalCutoff(world);
  const due = world.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === LOCAL_COUNCIL_MEETING &&
        item.entityIds.includes(playerId) &&
        item.dueAt >= world.currentDate &&
        futureDueItemStateAt(world, item.id, cutoff)?.status === "scheduled",
    )
    .sort(
      (left, right) =>
        left.dueAt.localeCompare(right.dueAt) || left.sequence - right.sequence,
    )[0];
  if (!due) return null;

  const preference = currentOfficeWorkflowPreference(
    world,
    playerId,
    seat.participationId,
  );
  const depth = preference?.meetingDepth ?? "what-matters";
  return {
    dueItemId: due.id,
    dueAt: due.dueAt,
    depth,
    items: meetingItemsThatMatter(world, playerId, due.id).map((item) => ({
      measure: item.measure,
      reasons: item.reasons,
      marked: depth === "everything" || item.reasons.length > 0,
    })),
  };
}
