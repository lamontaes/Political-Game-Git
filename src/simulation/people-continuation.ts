import { addDays, ageOnDate, makeIsoDate } from "./dates";
import { advanceWorld } from "./world";
import { kinshipRelationshipsAt } from "./life-queries";
import { childrenOf, grandchildrenOf } from "./people-family";
import { personName } from "./people";
import { recordEventKnowledge } from "./records";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  HistoricalEvent,
  IsoDate,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";

/**
 * Playing on after a life ends (CRUNCH46 P5).
 *
 * When the character being played dies, or the player explicitly retires them
 * from play, the same World goes on. The player may continue as an eligible
 * member of that character's family, read the finished life's record, or keep
 * watching the world with nobody in hand. Nothing is copied, merged, reseeded
 * or reset: the date, the laws, the officials and everybody's history stay
 * exactly as they are, and only the pointer to the controlled person moves.
 *
 * What the new character knows is their own history plus the family facts
 * disclosed to them here — that their relative died or stepped back, and that
 * an estate is pending. They do not inherit the predecessor's knowledge,
 * temperament, relationships, aims, office or money. A person who owned
 * property individually leaves it in a pending estate; household and joint
 * holdings keep their existing shares; campaign and public money was never
 * theirs to leave. Probate is not modelled and not claimed.
 *
 * Retiring a character from play is not their death and does not end any job
 * or office they hold. They simply stop being played.
 */

export const PEOPLE_CONTINUATION_VERSION = "people-continuation-v1";
export const CONTROL_CONTINUED_EVENT = "game.control-continued";
export const CONTROL_RELEASED_EVENT = "game.control-released";
export const CHARACTER_RETIRED_EVENT = "game.character-retired";
export const ESTATE_OPENED_EVENT = "life.estate-opened";
export const CONTROL_TAG_PREFIX = "control.v1:";

/** Authored first scope: the youngest age a continued character is played at. */
export const PLAYABLE_AGE = 5;

export type LifeEndKind = "death" | "retirement";

export interface ControlHandoff {
  readonly eventId: EntityId;
  readonly at: IsoDate;
  readonly kind: "continued" | "released";
  readonly fromPersonId: EntityId;
  readonly toPersonId: EntityId | null;
  readonly reason: LifeEndKind;
  /** 1 for the first character, 2 for the first continuation, and so on. */
  readonly generation: number;
}

interface ControlTag {
  readonly version: 1;
  readonly from: EntityId;
  readonly to: EntityId | null;
  readonly reason: LifeEndKind;
  readonly generation: number;
}

function controlTagOf(event: HistoricalEvent): ControlTag | null {
  const tag = event.tags.find((entry) => entry.startsWith(CONTROL_TAG_PREFIX));
  if (!tag) return null;
  try {
    return JSON.parse(tag.slice(CONTROL_TAG_PREFIX.length)) as ControlTag;
  } catch {
    return null;
  }
}

/** Every change of hands, oldest first. */
export function controlHandoffs(world: World): readonly ControlHandoff[] {
  return world.history.events.flatMap((event) => {
    if (
      event.type !== CONTROL_CONTINUED_EVENT &&
      event.type !== CONTROL_RELEASED_EVENT
    ) {
      return [];
    }
    const tag = controlTagOf(event);
    if (!tag) return [];
    return [
      {
        eventId: event.id,
        at: event.occurredAt,
        kind: event.type === CONTROL_CONTINUED_EVENT ? "continued" : "released",
        fromPersonId: tag.from,
        toPersonId: tag.to,
        reason: tag.reason,
        generation: tag.generation,
      },
    ];
  });
}

/**
 * The people who have been played in this world, in order. The first is the
 * character the game began with.
 */
export function controlledLineage(world: World): readonly EntityId[] {
  const handoffs = controlHandoffs(world);
  const lineage: EntityId[] = [];
  const first = handoffs[0]?.fromPersonId;
  if (first) lineage.push(first);
  else if (world.control.kind === "person")
    lineage.push(world.control.personId);
  for (const handoff of handoffs) {
    if (handoff.toPersonId && !lineage.includes(handoff.toPersonId)) {
      lineage.push(handoff.toPersonId);
    }
  }
  return lineage;
}

