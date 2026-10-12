import type {
  EntityId,
  IsoDate,
  PoliticalSalience,
  PrivateBeliefRecord,
  OfficialViewRecord,
  Organization,
  OrganizationParticipation,
} from "../../simulation/types";
import { addDays } from "../elections/calendar";
export interface OfficialStandingFacts {
  readonly onDate: IsoDate;
  readonly beliefs: readonly PrivateBeliefRecord[];
  readonly legacyViews: readonly OfficialViewRecord[];
  readonly personOrder: readonly EntityId[];
  readonly people: Readonly<
    Record<EntityId, { readonly homeJurisdictionId: EntityId }>
  >;
  readonly organizations: readonly Organization[];
  readonly participations: readonly OrganizationParticipation[];
}
export const OFFICIAL_VIEW_BASE_POINTS = 20;

const BASE_POINTS = OFFICIAL_VIEW_BASE_POINTS;

const GROUP_OPPOSITION = 0.05;

const STANDING_BY_SALIENCE: Readonly<Record<PoliticalSalience, number>> = {
  low: BASE_POINTS / 4,
  moderate: BASE_POINTS / 2,
  high: BASE_POINTS,
  central: BASE_POINTS * 2,
};

export function officialStanding(belief: PrivateBeliefRecord): number {
  const size = STANDING_BY_SALIENCE[belief.salience];
  if (belief.position === "support") return size;
  if (belief.position === "oppose") return -size;
  return 0;
}

interface StandingIndex {
  readonly beliefs: ReadonlyMap<
    EntityId,
    ReadonlyMap<EntityId, readonly PrivateBeliefRecord[]>
  >;
  readonly legacy: ReadonlyMap<
    EntityId,
    ReadonlyMap<EntityId, readonly OfficialViewRecord[]>
  >;
}

function standingIndex(facts: OfficialStandingFacts): StandingIndex {
  const beliefList = facts.beliefs;
  const rows = facts.legacyViews;

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

  return index;
}

function latestOn(
  list: readonly PrivateBeliefRecord[] | undefined,
  onDate: string,
  sequenceExclusive = Infinity,
): PrivateBeliefRecord | null {
  if (!list) return null;
  for (let i = list.length - 1; i >= 0; i -= 1)
    if (list[i]!.formedAt <= onDate && list[i]!.sequence < sequenceExclusive)
      return list[i]!;
  return null;
}

function standingOn(
  index: StandingIndex,
  personId: EntityId,
  officialId: EntityId,
  onDate: string,
  weigh: (formedOn: IsoDate) => number = () => 1,
  sequenceExclusive = Infinity,
): {
  readonly points: number;
  readonly belief: PrivateBeliefRecord | null;
  readonly rows: readonly OfficialViewRecord[];
} {
  const belief = latestOn(
    index.beliefs.get(officialId)?.get(personId),
    onDate,
    sequenceExclusive,
  );
  if (belief)
    return {
      points: officialStanding(belief) * weigh(belief.formedAt),
      belief,
      rows: [],
    };
  const rows = (index.legacy.get(officialId)?.get(personId) ?? []).filter(
    (row) => row.recordedAt <= onDate && row.sequence < sequenceExclusive,
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

export function strongestOfficialStanding(
  facts: OfficialStandingFacts,
  personId: EntityId,
): {
  readonly officialId: EntityId;
  readonly points: number;
  readonly belief: PrivateBeliefRecord | null;
  readonly rows: readonly OfficialViewRecord[];
} | null {
  const index = standingIndex(facts);
  const officials = new Set<EntityId>();
  for (const [officialId, byPerson] of index.beliefs)
    if (byPerson.has(personId)) officials.add(officialId);
  for (const [officialId, byPerson] of index.legacy)
    if (byPerson.has(personId)) officials.add(officialId);
  let best: ReturnType<typeof strongestOfficialStanding> = null;
  let bestSequence = -1;
  for (const officialId of [...officials].sort()) {
    const view = standingOn(index, personId, officialId, facts.onDate);
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

const RECENT_DAYS = 183;

const RECENT_WEIGHT = 1.5;

const MAX_SUPPORT_SHIFT = 0.5;

export function townSupportFromViews(
  facts: OfficialStandingFacts,
  town: EntityId,
  candidateId: EntityId,
  electionDate: IsoDate,
): number {
  let residents = 0;
  const inTown = new Set<EntityId>();
  for (const personId of facts.personOrder) {
    const person = facts.people[personId];
    if (!person || person.homeJurisdictionId !== town) continue;
    inTown.add(personId);
    residents += 1;
  }
  if (residents === 0) return 1;
  const recentFrom = addDays(electionDate, -RECENT_DAYS);
  const index = standingIndex(facts);
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
  const opposed = groupsAgainst(facts, town, candidateId, electionDate).length;
  const shift =
    weighted / (residents * BASE_POINTS) - opposed * GROUP_OPPOSITION;
  return 1 + Math.max(-MAX_SUPPORT_SHIFT, Math.min(MAX_SUPPORT_SHIFT, shift));
}

const G = "law-interest";

export function lawInterestMembers(
  facts: OfficialStandingFacts,
  organizationId: EntityId,
): readonly EntityId[] {
  return [
    ...new Set(
      facts.participations
        .filter((row) => row.organizationId === organizationId)
        .map((row) => row.personId),
    ),
  ].sort();
}

export function groupsAgainst(
  facts: OfficialStandingFacts,
  town: EntityId | null,
  officialId: EntityId,
  onDate: string = facts.onDate,
): readonly {
  readonly organizationId: EntityId;
  readonly members: number;
}[] {
  const groups = facts.organizations.filter(
    (row) =>
      row.stableKey.startsWith(`${G}:`) &&
      row.formedAt <= onDate &&
      (town === null || row.stableKey.startsWith(`${G}:${town}:`)),
  );
  const result: {
    organizationId: EntityId;
    members: number;
  }[] = [];
  for (const group of groups) {
    const members = new Set(lawInterestMembers(facts, group.id));
    if (members.size === 0) continue;
    const index = standingIndex(facts);
    let net = 0;
    for (const personId of members)
      net += standingOn(index, personId, officialId, onDate).points;
    if (net < 0)
      result.push({ organizationId: group.id, members: members.size });
  }
  return result;
}

// stopgapId: "SG-P14-legislatures-official-membership-history"
