/**
 * P15 part 5: meeting new people during play (owner ruling on #3956).
 *
 * People meet only at a real shared moment that the simulation already
 * records: a visit meets the people the host lives with, joining a group
 * meets its members and staff, and an organized meeting meets the others who
 * come. Each side gets a dated fact naming the place and the other person,
 * and the pair gets a first tie of the hours they spent together, so
 * closeness grows only through later contact. Nothing here rolls a die: who
 * meets follows who lives where, who belongs to what and who shares a cause.
 */
import data from "./data/encounters.json" with { type: "json" };
import { CLOSENESS } from "./closeness";
import { OPENING_KIN } from "./opening-kin";
import type {
  CoreAPI,
  PastFact,
  PersonId,
  PersonState,
  PlaceId,
  Relationship,
  Source,
} from "./types";

export const ENCOUNTERS = data;

interface Encounter {
  kind: string;
  placeId: PlaceId;
  hours: number;
  relationshipKind: Relationship["kind"];
  reasonKey: string;
  /** The act or event that brought them together. */
  sourceRecordId: string;
  /** The household or group where they met. */
  settingId: string;
  summary: (self: PersonState, other: PersonState) => string;
}

const fullName = (person: PersonState) =>
  [person.givenName, person.familyName].join(" ");

/** Someone alive today. Relatives outside town (kin tier) can be met too. */
function present(api: CoreAPI, id: PersonId): PersonState | undefined {
  const person = api.state.people.get(id);
  return person?.alive ? person : undefined;
}

/** Someone the simulation runs day to day, who makes their own choices. */
function resident(api: CoreAPI, id: PersonId): PersonState | undefined {
  const person = present(api, id);
  return person && person.tier !== OPENING_KIN.kinTier ? person : undefined;
}

function fact(
  api: CoreAPI,
  self: PersonState,
  other: PersonState,
  encounter: Encounter,
): PastFact {
  const date = api.state.date;
  return {
    id: `${self.id}:${data.version}:${encounter.kind}:${date}:${other.id}`,
    date,
    kind: `${data.factKindPrefix}${encounter.kind}`,
    summary: encounter.summary(self, other),
    source: {
      ...data.source,
      tag: data.source.tag as Source["tag"],
      asOf: date,
    },
    facts: {
      otherPersonId: other.id,
      placeId: encounter.placeId,
      hours: String(encounter.hours),
      sourceRecordId: encounter.sourceRecordId,
      setting: encounter.settingId,
    },
  };
}

/**
 * Two people meet when they have no tie yet. Returns whether they met; a pair
 * that already has a tie is not new to each other.
 */
export function meet(
  api: CoreAPI,
  left: PersonState,
  right: PersonState,
  encounter: Encounter,
): boolean {
  if (left.id === right.id) return false;
  if (api.state.relationships.has([left.id, right.id].sort().join(":")))
    return false;
  api.meetPerson(left.id, right.id, fact(api, left, right, encounter));
  api.meetPerson(right.id, left.id, fact(api, right, left, encounter));
  api.relationship(
    left.id,
    right.id,
    encounter.relationshipKind,
    encounter.hours,
    {
      key: encounter.reasonKey,
      basisRecordIds: [encounter.sourceRecordId, encounter.settingId],
    },
  );
  return true;
}

/** Encounter 1: a visit meets the people the host lives with. */
export function meetHousemates(
  api: CoreAPI,
  visitorId: PersonId,
  hostId: PersonId,
  hours: number,
  actId: string,
): void {
  const visitor = resident(api, visitorId);
  const host = api.state.people.get(hostId);
  if (!visitor || !host || host.householdId === visitor.householdId) return;
  const household = api.state.households.get(host.householdId);
  if (!household) return;
  api.stopgap(data.visit.stopgapId);
  const encounter: Encounter = {
    kind: data.visit.kind,
    placeId: household.placeId,
    hours,
    relationshipKind: data.visit.relationshipKind as Relationship["kind"],
    reasonKey: CLOSENESS.reasonKeys.metVisiting,
    sourceRecordId: actId,
    settingId: household.id,
    summary: (self, other) =>
      (self.id === visitor.id
        ? data.visit.visitorSummaryTemplate
        : data.visit.housemateSummaryTemplate
      )
        .replace("{otherName}", fullName(other))
        .replace("{hostName}", fullName(host)),
  };
  for (const id of household.memberIds) {
    if (id === hostId || id === visitorId) continue;
    const housemate = present(api, id);
    if (housemate) meet(api, visitor, housemate, encounter);
  }
}

