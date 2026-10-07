import {
  currentOfficeWorkflowPreference,
  type EntityId,
  type OfficeMeetingDepth,
  type World,
} from "../simulation";
import {
  LOCAL_COUNCIL_MEETING,
  meetingItemsThatMatter,
} from "../simulation/living-world/local-council-meetings";

export interface CouncilMeetingAgendaNotice {
  readonly dueItemId: EntityId;
  readonly meetingAt: string;
  readonly selectedDepth: OfficeMeetingDepth;
  readonly items: readonly {
    readonly measureId: EntityId;
    readonly designation: string;
    readonly title: string;
    readonly reasons: readonly string[];
    readonly plays: boolean;
  }[];
}

/** Reads one scheduled council agenda without writing a preference or event. */
export function projectCouncilMeetingAgendaNotice(
  world: World,
  playerId: EntityId,
  officeRelationshipId: EntityId,
  dueItemId: EntityId,
  meetingDepthOverride?: OfficeMeetingDepth,
): CouncilMeetingAgendaNotice | null {
  const due = world.history.futureDueItems.find(
    (item) =>
      item.id === dueItemId && item.transitionKey === LOCAL_COUNCIL_MEETING,
  );
  if (!due || !world.people[playerId]) return null;

  const selectedDepth =
    meetingDepthOverride ??
    currentOfficeWorkflowPreference(world, playerId, officeRelationshipId)
      ?.meetingDepth ??
    "what-matters";
  const items = meetingItemsThatMatter(world, playerId, due.id).map(
    ({ measure, reasons }) => ({
      measureId: measure.id,
      designation: measure.designation,
      title: measure.shortTitle,
      reasons,
      plays: selectedDepth === "everything" || reasons.length > 0,
    }),
  );

  return {
    dueItemId: due.id,
    meetingAt: due.dueAt,
    selectedDepth,
    items,
  };
}
