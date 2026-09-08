import { formativeIntervalAt } from "./character-history";
import { addDays, makeIsoDate, makeSimulationMoment } from "./dates";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdLocationAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import { recordEventKnowledge } from "./records";
import {
  createScheduledActivity,
  createWorkItem,
  workPendingEntriesFor,
} from "./time-work";
import { recordWorldEvent } from "./world";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "./types";

/**
 * Where an adult life gets its next thing to do.
 *
 * The adult scene bank reads premises and never invents them, which is right,
 * and on its own it is not enough: a world that never writes a request, an
 * invitation or a notice has nothing for the bank to read, and the life runs
 * out. The audited failure was exactly that shape — the week's errands are
 * completed after a hundred and fifty minutes, both remaining scenes lose the
 * record they stand on, and no amount of further time restores either, because
 * nothing in the game was ever going to write another one.
 *
 * This module is the missing writer, and it is a writer: every function that
 * returns a `World` here creates canonical records during a transition the
 * player actually took. Nothing in the reading path calls them. A situation
 * list, a fact packet or a rendered scene that manufactured the record it then
 * cites as evidence would prove nothing at all, and the separation is the
 * whole point of asking for a premise in the first place.
 *
 * What it may write is deliberately small. Six kinds, each one a proposition
 * an existing canonical record can already carry — somebody asked something,
 * of somebody, about something, at a time — plus the ordinary household week,
 * which recurs because households do. It is not a social engine, it does not
 * model professions, and it decides nothing about what any of it means; the
 * bank still owns the scene and the player still owns the choice.
 */

/* -------------------------------------------------------------------------- */
/* The bounded vocabulary                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The kinds of opportunity this world may create for a life.
 *
 * Bounded on purpose, and each one names the family it makes answerable rather
 * than being a general-purpose event. A kind is added when an authored scene is
 * withheld for exactly the record this kind writes — not because a seventh kind
 * would be interesting.
 */
export const LIFE_OPPORTUNITY_KINDS = [
  "household-evening",
  "social-occasion",
  "favour-request",
  "confidence-disclosed",
  "extra-hours-request",
  "meeting-agenda-item",
  "candidacy-approach",
] as const;

export type LifeOpportunityKind = (typeof LIFE_OPPORTUNITY_KINDS)[number];

/** The scene each kind makes answerable. One family, named rather than guessed. */
export const LIFE_OPPORTUNITY_ANSWERING_KEY: Readonly<
  Record<LifeOpportunityKind, string>
> = {
  "household-evening": "adult.household-quiet-evening",
  "social-occasion": "adult.weekend-invitation",
  "favour-request": "adult.friend-favour",
  "confidence-disclosed": "adult.friend-in-difficulty",
  "extra-hours-request": "adult.work-extra-hours",
  "meeting-agenda-item": "adult.local-issue-position",
  "candidacy-approach": "adult.candidacy-approach",
};

/**
 * Whether a kind may be written again once its scene has been played.
 *
 * The two ordinary weeks of a life — an evening in, an invitation to something
 * on a Saturday — recur, because they do. The other five do not: a favour
 * asked, a confidence given, an approach about standing for office and a read
 * agenda item happen once in this bank, and a world that kept writing new ones
 * would be manufacturing a queue of requests nobody would ever be offered.
 *
 * This mirrors the `ordinary` stakes tier in the adult bank, which cannot be
 * imported here without a cycle. `adult-situations.test.ts` pins the two
 * against each other so the copy cannot quietly drift from the original.
 */
export const LIFE_OPPORTUNITY_REPEATABLE: Readonly<
  Record<LifeOpportunityKind, boolean>
> = {
  "household-evening": true,
  "social-occasion": true,
  "favour-request": false,
  "confidence-disclosed": false,
  "extra-hours-request": false,
  "meeting-agenda-item": false,
  "candidacy-approach": false,
};

export const LIFE_OPPORTUNITY_TAG_PREFIX = "life.opportunity:";

export function lifeOpportunityTag(kind: LifeOpportunityKind): string {
  return `${LIFE_OPPORTUNITY_TAG_PREFIX}${kind}`;
}

/**
 * How many unanswered opportunities a life may carry at once.
 *
 * A cap rather than a rate. It exists so a player who lets a year go by finds a
 * life with a few things in it rather than a queue of forty, and so that a
 * repeated selector cannot pile up work by being called twice.
 */
export const OPEN_LIFE_OPPORTUNITY_LIMIT = 4;

/** How long the household week runs before another one is written. */
export const HOUSEHOLD_WEEK_DAYS = 7;

