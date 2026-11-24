/**
 * P15 part 5: meeting new people through real encounters (owner's ruling,
 * October 10, 2026). A visit to someone meets the people who live with them;
 * joining a group meets its other members. Each meeting is a dated fact naming
 * the place and the other person, and the first tie holds the hours spent
 * together, so closeness grows only through later contact. A new hire
 * meets the coworkers already working there. A resident who speaks at public comment meets the members of the
 * body who hear them. Two people who talk meet each
 * other.
 */
import data from "./data/encounters.json" with { type: "json" };
import type { CoreAPI } from "./types";

export const ENCOUNTERS = data;

/** The people at the visited person's home whom the visitor did not know;
 * the meeting names that home. */
export function meetAtVisit(
  api: CoreAPI,
  visitorId: string,
  hostId: string,
  hours: number,
): number {
  const host = api.state.people.get(hostId);
  const visitor = api.state.people.get(visitorId);
  if (!host || !visitor) return api.parameter("zero");
  let met = api.parameter("zero");
  for (const id of api.state.households.get(host.householdId)?.memberIds ??
    []) {
    if (id === visitorId || id === hostId) continue;
    const resident = api.state.people.get(id);
    if (!resident?.alive || visitor.knownIds.has(id)) continue;
    if (
      api.meet(visitorId, id, {
        placeId: host.householdId,
        sourceId: `visit:${api.state.date}:${visitorId}:${hostId}`,
        cause: data.causes.metOnVisit,
        hours,
      })
    )
      met += api.parameter("one");
  }
  return met;
}

/**
 * How many of a group's or workplace's other people one comes to know by name:
 * a power law of its size, never more than the others in it (no dice).
 */
export function knownAmong(api: CoreAPI, others: number): number {
  const size = others + api.parameter("one");
  return Math.min(
    others,
    api.parameter("groupKnownCap"),
    Math.ceil(
      api.parameter("groupKnownScale") *
        size ** api.parameter("groupKnownExponent"),
    ),
  );
}

/**
 * The group's other members, met on joining it: the ones who joined nearest
 * the same time (they sit through the same meetings), up to how many people
 * a group that size lets one know (`knownAmong`).
 */
export function meetAtJoin(
  api: CoreAPI,
  personId: string,
  organizationId: string,
  hours: number,
): number {
  const person = api.state.people.get(personId);
  if (!person) return api.parameter("zero");
  const place =
    api.state.publicOrganizations.get(organizationId)?.placeId ??
    api.state.organizations.get(organizationId)?.placeId ??
    person.placeId;
  let met = api.parameter("zero");
  const mine = api.state.memberships.get(`${personId}:${organizationId}`);
  const others = [...api.state.memberships.values()].filter(
    (row) => row.organizationId === organizationId && row.personId !== personId,
  );
  let room = knownAmong(api, others.length);
  const joined = (at: string) => Date.parse(at);
  const anchor = joined(mine?.joinedAt ?? api.state.date);
  others.sort(
    (a, b) =>
      Math.abs(joined(a.joinedAt) - anchor) -
        Math.abs(joined(b.joinedAt) - anchor) ||
      (a.personId < b.personId ? -1 : a.personId > b.personId ? 1 : 0),
  );
  for (const row of others) {
    if (room <= api.parameter("zero")) break;
    const member = api.state.people.get(row.personId);
    if (!member?.alive) continue;
    if (person.knownIds.has(member.id)) {
      room -= api.parameter("one");
      continue;
    }
    if (
      api.meet(personId, member.id, {
        placeId: place,
        sourceId: `membership:${organizationId}:${personId}`,
        cause: data.causes.metInGroup,
        hours,
      })
    ) {
      met += api.parameter("one");
      room -= api.parameter("one");
    }
  }
  return met;
}

/** The coworkers already at the employer, met by a new hire on the first shift. */
export function meetAtWork(
  api: CoreAPI,
  personId: string,
  organizationId: string,
  coworkerIds: readonly string[],
  hours: number,
  sourceId: string,
): number {
  const person = api.state.people.get(personId);
  if (!person) return api.parameter("zero");
  const place =
    api.state.organizations.get(organizationId)?.placeId ?? person.placeId;
  let met = api.parameter("zero");
  // The caller lists coworkers nearest first (same role, then the rest); a
  // hire comes to know as many as a workplace that size lets one.
  let room = knownAmong(api, coworkerIds.length);
  for (const id of coworkerIds) {
    if (room <= api.parameter("zero")) break;
    const coworker = api.state.people.get(id);
    if (id === personId || !coworker?.alive) continue;
    if (person.knownIds.has(id)) {
      room -= api.parameter("one");
      continue;
    }
    if (
      api.meet(personId, id, {
        placeId: place,
        sourceId,
        cause: data.causes.metAtWork,
        hours,
      })
    ) {
      met += api.parameter("one");
      room -= api.parameter("one");
    }
  }
  return met;
}

/**
 * The people at a meeting who did not know the one they came to hear, met by
 * name: each full person among `attendeeIds` meets `hostId` (a town hall's
 * host, a seated member of the body), and the first tie holds `hours`, the
 * time they sat in the room. A resident still in the counted population is
 * not met (two-level population): the meeting leaves their record as it is
 * until the player meets or clicks them. Returns how many were newly met.
 */
export function meetAtMeeting(
  api: CoreAPI,
  hostId: string,
  attendeeIds: readonly string[],
  placeId: string,
  sourceId: string,
  cause: string,
  hours: number,
): number {
  const host = api.state.people.get(hostId);
  if (!host?.alive) return api.parameter("zero");
  let met = api.parameter("zero");
  for (const id of attendeeIds) {
    const attendee = api.state.people.get(id);
    if (id === hostId || !attendee?.alive) continue;
    if (api.meet(id, hostId, { placeId, sourceId, cause, hours }))
      met += api.parameter("one");
  }
  return met;
}

/**
 * The person the player talked to, met once the talk really opens (a line is
 * said): each now knows the other by name, and the first tie holds the talk's
 * own time. Nobody else in the room is met by it. True when they had not met.
 */
export function meetInTalk(
  api: CoreAPI,
  playerId: string,
  otherId: string,
  placeId: string,
  hours: number,
  sourceId: string,
): boolean {
  const player = api.state.people.get(playerId);
  const other = api.state.people.get(otherId);
  if (!player || !other?.alive || playerId === otherId) return false;
  if (player.knownIds.has(otherId) && other.knownIds.has(playerId))
    return false;
  return api.meet(playerId, otherId, {
    placeId,
    sourceId,
    cause: data.causes.metInTalk,
    hours,
  });
}
