import { addDays } from "./dates";
import type {
  EntityId,
  IsoDate,
  LawExposureRecord,
  OfficialViewRecord,
  PoliticalSalience,
  PrivateBeliefRecord,
  World,
} from "./types";

/**
 * Reads of people's views of officials (spec 5), kept apart from the
 * reflection that writes them so that the election count, the legislator's
 * decision and the integrity check can read views without loading the writer
 * and its dependencies. See living-world/official-views.ts for how a view is
 * formed.
 *
 * A person's view of an official is a private belief saved through the one
 * belief pipeline, whose subject is the official. Saves from before that
 * kept dated reflection rows (`officialViews`) instead; those still load, and
 * a person who has formed no saved view of that official since is read from
 * them.
 */

// PLACEHOLDER: the points one fully felt law moved a view in the old rows,
// the unit every count below is kept in.
export const OFFICIAL_VIEW_BASE_POINTS = 20;
const BASE_POINTS = OFFICIAL_VIEW_BASE_POINTS;
// PLACEHOLDER: how much one organized group backing a candidate's opponents
// cuts that candidate's support in a town count, within the overall cap.
const GROUP_OPPOSITION = 0.05;
// PLACEHOLDER: a saved view of an official in those points. A view that
// matters little to the person counts a quarter of one fully felt law; one
// central to them, two.
const STANDING_BY_SALIENCE: Readonly<Record<PoliticalSalience, number>> = {
  low: BASE_POINTS / 4,
  moderate: BASE_POINTS / 2,
  high: BASE_POINTS,
  central: BASE_POINTS * 2,
};

/** The stable key of the event of a person reflecting on one law exposure. */
export function officialViewReflectionEventKey(
  exposure: Pick<LawExposureRecord, "id">,
): string {
  return `official-view:reflection:${exposure.id}`;
}

/** A saved view of an official, signed: credit up, blame down, both at once 0. */
export function officialStanding(belief: PrivateBeliefRecord): number {
  const size = STANDING_BY_SALIENCE[belief.salience];
  if (belief.position === "support") return size;
  if (belief.position === "oppose") return -size;
  return 0;
}

interface StandingIndex {
  /** official -> person -> that person's views of them, oldest first. */
  readonly beliefs: ReadonlyMap<
    EntityId,
    ReadonlyMap<EntityId, readonly PrivateBeliefRecord[]>
  >;
  /** official -> person -> old reflection rows, oldest first. */
  readonly legacy: ReadonlyMap<
    EntityId,
    ReadonlyMap<EntityId, readonly OfficialViewRecord[]>
  >;
}

// History lists are replaced, never changed in place, so an index built for
// one pair of lists stays right for as long as both are the world's.
const indexes = new WeakMap<
  readonly PrivateBeliefRecord[],
  {
    readonly rows: readonly OfficialViewRecord[] | undefined;
    readonly index: StandingIndex;
  }
>();

function standingIndex(world: World): StandingIndex {
  const beliefList = world.history.privateBeliefs;
  const rows = world.history.officialViews;
  const cached = indexes.get(beliefList);
  if (cached && cached.rows === rows) return cached.index;
  const beliefs = new Map<EntityId, Map<EntityId, PrivateBeliefRecord[]>>();
  for (const belief of beliefList) {
    if (belief.subject?.kind !== "official") continue;
    const officialId = belief.subject.personId;
    const byPerson = beliefs.get(officialId) ?? new Map();
    beliefs.set(officialId, byPerson);
    byPerson.set(belief.personId, [
      ...(byPerson.get(belief.personId) ?? []),
      belief,
    ]);
  }
  for (const byPerson of beliefs.values())
    for (const list of byPerson.values())
      list.sort(
        (a, b) =>
          a.formedAt.localeCompare(b.formedAt) || a.sequence - b.sequence,
      );
  const legacy = new Map<EntityId, Map<EntityId, OfficialViewRecord[]>>();
  for (const row of rows ?? []) {
    const byPerson = legacy.get(row.officialId) ?? new Map();
    legacy.set(row.officialId, byPerson);
    byPerson.set(row.personId, [...(byPerson.get(row.personId) ?? []), row]);
  }
  const index = { beliefs, legacy };
  indexes.set(beliefList, { rows, index });
  return index;
}

function latestOn(
  list: readonly PrivateBeliefRecord[] | undefined,
  onDate: string,
): PrivateBeliefRecord | null {
  if (!list) return null;
  for (let i = list.length - 1; i >= 0; i -= 1)
    if (list[i]!.formedAt <= onDate) return list[i]!;
  return null;
}

/**
 * One person's view of one official as of a date: their latest saved view,
 * or, in a save from before saved views, the sum of their old reflections.
 */
