import {
  advanceWorld,
  ageOnDate,
  createScheduledActivity,
  createWorkItem,
  lifePlaceByJurisdictionId,
  makeSimulationMoment,
  personName,
  recordWorldEvent,
  workPendingEntriesFor,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import type { ConversationRoomContext } from "./run-b-conversation";

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
 * Writes the two ordinary contexts this life starts with, once.
 *
 * Both are deliberately unglamorous and neither is legislative: a household
 * week that has to be covered by somebody, and a public meeting that is posted
 * whether or not anyone goes. They exist so the normal content sample is not
 * one transit bill.
 */
export function openOrdinaryLife(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
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
    title: "The week's errands",
    summary:
      "The shopping and the two appointments after it still have to be covered by somebody.",
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
    title: "Whether to go to the meeting",
    summary:
      "The agenda is posted. Going costs an evening; not going costs knowing what was decided.",
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
  const companionPersonId =
    world.personOrder.find((candidate) => candidate !== personId) ?? null;
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
    opening: openingLine(placeName, pending.length, companion?.givenName),
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
  const companionId =
    world.personOrder.find((candidate) => candidate !== personId) ?? null;
  if (companionId === null) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId =
    place?.context.jurisdiction.id ?? person.homeJurisdictionId;
  if (!world.jurisdictions[jurisdictionId]) return null;
  const present = [personId, companionId];
  return {
    sceneKey: "ordinary-life:home",
    briefingLeadPersonId: companionId,
    referralVerifierPersonId: companionId,
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
