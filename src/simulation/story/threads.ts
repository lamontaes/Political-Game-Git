import threadData from "../../../data/content/story-threads.json" with { type: "json" };
import { scheduleFutureDueItem } from "../future-transitions";
import { appendedList, recordsByStringField } from "../history-index";
import { createStableId } from "../ids";
import {
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { relationshipDormantOn } from "../relationship-absence";
import { withWorldIntegrityDeferred } from "../world";
import {
  readRelationshipStanding,
  RELATIONSHIP_DIMENSIONS,
  type StandingBand,
} from "../relationship-standing";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  IsoDate,
  RelationshipInteraction,
  StoryMomentRecord,
  StoryThreadLines,
  StoryThreadStateRecord,
  StoryThreadTurn,
  World,
} from "../types";

/**
 * Threads: one person's view of one other person (story director, part 2 of
 * docs/design/story-director.md).
 *
 * Most of a thread is read from records that already exist: kinship, a shared
 * home, the five-line standing and the absence reader. Only its importance and
 * turns are stored, one row per change, because summing every past moment on
 * each read would be slow. A row is written on a day a moment touches the
 * pair, or when the pair's fade check comes due; no daily scan looks for
 * either.
 *
 * Importance is the standing tie for kin and a shared home, plus the pair's
 * moment salience discounted by fading. There is no cap: importance ranks the
 * people in a life, and a handful rise while the rest fade. Nothing here
 * decides what anybody does.
 */

/* -------------------------------------------------------------------------- */
/* The calibration                                                             */
/* -------------------------------------------------------------------------- */

type TieKind =
  "parent" | "child" | "sibling" | "grandparent" | "grandchild" | "sharedHome";

const TIES: Readonly<Record<TieKind, number>> = threadData.ties;
const FADING_DISCOUNT: number = threadData.fadingDiscount;

/** The fade check's transition key, resolved on every path that passes time. */
export const STORY_THREAD_FADE_KEY = "story:thread-fade";

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

const NO_STATES: readonly StoryThreadStateRecord[] = [];

export function storyThreadStates(
  world: World,
): readonly StoryThreadStateRecord[] {
  return world.history.storyThreadStates ?? NO_STATES;
}

/** Every change in this person's threads, oldest first. */
export function storyThreadStatesOf(
  world: World,
  personId: EntityId,
): readonly StoryThreadStateRecord[] {
  return recordsByStringField(storyThreadStates(world), "personId", personId);
}

/** Every change in anyone's thread to this person, oldest first. */
export function storyThreadStatesTo(
  world: World,
  otherPersonId: EntityId,
): readonly StoryThreadStateRecord[] {
  return recordsByStringField(
    storyThreadStates(world),
    "otherPersonId",
    otherPersonId,
  );
}

/** Where this person's thread to the other stands, or null before any change. */
export function latestThreadState(
  world: World,
  personId: EntityId,
  otherPersonId: EntityId,
): StoryThreadStateRecord | null {
  const states = storyThreadStatesOf(world, personId);
  for (let index = states.length - 1; index >= 0; index -= 1)
    if (states[index]!.otherPersonId === otherPersonId) return states[index]!;
  return null;
}

/** One thread as it stands, for the developer and observer view. */
export interface StoryThread {
  readonly otherPersonId: EntityId;
  /** The tie the thread rests on, or null with neither kin nor a shared home. */
  readonly tieKind: TieKind | null;
  readonly importance: number;
  /** The first change on record, or the kinship's date for a tie alone. */
  readonly since: IsoDate | null;
  readonly turns: readonly {
    readonly occurredAt: IsoDate;
    readonly turn: StoryThreadTurn;
    readonly importance: number;
    readonly momentId: EntityId | null;
  }[];
  readonly lastContactOn: IsoDate | null;
  readonly currency: StoryThreadStateRecord["currency"];
}

/**
 * This person's threads, most important first: every pair a moment has
 * touched, read from its latest change, and every relative or housemate with
 * no moment yet, at their standing tie. Pure: it writes nothing.
 */
