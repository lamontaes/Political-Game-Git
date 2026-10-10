import { addDays } from "../dates";
import { recordById, recordsByStringField } from "../history-index";
import {
  activeChildAuthoritiesAt,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  educationEnrollmentStateAt,
  householdMembershipsAt,
  organizationParticipationStateAt,
  organizationProfileAt,
  workStatusAt,
} from "../life-queries";
import { describePersonContext } from "../person-context";
import { personName } from "../people";
import {
  RELATIONSHIP_DIMENSIONS,
  readRelationshipStanding,
} from "../relationship-standing";
import {
  recordSceneBinding,
  sceneAlreadyBound,
  type SceneBinding,
  type SceneStagedPerson,
  type SceneStaging,
} from "../scene-bindings";
import type {
  EntityId,
  IsoDate,
  StoryCoverageReason,
  StoryMomentRecord,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { storyMoments } from "./moments";
import {
  STORY_SCHEDULING,
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
  | {
      readonly kind: "unbound";
      readonly reason: string;
      /**
       * Why, for the coverage log, when the records fell short; null when
       * nothing is missing (the player is not in it, or it is already bound).
       */
      readonly coverage: StoryCoverageReason | null;
    };

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

/* -------------------------------------------------------------------------- */
/* The school or workplace a moment is about                                   */
/* -------------------------------------------------------------------------- */

interface Institution {
  readonly setting: "school" | "workplace";
  readonly organizationId: EntityId;
}

function enrollmentInstitution(
  world: World,
  enrollmentId: EntityId,
): Institution | null {
  const enrollment = recordById(
    world.history.educationEnrollments,
    enrollmentId,
  );
  return enrollment
    ? { setting: "school", organizationId: enrollment.organizationId }
    : null;
}

function workInstitution(
  world: World,
  relationshipId: EntityId,
): Institution | null {
  const relationship = recordById(
    world.history.workRelationships,
    relationshipId,
  );
  return relationship?.organizationId
    ? { setting: "workplace", organizationId: relationship.organizationId }
    : null;
}

/**
 * The school or workplace the moment is about: the one its own record names,
 * or else the person's current school, then their current job.
 */
function institutionOf(
  world: World,
  moment: StoryMomentRecord,
): Institution | null {
  const id = moment.sourceRecordId;
  switch (moment.sourceStore) {
    case "educationEnrollments":
      return enrollmentInstitution(world, id);
    case "educationEnrollmentStates": {
      const state = recordById(world.history.educationEnrollmentStates, id);
      return state ? enrollmentInstitution(world, state.enrollmentId) : null;
    }
    case "workRelationships":
      return workInstitution(world, id);
    case "workStatuses": {
      const status = recordById(world.history.workStatuses, id);
      return status ? workInstitution(world, status.workRelationshipId) : null;
    }
  }
  const school = activeEducationEnrollmentsAt(world, moment.personId)[0];
  if (school)
    return {
      setting: "school",
      organizationId: school.enrollment.organizationId,
    };
  const job = activeWorkRelationshipsAt(world, moment.personId).find(
    (entry) => entry.relationship.organizationId,
  );
  return job
    ? {
        setting: "workplace",
        organizationId: job.relationship.organizationId!,
      }
    : null;
}

/** Everyone enrolled at a school now. */
function enrolledAt(world: World, organizationId: EntityId): EntityId[] {
  return recordsByStringField(
    world.history.educationEnrollments,
    "organizationId",
    organizationId,
  )
    .filter(
      (enrollment) =>
        enrollment.startedAt <= world.currentDate &&
        educationEnrollmentStateAt(world, enrollment.id)?.status === "active",
    )
    .map((enrollment) => enrollment.personId);
}

/** Everyone working at an organization now. */
function workingAt(world: World, organizationId: EntityId): EntityId[] {
  return recordsByStringField(
    world.history.workRelationships,
    "organizationId",
    organizationId,
  )
    .filter(
      (relationship) =>
        relationship.startedAt <= world.currentDate &&
        workStatusAt(world, relationship.id)?.status === "active",
    )
    .map((relationship) => relationship.personId);
}

/** Everyone holding a leading role in an organization now. */
function leadingAt(world: World, organizationId: EntityId): EntityId[] {
  return recordsByStringField(
    world.history.organizationParticipations,
    "organizationId",
    organizationId,
  )
    .filter((participation) => {
      const state = organizationParticipationStateAt(world, participation.id);
      return (
        participation.startedAt <= world.currentDate &&
        state?.status === "active" &&
        (state.roleKind?.startsWith("leader:") ?? false)
      );
    })
    .map((participation) => participation.personId);
}

/**
 * The person's guardian, teacher or supervisor on record: at school, the
 * people the school employs; at work, the people leading the organization;
 * otherwise, for a child, the people holding authority over them.
 */
function authorityFor(world: World, moment: StoryMomentRecord): EntityId[] {
  const institution = institutionOf(world, moment);
  if (institution?.setting === "school")
    return workingAt(world, institution.organizationId);
  if (institution?.setting === "workplace")
    return leadingAt(world, institution.organizationId);
  try {
    return activeChildAuthoritiesAt(world, moment.personId).flatMap((entry) =>
      entry.authority.holder.kind === "person"
        ? [entry.authority.holder.personId]
        : [],
    );
  } catch {
    return [];
  }
}

/** The people a fill rule names from this moment. */
function fillPeople(
  world: World,
  fill: string,
  moment: StoryMomentRecord,
): EntityId[] | null {
  const others = (people: readonly EntityId[]) => [
    ...new Set(people.filter((id) => id !== moment.personId)),
  ];
  switch (fill) {
    case "subject":
      return [moment.personId];
    case "counterpart":
    case "absent":
      // The absent person is the one the record names as away or gone.
      return [...moment.counterpartPersonIds];
    case "household":
      return storyHousemates(world, moment.personId);
    case "kin":
      return storyKin(world, moment.personId);
    case "present":
      return namedByRecord(world, moment);
    case "classmates": {
      const school = institutionOf(world, moment);
      return school?.setting === "school"
        ? others(enrolledAt(world, school.organizationId))
        : [];
    }
    case "coworkers": {
      const work = institutionOf(world, moment);
      return work?.setting === "workplace"
        ? others(workingAt(world, work.organizationId))
        : [];
    }
    case "authority":
      return others(authorityFor(world, moment));
    default:
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

/* -------------------------------------------------------------------------- */
/* Where it happens (part 4)                                                   */
/* -------------------------------------------------------------------------- */

interface ScenePlace {
  readonly setting: string;
  readonly label: string;
  readonly jurisdictionId: EntityId;
  readonly placeRecordId: EntityId | null;
}

/** A person's home, from their household's location record. */
function homeOf(world: World, personId: EntityId): ScenePlace | null {
  let memberships;
  try {
    memberships = householdMembershipsAt(world, personId);
  } catch {
    return null;
  }
  const home =
    memberships.find(
      (entry) => entry.state.residenceRole === "primary" && entry.location,
    ) ?? memberships.find((entry) => entry.location);
  return home?.location
    ? {
        setting: "home",
        label: home.location.label,
        jurisdictionId: home.location.jurisdictionId,
        placeRecordId: home.location.id,
      }
    : null;
}

function institutionPlace(
  world: World,
  institution: Institution | null,
  setting: "school" | "workplace",
): ScenePlace | null {
  if (institution?.setting !== setting) return null;
  const profile = organizationProfileAt(
    world,
    institution.organizationId,
    currentLifeCutoff(world),
  );
  if (!profile?.locationJurisdictionId) return null;
  return {
    setting,
    label: profile.name,
    jurisdictionId: profile.locationJurisdictionId,
    placeRecordId: profile.id,
  };
}

/** The place the opening record itself names, when it is an event. */
function venueOf(world: World, moment: StoryMomentRecord): ScenePlace | null {
  if (moment.sourceStore !== "events") return null;
  const event = recordById(world.history.events, moment.sourceRecordId);
  const location = event?.context.location;
  if (!event || !location?.label || !location.jurisdictionId) return null;
  return {
    setting: "venue",
    label: location.label,
    jurisdictionId: location.jurisdictionId,
    placeRecordId: event.id,
  };
}

/**
 * The first of the type's settings the records can place: the household's
 * home, the counterpart's home, the school or workplace the moment is about,
 * the place its event names, or the town. A call or a letter reaches the
 * person at home.
 */
function resolvePlace(
  world: World,
  type: SituationType,
  moment: StoryMomentRecord,
): ScenePlace | null {
  for (const setting of type.setting) {
    let place: ScenePlace | null = null;
    switch (setting) {
      case "home":
        place = homeOf(world, moment.personId);
        break;
      case "phone":
      case "letter": {
        const home = homeOf(world, moment.personId);
        place = home ? { ...home, setting } : null;
        break;
      }
      case "other-home": {
        const other = moment.counterpartPersonIds[0];
        const home = other ? homeOf(world, other) : null;
        place = home ? { ...home, setting } : null;
        break;
      }
      case "school":
      case "workplace":
        place = institutionPlace(world, institutionOf(world, moment), setting);
        break;
      case "venue":
        place = venueOf(world, moment);
        break;
      case "public": {
        const person = world.people[moment.personId];
        const town = person && world.jurisdictions[person.homeJurisdictionId];
        place = town
          ? {
              setting,
              label: town.name,
              jurisdictionId: town.id,
              placeRecordId: null,
            }
          : null;
        break;
      }
    }
    if (place) return place;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Staging and timing (part 4)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Everyone in the scene, in their role, with the act kinds their role leans
 * toward, the role's bearing and their recorded standing toward the person
 * they face: the player faces the speaker, everyone else faces the player.
 */
function stage(
  world: World,
  type: SituationType,
  cast: SituationCast,
  place: ScenePlace,
  playerId: EntityId,
  speakerId: EntityId,
): SceneStaging {
  const people: SceneStagedPerson[] = [];
  const seen = new Set<EntityId>();
  for (const role of presentRoles(type))
    for (const personId of cast[role.key] ?? []) {
      if (seen.has(personId)) continue;
      seen.add(personId);
      const toward = personId === playerId ? speakerId : playerId;
      const readings = readRelationshipStanding(
        world,
        personId,
        toward,
      ).readings;
      people.push({
        personId,
        typeKey: type.key,
        role: role.key,
        acts: role.wants,
        mood: role.bearing!,
        standing: RELATIONSHIP_DIMENSIONS.flatMap((dimension) => {
          const reading = readings[dimension];
          return reading.band === "none"
            ? []
            : [
                {
                  towardPersonId: toward,
                  dimension,
                  band: reading.band,
                  adverse: reading.adverse,
                },
              ];
        }),
      });
    }
  return {
    setting: place.setting,
    placeRecordId: place.placeRecordId,
    people,
  };
}

/**
 * When the scene opens and how long it stays open, by the type's timing: on
 * the date the opening record takes effect, or as soon as the player has
 * control after it is written. A date already past opens now.
 */
function openWindow(
  world: World,
  type: SituationType,
  moment: StoryMomentRecord,
): { readonly opensOn: IsoDate; readonly expiresAt: IsoDate } {
  const opensOn =
    type.timing === "effective-date" && moment.occurredAt > world.currentDate
      ? moment.occurredAt
      : world.currentDate;
  const days = STORY_SCHEDULING.openDays[type.timing] ?? 0;
  return { opensOn, expiresAt: addDays(opensOn, days) };
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
  const unbound = (
    reason: string,
    coverage: StoryCoverageReason | null = null,
  ): SituationBindResult => ({ kind: "unbound", reason, coverage });
  const type = SITUATION_TYPES.find((entry) => entry.key === input.typeKey);
  if (!type) return unbound(`No type ${input.typeKey}`);
  const moment = recordById(storyMoments(world), input.momentId);
  if (!moment) return unbound("No such moment");
  const cause = type.causes.find(
    (entry) => entry.moment && causeMatches(entry.moment, moment.kindKey),
  );
  if (!cause) return unbound(`${type.key} is not opened by ${moment.kindKey}`);
  const player = world.people[input.playerPersonId];
  if (!player) return unbound("No such player");
  if (
    sceneAlreadyBound(
      world,
      player.id,
      SITUATION_FAMILY,
      type.key,
      moment.sourceRecordId,
    )
  )
    return unbound("Already bound");

  const casting = castSituation(world, type, cause, moment);
  if ("reason" in casting) return unbound(casting.reason, "role-unbound");
  const { cast } = casting;
  const roles = presentRoles(type);
  const playerRole = roles.find((role) => cast[role.key]!.includes(player.id));
  if (!playerRole)
    return unbound(
      `${type.key}: the player fills no role, so it stays a journal line`,
    );
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
    return unbound(`${type.key}: nobody else is there`, "role-unbound");
  const speaker = world.people[speakerId]!;
  const place = resolvePlace(world, type, moment);
  if (!place)
    return unbound(
      `${type.key}: no ${type.setting.join(" or ")} on record`,
      "no-place",
    );
  const { opensOn, expiresAt } = openWindow(world, type, moment);

  const facts: Record<string, string> = {
    type: type.key,
    cause: moment.kindKey,
    momentId: moment.id,
    playerRole: playerRole.key,
    opener,
    speakerName: personName(speaker),
    timing: type.timing,
    opensOn,
  };
  if (cause.opening) facts.opening = cause.opening;
  for (const [roleKey, people] of Object.entries(cast))
    if (people.length > 0) facts[`role.${roleKey}`] = people.join(",");

  const binding: SceneBinding = {
    version: 1,
    family: SITUATION_FAMILY,
    variant: type.key,
    playerPersonId: player.id,
    speakerPersonId: speaker.id,
    relationship:
      describePersonContext(world, player.id, speaker.id)?.relationship ?? null,
    place: place.label,
    jurisdictionId: place.jurisdictionId,
    // The sourced scale row the moment was weighed by, such as "Change in
    // residence": the record's own words for what happened.
    request: moment.weight.row,
    sourceEntityIds: [moment.sourceRecordId, moment.id],
    facts,
    knownRecordIds: [moment.sourceRecordId],
    target: null,
    date: opensOn,
    expiresAt,
    staging: stage(world, type, cast, place, player.id, speaker.id),
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