/** The people who belong to a group: members who joined, and its staff. */
function membersOf(api: CoreAPI, organizationId: string): PersonId[] {
  const ids = new Set<PersonId>();
  for (const id of api.state.membershipsByOrganization.get(organizationId) ??
    [])
    ids.add(api.state.memberships.get(id)!.personId);
  for (const row of api.state.publicOrganizations.get(organizationId)?.staff ??
    [])
    ids.add(row.personId);
  return [...ids];
}

/** Encounter 2a: joining a group meets its members and staff. */
export function meetGroup(
  api: CoreAPI,
  joinerId: PersonId,
  organizationId: string,
  hours: number,
  actId: string,
): void {
  const joiner = resident(api, joinerId);
  const group = api.state.publicOrganizations.get(organizationId);
  if (!joiner || !group) return;
  const encounter: Encounter = {
    kind: data.group.kind,
    placeId: group.placeId,
    hours,
    relationshipKind: data.group.relationshipKind as Relationship["kind"],
    reasonKey: CLOSENESS.reasonKeys.metJoining,
    sourceRecordId: actId,
    settingId: group.id,
    summary: (self, other) =>
      (self.id === joiner.id
        ? data.group.joinerSummaryTemplate
        : data.group.memberSummaryTemplate
      )
        .replace("{otherName}", fullName(other))
        .replace("{groupName}", group.name),
  };
  for (const id of membersOf(api, organizationId)) {
    const member = present(api, id);
    if (member) meet(api, joiner, member, encounter);
  }
}

/**
 * Encounter 2b: an organized meeting meets the others who come. Those who
 * come are the organizer's relatives and acquaintances in town who hold a
 * cause on the same topic, and the members of the group that hosts it.
 */
export function meetAtGathering(
  api: CoreAPI,
  organizerId: PersonId,
  placeOrganizationId: string,
  topic: string,
  hours: number,
  eventId: string,
): number {
  const organizer = resident(api, organizerId);
  const venue = api.state.publicOrganizations.get(placeOrganizationId);
  if (!organizer || !venue) return api.parameter("zero");
  api.stopgap(data.meeting.stopgapId);
  const local = (person: PersonState) =>
    person.placeId === organizer.placeId ||
    (person.countyId !== undefined && person.countyId === organizer.countyId);
  const shares = (person: PersonState) =>
    [...person.drives.values()].some((drive) => drive.topic === topic);
  const attendees = new Map<PersonId, PersonState>([[organizer.id, organizer]]);
  for (const id of new Set([...organizer.familyIds, ...organizer.knownIds])) {
    const person = resident(api, id);
    if (person && local(person) && shares(person))
      attendees.set(person.id, person);
  }
  for (const id of membersOf(api, venue.id)) {
    const person = present(api, id);
    if (person) attendees.set(person.id, person);
  }
  const encounter: Encounter = {
    kind: data.meeting.kind,
    placeId: venue.placeId,
    hours,
    relationshipKind: data.meeting.relationshipKind as Relationship["kind"],
    reasonKey: CLOSENESS.reasonKeys.metAtMeeting,
    sourceRecordId: eventId,
    settingId: venue.id,
    summary: (_self, other) =>
      data.meeting.summaryTemplate
        .replace("{otherName}", fullName(other))
        .replace("{placeName}", venue.name),
  };
  const people = [...attendees.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const one = api.parameter("one");
  let met = api.parameter("zero");
  for (let left = api.parameter("zero"); left < people.length; left += one)
    for (let right = left + one; right < people.length; right += one)
      if (meet(api, people[left]!, people[right]!, encounter)) met += one;
  return met;
}
