import {
  currentLifeCutoff,
  householdMembershipsAt,
  advanceWorld,
  ageOnDate,
  createScheduledActivity,
  createWorkItem,
  formativeIntervalAt,
  lifePlaceByJurisdictionId,
  makeSimulationMoment,
  personName,
  recordWorldEvent,
  workPendingEntriesFor,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import type { ConversationRoomContext } from "./run-b-conversation";
import { shortPersonName } from "./conversation-subjects";

/**
 * A day in an ordinary life.
 *
 * Most characters do not work in a legislature, and the game has to be worth
 * playing for them too. What is here is small on purpose: where the character
 * is, what is actually waiting on them, and who else is around. It is a scene
 * with a few things in it, not a dashboard of cards.
 */

export const HOUSEHOLD_ERRANDS_KEY = "ordinary-life:household-errands";
export const PUBLIC_MEETING_KEY = "ordinary-life:public-meeting";

/**
 * The two things an ordinary week actually puts in front of somebody.
 *
 * These sentences used to live inside `openOrdinaryLife`, which is where they
 * are used and the wrong place for them to be read. Naming them here changes
 * nothing about the week — the same two work items are written with the same
 * two titles and the same two summaries — and it means a review surface can
 * quote the authored line rather than retyping it somewhere else and letting
 * the two copies drift.
 */
export interface OrdinaryLifeWorkItemDefinition {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
}

export const ORDINARY_LIFE_WORK_ITEMS: readonly OrdinaryLifeWorkItemDefinition[] =
  [
    {
      key: HOUSEHOLD_ERRANDS_KEY,
      title: "The week's errands",
      summary:
        "The shopping and the two appointments after it still have to be covered by somebody.",
    },
    {
      key: PUBLIC_MEETING_KEY,
      title: "Whether to go to the meeting",
      summary:
        "The agenda is posted. Going costs an evening; not going costs knowing what was decided.",
    },
  ];

function ordinaryLifeWorkItem(key: string): OrdinaryLifeWorkItemDefinition {
  const definition = ORDINARY_LIFE_WORK_ITEMS.find(
    (candidate) => candidate.key === key,
  );
  if (!definition) {
    throw new Error(`No ordinary-life work item is authored as '${key}'.`);
  }
  return definition;
}

export interface PendingThing {
  readonly key: string;
  /** One sentence, in the character's own life, not a work-tracker row. */
  readonly sentence: string;
  readonly waitingOnSomeoneElse: boolean;
}

export interface OrdinaryDay {
  readonly personName: string;
  readonly age: number;
  readonly placeName: string | null;
  readonly dateLabel: string;
  readonly timeLabel: string;
  /** The scene, before anything is listed. */
  readonly opening: string;
  readonly pending: readonly PendingThing[];
  /** Who is around to talk to, if anyone is. */
  readonly companionPersonId: EntityId | null;
  readonly companionName: string | null;
}

/**
 * Whether the ordinary week is this character's to run.
 *
 * Covering the shopping and the appointments, and deciding whether to give up
 * an evening to a public meeting, are things a person does once nobody else is
 * responsible for them. While the formative interval is still running they are
 * not: a five-year-old does not carry the household week, and the game must not
 * write down that they do. The engine already draws that line — the formative
 * interval runs from birth to eighteen and then stops — so this reads that
 * contract rather than inventing a second age rule beside it.
 */
export function ordinaryLifeAvailableFor(
  world: World,
  personId: EntityId,
): boolean {
  return formativeIntervalAt(world, personId) === null;
}

/**
 * Writes the two ordinary contexts this life starts with, once.
 *
 * Both are deliberately unglamorous and neither is legislative: a household
 * week that has to be covered by somebody, and a public meeting that is posted
 * whether or not anyone goes. They exist so the normal content sample is not
 * one transit bill.
 *
 * Nothing is written for a character these are not yet true of. The audit
 * reproduced a production five-year-old carrying "The week's errands", a
 * decision about a meeting and an evening on their calendar with themselves as
 * the responsible person — invisible on screen, because a child renders the
 * formative surface, and permanent in the save. The gate lives here, at the
 * write, rather than in the one caller that happened to exist: a canonical
 * record is not made pure by the screen that hides it.
 */
export function openOrdinaryLife(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  if (!ordinaryLifeAvailableFor(world, personId)) return world;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const alreadyOpen = world.history.workItems.some(
    (item) => item.stableKey === HOUSEHOLD_ERRANDS_KEY,
  );
  if (alreadyOpen) return world;

  // The meeting is on the calendar because a notice was posted. Recording the
  // notice first gives the activity something canonical to have come from.
  let next = recordWorldEvent(world, {
    stableKey: `${PUBLIC_MEETING_KEY}:notice`,
    type: "civic.meeting-notice",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "observation:reader",
        detail: "Saw the posted agenda",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["civic.public-meeting"],
    summary:
      "A public meeting was posted on the local calendar with its agenda attached.",
    context: {
      location: jurisdictionId
        ? { jurisdictionId, label: "Public meeting room", setting: null }
        : null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const notice = next.history.events.at(-1);
  if (!notice) throw new Error("The meeting notice was not recorded.");

  next = createScheduledActivity(next, {
    stableKey: `${PUBLIC_MEETING_KEY}:activity`,
    title: "Posted public meeting",
    summary:
      "A local meeting on the published calendar. Anyone may attend; nobody has asked you to.",
    kind: "tentative",
    start: momentAt(world, 18, 30),
    end: momentAt(world, 19, 45),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "ordinary-life:meeting-room",
      label: "Public meeting room",
      jurisdictionId: jurisdictionId ?? person.homeJurisdictionId,
    },
    sourceEntityIds: [notice.id],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  const meeting = next.history.scheduledActivities.at(-1);
  if (!meeting) throw new Error("The public meeting was not recorded.");

  next = createWorkItem(next, {
    stableKey: HOUSEHOLD_ERRANDS_KEY,
    title: ordinaryLifeWorkItem(HOUSEHOLD_ERRANDS_KEY).title,
    summary: ordinaryLifeWorkItem(HOUSEHOLD_ERRANDS_KEY).summary,
    jurisdictionId,
    sourceEntityIds: [notice.id],
    focus: { kind: "person", personId },
    effort: { kind: "authored-duration", requiredMinutes: 150 },
    access: { kind: "private", personIds: [personId] },
    assignedPersonIds: [personId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });

  return createWorkItem(next, {
    stableKey: PUBLIC_MEETING_KEY,
    title: ordinaryLifeWorkItem(PUBLIC_MEETING_KEY).title,
    summary: ordinaryLifeWorkItem(PUBLIC_MEETING_KEY).summary,
    jurisdictionId,
    sourceEntityIds: [meeting.id],
    focus: { kind: "calendar-item", scheduledActivityId: meeting.id },
    effort: { kind: "authored-duration", requiredMinutes: 75 },
    access: { kind: "private", personIds: [personId] },
    assignedPersonIds: [personId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: meeting.id,
  });
}

export function projectOrdinaryDay(
  world: World,
  personId: EntityId,
): OrdinaryDay {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const placeName = place?.displayName ?? null;
  // The same person the conversation below is with. The day used to name the
  // first other person in the world while the room named an actual housemate,
  // so one screen introduced two strangers as though they were one.
  const companionPersonId = currentHouseholdCompanion(world, personId);
  const companion = companionPersonId
    ? world.people[companionPersonId]
    : undefined;
  const pending = workPendingEntriesFor(world, personId)
    .filter((entry) => entry.state.status !== "completed")
    .map((entry) => ({
      key: entry.item.stableKey,
      sentence: entry.item.summary,
      waitingOnSomeoneElse: entry.state.waitingOnPersonIds.length > 0,
    }));

  return {
    personName: personName(person),
    age: ageOnDate(person.birthDate, world.currentDate),
    placeName,
    dateLabel: longDate(world.currentDate),
    timeLabel: clockTime(world.currentMoment.minuteOfDay),
    // The same name the conversation below uses. Calling one person "Emmanuel"
    // on one line and "Day" on the next leaves a player unable to tell they
    // are the same person.
    opening: openingLine(
      placeName,
      pending.length,
      companion ? shortPersonName(world, companion.id) : undefined,
    ),
    pending,
    companionPersonId,
    companionName: companion ? personName(companion) : null,
  };
}

/** Moves an ordinary day forward. Nothing dramatic is manufactured to fill it. */
export function passOrdinaryDays(world: World, days = 1): World {
  return advanceWorld(world, Math.max(1, Math.trunc(days)));
}

function openingLine(
  placeName: string | null,
  pendingCount: number,
  companionName: string | undefined,
): string {
  const where = placeName ? ` in ${placeName}` : "";
  const who = companionName ? ` ${companionName} is in the next room.` : "";
  if (pendingCount === 0) {
    return `A day${where} with nothing on it that anyone is waiting for.${who}`;
  }
  return `A day${where}, and a short list of things nobody else is going to do.${who}`;
}

function momentAt(world: World, hour: number, minute: number) {
  return makeSimulationMoment({
    date: world.currentDate,
    minuteOfDay: hour * 60 + minute,
    timeZone: world.currentMoment.timeZone,
    utcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function longDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function clockTime(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

/**
 * The kitchen, as a room the conversation engine understands.
 *
 * Two people, both present, nobody else in earshot. The engine's role fields
 * are named after the office scenario that was written first; the household
 * subject never reads them, so they simply point at whoever is here.
 */
export function householdConversationRoom(
  world: World,
  personId: EntityId,
): ConversationRoomContext | null {
  const person = world.people[personId];
  if (!person) return null;
  // Somebody the character actually lives with, not merely the first other
  // person in the world. A forty-one-year-old was holding a conversation "at
  // home" with the parent from their own summarized childhood — a household
  // they had already moved out of.
  const companionId = currentHouseholdCompanion(world, personId);
  if (companionId === null) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId =
    place?.context.jurisdiction.id ?? person.homeJurisdictionId;
  if (!world.jurisdictions[jurisdictionId]) return null;
  const present = [personId, companionId];
  return {
    sceneKey: "ordinary-life:home",
    // A kitchen has one other person in it, and they are not a briefing lead.
    roles: { "the-other-person": companionId },
    locationLabel: "Home",
    jurisdictionId,
    playerPersonId: personId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: [companionId],
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    privateAvailable: true,
    privateUnavailableReason: null,
  };
}

/**
 * Another member of the household this person is currently in.
 *
 * Membership is read from the world rather than assumed, so a household with
 * nobody else in it has no household conversation — which is the truthful
 * outcome, and better than putting somebody who moved out decades ago in the
 * next room.
 */
function currentHouseholdCompanion(
  world: World,
  personId: EntityId,
): EntityId | null {
  const cutoff = currentLifeCutoff(world);
  const mine = householdMembershipsAt(world, personId, cutoff);
  const householdIds = new Set(
    mine.map((entry) => entry.membership.householdId),
  );
  if (householdIds.size === 0) return null;

  for (const candidateId of world.personOrder) {
    if (candidateId === personId) continue;
    const theirs = householdMembershipsAt(world, candidateId, cutoff);
    if (
      theirs.some((entry) => householdIds.has(entry.membership.householdId))
    ) {
      return candidateId;
    }
  }
  return null;
}
