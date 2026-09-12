import { refreshLifeCircumstances } from "../simulation/life-circumstances";
import {
  activeChildAuthoritiesAt,
  currentLifeCutoff,
  householdMembershipsAt,
  addDays,
  advanceWorld,
  advanceWorldMinutes,
  compareSimulationMoments,
  createCampaignElectionTransitionRegistry,
  ageOnDate,
  formativeIntervalAt,
  lifePlaceByJurisdictionId,
  openOrdinaryLifeRecords,
  personName,
  refreshLifeOpportunities,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
  workPendingEntriesFor,
  ORDINARY_LIFE_WORK_ITEMS,
} from "../simulation";
import type {
  EntityId,
  OrdinaryLifeWorkItemDefinition,
  World,
} from "../simulation";
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
 * Authored in `src/simulation/life-opportunities.ts`, beside the writer that
 * creates them, and re-exported here because that is where the content bank
 * and the review surfaces already look for them. One copy of the sentence, in
 * the module that writes it.
 */
export { ORDINARY_LIFE_WORK_ITEMS };
export type { OrdinaryLifeWorkItemDefinition };

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
 * Opens an ordinary life, and keeps it open.
 *
 * Two jobs now, where there used to be one. The first is unchanged: the
 * household week and the posted meeting are written once, for somebody the
 * formative interval has finished with, and never for a five-year-old.
 *
 * The second is the repair this wave exists for. Opening an ordinary life is a
 * legitimate transition, so it is also a moment at which the world may write
 * whatever this life has come to be owed next — another week's errands once the
 * last week's are done, or one new opportunity from the bounded set in
 * `life-opportunities.ts`. Before this, a life had exactly two work items in it
 * for the rest of its existence, and the reachable scenes disappeared with the
 * first of them.
 */
