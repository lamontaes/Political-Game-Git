import { addDays } from "./dates";
import type { EntityId, IsoDate, OfficialViewRecord, World } from "./types";

/**
 * Reads of people's views of officials (spec 5), kept apart from the
 * reflection that writes them so that the election count, the legislator's
 * decision and the integrity check can read views without loading the writer
 * and its dependencies. See living-world/official-views.ts for how a view is
 * formed.
 */

// PLACEHOLDER: the points one fully felt law moves a view.
export const OFFICIAL_VIEW_BASE_POINTS = 20;
const BASE_POINTS = OFFICIAL_VIEW_BASE_POINTS;
// PLACEHOLDER: how much one organized group backing a candidate's opponents
// cuts that candidate's support in a town count, within the overall cap.
const GROUP_OPPOSITION = 0.05;

/** A person's standing view of an official: the sum of every reflection. */
export function viewOfOfficial(
  world: World,
  personId: EntityId,
  officialId: EntityId,
): { readonly points: number; readonly rows: readonly OfficialViewRecord[] } {
  const rows = (world.history.officialViews ?? []).filter(
    (row) => row.personId === personId && row.officialId === officialId,
  );
  return { points: rows.reduce((sum, row) => sum + row.points, 0), rows };
}

/**
 * Saved views must reconcile: real people, an exposure of this person to this
 * law that came first, and points that are the sum of their reasons.
 */
export function assertOfficialViewIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const exposures = new Map(
    (world.history.lawExposures ?? []).map((row) => [row.id, row]),
  );
  const keys = new Set<string>();
  for (const row of world.history.officialViews ?? []) {
    if (ids.has(row.id)) throw new Error(`Duplicate entity ID: ${row.id}`);
    ids.add(row.id);
    if (keys.has(row.stableKey))
      throw new Error("Duplicate official view identity.");
    keys.add(row.stableKey);
    if (!world.people[row.personId] || !world.people[row.officialId])
      throw new Error("An official view names a person not in the world.");
    const exposure = exposures.get(row.exposureId);
    if (
      !exposure ||
      exposure.personId !== row.personId ||
      exposure.measureId !== row.measureId ||
      exposure.sequence >= row.sequence
    )
      throw new Error("An official view must follow its law exposure.");
    if (
      row.reasons.length === 0 ||
      row.points !== row.reasons.reduce((sum, reason) => sum + reason.points, 0)
    )
      throw new Error("An official view's points are the sum of its reasons.");
  }
}

// PLACEHOLDER, approved provisional: an election weighs recent exposures more.
// No half-life was found, so a view formed in the half year before the vote
// counts half again as much.
const RECENT_DAYS = 183;
const RECENT_WEIGHT = 1.5;
// PLACEHOLDER: the most a town's views can raise or cut a candidate's support.
const MAX_SUPPORT_SHIFT = 0.5;

/**
 * What a town's residents think of a candidate, as a multiplier on their
 * support in a town count: 1 when nobody has reflected on anything they did.
 * The sum of residents' views, recent ones weighted more, is spread over every
 * grown resident the game has written for the town, so a view held by a few
 * moves the count a little and one held by many moves it a lot.
 */
export function townSupportFromViews(
  world: World,
  town: EntityId,
  candidateId: EntityId,
  electionDate: IsoDate,
): number {
  let residents = 0;
  const inTown = new Set<EntityId>();
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person || person.homeJurisdictionId !== town) continue;
    inTown.add(personId);
    residents += 1;
  }
  if (residents === 0) return 1;
  const recentFrom = addDays(electionDate, -RECENT_DAYS);
  let weighted = 0;
  for (const row of world.history.officialViews ?? []) {
    if (row.officialId !== candidateId || !inTown.has(row.personId)) continue;
    if (row.recordedAt > electionDate) continue;
    weighted += row.points * (row.recordedAt >= recentFrom ? RECENT_WEIGHT : 1);
  }
  // Each law-interest group in town that blames the candidate backs their
  // opponents.
  const opposed = groupsAgainst(world, town, candidateId, electionDate).length;
  const shift =
    weighted / (residents * BASE_POINTS) - opposed * GROUP_OPPOSITION;
  return 1 + Math.max(-MAX_SUPPORT_SHIFT, Math.min(MAX_SUPPORT_SHIFT, shift));
}

/**
 * What the people a law reached made of one official's part in it: the net
 * points of every view of this official formed about this law.
 */
export function netViewOnLaw(
  world: World,
  officialId: EntityId,
  measureId: EntityId,
): number {
  let net = 0;
  for (const row of world.history.officialViews ?? [])
    if (row.officialId === officialId && row.measureId === measureId)
      net += row.points;
  return net;
}

// Organized interests: reads of the groups living-world/law-interest-groups.ts
// forms.
const G = "law-interest";

export function lawInterestGroupKey(town: EntityId, measureId: EntityId) {
  return `${G}:${town}:${measureId}`;
}

/** The group formed in this town against this law, if there is one. */
export function lawInterestGroup(
  world: World,
  town: EntityId,
  measureId: EntityId,
): EntityId | null {
  const key = lawInterestGroupKey(town, measureId);
  return (
    world.history.organizations.find((row) => row.stableKey === key)?.id ?? null
  );
}

/** Everyone active in the group. */
export function lawInterestMembers(
  world: World,
  organizationId: EntityId,
): readonly EntityId[] {
  return [
    ...new Set(
      world.history.organizationParticipations
        .filter((row) => row.organizationId === organizationId)
        .map((row) => row.personId),
    ),
  ].sort();
}

/**
 * The law-interest groups in a town whose members, on balance, blame this
 * official. Each one backs the official's opponents.
 */
export function groupsAgainst(
  world: World,
  town: EntityId | null,
  officialId: EntityId,
  onDate: string = world.currentDate,
): readonly { readonly organizationId: EntityId; readonly members: number }[] {
  const groups = world.history.organizations.filter(
    (row) =>
      row.stableKey.startsWith(`${G}:`) &&
      row.formedAt <= onDate &&
      (town === null || row.stableKey.startsWith(`${G}:${town}:`)),
  );
  const result: { organizationId: EntityId; members: number }[] = [];
  for (const group of groups) {
    const members = new Set(lawInterestMembers(world, group.id));
    if (members.size === 0) continue;
    let net = 0;
    for (const view of world.history.officialViews ?? [])
      if (
        view.officialId === officialId &&
        members.has(view.personId) &&
        view.recordedAt <= onDate
      )
        net += view.points;
    if (net < 0)
      result.push({ organizationId: group.id, members: members.size });
  }
  return result;
}

/** The measure a law-interest group was formed against. */
export function lawInterestMeasure(
  world: World,
  organizationId: EntityId,
): EntityId | null {
  const key = world.history.organizations.find(
    (row) => row.id === organizationId,
  )?.stableKey;
  if (!key?.startsWith(`${G}:`)) return null;
  return (key.split(":").at(-1) as EntityId | undefined) ?? null;
}

/** Members of every law-interest group formed against this law. */
export function membersAgainstLaw(world: World, measureId: EntityId): number {
  let members = 0;
  for (const group of world.history.organizations)
    if (
      group.stableKey.startsWith(`${G}:`) &&
      group.stableKey.endsWith(`:${measureId}`)
    )
      members += lawInterestMembers(world, group.id).length;
  return members;
}