export function storyThreadsOf(
  world: World,
  personId: EntityId,
): readonly StoryThread[] {
  const byOther = new Map<EntityId, StoryThreadStateRecord[]>();
  for (const state of storyThreadStatesOf(world, personId)) {
    const list = byOther.get(state.otherPersonId);
    if (list) list.push(state);
    else byOther.set(state.otherPersonId, [state]);
  }
  const threads: StoryThread[] = [];
  for (const [otherPersonId, states] of byOther) {
    const latest = states.at(-1)!;
    threads.push({
      otherPersonId,
      tieKind: tieBetween(world, personId, otherPersonId).kind,
      importance: latest.importance,
      since: states[0]!.occurredAt,
      turns: states.map((state) => ({
        occurredAt: state.occurredAt,
        turn: state.turn,
        importance: state.importance,
        momentId: state.momentId,
      })),
      lastContactOn: latest.lastContactOn,
      currency: latest.currency,
    });
  }
  for (const [otherPersonId, since] of tiedPeople(world, personId)) {
    if (byOther.has(otherPersonId)) continue;
    const tie = tieBetween(world, personId, otherPersonId);
    if (tie.value <= 0) continue;
    threads.push({
      otherPersonId,
      tieKind: tie.kind,
      importance: tie.value,
      since,
      turns: [],
      lastContactOn: null,
      currency: null,
    });
  }
  return threads.sort(
    (left, right) =>
      right.importance - left.importance ||
      left.otherPersonId.localeCompare(right.otherPersonId),
  );
}

/* -------------------------------------------------------------------------- */
/* Ties                                                                        */
/* -------------------------------------------------------------------------- */

/** A person's relatives on record, for the situation fills. */
export function storyKin(world: World, personId: EntityId): EntityId[] {
  return [
    ...new Set(
      safeKinship(world, personId).flatMap((kin) =>
        kin.personIds.filter((id) => id !== personId),
      ),
    ),
  ];
}

/** The people who share a person's home now, for the situation fills. */
export function storyHousemates(world: World, personId: EntityId): EntityId[] {
  return [...housemates(world, personId)];
}

function safeKinship(world: World, personId: EntityId) {
  try {
    return kinshipRelationshipsAt(world, personId);
  } catch {
    return [];
  }
}

function housemates(world: World, personId: EntityId): Set<EntityId> {
  const people = new Set<EntityId>();
  try {
    for (const membership of householdMembershipsAt(world, personId))
      for (const id of peopleInHouseholdAt(
        world,
        membership.membership.householdId,
      ))
        if (id !== personId) people.add(id);
  } catch {
    // A person with no household on record shares a home with nobody.
  }
  return people;
}

/** Relatives and housemates, with the date the tie is on record from. */
function tiedPeople(
  world: World,
  personId: EntityId,
): ReadonlyMap<EntityId, IsoDate | null> {
  const people = new Map<EntityId, IsoDate | null>();
  for (const kin of safeKinship(world, personId)) {
    const otherId = kin.personIds.find((id) => id !== personId);
    if (otherId && !people.has(otherId)) people.set(otherId, kin.establishedAt);
  }
  for (const id of housemates(world, personId))
    if (!people.has(id)) people.set(id, null);
  return people;
}

/** The kinship tie between two people, read from the kinship record's kind. */
function kinTie(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): TieKind | null {
  const record = safeKinship(world, personId).find((kin) =>
    kin.personIds.includes(otherId),
  );
  if (!record) return null;
  const older =
    (world.people[otherId]?.birthDate ?? "") <
    (world.people[personId]?.birthDate ?? "");
  if (record.kind.includes("grandparent"))
    return older ? "grandparent" : "grandchild";
  if (record.kind.includes("parent-child")) return older ? "parent" : "child";
  if (record.kind.includes("sibling")) return "sibling";
  return null;
}

/** The standing tie: the larger of the kin tie and a shared home. */
function tieBetween(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): { readonly kind: TieKind | null; readonly value: number } {
  const kin = kinTie(world, personId, otherId);
  const home = housemates(world, personId).has(otherId);
  const kinValue = kin ? TIES[kin] : 0;
  const homeValue = home ? TIES.sharedHome : 0;
  if (kinValue === 0 && homeValue === 0) return { kind: null, value: 0 };
  return kinValue >= homeValue
    ? { kind: kin, value: kinValue }
    : { kind: "sharedHome", value: homeValue };
}