function standingOn(
  index: StandingIndex,
  personId: EntityId,
  officialId: EntityId,
  onDate: string,
  weigh: (formedOn: IsoDate) => number = () => 1,
): {
  readonly points: number;
  readonly belief: PrivateBeliefRecord | null;
  readonly rows: readonly OfficialViewRecord[];
} {
  const belief = latestOn(index.beliefs.get(officialId)?.get(personId), onDate);
  if (belief)
    return {
      points: officialStanding(belief) * weigh(belief.formedAt),
      belief,
      rows: [],
    };
  const rows = (index.legacy.get(officialId)?.get(personId) ?? []).filter(
    (row) => row.recordedAt <= onDate,
  );
  return {
    points: rows.reduce(
      (sum, row) => sum + row.points * weigh(row.recordedAt),
      0,
    ),
    belief: null,
    rows,
  };
}

/** A person's standing view of an official, today. */
export function viewOfOfficial(
  world: World,
  personId: EntityId,
  officialId: EntityId,
): {
  readonly points: number;
  readonly belief: PrivateBeliefRecord | null;
  readonly rows: readonly OfficialViewRecord[];
} {
  return standingOn(
    standingIndex(world),
    personId,
    officialId,
    world.currentDate,
  );
}

/**
 * The official this person holds the strongest view of today, if any: the
 * view furthest from zero, the later one on a tie.
 */
export function strongestOfficialStanding(
  world: World,
  personId: EntityId,
): {
  readonly officialId: EntityId;
  readonly points: number;
  readonly belief: PrivateBeliefRecord | null;
  readonly rows: readonly OfficialViewRecord[];
} | null {
  const index = standingIndex(world);
  const officials = new Set<EntityId>();
  for (const [officialId, byPerson] of index.beliefs)
    if (byPerson.has(personId)) officials.add(officialId);
  for (const [officialId, byPerson] of index.legacy)
    if (byPerson.has(personId)) officials.add(officialId);
  let best: ReturnType<typeof strongestOfficialStanding> = null;
  let bestSequence = -1;
  for (const officialId of [...officials].sort()) {
    const view = standingOn(index, personId, officialId, world.currentDate);
    if (view.points === 0) continue;
    const sequence = view.belief?.sequence ?? view.rows.at(-1)?.sequence ?? -1;
    if (
      !best ||
      Math.abs(view.points) > Math.abs(best.points) ||
      (Math.abs(view.points) === Math.abs(best.points) &&
        sequence > bestSequence)
    ) {
      best = { officialId, ...view };
      bestSequence = sequence;
    }
  }
  return best;
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
 * support in a town count: 1 when nobody holds a view of them. The sum of
 * residents' views, those formed recently weighted more, is spread over every
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
  const index = standingIndex(world);
  const holders = new Set([
    ...(index.beliefs.get(candidateId)?.keys() ?? []),
    ...(index.legacy.get(candidateId)?.keys() ?? []),
  ]);
  let weighted = 0;
  for (const personId of holders) {
    if (!inTown.has(personId)) continue;
    weighted += standingOn(
      index,
      personId,
      candidateId,
      electionDate,
      (formedOn) => (formedOn >= recentFrom ? RECENT_WEIGHT : 1),
    ).points;
  }
  // Each law-interest group in town that blames the candidate backs their
  // opponents.
  const opposed = groupsAgainst(world, town, candidateId, electionDate).length;
  const shift =
    weighted / (residents * BASE_POINTS) - opposed * GROUP_OPPOSITION;
  return 1 + Math.max(-MAX_SUPPORT_SHIFT, Math.min(MAX_SUPPORT_SHIFT, shift));
}

/**
 * What the people a law reached think of one official: the sum of the views
 * of this official held today by everyone the law reached.
 */
export function netViewOnLaw(
  world: World,
  officialId: EntityId,
  measureId: EntityId,
): number {
  const index = standingIndex(world);
  const holders = [
    ...(index.beliefs.get(officialId)?.keys() ?? []),
    ...(index.legacy.get(officialId)?.keys() ?? []),
  ];
  if (holders.length === 0) return 0;
  const reached = new Set(
    (world.history.lawExposures ?? [])
      .filter((row) => row.measureId === measureId)
      .map((row) => row.personId),
  );
  let net = 0;
  for (const personId of new Set(holders)) {
    const view = standingOn(index, personId, officialId, world.currentDate);
    if (view.belief) {
      if (reached.has(personId)) net += view.points;
      continue;
    }
    // An old save's rows each name the law they were about.
    for (const row of index.legacy.get(officialId)?.get(personId) ?? [])
      if (row.measureId === measureId) net += row.points;
  }
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

/** Everyone in any group formed in this town against a law. */
export function lawInterestMembersInTown(
  world: World,
  town: EntityId,
): ReadonlySet<EntityId> {
  const prefix = `${G}:${town}:`;
  const groups = new Set(
    world.history.organizations
      .filter((row) => row.stableKey.startsWith(prefix))
      .map((row) => row.id),
  );
  const members = new Set<EntityId>();
  if (groups.size === 0) return members;
  for (const row of world.history.organizationParticipations)
    if (groups.has(row.organizationId)) members.add(row.personId);
  return members;
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
    const index = standingIndex(world);
    let net = 0;
    for (const personId of members)
      net += standingOn(index, personId, officialId, onDate).points;
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
