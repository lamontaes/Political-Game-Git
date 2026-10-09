import { recordById } from "../history-index";
import { describePersonContext } from "../person-context";
import { personName } from "../people";
import {
  recordSceneBinding,
  sceneAlreadyBound,
  type SceneBinding,
} from "../scene-bindings";
import type { EntityId, StoryMomentRecord, World } from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { storyMoments } from "./moments";
import {
  SITUATION_TYPES,
  type SituationCause,
  type SituationRole,
  type SituationType,
} from "./situations";
import { storyHousemates, storyKin, storyThreadsOf } from "./threads";

/**
 * Binding a situation from the moment that opens it (story director, part 3).
 *
 * The records fill every role. A cause names, for each role, the fill rule
 * that binds it from the opening moment: the person the moment is about, the
 * other person it names, the household, the relatives, or whoever else the
 * opening record names. A role the records cannot fill leaves the situation
 * unbound, with the reason, so a missing record shows instead of being made
 * up. The binding is saved once, as the conversation engine's scene binding,
 * and every later read uses it unchanged.
 *
 * Which situations become scenes, when and where, is scheduling (part 4).
 * This module only casts one situation from one moment.
 */

export const SITUATION_FAMILY = "situation" as const;

/** The people in each role, by role key. */
export type SituationCast = Readonly<Record<string, readonly EntityId[]>>;

/** What a situation binding holds, read back from its saved facts. */
export interface BoundSituation {
  readonly typeKey: string;
  readonly causeKind: string;
  readonly momentId: EntityId;
  readonly cast: SituationCast;
  /** The role the player fills. */
  readonly playerRole: string;
  /** The role that speaks first. */
  readonly opener: string;
  /** The move the opening record already is, if it is one. */
  readonly opening: string | null;
}

export type SituationBindResult =
  | { readonly kind: "bound"; readonly world: World }
  | { readonly kind: "unbound"; readonly reason: string };

/** Whether a cause's moment pattern matches a moment kind; `*` is one segment. */
function causeMatches(pattern: string, kindKey: string): boolean {
  const want = pattern.split(":");
  const have = kindKey.split(":");
  return (
    want.length === have.length &&
    want.every((part, index) => part === "*" || part === have[index])
  );
}

/** The situation types a moment can open, with the cause that opens each. */
export function situationCausesFor(
  kindKey: string,
): readonly { readonly type: SituationType; readonly cause: SituationCause }[] {
  return SITUATION_TYPES.flatMap((type) =>
    type.causes
      .filter((cause) => cause.moment && causeMatches(cause.moment, kindKey))
      .map((cause) => ({ type, cause })),
  );
}

/** The people the opening record itself names, besides the moment's own. */
function namedByRecord(world: World, moment: StoryMomentRecord): EntityId[] {
  const eventId =
    moment.sourceStore === "events"
      ? moment.sourceRecordId
      : moment.sourceStore === "relationshipInteractions"
        ? (world.history.relationshipInteractions.find(
            (interaction) => interaction.id === moment.sourceRecordId,
          )?.eventId ?? null)
        : null;
  if (!eventId) return [];
  const event = world.history.events.find((entry) => entry.id === eventId);
  if (!event) return [];
  const own = new Set([moment.personId, ...moment.counterpartPersonIds]);
  return [
    ...new Set(
      event.participants
        .map((participant) => participant.personId)
        .filter((id) => !own.has(id)),
    ),
  ];
}

/** The people a fill rule names from this moment, or null if it is not built. */
function fillPeople(
  world: World,
  fill: string,
  moment: StoryMomentRecord,
): EntityId[] | null {
  switch (fill) {
    case "subject":
      return [moment.personId];
    case "counterpart":
      return [...moment.counterpartPersonIds];
    case "household":
      return storyHousemates(world, moment.personId);
    case "kin":
      return storyKin(world, moment.personId);
    case "present":
      return namedByRecord(world, moment);
    default:
      // Classmates, coworkers, the absent and an authority need the presence
      // and staging records of scheduling (part 4).
      return null;
  }
}

/**
 * Candidates ranked by how much they matter to the moment's person now: the
 * order of that person's threads, then the order the records list them.
 */
function ranked(
  world: World,
  personId: EntityId,
  people: readonly EntityId[],
): EntityId[] {
  const order = new Map(
    storyThreadsOf(world, personId).map(
      (thread, index) => [thread.otherPersonId, index] as const,
    ),
  );
  return people
    .map((id, index) => ({ id, rank: order.get(id) ?? order.size + index }))
    .sort((left, right) => left.rank - right.rank)
    .map((entry) => entry.id);
}

function alive(world: World, personId: EntityId): boolean {
  if (!world.people[personId]) return false;
  return isPersonAliveAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}