function alive(world: World, personId: EntityId): boolean {
  return isPersonAliveAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}

export function deathOf(world: World, personId: EntityId) {
  return world.history.personDeaths.find(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

export function retirementOf(
  world: World,
  personId: EntityId,
): HistoricalEvent | undefined {
  return world.history.events.find(
    (event) =>
      event.type === CHARACTER_RETIRED_EVENT &&
      event.involvedEntityIds.includes(personId),
  );
}

/** How the played life ended, if it has. */
export function lifeEnd(
  world: World,
  personId: EntityId,
): {
  readonly kind: LifeEndKind;
  readonly on: IsoDate;
  readonly eventId: EntityId;
} | null {
  const death = deathOf(world, personId);
  if (death) return { kind: "death", on: death.diedAt, eventId: death.eventId };
  const retired = retirementOf(world, personId);
  if (retired) {
    return { kind: "retirement", on: retired.occurredAt, eventId: retired.id };
  }
  return null;
}

/** The generation number of whoever is played now (1 for the first). */
export function currentGeneration(world: World): number {
  return (
    controlHandoffs(world)
      .filter((handoff) => handoff.kind === "continued")
      .at(-1)?.generation ?? 1
  );
}

/**
 * Stops playing the controlled character. They go on living as anyone else
 * in the world does; their jobs, offices and commitments are untouched.
 */
export function retireControlledCharacter(
  world: World,
  personId: EntityId,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    throw new Error(
      "Only the character being played can be retired from play.",
    );
  }
  if (!alive(world, personId)) {
    throw new Error("A character who has died is not retired from play.");
  }
  if (retirementOf(world, personId)) return world;
  const person = world.people[personId]!;
  return recordWorldEvent(world, {
    stableKey: `${PEOPLE_CONTINUATION_VERSION}:retired:${personId}`,
    type: CHARACTER_RETIRED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "other:retired-from-play", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: [`${PEOPLE_CONTINUATION_VERSION}`],
    summary: `The player stopped playing ${personName(person)}, who goes on living.`,
    context: {
      location: null,
      socialContext: "A change of who is played, not an event in the world.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export type SuccessorRelation = "child" | "grandchild" | "sibling" | "partner";

export interface SuccessorCandidate {
  readonly personId: EntityId;
  readonly relation: SuccessorRelation;
  readonly age: number;
  /** Playable today. */
  readonly availableNow: boolean;
  /** When they reach playable age, if they have not yet. */
  readonly playableOn: IsoDate | null;
}

/**
 * Living family members who could be played next, closest first. Only people
 * the world already records as family; nobody is made up to fill the list.
 */
export function successorCandidates(
  world: World,
  predecessorId: EntityId,
): readonly SuccessorCandidate[] {
  if (!world.people[predecessorId]) return [];
  const seen = new Set<EntityId>([predecessorId]);
  const candidates: SuccessorCandidate[] = [];
  const add = (personId: EntityId, relation: SuccessorRelation) => {
    if (seen.has(personId)) return;
    seen.add(personId);
    const person = world.people[personId];
    if (!person || !alive(world, personId)) return;
    if (lifeEnd(world, personId)) return;
    const age = ageOnDate(person.birthDate, world.currentDate);
    const playableOn = addYears(person.birthDate, PLAYABLE_AGE);
    candidates.push({
      personId,
      relation,
      age,
      availableNow: age >= PLAYABLE_AGE,
      playableOn: age >= PLAYABLE_AGE ? null : playableOn,
    });
  };
  for (const id of childrenOf(world, predecessorId)) add(id, "child");
  for (const id of grandchildrenOf(world, predecessorId)) add(id, "grandchild");
  for (const entry of kinshipRelationshipsAt(world, predecessorId)) {
    if (entry.kind === "collateral:sibling") {
      add(
        entry.personIds.find((id) => id !== predecessorId)!,
        "sibling",
      );
    }
  }
  // Death does not end the partnership record (D-046), so a partner whose
  // partnership was last recorded as active is still named as the partner.
  for (const partnership of world.history.partnerships) {
    if (!partnership.personIds.includes(predecessorId)) continue;
    const last = world.history.partnershipStates
      .filter((state) => state.partnershipId === partnership.id)
      .at(-1);
    if (last?.status !== "active") continue;
    add(
      partnership.personIds.find((id) => id !== predecessorId)!,
      "partner",
    );
  }
  return candidates;
}

function addYears(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y + years, m - 1, d));
  // February 29 falls to March 1 in a non-leap year, as ageOnDate counts it.
  return makeIsoDate(target.toISOString().slice(0, 10));
}

function assertEnded(world: World, predecessorId: EntityId): LifeEndKind {
  const played =
    world.control.kind === "person"
      ? world.control.personId
      : (controlHandoffs(world).at(-1)?.fromPersonId ?? null);
  if (played !== predecessorId) {
    throw new Error("That is not the character who was being played.");
  }
  const ended = lifeEnd(world, predecessorId);
  if (!ended) {
    throw new Error("That life has not ended; retire the character first.");
  }
  return ended.kind;
}

/**
 * The deceased's individually owned holdings, left pending in an estate. Nothing
 * moves; the record says what is waiting to be settled.
 */
function openEstate(world: World, deceasedId: EntityId): World {
  const stableKey = `${PEOPLE_CONTINUATION_VERSION}:estate:${deceasedId}`;
  if (world.history.events.some((event) => event.stableKey === stableKey)) {
    return world;
  }
  const positions = world.history.resourcePositions
    .filter(
      (position) =>
        position.owner.kind === "person" &&
        position.owner.personId === deceasedId,
    )
    .map((position) => position.id);
  const tenures = world.history.housingTenures
    .filter(
      (tenure) =>
        tenure.holder.kind === "person" &&
        tenure.holder.personId === deceasedId,
    )
    .map((tenure) => tenure.id);
  const person = world.people[deceasedId]!;
  const held = positions.length + tenures.length;
  return recordWorldEvent(world, {
    stableKey,
    type: ESTATE_OPENED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [deceasedId],
    participants: [
      {
        personId: deceasedId,
        role: "focus:subject",
        detail: "Whose estate it is",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PEOPLE_CONTINUATION_VERSION,
      "estate.pending-disposition",
      ...positions.map((id) => `estate.position:${id}`),
      ...tenures.map((id) => `estate.tenure:${id}`),
    ],
    summary:
      held === 0
        ? `${personName(person)} held nothing individually; there is nothing to settle.`
        : `${personName(person)}'s individually held ${held === 1 ? "holding is" : `${held} holdings are`} pending settlement. Nothing has been passed on.`,
    context: {
      location: null,
      socialContext: "What a person owned alone waits to be settled.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export interface ContinueAsInput {
  readonly predecessorId: EntityId;
  readonly successorId: EntityId;
}

/**
 * Continue the game as a living family member of the character whose life
 * ended. The same World; the successor becomes the controlled person.
 */
export function continueAsRelative(
  world: World,
  input: ContinueAsInput,
): World {
  const reason = assertEnded(world, input.predecessorId);
  const candidate = successorCandidates(world, input.predecessorId).find(
    (entry) => entry.personId === input.successorId,
  );
  if (!candidate) {
    throw new Error(
      "That person is not an eligible family member to continue as.",
    );
  }
  if (!candidate.availableNow) {
    throw new Error(
      `They cannot be played until ${candidate.playableOn}; wait for that date first.`,
    );
  }
  let next = world;
  const predecessor = next.people[input.predecessorId]!;
  const successor = next.people[input.successorId]!;
  const end = lifeEnd(next, input.predecessorId)!;

  if (reason === "death") {
    next = openEstate(next, input.predecessorId);
  }
  // What the successor is told: the family facts of this change, nothing else.
  const disclosed = [
    end.eventId,
    ...(reason === "death"
      ? [
          next.history.events.find(
            (event) =>
              event.stableKey ===
              `${PEOPLE_CONTINUATION_VERSION}:estate:${input.predecessorId}`,
          )!.id,
        ]
      : []),
  ];
  for (const eventId of disclosed) {
    const already = next.history.knowledge.some(
      (entry) =>
        entry.personId === input.successorId && entry.eventId === eventId,
    );
    if (already) continue;
    const event = next.history.events.find((entry) => entry.id === eventId)!;
    if (reason === "retirement" && eventId === end.eventId) continue;
    next = recordEventKnowledge(next, {
      stableKey: `${PEOPLE_CONTINUATION_VERSION}:told:${input.successorId}:${eventId}`,
      personId: input.successorId,
      eventId,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: "Family notice" },
    });
  }

  const generation = currentGeneration(next) + 1;
  const tag: ControlTag = {
    version: 1,
    from: input.predecessorId,
    to: input.successorId,
    reason,
    generation,
  };
  next = recordWorldEvent(next, {
    stableKey: `${PEOPLE_CONTINUATION_VERSION}:continued:${input.predecessorId}:${input.successorId}`,
    type: CONTROL_CONTINUED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: successor.homeJurisdictionId,
    involvedEntityIds: [input.predecessorId, input.successorId],
    participants: [
      {
        personId: input.predecessorId,
        role: "other:played-before",
        detail: null,
      },
      { personId: input.successorId, role: "other:played-now", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`${CONTROL_TAG_PREFIX}${JSON.stringify(tag)}`],
    summary: `Play continued as ${personName(successor)}, after ${personName(predecessor)}.`,
    context: {
      location: null,
      socialContext: "A change of who is played, not an event in the world.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { ...next, control: { kind: "person", personId: input.successorId } };
}

/** Keep the world running with nobody in hand. */
export function keepObserving(world: World, predecessorId: EntityId): World {
  const reason = assertEnded(world, predecessorId);
  if (world.control.kind === "observer") return world;
  let next = reason === "death" ? openEstate(world, predecessorId) : world;
  const tag: ControlTag = {
    version: 1,
    from: predecessorId,
    to: null,
    reason,
    generation: currentGeneration(next),
  };
  next = recordWorldEvent(next, {
    stableKey: `${PEOPLE_CONTINUATION_VERSION}:released:${predecessorId}`,
    type: CONTROL_RELEASED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: next.people[predecessorId]!.homeJurisdictionId,
    involvedEntityIds: [predecessorId],
    participants: [
      { personId: predecessorId, role: "other:played-before", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`${CONTROL_TAG_PREFIX}${JSON.stringify(tag)}`],
    summary: `The player kept watching the world after ${personName(next.people[predecessorId]!)}.`,
    context: {
      location: null,
      socialContext: "A change of who is played, not an event in the world.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { ...next, control: { kind: "observer" } };
}

/**
 * The disclosed wait for a younger relative: the world runs, with nobody in
 * hand, until they reach playable age, and then play continues as them. The
 * predecessor makes no decisions in the meantime.
 */
export function waitThenContinue(
  world: World,
  input: ContinueAsInput & {
    readonly handlers: FutureTransitionHandlerRegistry;
  },
): World {
  const candidate = successorCandidates(world, input.predecessorId).find(
    (entry) => entry.personId === input.successorId,
  );
  if (!candidate) {
    throw new Error(
      "That person is not an eligible family member to continue as.",
    );
  }
  if (candidate.availableNow) {
    return continueAsRelative(world, input);
  }
  const observing = keepObserving(world, input.predecessorId);
  const days = daysBetween(observing.currentDate, candidate.playableOn!);
  const advanced = advanceWorld(observing, days, input.handlers);
  if (advanced.currentDate < candidate.playableOn!) {
    throw new Error("The world could not run on to that date.");
  }
  if (!alive(advanced, input.successorId)) {
    throw new Error("They did not live to that date; nobody is played.");
  }
  return continueAsRelative(advanced, input);
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}