/* -------------------------------------------------------------------------- */
/* Tone and turns                                                              */
/* -------------------------------------------------------------------------- */

const BAND_VALUE: Readonly<Record<StandingBand, number>> = {
  none: 0,
  slight: 1,
  marked: 2,
  strong: 3,
};

interface PairReading {
  readonly tie: number;
  readonly fading: number;
  readonly currency: StoryThreadStateRecord["currency"];
  readonly lastContactOn: IsoDate | null;
  readonly lines: StoryThreadLines;
}

function readPair(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): PairReading {
  const standing = readRelationshipStanding(world, personId, otherId);
  const lines = {} as Record<keyof StoryThreadLines, number>;
  for (const dimension of RELATIONSHIP_DIMENSIONS) {
    const reading = standing.readings[dimension];
    lines[dimension] = BAND_VALUE[reading.band] * (reading.adverse ? -1 : 1);
  }
  const absence = standing.absence;
  // A pair with no contact on record is not current, only unread: the thread
  // takes no currency from the absence reader then (design, missing links).
  return {
    tie: tieBetween(world, personId, otherId).value,
    fading: absence.fading,
    currency:
      absence.lastMeaningfulContactOn === null ? null : absence.currency,
    lastContactOn: absence.lastMeaningfulContactOn,
    lines,
  };
}

/** Whether the lines read warm (1), tense (-1) or neither (0). */
function tone(lines: StoryThreadLines): number {
  const warm = Math.max(
    0,
    lines.warmth,
    lines.trust,
    lines.respect,
    lines.commitment,
  );
  const tense = Math.max(
    lines.tension,
    -Math.min(0, lines.warmth, lines.trust, lines.respect),
  );
  return Math.sign(warm - tense);
}

function adverseLines(lines: StoryThreadLines): number {
  return RELATIONSHIP_DIMENSIONS.filter((dimension) => lines[dimension] < 0)
    .length;
}

function isDead(world: World, personId: EntityId): boolean {
  return (
    recordsByStringField(world.history.personDeaths, "personId", personId)
      .length > 0
  );
}

/** How a moment changed the thread, from the row before it. */
function turnFor(
  world: World,
  moment: StoryMomentRecord,
  otherId: EntityId,
  previous: StoryThreadStateRecord | null,
  reading: PairReading,
): StoryThreadTurn {
  // A death or an ended relationship closes the thread.
  if (isDead(world, otherId) || moment.kindKey.endsWith(":ended"))
    return "closed";
  if (!previous) return "started";
  if (previous.currency === "dormant" || previous.turn === "faded")
    return "renewed";
  if (tone(previous.lines) * tone(reading.lines) < 0) return "turned";
  if (
    reading.lines.tension > previous.lines.tension ||
    adverseLines(reading.lines) > adverseLines(previous.lines)
  )
    return "soured";
  return "grew";
}

function importanceOf(tie: number, momentSum: number, fading: number): number {
  return round(tie + momentSum * (1 - FADING_DISCOUNT * fading));
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

function threadStateId(world: World, stableKey: string): EntityId {
  return createStableId("story-thread-state", `${world.id}:${stableKey}`);
}

/**
 * Schedules the pair's fade check for the first day they would read as
 * dormant, when anything can make them so. The check re-reads the pair.
 */
function scheduleFadeCheck(
  world: World,
  personId: EntityId,
  otherId: EntityId,
  afterSequence: number,
): World {
  const dormantOn = relationshipDormantOn(world, personId, otherId);
  if (dormantOn === null) return world;
  const pair = [personId, otherId].sort();
  return scheduleFutureDueItem(world, {
    stableKey: `${STORY_THREAD_FADE_KEY}:${personId}:${otherId}:${afterSequence}`,
    dueAt: dormantOn > world.currentDate ? dormantOn : world.currentDate,
    transitionKey: STORY_THREAD_FADE_KEY,
    entityIds: pair,
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: pair },
  });
}

