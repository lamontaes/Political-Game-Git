/**
 * P15 part 5: meeting new people through real encounters (owner's ruling,
 * October 10, 2026). A visit to someone meets the people who live with them;
 * joining a group meets its other members. Each meeting is a dated fact naming
 * the place and the other person, and the first tie holds the hours spent
 * together, so closeness grows only through later contact. A new hire
 * meets the coworkers already working there; those who attend a town hall
 * meet the person holding it.
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
  api.stopgap(data.stopgapId);
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

/** The group's other members, met on joining it. */
export function meetAtJoin(
  api: CoreAPI,
  personId: string,
  organizationId: string,
  hours: number,
): number {
  api.stopgap(data.stopgapId);
  const person = api.state.people.get(personId);
  if (!person) return api.parameter("zero");
  const place =
    api.state.publicOrganizations.get(organizationId)?.placeId ??
    api.state.organizations.get(organizationId)?.placeId ??
    person.placeId;
  let met = api.parameter("zero");
  for (const row of api.state.memberships.values()) {
    if (row.organizationId !== organizationId || row.personId === personId)
      continue;
    const member = api.state.people.get(row.personId);
    if (!member?.alive || person.knownIds.has(member.id)) continue;
    if (
      api.meet(personId, member.id, {
        placeId: place,
        sourceId: `membership:${organizationId}:${personId}`,
        cause: data.causes.metInGroup,
        hours,
      })
    )
      met += api.parameter("one");
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
  api.stopgap(data.stopgapId);
  const person = api.state.people.get(personId);
  if (!person) return api.parameter("zero");
  const place =
    api.state.organizations.get(organizationId)?.placeId ?? person.placeId;
  let met = api.parameter("zero");
  for (const id of coworkerIds) {
    const coworker = api.state.people.get(id);
    if (id === personId || !coworker?.alive || person.knownIds.has(id))
      continue;
    if (
      api.meet(personId, id, {
        placeId: place,
        sourceId,
        cause: data.causes.metAtWork,
        hours,
      })
    )
      met += api.parameter("one");
  }
  return met;
}

/** The people at a town hall who did not know its host, met there; the hours
 * are a civic act's hours. */
export function meetAtMeeting(
  api: CoreAPI,
  hostId: string,
  attendeeIds: readonly string[],
  meetingId: string,
  placeId: string,
): number {
  api.stopgap(data.stopgapId);
  const host = api.state.people.get(hostId);
  if (!host?.alive) return api.parameter("zero");
  let met = api.parameter("zero");
  for (const id of attendeeIds) {
    const attendee = api.state.people.get(id);
    if (id === hostId || !attendee?.alive || attendee.knownIds.has(hostId))
      continue;
    if (
      api.meet(id, hostId, {
        placeId,
        sourceId: meetingId,
        cause: data.causes.metAtMeeting,
        hours: api.parameter("civicHours"),
      })
    )
      met += api.parameter("one");
  }
  return met;
}
