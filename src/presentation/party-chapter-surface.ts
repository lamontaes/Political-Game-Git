import { projectContacts, type ContactEntry } from "./people-contacts";
import {
  canJoinPartyChapter,
  personName,
  projectPartyEncounters,
  type EntityId,
  type PartyEncounterView,
  type World,
} from "../simulation";
import { formatMinute } from "./player-calendar";
import { proseDate } from "./prose-dates";

/**
 * What a local party chapter looks like from where the player stands.
 *
 * A pure reading of W's chapter encounters. It names the chapter, its
 * organizer and where it meets, lists this player's own invitations with their
 * current state, and says which explicit actions the existing writers will
 * accept right now. It never accepts, attends, joins or travels; the surface
 * calls those writers only when the player chooses one.
 */

export type ChapterMeetingAction = "accept" | "decline" | "attend";

export interface ChapterMeetingRow {
  readonly activityId: EntityId;
  readonly title: string;
  readonly when: string;
  readonly stateLabel: string;
  readonly actions: readonly ChapterMeetingAction[];
}

export interface PartyChapterView {
  readonly organizationId: EntityId;
  readonly name: string;
  readonly venueLabel: string;
  readonly organizer: {
    readonly personId: EntityId;
    readonly name: string;
  } | null;
  /** Public contact route; availability and pending request come from Contacts. */
  readonly contact: ContactEntry | null;
  readonly member: boolean;
  readonly canJoin: boolean;
  readonly meetings: readonly ChapterMeetingRow[];
}

const STATE_LABELS: Readonly<Record<string, string>> = {
  offered: "Invited",
  accepted: "You said you would come",
  declined: "You declined",
  expired: "Passed",
  attended: "You went",
};

function actionsFor(state: string): readonly ChapterMeetingAction[] {
  if (state === "offered") return ["accept", "decline"];
  if (state === "accepted") return ["attend"];
  return [];
}

function chapterView(
  world: World,
  personId: EntityId,
  encounter: PartyEncounterView,
): PartyChapterView {
  const organizer = encounter.organizerPersonId
    ? world.people[encounter.organizerPersonId]
    : undefined;
  return {
    organizationId: encounter.chapterOrganizationId,
    name: encounter.name,
    venueLabel: encounter.venue.label,
    organizer:
      organizer && encounter.organizerPersonId
        ? { personId: encounter.organizerPersonId, name: personName(organizer) }
        : null,
    contact: encounter.organizerPersonId
      ? (projectContacts(world, personId).contacts.find(
          (entry) => entry.personId === encounter.organizerPersonId,
        ) ?? null)
      : null,
    member: encounter.playerParticipation !== null,
    canJoin:
      encounter.playerParticipation === null &&
      canJoinPartyChapter(world, personId, encounter.chapterOrganizationId),
    meetings: encounter.activities.map((activity) => ({
      activityId: activity.activityId,
      title: activity.title,
      when: `${proseDate(activity.start.date)}, ${formatMinute(activity.start.minuteOfDay)}`,
      stateLabel: STATE_LABELS[activity.state] ?? activity.state,
      actions: actionsFor(activity.state),
    })),
  };
}

/** Every home chapter, for finding them from the Politics menu. */
export function projectPartyChapters(
  world: World,
  personId: EntityId,
): readonly PartyChapterView[] {
  return projectPartyEncounters(world, personId).map((encounter) =>
    chapterView(world, personId, encounter),
  );
}

/** One chapter, for a pin or a link; null when this world has no such chapter. */
export function projectPartyChapter(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
): PartyChapterView | null {
  const encounter = projectPartyEncounters(world, personId).find(
    (candidate) => candidate.chapterOrganizationId === organizationId,
  );
  return encounter ? chapterView(world, personId, encounter) : null;
}