/**
 * Writes one thread change for each pair the new moments touch: the person
 * whose moment it is, toward each other person the moment's record names.
 * Then contact that scored nothing still renews a dormant thread: a minor
 * conversation after years apart puts two people back in touch. Called by
 * the moment intake with the moments it has just written and the contact
 * records it has just read.
 */
export function recordStoryThreads(
  world: World,
  moments: readonly StoryMomentRecord[],
  contacts: readonly RelationshipInteraction[] = [],
): World {
  // The rows are appended once, after their fade checks are scheduled, so the
  // writers' own checks wait for the clock's check at the end of the advance.
  return withWorldIntegrityDeferred(() =>
    writeThreads(world, moments, contacts),
  );
}

function writeThreads(
  world: World,
  moments: readonly StoryMomentRecord[],
  contacts: readonly RelationshipInteraction[],
): World {
  let next = world;
  const rows: StoryThreadStateRecord[] = [];
  const latest = new Map<string, StoryThreadStateRecord>();
  for (const moment of moments)
    for (const otherId of moment.counterpartPersonIds) {
      if (otherId === moment.personId || !next.people[otherId]) continue;
      const pairKey = `${moment.personId}|${otherId}`;
      const previous =
        latest.get(pairKey) ??
        latestThreadState(next, moment.personId, otherId);
      const reading = readPair(next, moment.personId, otherId);
      const turn = turnFor(next, moment, otherId, previous, reading);
      const momentSum = round((previous?.momentSum ?? 0) + moment.salience);
      const stableKey = `story-thread:${moment.personId}:${otherId}:${moment.id}`;
      const sequence = next.history.nextSequence;
      const row: StoryThreadStateRecord = {
        id: threadStateId(next, stableKey),
        stableKey,
        sequence,
        personId: moment.personId,
        otherPersonId: otherId,
        occurredAt: moment.occurredAt,
        recordedAt: next.currentDate,
        turn,
        momentId: moment.id,
        sourceRecordId: moment.sourceRecordId,
        importance: importanceOf(reading.tie, momentSum, reading.fading),
        momentSum,
        tie: reading.tie,
        fading: round(reading.fading),
        currency: reading.currency,
        lastContactOn: reading.lastContactOn,
        lines: reading.lines,
      };
      rows.push(row);
      latest.set(pairKey, row);
      next = {
        ...next,
        history: { ...next.history, nextSequence: sequence + 1 },
      };
      if (turn !== "closed" && reading.currency !== "dormant")
        next = scheduleFadeCheck(next, moment.personId, otherId, sequence);
    }
  for (const contact of contacts)
    for (const personId of contact.personIds)
      for (const otherId of contact.personIds) {
        if (personId === otherId || !next.people[otherId]) continue;
        const pairKey = `${personId}|${otherId}`;
        const previous =
          latest.get(pairKey) ?? latestThreadState(next, personId, otherId);
        if (
          !previous ||
          previous.turn === "closed" ||
          (previous.currency !== "dormant" && previous.turn !== "faded")
        )
          continue;
        const reading = readPair(next, personId, otherId);
        if (reading.currency === "dormant") continue;
        const stableKey = `story-thread:${personId}:${otherId}:contact:${contact.id}`;
        const sequence = next.history.nextSequence;
        const row: StoryThreadStateRecord = {
          id: threadStateId(next, stableKey),
          stableKey,
          sequence,
          personId,
          otherPersonId: otherId,
          occurredAt: contact.occurredAt,
          recordedAt: next.currentDate,
          turn: "renewed",
          momentId: null,
          sourceRecordId: contact.id,
          importance: importanceOf(
            reading.tie,
            previous.momentSum,
            reading.fading,
          ),
          momentSum: previous.momentSum,
          tie: reading.tie,
          fading: round(reading.fading),
          currency: reading.currency,
          lastContactOn: reading.lastContactOn,
          lines: reading.lines,
        };
        rows.push(row);
        latest.set(pairKey, row);
        next = {
          ...next,
          history: { ...next.history, nextSequence: sequence + 1 },
        };
        next = scheduleFadeCheck(next, personId, otherId, sequence);
      }
  if (rows.length === 0) return world;
  return {
    ...next,
    history: {
      ...next.history,
      storyThreadStates: appendedList(storyThreadStates(next), rows),
    },
  };
}