export const HOUSEHOLD_ERRANDS_KEY = "ordinary-life:household-errands";
export const PUBLIC_MEETING_KEY = "ordinary-life:public-meeting";

/**
 * The two things an ordinary week actually puts in front of somebody.
 *
 * Authored data, and it lives in the simulation because the world builder
 * writes these items and a world may not read a screen to find out what an
 * ordinary week is. `src/presentation/ordinary-life.ts` re-exports both the
 * type and the constant, so the content bank that quotes the authored line
 * still quotes exactly one copy of it.
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
      summary: "The agenda is posted. Decide whether to attend.",
    },
  ];

function authoredWorkItem(key: string): OrdinaryLifeWorkItemDefinition {
  const definition = ORDINARY_LIFE_WORK_ITEMS.find(
    (candidate) => candidate.key === key,
  );
  if (!definition) {
    throw new Error(`No ordinary-life work item is authored as '${key}'.`);
  }
  return definition;
}

/* -------------------------------------------------------------------------- */
/* Reading — pure, and the only thing the scene bank is allowed to use         */
/* -------------------------------------------------------------------------- */

export interface LifeOpportunityRecord {
  readonly kind: LifeOpportunityKind;
  readonly eventId: EntityId;
  readonly stableKey: string;
  readonly openedAt: IsoDate;
  /** The person who asked, or null where nobody did. */
  readonly counterpartPersonId: EntityId | null;
  /** The day the thing is for, when it is for a day. */
  readonly occasionDate: IsoDate | null;
  readonly sequence: number;
}

/**
 * The opportunities this life currently carries an answer for.
 *
 * Open means three separate things, and all three are read from the record
 * rather than assumed: it was written, the player has not since answered the
 * family it belongs to, and — where it was for a particular day — that day has
 * not gone past. An invitation to a Saturday that has been and gone is not an
 * invitation, and a game that kept offering it would be lying about the world.
 */
export function lifeOpportunitiesFor(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): readonly LifeOpportunityRecord[] {
  // One pass. This is read on every context build, which is read on every
  // projection, so it walks the event log exactly once and collects both the
  // requests and the answers as it goes.
  const written: {
    readonly kind: LifeOpportunityKind;
    readonly event: (typeof world.history.events)[number];
  }[] = [];
  const answeredAfter = new Map<string, number>();

  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    for (const tag of event.tags) {
      if (tag.startsWith("adult.")) {
        const previous = answeredAfter.get(tag);
        if (previous === undefined || event.sequence > previous) {
          answeredAfter.set(tag, event.sequence);
        }
        continue;
      }
      if (!tag.startsWith(LIFE_OPPORTUNITY_TAG_PREFIX)) continue;
      const kind = tag.slice(LIFE_OPPORTUNITY_TAG_PREFIX.length);
      if (isLifeOpportunityKind(kind)) written.push({ kind, event });
    }
  }
  if (written.length === 0) return [];

  const occasions = occasionDatesBySource(world);
  const opened: LifeOpportunityRecord[] = [];
  for (const { kind, event } of written) {
    const answeredAt = answeredAfter.get(LIFE_OPPORTUNITY_ANSWERING_KEY[kind]);
    if (answeredAt !== undefined && answeredAt > event.sequence) continue;

    const occasionDate = occasions.get(event.id) ?? null;
    if (occasionDate !== null && occasionDate < asOfDate) continue;

    opened.push({
      kind,
      eventId: event.id,
      stableKey: event.stableKey,
      openedAt: event.occurredAt,
      counterpartPersonId:
        event.participants.find(
          (participant) =>
            participant.personId !== personId &&
            participant.role.startsWith("agency:"),
        )?.personId ?? null,
      occasionDate,
      sequence: event.sequence,
    });
  }

  return opened.sort((left, right) => left.sequence - right.sequence);
}

export function isLifeOpportunityKind(
  value: string,
): value is LifeOpportunityKind {
  return (LIFE_OPPORTUNITY_KINDS as readonly string[]).includes(value);
}

/**
 * The day each opportunity's occasion falls on, indexed by the event it came
 * from. Built once per read rather than searched per opportunity.
 */
function occasionDatesBySource(world: World): ReadonlyMap<EntityId, IsoDate> {
  const starts = new Map<EntityId, IsoDate>();
  for (const state of world.history.scheduledActivityStates) {
    starts.set(state.activityId, makeIsoDate(state.start.date));
  }
  const byEvent = new Map<EntityId, IsoDate>();
  for (const activity of world.history.scheduledActivities) {
    const start = starts.get(activity.id);
    if (!start) continue;
    for (const sourceId of activity.sourceEntityIds) {
      byEvent.set(sourceId, start);
    }
  }
  return byEvent;
}

