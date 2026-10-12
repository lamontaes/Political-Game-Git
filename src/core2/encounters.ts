/**
 * P15 part 5: meeting new people through real encounters (owner's ruling,
 * October 10, 2026). A visit to someone meets the people who live with them;
 * joining a group meets its other members. Each meeting is a dated fact naming
 * the place and the other person, and the first tie holds the hours spent
 * together, so closeness grows only through later contact. A new coworker
 * comes with jobs changing during play (M1).
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
