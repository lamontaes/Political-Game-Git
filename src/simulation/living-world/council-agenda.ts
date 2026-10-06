import type { GovernmentUnitIdentity } from "../government-units";
import { currentOfficeWorkflowPreference } from "../office-workflow";
import { recordWorldEvent } from "../world";
import type {
  EntityId,
  LegislativeMeasureRecord,
  OfficeMeetingDepth,
  OfficeVotingWorkflowMode,
  World,
} from "../types";
import {
  playerCouncilSeat,
  quietCouncilItems,
  type QuietItemHandling,
} from "./council-quiet-items";
import {
  meetingItemsThatMatter,
  type CouncilMeetingMatterReason,
} from "./local-council-meetings";
import { measurePosition } from "../legislation";

/**
 * The agenda a council member sees before a meeting (b05 part 2).
 *
 * Each item carries the saved facts that make it matter to them (none means it
 * is quiet), and whether it plays: an item plays when something makes it
 * matter, when the member's default depth for this seat is "everything", when
 * they chose to sit through this one meeting, or when their voting workflow
 * is to handle each vote individually. Only the items that do not play are
 * quiet, and the quiet ones follow the voting workflow (`council-quiet-items`).
 *
 * Reading the agenda writes nothing and spends no game time.
 */

const SIT_THROUGH_EVENT = "local.council-sit-through-chosen";

export interface CouncilAgendaItem {
  readonly measure: LegislativeMeasureRecord;
  readonly reasons: readonly CouncilMeetingMatterReason[];
  readonly matters: boolean;
  /** True when the member takes this item themselves instead of letting a workflow handle it. */
  readonly plays: boolean;
  /** Why it plays, in words from the record, or null for a quiet item. */
  readonly playsBecause:
    | "matters"
    | "everything-default"
    | "sits-through-this-meeting"
    | "handles-each-vote"
    | null;
  /** What the workflow does with it when it does not play. */
  readonly handling: QuietItemHandling | null;
}

export interface CouncilMeetingAgenda {
  readonly dueItemId: EntityId;
  readonly seatParticipationId: EntityId | null;
  readonly depth: OfficeMeetingDepth;
  readonly votingMode: OfficeVotingWorkflowMode | null;
  readonly sitsThroughThisMeeting: boolean;
  readonly items: readonly CouncilAgendaItem[];
}

function sitThroughKey(dueStableKey: string, playerId: EntityId): string {
  return `${dueStableKey}:sit-through:${playerId}`;
}

/** Whether the member chose to sit through this one meeting. */
export function sitsThroughMeeting(
  world: World,
  playerId: EntityId,
  dueItemId: EntityId,
): boolean {
  const due = world.history.futureDueItems.find((row) => row.id === dueItemId);
  if (!due) return false;
  const key = sitThroughKey(due.stableKey, playerId);
  return world.history.events.some((event) => event.stableKey === key);
}

/**
 * The member chooses to sit through the whole of this meeting. Refused (World
 * unchanged) when the meeting is not a saved council meeting or the member
 * holds no seat on its body. Choosing again changes nothing.
 */
export function chooseToSitThroughMeeting(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly playerId: EntityId;
    readonly dueItemId: EntityId;
  },
): World {
  const due = world.history.futureDueItems.find(
    (row) => row.id === input.dueItemId,
  );
  if (
    !due?.jurisdictionId ||
    !playerCouncilSeat(world, input.unit, input.playerId)
  )
    return world;
  if (sitsThroughMeeting(world, input.playerId, due.id)) return world;
  return recordWorldEvent(world, {
    stableKey: sitThroughKey(due.stableKey, input.playerId),
    type: SIT_THROUGH_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: due.jurisdictionId,
    involvedEntityIds: [due.id, input.playerId],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: [SIT_THROUGH_EVENT],
    summary: "A council member chose to sit through the whole meeting.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** The agenda for one saved council meeting, as the member's seat sees it. Read only. */
export function councilMeetingAgenda(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly playerId: EntityId;
    readonly dueItemId: EntityId;
  },
): CouncilMeetingAgenda {
  const seat = playerCouncilSeat(world, input.unit, input.playerId);
  const preference = seat
    ? currentOfficeWorkflowPreference(
        world,
        input.playerId,
        seat.participationId,
      )
    : null;
  const depth = preference?.meetingDepth ?? "what-matters";
  const votingMode = preference?.votingMode ?? null;
  const sits = sitsThroughMeeting(world, input.playerId, input.dueItemId);
  const listed = meetingItemsThatMatter(
    world,
    input.playerId,
    input.dueItemId,
  ).filter((item) => {
    const phase = measurePosition(world, item.measure.id).phase;
    return phase === "awaiting-referral" || phase === "on-floor";
  });
  // What the workflow does with each item that does not play; the reader
  // judges every item as if it were quiet and only uses the answer for those.
  const handlingFor = new Map(
    quietCouncilItems(world, {
      unit: input.unit,
      playerId: input.playerId,
      quiet: listed.map((item) => item.measure),
    }).map((item) => [item.measure.id, item.handling] as const),
  );
  return {
    dueItemId: input.dueItemId,
    seatParticipationId: seat?.participationId ?? null,
    depth,
    votingMode,
    sitsThroughThisMeeting: sits,
    items: listed.map((item) => {
      const playsBecause: CouncilAgendaItem["playsBecause"] =
        item.reasons.length > 0
          ? "matters"
          : depth === "everything"
            ? "everything-default"
            : sits
              ? "sits-through-this-meeting"
              : votingMode === "handle-individually"
                ? "handles-each-vote"
                : null;
      return {
        measure: item.measure,
        reasons: item.reasons,
        matters: item.reasons.length > 0,
        plays: playsBecause !== null,
        playsBecause,
        handling:
          playsBecause === null
            ? (handlingFor.get(item.measure.id) ?? null)
            : null,
      };
    }),
  };
}