/** Whether this life is currently carrying an active household week. */
export function hasActiveHouseholdWeek(
  world: World,
  personId: EntityId,
): boolean {
  return workPendingEntriesFor(world, personId).some(
    ({ item, state }) =>
      item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY) &&
      item.focus.kind === "person" &&
      item.focus.personId === personId &&
      state.assignedPersonIds.includes(personId) &&
      state.status === "active",
  );
}

/* -------------------------------------------------------------------------- */
/* Writing — only from a transition the player actually took                   */
/* -------------------------------------------------------------------------- */

/**
 * The two records an ordinary week starts with, written once.
 *
 * Moved here from the presentation surface without changing what it writes:
 * the same notice, the same meeting on the calendar, the same two work items
 * under the same stable keys, the same authored titles and summaries. It lives
 * in the simulation now because the canonical world builder needs it and a
 * world may not reach up into a screen to find out what an ordinary week is.
 *
 * Once per world, and that is deliberate rather than incidental. The keys are
 * fixed strings that saves already carry, and the week they name is the week of
 * the life the world was opened for: a household's shopping is not six separate
 * people's shopping. Whether the week is a decision or merely work is the one
 * thing that varies, and it varies with who is playing.
 */
export function openOrdinaryLifeRecords(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  if (formativeIntervalAt(world, personId) !== null) return world;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const alreadyOpen = world.history.workItems.some((item) =>
    item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY),
  );
  if (alreadyOpen) return world;

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
    title: authoredWorkItem(HOUSEHOLD_ERRANDS_KEY).title,
    summary: authoredWorkItem(HOUSEHOLD_ERRANDS_KEY).summary,
    jurisdictionId,
    sourceEntityIds: [notice.id],
    focus: { kind: "person", personId },
    effort: { kind: "authored-duration", requiredMinutes: 150 },
    access: { kind: "private", personIds: [personId] },
    assignedPersonIds: [personId],
    playerRequirement: playerRequirementFor(next, personId),
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });

  return createWorkItem(next, {
    stableKey: PUBLIC_MEETING_KEY,
    title: authoredWorkItem(PUBLIC_MEETING_KEY).title,
    summary: authoredWorkItem(PUBLIC_MEETING_KEY).summary,
    jurisdictionId,
    sourceEntityIds: [meeting.id],
    focus: { kind: "calendar-item", scheduledActivityId: meeting.id },
    effort: { kind: "authored-duration", requiredMinutes: 75 },
    access: { kind: "private", personIds: [personId] },
    assignedPersonIds: [personId],
    playerRequirement: playerRequirementFor(next, personId),
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: meeting.id,
  });
}

/**
 * Whether the ordinary week is something anybody will be asked about.
 *
 * "decision" when this world is being played by this person, which is the case
 * every normal route reaches, and "none" in an observer world, where the
 * shopping still has to be covered but nobody is going to be shown a choice
 * about it. The engine enforces the same distinction — player-required work
 * against an unplayed person is refused — and stating it here keeps a canonical
 * fixture honest rather than dressing an observer up as a player.
 */
function playerRequirementFor(
  world: World,
  personId: EntityId,
): "decision" | "none" {
  return world.control.kind === "person" && world.control.personId === personId
    ? "decision"
    : "none";
}

/**
 * Writes whatever this life has legitimately come to be owed next, and stops.
 *
 * Called from the transitions a player actually takes — opening an ordinary
 * life, choosing something, letting a stretch of time go by — and from nowhere
 * that reads. Two things can happen, at most:
 *
 * 1. The household week is written again once the last one is finished and a
 *    week has gone past. Households do not stop needing the shopping done, and
 *    a game in which they do is the game that ran out.
 * 2. At most one new opportunity is created, from the kinds this world can
 *    actually support today, preferring the one this life has seen least
 *    recently and breaking ties from the world's own seed.
 *
 * Both are idempotent at the day: everything written here is keyed by the date
 * it was written on, so calling this twice against the same world writes once.
 * That is the property the repeated-selector and reload proofs rest on.
 */
export function refreshLifeOpportunities(
  world: World,
  personId: EntityId,
): World {
  const person = world.people[personId];
  if (!person) return world;
  if (formativeIntervalAt(world, personId) !== null) return world;

  let next = replenishHouseholdWeek(world, personId);
  next = writeNextOpportunity(next, personId);
  return next;
}