export function openOrdinaryLife(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  if (!ordinaryLifeAvailableFor(world, personId)) return world;
  return refreshLifeCircumstances(
    refreshLifeOpportunities(
      openOrdinaryLifeRecords(world, personId),
      personId,
    ),
    personId,
  );
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
  const companionPersonId =
    currentHouseholdCompanions(world, personId)[0] ?? null;
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

/**
 * When an ordinary day begins.
 *
 * A day that has been passed has also been started, and a life starts its day
 * in the morning. This is the hour the surface hands the player back at, and
 * it is early enough to leave the whole of the day in front of them.
 */
export const ORDINARY_DAY_START_MINUTE = 7 * 60;

/**
 * Moves an ordinary day forward. Nothing dramatic is manufactured to fill it.
 *
 * The handlers are the campaign-aware ones, which is how election day arrives:
 * by the world reaching it while somebody gets on with their week, not because
 * a screen offered a button marked "hold the election". A contest nobody filed
 * for falls through to the substrate's own handler, so this changes nothing for
 * a life with no campaign in it.
 *
 * The first day is crossed on the canonical sub-day path rather than the
 * date-level one, and that is the whole of this repair. `advanceWorld` keeps
 * the local minute by its own accepted contract, which is right for a date
 * primitive and wrong for the one control a player has: a character who spent
 * their evening and then moved to tomorrow arrived at tomorrow still standing
 * at a quarter past eight at night, and the day after that, and the one after
 * that. Anything with an hour in its rules — the campaign afternoon, which
 * books nothing that would run past nine — then had no reachable time left in
 * any day for the rest of the life, and the button that said "move to
 * tomorrow" could not make tomorrow any different. Crossing the first
 * midnight by minutes lands the character in the morning, and the remaining
 * whole days keep that morning by the same contract.
 *
 * A commitment the character has not answered yet is still a hard boundary:
 * the sub-day path refuses to step over one, and when it does the day moves as
 * it did before rather than not at all. Routine work on that first crossing
 * may complete before the commitment; the calendar still moves from there.
 *
 * Remaining whole days stay on `advanceWorld`. A residency skip of years is
 * not a thousand sub-day resolutions; the player control is one day, and
 * further days keep the local minute the first crossing established.
 */
export function passOrdinaryDays(world: World, days = 1): World {
  // The handler registry travels with every advance an adult life can make.
  // A day passed here is the same day as a day passed on the adult surface,
  // and a callback that comes due on it must be answered rather than stepped
  // over — time refuses to step over one it has no handler for, which is the
  // behaviour that keeps a scheduled consequence from being lost. The campaign
  // registry composes the ordinary life handlers with the election handler, so
  // election day arrives without either the life or the contest being dropped.
  const handlers = createCampaignElectionTransitionRegistry();
  const wholeDays = Math.max(1, Math.trunc(days));
  const morning = simulationMomentAtLocalTime({
    date: addDays(world.currentDate, 1),
    minuteOfDay: ORDINARY_DAY_START_MINUTE,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
  const minutes = simulationMinutesBetween(world.currentMoment, morning);
  const stepped =
    minutes > 0 ? advanceWorldMinutes(world, minutes, handlers) : world;
  const tomorrow =
    compareSimulationMoments(stepped.currentMoment, morning) >= 0
      ? stepped
      : advanceWorld(stepped, 1, handlers);
  if (wholeDays === 1) return tomorrow;
  return advanceWorld(tomorrow, wholeDays - 1, handlers);
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
 * Everybody the character currently lives with, not merely the first person the
 * world happens to list. A household of three has three people in it, and a
 * conversation surface that could only ever address one of them was making the
 * other two scenery.
 *
 * Privacy is a fact about the room rather than a setting. Two people in a house
 * can say something meant for one of them; three cannot, not without leaving,
 * and the game does not record anybody leaving. So a third person in the
 * household makes a private word unavailable, and the reason names them rather
 * than greying out a control and saying nothing.
 */
export function householdConversationRoom(
  world: World,
  personId: EntityId,
): ConversationRoomContext | null {
  const person = world.people[personId];
  if (!person) return null;
  // This is an adult household negotiation — who carries the week's errands —
  // and it must not be handed to a dependent child. The fifth human play was a
  // ten-year-old asked to settle the household logistics with a parent. A
  // character somebody else still holds authority over does not have this
  // conversation; refusing is more honest than casting a child as the manager
  // of the house.
  if (activeChildAuthoritiesAt(world, personId).length > 0) return null;
  // People the character actually lives with, not merely other people in the
  // world. A forty-one-year-old was holding a conversation "at home" with the
  // parent from their own summarized childhood — a household they had already
  // moved out of.
  const companionIds = currentHouseholdCompanions(world, personId);
  if (companionIds.length === 0) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId =
    place?.context.jurisdiction.id ?? person.homeJurisdictionId;
  if (!world.jurisdictions[jurisdictionId]) return null;
  const present = [personId, ...companionIds];
  const others = companionIds
    .map((id) => world.people[id])
    .filter((candidate) => candidate !== undefined);
  return {
    sceneKey: "ordinary-life:home",
    // A kitchen has other people in it, and they are not briefing leads. The
    // named part points at whoever the subject will speak to first.
    roles: { "the-other-person": companionIds[0]! },
    locationLabel: "Home",
    jurisdictionId,
    playerPersonId: personId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: companionIds,
    normalHearingPersonIds: present,
    // Nobody is recorded as standing anywhere in particular, so nobody is
    // recorded as overhearing. Inventing an eavesdropper would be inventing a
    // fact about a room the world has never described.
    quietAmbientHearingPersonIds: [],
    privateAvailable: companionIds.length === 1,
    privateUnavailableReason:
      companionIds.length === 1
        ? null
        : `${others
            .slice(1)
            .map((other) => other!.givenName)
            .join(" and ")} ${
            others.length > 2 ? "are" : "is"
          } in the house too, and the rooms here do not really close.`,
  };
}

/**
 * A neighbour, and a notice that concerns both of them.
 *
 * Grounded in two records and nothing else: the character lives somewhere, and
 * so does somebody who is not in their household. That is what a neighbour is
 * — the game does not have a friendship score to consult and will not invent
 * one. Where the world has nobody in the same place outside the household,
 * there is no doorstep conversation, which is the truthful outcome.
 */
export function neighborhoodConversationRoom(
  world: World,
  personId: EntityId,
): ConversationRoomContext | null {
  const person = world.people[personId];
  if (!person) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId =
    place?.context.jurisdiction.id ?? person.homeJurisdictionId;
  if (!world.jurisdictions[jurisdictionId]) return null;

  const cutoff = currentLifeCutoff(world);
  const household = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.membership.householdId,
    ),
  );
  const neighborId = world.personOrder.find((candidateId) => {
    if (candidateId === personId) return false;
    const candidate = world.people[candidateId];
    if (!candidate) return false;
    if (candidate.homeJurisdictionId !== person.homeJurisdictionId)
      return false;
    // Somebody you live with is not a neighbour; that conversation is the one
    // at the kitchen table.
    return !householdMembershipsAt(world, candidateId, cutoff).some((entry) =>
      household.has(entry.membership.householdId),
    );
  });
  if (!neighborId) return null;

  const present = [personId, neighborId];
  return {
    sceneKey: "ordinary-life:doorstep",
    roles: { "the-other-person": neighborId },
    locationLabel: place?.displayName ?? "The street",
    jurisdictionId,
    playerPersonId: personId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: [neighborId],
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    // A doorstep is not private. Anybody could come past, and the game is not
    // going to claim it knows that nobody did.
    privateAvailable: false,
    privateUnavailableReason:
      "You are standing on a doorstep with the street behind you.",
  };
}

/**
 * The people this character currently lives with.
 *
 * Membership is read from the world rather than assumed, so a household with
 * nobody else in it has no household conversation — which is the truthful
 * outcome, and better than putting somebody who moved out decades ago in the
 * next room.
 */
function currentHouseholdCompanions(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const cutoff = currentLifeCutoff(world);
  const mine = householdMembershipsAt(world, personId, cutoff);
  const householdIds = new Set(
    mine.map((entry) => entry.membership.householdId),
  );
  if (householdIds.size === 0) return [];

  const companions: EntityId[] = [];
  for (const candidateId of world.personOrder) {
    if (candidateId === personId) continue;
    const theirs = householdMembershipsAt(world, candidateId, cutoff);
    if (
      theirs.some((entry) => householdIds.has(entry.membership.householdId))
    ) {
      companions.push(candidateId);
    }
  }
  return companions;
}