/** Casts every role from the moment, or says which role the records cannot fill. */
export function castSituation(
  world: World,
  type: SituationType,
  cause: SituationCause,
  moment: StoryMomentRecord,
): { readonly cast: SituationCast } | { readonly reason: string } {
  const cast: Record<string, readonly EntityId[]> = {};
  const inRoom = new Set<EntityId>();
  for (const role of type.roles) {
    const fill = cause.bind[role.key] ?? role.fill;
    const found = fillPeople(world, fill, moment);
    if (found === null)
      return {
        reason: `${type.key} ${role.key}: the ${fill} fill is not built`,
      };
    const present = role.present !== false;
    const people = ranked(world, moment.personId, found).filter(
      (id) => !present || (alive(world, id) && !inRoom.has(id)),
    );
    const chosen = role.count === "one" ? people.slice(0, 1) : people;
    if (role.count === "one" && chosen.length === 0)
      return {
        reason: `${type.key} ${role.key}: no ${fill} on record for this moment`,
      };
    if (present) for (const id of chosen) inRoom.add(id);
    cast[role.key] = chosen;
  }
  return { cast };
}

function presentRoles(type: SituationType): SituationRole[] {
  return type.roles.filter((role) => role.present !== false);
}

/**
 * Binds one situation from one moment for the player, if the player fills one
 * of its roles and the records fill the rest.
 */
export function bindSituation(
  world: World,
  input: {
    readonly typeKey: string;
    readonly momentId: EntityId;
    readonly playerPersonId: EntityId;
  },
): SituationBindResult {
  const type = SITUATION_TYPES.find((entry) => entry.key === input.typeKey);
  if (!type) return { kind: "unbound", reason: `No type ${input.typeKey}` };
  const moment = recordById(storyMoments(world), input.momentId);
  if (!moment) return { kind: "unbound", reason: "No such moment" };
  const cause = type.causes.find(
    (entry) => entry.moment && causeMatches(entry.moment, moment.kindKey),
  );
  if (!cause)
    return {
      kind: "unbound",
      reason: `${type.key} is not opened by ${moment.kindKey}`,
    };
  const player = world.people[input.playerPersonId];
  if (!player) return { kind: "unbound", reason: "No such player" };
  if (
    sceneAlreadyBound(
      world,
      player.id,
      SITUATION_FAMILY,
      type.key,
      moment.sourceRecordId,
    )
  )
    return { kind: "unbound", reason: "Already bound" };

  const casting = castSituation(world, type, cause, moment);
  if ("reason" in casting) return { kind: "unbound", reason: casting.reason };
  const { cast } = casting;
  const roles = presentRoles(type);
  const playerRole = roles.find((role) => cast[role.key]!.includes(player.id));
  if (!playerRole)
    return {
      kind: "unbound",
      reason: `${type.key}: the player fills no role, so it stays a journal line`,
    };
  const opener =
    cause.opener ??
    roles.find(
      (role) => role.key !== playerRole.key && cast[role.key]!.length > 0,
    )?.key ??
    playerRole.key;
  // The person the player speaks with: the opener, or when the player opens,
  // the first other person in the room.
  const speakerId =
    opener !== playerRole.key
      ? cast[opener]![0]
      : roles
          .filter((role) => role.key !== playerRole.key)
          .flatMap((role) => cast[role.key]!)[0];
  if (!speakerId)
    return { kind: "unbound", reason: `${type.key}: nobody else is there` };
  const speaker = world.people[speakerId]!;

  const facts: Record<string, string> = {
    type: type.key,
    cause: moment.kindKey,
    momentId: moment.id,
    playerRole: playerRole.key,
    opener,
    speakerName: personName(speaker),
  };
  if (cause.opening) facts.opening = cause.opening;
  for (const [roleKey, people] of Object.entries(cast))
    if (people.length > 0) facts[`role.${roleKey}`] = people.join(",");

  const date =
    moment.occurredAt > world.currentDate
      ? moment.occurredAt
      : world.currentDate;
  const binding: SceneBinding = {
    version: 1,
    family: SITUATION_FAMILY,
    variant: type.key,
    playerPersonId: player.id,
    speakerPersonId: speaker.id,
    relationship:
      describePersonContext(world, player.id, speaker.id)?.relationship ?? null,
    place:
      world.jurisdictions[player.homeJurisdictionId]?.name ??
      player.homeJurisdictionId,
    jurisdictionId: player.homeJurisdictionId,
    // The sourced scale row the moment was weighed by, such as "Change in
    // residence": the record's own words for what happened.
    request: moment.weight.row,
    sourceEntityIds: [moment.sourceRecordId, moment.id],
    facts,
    knownRecordIds: [moment.sourceRecordId],
    target: null,
    date: moment.occurredAt,
    // Scheduling (part 4) sets how long each timing stays open; until then a
    // situation is open on the day it is bound.
    expiresAt: date,
  };
  return {
    kind: "bound",
    world: recordSceneBinding(world, binding, moment.weight.row),
  };
}

/** The situation a saved binding holds. */
export function situationOf(binding: SceneBinding): BoundSituation | null {
  if (binding.family !== SITUATION_FAMILY) return null;
  const { facts } = binding;
  const cast: Record<string, readonly EntityId[]> = {};
  for (const [key, value] of Object.entries(facts))
    if (key.startsWith("role."))
      cast[key.slice("role.".length)] = value.split(",") as EntityId[];
  if (!facts.type || !facts.playerRole || !facts.opener || !facts.momentId)
    return null;
  return {
    typeKey: facts.type,
    causeKind: facts.cause ?? "",
    momentId: facts.momentId as EntityId,
    cast,
    playerRole: facts.playerRole,
    opener: facts.opener,
    opening: facts.opening ?? null,
  };
}