/**
 * Another week's errands, once the last week's are done and a week has passed.
 *
 * The item is the same authored item — the same title, the same summary, the
 * same hundred and fifty minutes — under a stable key that says which week it
 * is. That distinction is the whole repair: the old key could be written once
 * and never again, so a life had exactly one week of errands in it forever.
 *
 * It is not a source of variety and must not be used as one. One household week
 * is open at a time, and breadth comes from the opportunity kinds below.
 */
function replenishHouseholdWeek(world: World, personId: EntityId): World {
  if (hasActiveHouseholdWeek(world, personId)) return world;
  const existing = world.history.workItems.filter((item) =>
    item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY),
  );
  // Nothing at all yet: the opening write owns that case, not this one.
  if (existing.length === 0) return world;

  const stableKey = `${HOUSEHOLD_ERRANDS_KEY}:${world.currentDate}`;
  if (existing.some((item) => item.stableKey === stableKey)) return world;

  // A week, since the last one was written. The date comes off the work item's
  // own creation moment rather than off its key, because the first week in a
  // world is written under the fixed key a save already carries and has no date
  // in it — and reading the key would have made that first week replenishable
  // the instant it was finished.
  const latest = existing.at(-1)!;
  const openedOn = makeIsoDate(latest.createdAt.date);
  if (addDays(openedOn, HOUSEHOLD_WEEK_DAYS) > world.currentDate) {
    return world;
  }

  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const authored = authoredWorkItem(HOUSEHOLD_ERRANDS_KEY);

  return createWorkItem(world, {
    stableKey,
    title: authored.title,
    summary: authored.summary,
    jurisdictionId,
    sourceEntityIds: [latest.id],
    focus: { kind: "person", personId },
    effort: { kind: "authored-duration", requiredMinutes: 150 },
    access: { kind: "private", personIds: [personId] },
    assignedPersonIds: [personId],
    playerRequirement: playerRequirementFor(world, personId),
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
}

/* -------------------------------------------------------------------------- */
/* The one new thing                                                           */
/* -------------------------------------------------------------------------- */

interface OpportunityCandidate {
  readonly kind: LifeOpportunityKind;
  readonly counterpartPersonId: EntityId | null;
  readonly write: (world: World, stableKey: string) => World;
}

/**
 * Fills this life up to the cap and stops.
 *
 * Idempotency is structural rather than timed: every record is keyed by the
 * person, the day and the kind, and a kind already open is not a candidate. So
 * running this twice against the same world produces the same world, running it
 * against a reloaded save produces the same world, and a selector called twice
 * cannot make two invitations out of one. The proofs for all three are in
 * `life-opportunities.test.ts`.
 *
 * The cap is small and it matters. A life is meant to have a few things in it,
 * not a backlog, and a player who lets a year go by should come back to a week
 * rather than to an inbox.
 */
function writeNextOpportunity(world: World, personId: EntityId): World {
  // Only a life with nothing in front of it gets given anything. This is the
  // difference between replenishing and nagging: a player who has been asked
  // three things and answered none of them is not short of things to do, and a
  // world that wrote them a fourth every time a month went by would turn a
  // quiet stretch into a stream of notifications and make silence impossible.
  if (lifeOpportunitiesFor(world, personId).length > 0) return world;

  let next = world;
  for (let attempt = 0; attempt < OPEN_LIFE_OPPORTUNITY_LIMIT; attempt += 1) {
    const open = lifeOpportunitiesFor(next, personId);
    if (open.length >= OPEN_LIFE_OPPORTUNITY_LIMIT) return next;

    const openKinds = new Set(open.map((entry) => entry.kind));
    const candidates = eligibleOpportunities(next, personId).filter(
      (candidate) => !openKinds.has(candidate.kind),
    );
    if (candidates.length === 0) return next;

    const chosen = chooseOpportunity(next, personId, candidates);
    const stableKey = `life-opportunity:${personId}:${next.currentDate}:${chosen.kind}`;
    // Already written today and since answered. Writing it again under the
    // same key would fail the world's own uniqueness rule, and offering the
    // same thing twice in a day would be a worse answer than offering nothing.
    if (next.history.events.some((event) => event.stableKey === stableKey)) {
      return next;
    }
    const written = tryWrite(next, chosen, stableKey);
    // The calendar refused it — the evening this would have been is already
    // spoken for. That is the world saying no, and the right answer is not to
    // offer it, rather than to move somebody's existing commitment out of the
    // way to make room for an invention of ours.
    if (written === null) return next;
    next = written;
  }
  return next;
}

function tryWrite(
  world: World,
  candidate: OpportunityCandidate,
  stableKey: string,
): World | null {
  try {
    return candidate.write(world, stableKey);
  } catch {
    return null;
  }
}

/**
 * Which of the six this world can support today.
 *
 * Every one of them needs a real person, a real record or both, and a kind
 * whose actor the world cannot supply is simply not a candidate. Nobody is
 * created to fill a slot: a life with nobody in it gets the kinds that need
 * nobody, and that is the honest answer rather than a fabricated friend.
 */
function eligibleOpportunities(
  world: World,
  personId: EntityId,
): readonly OpportunityCandidate[] {
  const cutoff = currentLifeCutoff(world);
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const candidates: OpportunityCandidate[] = [];
  const answered = answeredFamilies(world, personId);
  const push = (candidate: OpportunityCandidate) => {
    // A scene that only ever happens once does not need a second request
    // written for it. Left unchecked this is how a bounded set turns into a
    // queue: the cap refills, the family is no longer offerable, and the world
    // writes the same unanswerable ask for the rest of the life.
    if (
      !LIFE_OPPORTUNITY_REPEATABLE[candidate.kind] &&
      answered.has(LIFE_OPPORTUNITY_ANSWERING_KEY[candidate.kind])
    ) {
      return;
    }
    candidates.push(candidate);
  };

  const householdCompanionId = firstOf(
    world,
    householdCompanionIds(world, personId, cutoff),
  );
  const localId = firstOf(world, localNeighbourIds(world, personId, cutoff));
  const familiarId = firstOf(
    world,
    familiarPersonIds(world, personId, cutoff),
  );
  const colleagueId = firstOf(world, colleagueIds(world, personId, cutoff));
  const communityMemberId = firstOf(
    world,
    communityMemberIds(world, personId, cutoff),
  );

  if (householdCompanionId) {
    push({
      kind: "household-evening",
      counterpartPersonId: householdCompanionId,
      write: (current, stableKey) =>
        writeAsk(current, {
          stableKey,
          kind: "household-evening",
          personId,
          askerPersonId: householdCompanionId,
          jurisdictionId,
          type: "life.household-evening-proposed",
          summary:
            "The evening was left free at home, and the person they live with said they would be in for it.",
          detail: "Said they would be in",
          believed:
            "The evening is free at home and the other person will be in.",
          // A particular evening, and it is tonight. Without the date this is
          // not a free evening at all but a standing offer, and a standing
          // offer would sit unanswered in the life forever while the world
          // waited for it to be taken up.
          occasion: {
            title: "An evening in",
            summary:
              "The evening at home, with the person who lives here saying they would be in for it.",
            date: world.currentDate,
            startHour: 20,
            endHour: 22,
            label: "Home",
          },
        }),
    });
  }

  if (localId) {
    push({
      kind: "social-occasion",
      counterpartPersonId: localId,
      write: (current, stableKey) =>
        writeAsk(current, {
          stableKey,
          kind: "social-occasion",
          personId,
          askerPersonId: localId,
          jurisdictionId,
          type: "life.social-occasion-invited",
          summary:
            "Somebody from the same place asked whether they would come to something on Saturday. Nobody is needed there.",
          detail: "Asked them to come",
          believed:
            "There is something on Saturday they were asked to, and nobody needs them there.",
          occasion: {
            title: "Something on Saturday",
            summary:
              "An occasion somebody local asked them to. Attendance was invited, not required.",
            date: nextSaturday(world.currentDate),
            startHour: 15,
            endHour: 18,
            label: place?.displayName ?? "The neighbourhood",
          },
        }),
    });
  }

  if (familiarId) {
    push({
      kind: "favour-request",
      counterpartPersonId: familiarId,
      write: (current, stableKey) =>
        writeAsk(current, {
          stableKey,
          kind: "favour-request",
          personId,
          askerPersonId: familiarId,
          jurisdictionId,
          type: "life.favour-requested",
          summary:
            "Somebody they already know asked them for a hand with one specific thing, and said it mattered to them.",
          detail: "Asked for a hand with one thing",
          believed:
            "They have been asked for a hand with one specific thing, and told it matters to the person asking.",
          occasion: null,
        }),
    });
    push({
      kind: "confidence-disclosed",
      counterpartPersonId: familiarId,
      write: (current, stableKey) =>
        writeAsk(current, {
          stableKey,
          kind: "confidence-disclosed",
          personId,
          askerPersonId: familiarId,
          jurisdictionId,
          type: "life.confidence-disclosed",
          summary:
            "Somebody they know told them what they had got themselves into, and told nobody else.",
          detail: "Told them, and nobody else",
          believed:
            "They know what this person has got into, and they are the only one who was told.",
          occasion: null,
        }),
    });
  }

  if (colleagueId) {
    push({
      kind: "extra-hours-request",
      counterpartPersonId: colleagueId,
      write: (current, stableKey) =>
        writeAsk(current, {
          stableKey,
          kind: "extra-hours-request",
          personId,
          askerPersonId: colleagueId,
          jurisdictionId,
          type: "life.extra-hours-requested",
          summary:
            "Somebody they work with asked whether they could put in extra hours for a stretch, and said what the terms were.",
          detail: "Asked for extra hours, with terms",
          believed:
            "They have been asked to work extra hours for a stretch, on stated terms.",
          occasion: null,
        }),
    });
  }

  if (hasPostedMeeting(world) && !hasReadAgendaItem(world, personId)) {
    push({
      kind: "meeting-agenda-item",
      counterpartPersonId: null,
      write: (current, stableKey) =>
        writeNotice(current, {
          stableKey,
          kind: "meeting-agenda-item",
          personId,
          jurisdictionId,
          type: "civic.meeting-agenda-item",
          summary:
            "One item on the posted agenda was published in full, and they read it.",
          believed: "They have read the agenda item in full.",
        }),
    });
  }

  const age = ageOn(person.birthDate, world.currentDate);
  if (
    communityMemberId &&
    age >= 21 &&
    activeOrganizationParticipationsAt(world, personId, cutoff).length > 0
  ) {
    push({
      kind: "candidacy-approach",
      counterpartPersonId: communityMemberId,
      write: (current, stableKey) =>
        writeAsk(current, {
          stableKey,
          kind: "candidacy-approach",
          personId,
          askerPersonId: communityMemberId,
          jurisdictionId,
          type: "life.candidacy-approach",
          summary:
            "Somebody they take part in something with asked, in as many words, whether they would ever stand for election to public office.",
          detail: "Asked whether they would ever stand",
          believed:
            "They have been asked outright whether they would ever run for public office.",
          occasion: null,
        }),
    });
  }

  return candidates;
}

/**
 * Which candidate this life gets, deterministically.
 *
 * Least recently offered first, so a life is not asked the same thing twice
 * while five other things wait, and a seeded tie-break so two lives in the same
 * situation do not both get the alphabetically first one. Neither of these is a
 * rate: nothing here says how often anything happens to anybody, only which of
 * the things this world can already support comes next.
 */
function chooseOpportunity(
  world: World,
  personId: EntityId,
  candidates: readonly OpportunityCandidate[],
): OpportunityCandidate {
  const lastOffered = new Map<LifeOpportunityKind, number>();
  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    const tag = event.tags.find((candidate) =>
      candidate.startsWith(LIFE_OPPORTUNITY_TAG_PREFIX),
    );
    if (!tag) continue;
    const kind = tag.slice(LIFE_OPPORTUNITY_TAG_PREFIX.length);
    if (isLifeOpportunityKind(kind)) lastOffered.set(kind, event.sequence);
  }

  const scored = candidates.map((candidate) => ({
    candidate,
    seen: lastOffered.get(candidate.kind) ?? -1,
    tie: hash(`${world.seed}:${personId}:${world.currentDate}:${candidate.kind}`),
  }));
  scored.sort((left, right) =>
    left.seen !== right.seen ? left.seen - right.seen : left.tie - right.tie,
  );
  return scored[0]!.candidate;
}

