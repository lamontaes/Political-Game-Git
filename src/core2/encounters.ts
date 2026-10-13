/**
 * P15 part 5: meeting new people through real encounters (owner's ruling,
 * October 10, 2026). A visit to someone meets the people who live with them;
 * joining a group meets its other members. Each meeting is a dated fact naming
 * the place and the other person, and the first tie holds the hours spent
 * together, so closeness grows only through later contact. Starting a job
 * during play meets the new workgroup at that employer.
 */
import data from "./data/encounters.json" with { type: "json" };
import type { CoreAPI, CoreState, JobInput } from "./types";

export const ENCOUNTERS = data;

/** People who left town (the moves engine) or are kin elsewhere. */
const INACTIVE_TIER = "husk";

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

/**
 * A new hire's workgroup at the employer, by the work itself: coworkers with
 * the same title first, then the same occupation group, as many as a
 * workgroup holds at the opening.
 */
export function workgroupOf(
  api: CoreAPI,
  personId: string,
  jobId: string,
): string[] {
  const core = api.state as CoreState;
  const job = core.jobs.get(jobId);
  if (!job) return [];
  const group = (code?: string) => code?.slice(0, api.parameter("two")) ?? "";
  const closeness = (other: Readonly<JobInput>) =>
    other.title === job.title
      ? api.parameter("zero")
      : group(other.occupationClassification) ===
          group(job.occupationClassification)
        ? api.parameter("one")
        : api.parameter("two");
  const peers: { personId: string; rank: number }[] = [];
  for (const id of core.finance.jobsByOrganization.get(job.organizationId) ??
    []) {
    const other = core.jobs.get(id);
    if (!other || id === jobId || other.endsAt !== undefined) continue;
    if (other.personId === personId) continue;
    const person = core.people.get(other.personId);
    if (!person?.alive || person.tier === INACTIVE_TIER) continue;
    peers.push({ personId: other.personId, rank: closeness(other) });
  }
  return peers
    .sort((a, b) => a.rank - b.rank || a.personId.localeCompare(b.personId))
    .slice(
      0,
      Math.max(
        api.parameter("zero"),
        api.parameter("openingCoworkerGroupSize") - api.parameter("one"),
      ),
    )
    .map((row) => row.personId);
}

/** The coworkers of a new hire's workgroup the hire did not know, met at the
 * employer on the first day. */
export function meetAtWork(
  api: CoreAPI,
  personId: string,
  jobId: string,
  sourceId: string,
): number {
  api.stopgap(data.stopgapId);
  const core = api.state as CoreState;
  const person = core.people.get(personId);
  const job = core.jobs.get(jobId);
  if (!person || !job) return api.parameter("zero");
  const place = core.organizations.get(job.organizationId)?.placeId;
  let met = api.parameter("zero");
  for (const id of workgroupOf(api, personId, jobId)) {
    if (person.knownIds.has(id)) continue;
    if (
      api.meet(personId, id, {
        placeId: place ?? person.placeId,
        sourceId,
        cause: data.causes.metAtWork,
        hours: job.hoursDaily,
      })
    )
      met += api.parameter("one");
  }
  return met;
}

/**
 * People at a public meeting who meet there, from the meeting's own record: a
 * town hall's attendees meet its host; at a hearing each speaker meets the
 * speakers just before and after them. No one meets the whole room.
 */
export function meetAtMeeting(
  api: CoreAPI,
  event: Readonly<{
    id: string;
    kind: string;
    placeId: string;
    personIds: readonly string[];
  }>,
): number {
  api.stopgap(data.stopgapId);
  const people = event.personIds.filter(
    (id) => api.state.people.get(id)?.alive,
  );
  const pairs: [string, string][] =
    event.kind === data.meetingEvents.townHall
      ? people
          .slice(api.parameter("one"))
          .map((id) => [people[api.parameter("zero")]!, id])
      : people.slice(api.parameter("one")).map((id, at) => [people[at]!, id]);
  let met = api.parameter("zero");
  for (const [a, b] of pairs) {
    if (a === b) continue;
    if (
      api.meet(a, b, {
        placeId: event.placeId || api.state.people.get(a)!.placeId,
        sourceId: event.id,
        cause: data.causes.metAtMeeting,
        hours: data.parameters.encounterMeetingHours.value,
      })
    )
      met += api.parameter("one");
  }
  return met;
}