/**
 * The fade check: on the day a pair would go dormant at their own rhythm, it
 * re-reads them. Dormant, the thread fades and its moments count for a
 * quarter. Still in touch through contact that scored nothing, it looks again
 * on their new dormant day. A later change to the thread replaces the check.
 */
function threadFadeHandler(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  const [, , personId, otherId] = item.stableKey.split(":") as [
    string,
    string,
    EntityId,
    EntityId,
  ];
  const previous = latestThreadState(world, personId, otherId);
  const done = (next: World, reasonKey: `${string}:${string}`) => ({
    world: next,
    status: "resolved" as const,
    reasonKey,
    context: null,
    outcomeEventId: null,
  });
  if (
    !previous ||
    previous.sequence > item.sequence ||
    previous.turn === "closed" ||
    !world.people[personId] ||
    !world.people[otherId]
  )
    return done(world, "story:thread-check-replaced");
  const reading = readPair(world, personId, otherId);
  if (reading.currency !== "dormant")
    return done(
      scheduleFadeCheck(world, personId, otherId, item.sequence),
      "story:thread-still-current",
    );
  const stableKey = `story-thread:${personId}:${otherId}:fade:${item.id}`;
  const sequence = world.history.nextSequence;
  const row: StoryThreadStateRecord = {
    id: threadStateId(world, stableKey),
    stableKey,
    sequence,
    personId,
    otherPersonId: otherId,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    turn: "faded",
    momentId: null,
    sourceRecordId: item.id,
    importance: importanceOf(reading.tie, previous.momentSum, reading.fading),
    momentSum: previous.momentSum,
    tie: reading.tie,
    fading: round(reading.fading),
    currency: reading.currency,
    lastContactOn: reading.lastContactOn,
    lines: reading.lines,
  };
  return done(
    {
      ...world,
      history: {
        ...world.history,
        nextSequence: sequence + 1,
        storyThreadStates: appendedList(storyThreadStates(world), [row]),
      },
    },
    "story:thread-faded",
  );
}

// Built without createFutureTransitionHandlerRegistry, for the same import
// cycle reason as PEOPLE_GOAL_HANDLERS.
export const STORY_THREAD_HANDLERS: FutureTransitionHandlerRegistry = {
  get: (transitionKey) =>
    transitionKey === STORY_THREAD_FADE_KEY ? threadFadeHandler : undefined,
};

/* -------------------------------------------------------------------------- */
/* Integrity                                                                   */
/* -------------------------------------------------------------------------- */

const TURNS = new Set<StoryThreadTurn>([
  "started",
  "grew",
  "soured",
  "turned",
  "faded",
  "renewed",
  "closed",
]);

export function assertStoryThreadIntegrity(world: World): void {
  const keys = new Set<string>();
  const momentIds = new Set(
    (world.history.storyMoments ?? []).map((moment) => moment.id),
  );
  let lastSequence = -1;
  for (const state of storyThreadStates(world)) {
    if (
      keys.has(state.stableKey) ||
      state.sequence <= lastSequence ||
      state.sequence >= world.history.nextSequence ||
      !world.people[state.personId] ||
      !world.people[state.otherPersonId] ||
      state.personId === state.otherPersonId ||
      !TURNS.has(state.turn) ||
      (state.momentId !== null && !momentIds.has(state.momentId)) ||
      (state.momentId === null &&
        state.turn !== "faded" &&
        state.turn !== "renewed") ||
      !(state.importance >= 0) ||
      !(state.fading >= 0 && state.fading <= 1) ||
      state.id !== threadStateId(world, state.stableKey)
    )
      throw new Error(`Invalid story thread state: ${state.stableKey}`);
    keys.add(state.stableKey);
    lastSequence = state.sequence;
  }
}