function hash(value: string): number {
  let total = 0;
  for (const character of value) {
    total = (total * 31 + character.charCodeAt(0)) % 1_000_003;
  }
  return total;
}

/* -------------------------------------------------------------------------- */
/* The two record shapes                                                       */
/* -------------------------------------------------------------------------- */

interface AskInput {
  readonly stableKey: string;
  readonly kind: LifeOpportunityKind;
  readonly personId: EntityId;
  readonly askerPersonId: EntityId;
  readonly jurisdictionId: EntityId | null;
  readonly type: `${string}.${string}`;
  readonly summary: string;
  readonly detail: string;
  readonly believed: string;
  readonly occasion: {
    readonly title: string;
    readonly summary: string;
    readonly date: IsoDate;
    readonly startHour: number;
    readonly endHour: number;
    readonly label: string;
  } | null;
}

/**
 * Somebody asked somebody something.
 *
 * Three records and no more: the asking, the occasion it was about where there
 * is one, and the fact that the person asked now knows about it. The last is
 * not decoration — several of the scenes this unblocks were withheld precisely
 * because nothing in the world established that the player had been told, and
 * a scene that assumes knowledge nobody wrote down is the defect, not the fix.
 *
 * An ask is not an agreement. Nothing here records a yes, a no, a plan or an
 * outcome; those are the player's, and they are written by the scene when the
 * player makes one.
 */
