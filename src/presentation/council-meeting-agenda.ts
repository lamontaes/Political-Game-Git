import {
  meetingItemsThatMatter,
  type CouncilMeetingMatterReason,
} from "../simulation/living-world/local-council-meetings";
import { officeCouncilMeetingDepth } from "../simulation/office-workflow";
import type { CouncilMeetingDepth, EntityId, World } from "../simulation/types";

export const COUNCIL_MEETING_DEPTH_CHOICES: readonly {
  readonly depth: CouncilMeetingDepth;
  readonly label: string;
}[] = [
  {
    depth: "what-matters",
    label: "Play items that matter to me or people I know",
  },
  { depth: "everything", label: "Sit through the whole meeting" },
];

export interface CouncilMeetingAgendaNotice {
  readonly dueItemId: EntityId;
  readonly meetingAt: string;
  readonly selectedDepth: CouncilMeetingDepth;
  readonly depthChoices: typeof COUNCIL_MEETING_DEPTH_CHOICES;
  readonly items: readonly {
    readonly measureId: EntityId;
    readonly designation: string;
    readonly title: string;
    readonly reasons: readonly CouncilMeetingMatterReason[];
    readonly plays: boolean;
  }[];
}

/**
 * Build the agenda notice from the scheduled meeting and its saved records.
 * A one-meeting choice may override the recorded office default without
 * changing it; the caller sends that choice back as `meetingDepth`.
 */
export function projectCouncilMeetingAgendaNotice(
  world: World,
  playerId: EntityId,
  officeRelationshipId: EntityId,
  dueItemId: EntityId,
  meetingDepth?: CouncilMeetingDepth,
): CouncilMeetingAgendaNotice | null {
  const due = world.history.futureDueItems.find(
    (item) =>
      item.id === dueItemId &&
      item.transitionKey === "civic:local-council-meeting",
  );
  if (!due) return null;
  const selectedDepth =
    meetingDepth ??
    officeCouncilMeetingDepth(world, playerId, officeRelationshipId);
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );
  const items = meetingItemsThatMatter(world, playerId, dueItemId).flatMap(
    (matter) => {
      const measure = measures.get(matter.measureId);
      if (!measure) return [];
      return [
        {
          measureId: matter.measureId,
          designation: measure.designation,
          title: measure.shortTitle,
          reasons: matter.reasons,
          plays: selectedDepth === "everything" || matter.reasons.length > 0,
        },
      ];
    },
  );
  return {
    dueItemId,
    meetingAt: due.dueAt,
    selectedDepth,
    depthChoices: COUNCIL_MEETING_DEPTH_CHOICES,
    items,
  };
}