function writeAsk(world: World, input: AskInput): World {
  let next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.personId, input.askerPersonId],
    participants: [
      {
        personId: input.askerPersonId,
        role: "agency:asked",
        detail: input.detail,
      },
      {
        personId: input.personId,
        role: "focus:asked-of",
        detail: "Was asked",
      },
    ],
    personFactConstraints: [],
    // Between the two of them. Nobody else is recorded as having heard it,
    // and the game is not going to claim it knows that somebody did.
    visibility: "private",
    tags: [lifeOpportunityTag(input.kind)],
    summary: input.summary,
    context: {
      location: input.jurisdictionId
        ? { jurisdictionId: input.jurisdictionId, label: "Nearby", setting: null }
        : null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const asking = next.history.events.at(-1);
  if (!asking) throw new Error("The request was not recorded.");

  if (input.occasion) {
    next = createScheduledActivity(next, {
      stableKey: `${input.stableKey}:occasion`,
      title: input.occasion.title,
      summary: input.occasion.summary,
      kind: "tentative",
      start: momentOn(world, input.occasion.date, input.occasion.startHour),
      end: momentOn(world, input.occasion.date, input.occasion.endHour),
      participantPersonIds: [input.personId],
      responsiblePersonId: null,
      location: {
        locationKey: `life-opportunity:${input.kind}`,
        label: input.occasion.label,
        jurisdictionId:
          input.jurisdictionId ?? world.people[input.personId]!.homeJurisdictionId,
      },
      sourceEntityIds: [asking.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [input.personId] },
    });
  }

  return recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:knowledge`,
    personId: input.personId,
    eventId: asking.id,
    learnedAt: world.currentDate,
    believedSummary: input.believed,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: input.askerPersonId, claimId: null },
  });
}

interface NoticeInput {
  readonly stableKey: string;
  readonly kind: LifeOpportunityKind;
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId | null;
  readonly type: `${string}.${string}`;
  readonly summary: string;
  readonly believed: string;
}

/**
 * Something was published, and this person read it.
 *
 * The public counterpart of an ask, for the one opportunity that needs no other
 * person: an agenda item exists whether or not anybody looks at it, and the
 * knowledge record is what separates "it was published" from "they have read
 * it". The scene it unblocks claims the second, so the second is what gets
 * written.
 */
function writeNotice(world: World, input: NoticeInput): World {
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [
      {
        personId: input.personId,
        role: "observation:reader",
        detail: "Read the item in full",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [lifeOpportunityTag(input.kind), "civic.public-meeting"],
    summary: input.summary,
    context: {
      location: input.jurisdictionId
        ? {
            jurisdictionId: input.jurisdictionId,
            label: "Public meeting room",
            setting: null,
          }
        : null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const notice = next.history.events.at(-1);
  if (!notice) throw new Error("The agenda item was not recorded.");

  return recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:knowledge`,
    personId: input.personId,
    eventId: notice.id,
    learnedAt: world.currentDate,
    believedSummary: input.believed,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

/* -------------------------------------------------------------------------- */
/* Small readers                                                               */
/* -------------------------------------------------------------------------- */

/** Adult families this life has already played, read from its own events. */
function answeredFamilies(
  world: World,
  personId: EntityId,
): ReadonlySet<string> {
  const answered = new Set<string>();
  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    for (const tag of event.tags) {
      if (tag.startsWith("adult.")) answered.add(tag);
    }
  }
  return answered;
}

function hasPostedMeeting(world: World): boolean {
  return world.history.workItems.some(
    (item) => item.stableKey === PUBLIC_MEETING_KEY,
  );
}

function hasReadAgendaItem(world: World, personId: EntityId): boolean {
  return world.history.events.some(
    (event) =>
      event.involvedEntityIds.includes(personId) &&
      event.tags.includes(lifeOpportunityTag("meeting-agenda-item")),
  );
}

function householdCompanionIds(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  const householdIds = [
    ...new Set(
      householdMembershipsAt(world, personId, cutoff).map(
        (entry) => entry.membership.householdId,
      ),
    ),
  ];
  return [
    ...new Set(
      householdIds.flatMap((householdId) =>
        peopleInHouseholdAt(world, householdId, cutoff).filter(
          (candidate) => candidate !== personId,
        ),
      ),
    ),
  ];
}

/**
 * Somebody outside the household whose household is recorded in the same place.
 *
 * A shared place, and only that. It is enough for an invitation, which claims
 * nothing more than that a local person asked — and it is deliberately not
 * enough for the favour below, which claims the player knows them.
 */
function localNeighbourIds(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  const mine = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.membership.householdId,
    ),
  );
  const myJurisdictions = new Set(
    [...mine]
      .map((householdId) => householdLocationAt(world, householdId, cutoff)?.jurisdictionId)
      .filter((value): value is EntityId => value !== undefined),
  );
  return world.personOrder.filter((candidateId) => {
    if (candidateId === personId) return false;
    const theirs = householdMembershipsAt(world, candidateId, cutoff);
    if (theirs.some((entry) => mine.has(entry.membership.householdId))) {
      return false;
    }
    return theirs.some((entry) => {
      const location = householdLocationAt(
        world,
        entry.membership.householdId,
        cutoff,
      );
      return location ? myJurisdictions.has(location.jurisdictionId) : false;
    });
  });
}

/**
 * Somebody this life has actually had something to do with.
 *
 * A recorded interaction and nothing softer. It is what makes "somebody you
 * know" true rather than a friendship announced because two people were in the
 * same world, and it deliberately does not ask where they live: a favour and a
 * confidence travel, and a game that required a shared postcode for either
 * would be inventing a rule to make its own bookkeeping easier.
 */
function familiarPersonIds(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  const familiar = new Set(
    world.history.relationshipInteractions
      .filter((interaction) => interaction.personIds.includes(personId))
      .flatMap((interaction) => interaction.personIds)
      .filter((candidate) => candidate !== personId),
  );
  // Somebody there is still a route to, first.
  //
  // A favour and a confidence are both things that can come back, and
  // `life-callbacks.ts` will only bring one back where the world still has a
  // standing connection between the two people. Asking somebody the record has
  // long since lost track of produces a scene whose consequence is settled in
  // advance to be nothing, which is a worse scene than not offering one.
  //
  // A relative, a colleague or somebody in the same group counts as known on
  // the strength of that record alone — kinship is not a stranger — and
  // whoever the player has merely interacted with is used when that is all
  // this life has. The household is left out on purpose: what happens between
  // people who live together has its own scenes.
  // Each pool once, not once per candidate: these are all world-wide scans and
  // recomputing them inside the filter turned a small preference into an
  // O(people x history) walk on the hot path.
  const household = new Set(householdCompanionIds(world, personId, cutoff));
  const reachable = new Set([
    ...colleagueIds(world, personId, cutoff),
    ...communityMemberIds(world, personId, cutoff),
    ...kinshipRelationshipsAt(world, personId, cutoff).flatMap(
      (relationship) => relationship.personIds,
    ),
  ]);
  const connected = world.personOrder.filter(
    (candidate) =>
      candidate !== personId &&
      !household.has(candidate) &&
      reachable.has(candidate),
  );
  if (connected.length > 0) return connected;
  return world.personOrder.filter((candidate) => familiar.has(candidate));
}

function colleagueIds(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  const employerIds = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).map(
      (entry) => entry.relationship.organizationId,
    ),
  );
  if (employerIds.size === 0) return [];
  return world.personOrder.filter(
    (candidate) =>
      candidate !== personId &&
      activeWorkRelationshipsAt(world, candidate, cutoff).some((entry) =>
        employerIds.has(entry.relationship.organizationId),
      ),
  );
}

function communityMemberIds(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  const organizationIds = new Set(
    activeOrganizationParticipationsAt(world, personId, cutoff).map(
      (entry) => entry.participation.organizationId,
    ),
  );
  if (organizationIds.size === 0) return [];
  return world.personOrder.filter(
    (candidate) =>
      candidate !== personId &&
      activeOrganizationParticipationsAt(world, candidate, cutoff).some((entry) =>
        organizationIds.has(entry.participation.organizationId),
      ),
  );
}

/** The world's own person order decides, so a replay reaches the same person. */
function firstOf(world: World, pool: readonly EntityId[]): EntityId | null {
  for (const candidate of world.personOrder) {
    if (pool.includes(candidate)) return candidate;
  }
  return null;
}

function ageOn(birthDate: IsoDate, on: IsoDate): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${on}T00:00:00Z`);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const month = at.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && at.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** The next Saturday strictly after today, so an invitation is never for the past. */
function nextSaturday(from: IsoDate): IsoDate {
  const day = new Date(`${from}T00:00:00Z`).getUTCDay();
  return addDays(from, ((6 - day + 7) % 7) || 7);
}

function momentAt(world: World, hour: number, minute: number) {
  return makeSimulationMoment({
    date: world.currentDate,
    minuteOfDay: hour * 60 + minute,
    timeZone: world.currentMoment.timeZone,
    utcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function momentOn(world: World, date: IsoDate, hour: number) {
  return makeSimulationMoment({
    date,
    minuteOfDay: hour * 60,
    timeZone: world.currentMoment.timeZone,
    utcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}
