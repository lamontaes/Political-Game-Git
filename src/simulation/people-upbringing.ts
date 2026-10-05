import {
  drawFamilyShape,
  recordedFamilyEstimates,
  type RecordedFamilySample,
} from "./family-shape";
import { childhoodRecordEntries } from "./childhood-record";
import {
  indexFollowingAppends,
  recordById,
  recordsByStringField,
} from "./history-index";
import { dateAtAge, daysBetween } from "./dates";
import { townJobRate, townPayPercentile } from "./living-world/town-pay";
import { stableHash } from "./ids";
import {
  annualPovertyLineMinor,
  recordedMonthlyPayByPerson,
} from "./household-pay";
import { homeStateKey } from "./state-jurisdiction-id";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import type { EntityId, IsoDate, World } from "./types";
import type { PeopleTrait, TraitValue } from "./people-trait-definitions";
import type { TraitLifePart } from "./personality-trait-registry";
import { isPersonAliveAt } from "./vitality-integrity";

/** Broad periods preserve change without pretending to know annual household accounts. */
export type UpbringingPeriod = "early-childhood" | "adolescence";
export type FamilyMoney = "secure" | "strained" | "severe-scarcity";
export type HomeStability = "stable" | "some-moves" | "disrupted";
export type CaregivingClimate =
  | "protective-reliable"
  | "consistent-firm"
  | "inconsistent"
  | "high-conflict"
  | "harsh"
  // A person born in play: no household record says how their caregivers
  // treated them yet, so nothing is drawn and no tendency is read from it.
  | "not-recorded"
  | "estimated-care";
export type UpbringingEvent =
  | "parent-death"
  | "parent-separation"
  | "serious-illness"
  | "family-illness-care"
  | "law-allegation"
  | "adjudicated-law-trouble"
  | "harsh-authority-treatment";
export type SchoolExperience =
  | "reliable-support"
  | "earned-success"
  | "supported-setbacks"
  | "ridicule-or-exclusion"
  | "peer-belonging"
  | "bullying";
export type FirstJobExperience =
  | "none"
  | "reliable-supervision"
  | "autonomy"
  | "public-contact"
  | "precarious";

export interface UpbringingSource {
  readonly kind: "public-data" | "world-record" | "game-profile";
  readonly key: string;
  readonly note: string;
}

export interface PersonUpbringing {
  readonly personId: EntityId;
  readonly familyContext?: ChildhoodFamilyContext;
  /**
   * "childhood-record": a person born in play, read from their childhood
   * record, the household pay and the family records with no draw.
   * "game-profile": retained for opening histories whose birth is not recorded;
   * money may use its sourced estimate, while other fields use saved evidence.
   */
  readonly basis: "childhood-record" | "game-profile";
  readonly money: readonly {
    readonly period: UpbringingPeriod;
    readonly level: FamilyMoney;
    readonly source: UpbringingSource;
  }[];
  /** 0 to 1: moves / (moves + K). The number readers weigh by. */
  readonly disruption: number;
  /** Display only; see `homeStabilityLabel`. */
  readonly homeStability: HomeStability;
  readonly caregiving: CaregivingClimate;
  readonly protectiveCaregiver: boolean;
  readonly events: readonly UpbringingEvent[];
  readonly schooling: readonly SchoolExperience[];
  readonly firstJob: FirstJobExperience;
}

export interface UpbringingTraitTendency {
  readonly trait: string;
  readonly weight: number;
  readonly lifePart: TraitLifePart | null;
  readonly because: string;
  readonly pole: "low" | "high";
}

/**
 * A family's money when the World holds no household pay for that part of a
 * childhood: the level of the median child, marked as an estimate.
 *
 * ACS 2024 1-year, table B17024 (ratio of income to poverty level by age),
 * United States: of 21,699,134 children under 6, 3,568,376 (16.4%) lived
 * under the poverty level, 4,304,160 (19.8%) at 100 to 199% of it and
 * 13,826,598 (63.7%) at 200% or more; of 25,998,996 aged 12 to 17, 14.5%,
 * 18.7% and 66.8%. The median child in both periods is in a family at 200%
 * of poverty or more, which this model calls secure.
 */
const MONEY_ESTIMATE: UpbringingSource = {
  kind: "public-data",
  key: "acs-2024-1yr-b17024-median-child",
  note: "ESTIMATED FROM AVERAGE: no household pay is on record for this part of the childhood, so it takes the median U.S. child's family level (ACS 2024 1-year B17024: 63.7% of children under 6 and 66.8% aged 12 to 17 live at 200% of poverty or more).",
};

const MONEY_FROM_RECORDS: UpbringingSource = {
  kind: "world-record",
  key: "household-pay-against-poverty-line",
  note: "The household's recorded pay against the HHS poverty guideline for its size and state: at or under 100% is severe scarcity and at or under 200% strained (the Census poverty and low-income bands).",
};

/** The ages each money period covers, and the age its record is read at. */
const MONEY_PERIODS: Readonly<
  Record<UpbringingPeriod, { from: number; until: number; readAt: number }>
> = {
  "early-childhood": { from: 0, until: 6, readAt: 3 },
  adolescence: { from: 12, until: 18, readAt: 15 },
};

/**
 * The day a money period's records are read: today while the person is in
 * it, the middle of it once it is over. None when the period is still ahead
 * or was over before the World's history begins.
 */
function moneyRecordDate(
  world: World,
  birthDate: IsoDate,
  period: UpbringingPeriod,
): IsoDate | null {
  const { from, until, readAt } = MONEY_PERIODS[period];
  if (world.currentDate < dateAtAge(birthDate, from)) return null;
  if (world.currentDate < dateAtAge(birthDate, until)) return world.currentDate;
  const middle = dateAtAge(birthDate, readAt);
  return middle < world.startedAt ? null : middle;
}

/**
 * A family's money in one part of a childhood, read from the household's
 * recorded pay on that day. When the World has no such record (the period
 * is before its history, still ahead, or someone at work has no recorded
 * pay), it is the median child's level, marked as an estimate.
 */
export function familyMoneyFor(
  world: World,
  personId: EntityId,
  period: UpbringingPeriod,
): { readonly level: FamilyMoney; readonly source: UpbringingSource } {
  const estimate = { level: "secure" as const, source: MONEY_ESTIMATE };
  const person = world.people[personId]!;
  const onDate = moneyRecordDate(world, person.birthDate, period);
  if (onDate === null) return estimate;
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const household = householdMembershipsAt(world, personId, cutoff)[0];
  const stateKey = homeStateKey(world, personId);
  if (!household || !stateKey) return estimate;
  const members = peopleInHouseholdAt(
    world,
    household.household.id,
    cutoff,
  ).filter((id) => isPersonAliveAt(world, id, cutoff));
  const pay = recordedMonthlyPayByPerson(world, onDate);
  const working = members.filter(
    (id) => activeWorkRelationshipsAt(world, id, cutoff).length > 0,
  );
  // Unknown is not zero: a household with nobody on a payroll, or somebody
  // at work whose pay is not recorded, has no income the World can read.
  if (working.length === 0 || working.some((id) => !pay.has(id)))
    return estimate;
  const annualMinor =
    members.reduce((sum, id) => sum + (pay.get(id) ?? 0), 0) * 12;
  const line = annualPovertyLineMinor(stateKey, members.length, onDate);
  const level: FamilyMoney =
    annualMinor <= line
      ? "severe-scarcity"
      : annualMinor <= line * 2
        ? "strained"
        : "secure";
  return { level, source: MONEY_FROM_RECORDS };
}

/** Opening-history proxies are explicitly estimates, never new family facts. */
export interface ChildhoodFamilyContext {
  readonly parentIds: readonly EntityId[];
  readonly householdId: EntityId | null;
  readonly householdMemberIds: readonly EntityId[];
  readonly placeId: EntityId | null;
  readonly householdType: string;
  readonly incomeBand: FamilyMoney | "unrecorded-pay";
  readonly estimatedIncomeBand?: FamilyMoney;
  readonly incomeSourcePersonIds?: readonly EntityId[];
  readonly congregationIds: readonly EntityId[];
  readonly comparablePersonIds: readonly EntityId[];
  readonly cohortScope: "exact" | "place" | "world" | "household" | "no-sample";
  readonly estimateSamplePersonId: EntityId | null;
  readonly caregiverPersonIds: readonly EntityId[];
  readonly caregiverCapacity: number | null;
  readonly estimatedParentCount: number | null;
  readonly estimatedSiblingCount: number | null;
  readonly source: UpbringingSource;
}

function selectedHouseholdMembers(world: World, personId: EntityId) {
  const parents = recordedParents(world, personId);
  const parentHousehold = parents
    .map((id) => householdMembershipsAt(world, id)[0])
    .find(Boolean);
  const household =
    parentHousehold ?? householdMembershipsAt(world, personId)[0];
  const members = household
    ? peopleInHouseholdAt(world, household.household.id)
    : [];
  return { parents, parentHousehold, household, members };
}

function householdContext(world: World, personId: EntityId) {
  const { parents, parentHousehold, household, members } =
    selectedHouseholdMembers(world, personId);
  const kinds = household
    ? members.flatMap((id) =>
        householdMembershipsAt(world, id)
          .filter((row) => row.household.id === household.household.id)
          .map((row) => row.state.kind),
      )
    : [];
  const householdType = [...new Set(kinds)].sort().join("+");
  const pay = recordedMonthlyPayByPerson(world, world.currentDate);
  const working = members.filter(
    (id) => activeWorkRelationshipsAt(world, id).length > 0,
  );
  const state = homeStateKey(
    world,
    parentHousehold
      ? parents.find(
          (id) =>
            householdMembershipsAt(world, id)[0]?.household.id ===
            parentHousehold.household.id,
        )!
      : personId,
  );
  const knownPay =
    !!state && working.length > 0 && working.every((id) => pay.has(id));
  const annual = knownPay
    ? members.reduce((sum, id) => sum + (pay.get(id) ?? 0), 0) * 12
    : null;
  const line =
    state && members.length
      ? annualPovertyLineMinor(state, members.length, world.currentDate)
      : null;
  const incomeBand: FamilyMoney | "unrecorded-pay" =
    annual === null || line === null
      ? "unrecorded-pay"
      : annual <= line
        ? "severe-scarcity"
        : annual <= line * 2
          ? "strained"
          : "secure";
  const congregationIds = [
    ...new Set(
      [personId, ...parents].flatMap((id) =>
        activeOrganizationParticipationsAt(world, id)
          .filter((row) => row.participation.kind === "membership:congregation")
          .map((row) => row.participation.organizationId),
      ),
    ),
  ].sort();
  return {
    placeId:
      household?.location?.jurisdictionId ??
      world.people[personId]!.homeJurisdictionId,
    parents,
    adultMembers: members.filter(
      (id) => dateAtAge(world.people[id]!.birthDate, 18) <= world.currentDate,
    ),
    household,
    members,
    householdType,
    incomeBand,
    congregationIds,
  };
}

type FamilyContextRead = ReturnType<typeof householdContext>;
// Repeated immutable snapshots can share the index when their family inputs
// are identical. Trait writes do not rebuild the world's family cohorts.
interface FamilyCohortIndex {
  readonly date: IsoDate;
  readonly validUntil: IsoDate;
  readonly inputs: readonly unknown[];
  readonly estimate: ReturnType<typeof recordedFamilyEstimates>;
  readonly byPerson: ReadonlyMap<EntityId, RecordedFamilySample>;
  readonly exact: Map<string, RecordedFamilySample[]>;
  readonly places: Map<EntityId, RecordedFamilySample[]>;
  readonly paidPeopleByPlace: Map<EntityId, EntityId[]>;
  readonly paidPeopleByState: Map<string, EntityId[]>;
  readonly paidPeople: readonly EntityId[];
  readonly estimatedMonthlyPay: ReadonlyMap<EntityId, number>;
  readonly householdsByPlace: ReadonlyMap<
    EntityId,
    FamilyCohortIndex["householdSamples"]
  >;
  readonly householdSamples: readonly {
    personId: EntityId;
    placeId: EntityId;
    adultIds: readonly EntityId[];
    childCount: number;
  }[];
}
interface FamilyCohortCache {
  readonly dependencies: WeakMap<object, FamilyCohortCache>;
  readonly intervals: FamilyCohortIndex[];
}
const FAMILY_COHORTS = new WeakMap<object, FamilyCohortCache>();
function cohortCache(
  key: object,
  inputs: readonly object[],
): FamilyCohortCache {
  let slot = FAMILY_COHORTS.get(key);
  if (!slot) {
    slot = { dependencies: new WeakMap(), intervals: [] };
    FAMILY_COHORTS.set(key, slot);
  }
  // Intake seeds people at their own historical dates. Keep every valid
  // interval for these exact immutable inputs, rather than evicting one
  // date whenever the next person's intake reads an earlier date.
  for (const input of inputs) {
    let next = slot.dependencies.get(input);
    if (!next) {
      next = { dependencies: new WeakMap(), intervals: [] };
      slot.dependencies.set(input, next);
    }
    slot = next;
  }
  return slot;
}
// Keep dependency tokens across irrelevant appends; revised/unknown prefixes
// build new tokens. Every extension copies before changing a handed-out index.
type CompensationFlows = readonly World["history"]["resourceFlows"][number][];
const COMPENSATION_FLOWS = new WeakMap<object, CompensationFlows>();
const RECENT_COMPENSATION_FLOWS: (readonly unknown[])[] = [];
const COMPENSATION_TERMS = new WeakMap<
  object,
  {
    cache: WeakMap<
      object,
      readonly World["history"]["resourceFlowTerms"][number][]
    >;
    recent: (readonly unknown[])[];
  }
>();
function compensationDependencies(world: World) {
  const flows = world.history.resourceFlows;
  const isCompensation = (flow: (typeof flows)[number]) =>
    flow.basisKind.startsWith("compensation:") &&
    flow.recipient.kind === "person";
  const extendFlows = (prior: CompensationFlows, from: number) => {
    const added = flows.slice(from).filter(isCompensation);
    return added.length ? [...prior, ...added] : prior;
  };
  const relevant = indexFollowingAppends(
    COMPENSATION_FLOWS,
    RECENT_COMPENSATION_FLOWS,
    flows,
    () => extendFlows([], 0),
    extendFlows,
  );
  let slot = COMPENSATION_TERMS.get(relevant);
  if (!slot) {
    slot = { cache: new WeakMap(), recent: [] };
    COMPENSATION_TERMS.set(relevant, slot);
  }
  const terms = world.history.resourceFlowTerms;
  const extendTerms = (
    prior: readonly (typeof terms)[number][],
    from: number,
  ) => {
    const added = terms.slice(from).filter((row) => {
      const flow = recordById(flows, row.resourceFlowId);
      // Unknown references conservatively invalidate rather than dropping
      // a dependency from a malformed or independently revised history.
      return !flow || isCompensation(flow);
    });
    return added.length ? [...prior, ...added] : prior;
  };
  return [
    relevant,
    indexFollowingAppends(
      slot.cache,
      slot.recent,
      terms,
      () => extendTerms([], 0),
      extendTerms,
    ),
  ] as const;
}
const FUTURE_DATES = new WeakMap<object, readonly string[]>();
const RECENT_FUTURE_DATES: (readonly unknown[])[] = [];
function nextRecordDate(
  rows: readonly object[],
  onDate: IsoDate,
): IsoDate | undefined {
  const extend = (prior: readonly string[], from: number) => {
    const added = rows
      .slice(from)
      .flatMap((row) =>
        Object.values(row).filter(
          (value): value is string =>
            typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
        ),
      );
    return added.length ? [...new Set([...prior, ...added])].sort() : prior;
  };
  const dates = indexFollowingAppends(
    FUTURE_DATES,
    RECENT_FUTURE_DATES,
    rows,
    () => extend([], 0),
    extend,
  );
  let low = 0;
  let high = dates.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (dates[middle]! <= onDate) low = middle + 1;
    else high = middle;
  }
  return dates[low] as IsoDate | undefined;
}

function cohortKey(row: FamilyContextRead): string {
  return JSON.stringify([row.placeId, row.householdType, row.incomeBand]);
}
function familyCohortIndex(world: World): FamilyCohortIndex {
  const key = world.history.kinshipRelationships;
  const [payFlows, payTerms] = compensationDependencies(world);
  const inputs = [
    world.people,
    world.history.householdMemberships,
    world.history.householdMembershipStates,
    world.history.householdLocations,
    payFlows,
    payTerms,
    world.history.workRelationships,
    world.history.workStatuses,
    world.history.workRoles,
  ];
  const cache = cohortCache(key, inputs);
  const prior = cache.intervals.find(
    (row) =>
      row.date <= world.currentDate &&
      world.currentDate < row.validUntil &&
      row.inputs.every((value, index) => value === inputs[index]),
  );
  if (prior) return prior;
  const estimate = recordedFamilyEstimates(world);
  // One immutable build can encounter the same person in both ordered loops.
  // Keep this map local: it must not retain contexts across snapshots or dates.
  const contexts = new Map<EntityId, FamilyContextRead>();
  const contextFor = (personId: EntityId): FamilyContextRead => {
    const prior = contexts.get(personId);
    if (prior) return prior;
    const context = householdContext(world, personId);
    contexts.set(personId, context);
    return context;
  };
  const exact = new Map<string, RecordedFamilySample[]>();
  const places = new Map<EntityId, RecordedFamilySample[]>();
  for (const sample of estimate.samples) {
    const context = contextFor(sample.personId);
    const groupKey = cohortKey(context);
    const group = exact.get(groupKey) ?? [];
    group.push(sample);
    exact.set(groupKey, group);
    const placeGroup = places.get(context.placeId) ?? [];
    placeGroup.push(sample);
    places.set(context.placeId, placeGroup);
  }
  // An unchanged family index survives ordinary date advances. Rebuild at
  // an actual future record boundary or the next poverty-guideline year;
  // daily trait reads never rescan the whole kinship history just for a date.
  let validUntil =
    `${Number(world.currentDate.slice(0, 4)) + 1}-01-01` as IsoDate;
  const consider = (value: unknown) => {
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      value > world.currentDate &&
      value < validUntil
    )
      validUntil = value as IsoDate;
  };
  for (const rows of [
    world.history.kinshipRelationships,
    ...inputs.slice(1),
  ] as readonly (readonly object[])[]) {
    consider(nextRecordDate(rows, world.currentDate));
  }
  for (const relationship of world.history.kinshipRelationships)
    for (const id of relationship.personIds)
      consider(world.people[id]?.birthDate);
  const estimatedMonthlyPay = new Map(
    recordedMonthlyPayByPerson(world, world.currentDate),
  );
  const orderedPeople = new Set(world.personOrder);
  const paidWorkPeople = new Set(
    world.history.workRelationships.flatMap((work) =>
      work.compensation === "paid" ? [work.personId] : [],
    ),
  );
  for (const id of paidWorkPeople) {
    if (!orderedPeople.has(id) || estimatedMonthlyPay.has(id)) continue;
    let monthly = 0;
    for (const { relationship, role } of activeWorkRelationshipsAt(world, id)) {
      if (relationship.compensation !== "paid") continue;
      const rate = townJobRate(
        role.occupationClassification,
        role.locationJurisdictionId,
        townPayPercentile(
          daysBetween(relationship.startedAt, world.currentDate) / 365.25,
        ),
      );
      const hours = role.timeDemand.expectedWeekly;
      if (rate && hours)
        monthly +=
          (((rate.hourlyMinor * (hours.minimumHours + hours.maximumHours)) /
            2) *
            52) /
          12;
    }
    if (monthly > 0) estimatedMonthlyPay.set(id, monthly);
  }
  const paidPeople = [...estimatedMonthlyPay.keys()].sort();
  const paidPeopleByPlace = new Map<EntityId, EntityId[]>();
  const paidPeopleByState = new Map<string, EntityId[]>();
  for (const id of paidPeople) {
    const place = world.people[id]?.homeJurisdictionId;
    if (!place) continue;
    const group = paidPeopleByPlace.get(place) ?? [];
    group.push(id);
    paidPeopleByPlace.set(place, group);
    const state = homeStateKey(world, id);
    if (state) {
      const group = paidPeopleByState.get(state) ?? [];
      group.push(id);
      paidPeopleByState.set(state, group);
    }
  }
  const seenHouseholds = new Set<EntityId>();
  const householdSamples = [];
  for (const membership of world.history.householdMemberships) {
    const { household, members } = selectedHouseholdMembers(
      world,
      membership.personId,
    );
    const adultMembers = members.filter(
      (id) => dateAtAge(world.people[id]!.birthDate, 18) <= world.currentDate,
    );
    const householdId = household?.household.id;
    if (!householdId || seenHouseholds.has(householdId) || !adultMembers.length)
      continue;
    seenHouseholds.add(householdId);
    householdSamples.push({
      personId: membership.personId,
      placeId:
        household?.location?.jurisdictionId ??
        world.people[membership.personId]!.homeJurisdictionId,
      adultIds: adultMembers,
      childCount: members.length - adultMembers.length,
    });
  }
  const householdsByPlace = new Map<EntityId, typeof householdSamples>();
  for (const row of householdSamples) {
    const group = householdsByPlace.get(row.placeId) ?? [];
    group.push(row);
    householdsByPlace.set(row.placeId, group);
  }
  const result = {
    householdsByPlace,
    householdSamples,
    estimatedMonthlyPay,
    paidPeople,
    paidPeopleByPlace,
    paidPeopleByState,
    date: world.currentDate,
    validUntil,
    inputs,
    estimate,
    byPerson: new Map(estimate.samples.map((row) => [row.personId, row])),
    exact,
    places,
  };
  cache.intervals.push(result);
  return result;
}
function childhoodFamilyContext(
  world: World,
  personId: EntityId,
): ChildhoodFamilyContext {
  const own = householdContext(world, personId);
  const index = familyCohortIndex(world);
  const exact = index.exact.get(cohortKey(own));
  const place = index.places.get(own.placeId);
  // Selected existing-code empty-cohort fallback: reuse saved family patterns,
  // first in this place, then the game. Never synthesize relatives or events.
  const peers = exact?.length
    ? exact
    : place?.length
      ? place
      : index.estimate.samples;
  const cohortScope = exact?.length
    ? "exact"
    : place?.length
      ? "place"
      : peers.length
        ? "world"
        : own.adultMembers.length
          ? "household"
          : "no-sample";
  const pattern =
    index.byPerson.get(personId) ??
    drawFamilyShape(world, world.people[personId]!.generationKey, {
      ...index.estimate,
      samples: peers,
    }).representative;
  // Known parents remain primary. Otherwise the current household's recorded
  // adults are an explicitly estimated proxy; without either, use the saved
  // family pattern's caregiver count per recorded child (siblings plus focus).
  const caregiverPersonIds = own.parents.length
    ? own.parents
    : own.adultMembers;
  const localHouseholds = index.householdsByPlace.get(own.placeId) ?? [];
  const householdPeers = localHouseholds.length
    ? localHouseholds
    : index.householdSamples;
  const householdProxy = householdPeers.length
    ? householdPeers[
        Number.parseInt(
          stableHash(world.people[personId]!.generationKey).slice(-8),
          16,
        ) % householdPeers.length
      ]
    : undefined;
  const caregiverCapacity = caregiverPersonIds.length
    ? caregiverPersonIds.length
    : pattern
      ? pattern.parentIds.length / (pattern.siblingCount + 1)
      : householdProxy
        ? householdProxy.adultIds.length /
          Math.max(1, householdProxy.childCount)
        : null;
  // Opening adults have no childhood payroll. Use their family's current
  // pay as a labeled historical proxy; otherwise reuse a real family/job pay estimate in
  // their place/state. Retain the sourced spread, never a universal secure band.
  const pay = index.estimatedMonthlyPay;
  const ownPayIds = [...new Set([...own.parents, ...own.members])].filter(
    (id) => pay.has(id),
  );
  const state = homeStateKey(world, personId);
  const localPay = index.paidPeopleByPlace.get(own.placeId);
  const statePay = state ? index.paidPeopleByState.get(state) : undefined;
  const candidates = localPay?.length
    ? localPay
    : statePay?.length
      ? statePay
      : index.paidPeople;
  const donorId = candidates.length
    ? candidates[
        Number.parseInt(
          stableHash(world.people[personId]!.generationKey).slice(-8),
          16,
        ) % candidates.length
      ]
    : undefined;
  const incomeSourcePersonIds = ownPayIds.length
    ? ownPayIds
    : donorId
      ? [donorId]
      : [];
  const donorMembers = donorId
    ? selectedHouseholdMembers(world, donorId).members
    : [];
  const familySize =
    own.members.length ||
    donorMembers.length ||
    (pattern
      ? pattern.parentIds.length + pattern.siblingCount + 1
      : householdProxy
        ? householdProxy.adultIds.length + householdProxy.childCount
        : 0);
  const annualPay =
    incomeSourcePersonIds.reduce((sum, id) => sum + pay.get(id)!, 0) * 12;
  const povertyLine =
    state && familySize
      ? annualPovertyLineMinor(state, familySize, world.currentDate)
      : null;
  const estimatedIncomeBand: FamilyMoney | undefined =
    incomeSourcePersonIds.length && povertyLine !== null
      ? annualPay <= povertyLine
        ? "severe-scarcity"
        : annualPay <= povertyLine * 2
          ? "strained"
          : "secure"
      : undefined;
  return {
    estimatedIncomeBand,
    incomeSourcePersonIds,
    parentIds: own.parents,
    householdId: own.household?.household.id ?? null,
    householdMemberIds: own.members,
    placeId: own.placeId,
    householdType: own.householdType,
    incomeBand: own.incomeBand,
    congregationIds: own.congregationIds,
    comparablePersonIds: pattern
      ? peers.map((row) => row.personId)
      : householdPeers.map((row) => row.personId),
    cohortScope: !pattern && householdProxy ? "household" : cohortScope,
    estimateSamplePersonId:
      pattern?.personId ?? householdProxy?.personId ?? null,
    caregiverPersonIds,
    caregiverCapacity,
    estimatedParentCount: own.parents.length
      ? null
      : (pattern?.parentIds.length ?? null),
    estimatedSiblingCount: pattern?.siblingCount ?? null,
    source: {
      kind: "game-profile",
      key: "recorded-family-childhood-context",
      note: `ESTIMATED FROM GAME FAMILIES: parents, household adults, pay, place and congregation records supply the person's context. Caregiver availability uses those recorded adults or a saved family pattern's parents per child. Cohort scope: ${cohortScope}; exact place/type/income first, same place next, then the game's recorded families. Current payroll takes priority; otherwise the existing BLS May 2025 place/occupation wage reader and recorded job tenure/hours supply a labeled pay proxy. Income contributors are retained in incomeSourcePersonIds. The existing family-pattern reader retains observed spread. It assigns no real relatives, emotional treatment, faith or events.`,
    },
  };
}

function otherPerson(
  pair: readonly [EntityId, EntityId],
  personId: EntityId,
): EntityId {
  return pair[0] === personId ? pair[1] : pair[0];
}

function recordedParents(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const child = world.people[personId];
  if (!child) return [];
  return kinshipRelationshipsAt(world, personId)
    .filter(({ kind }) => kind === "lineal:parent-child")
    .map(({ personIds }) => otherPerson(personIds, personId))
    .filter((candidate) => {
      const person = world.people[candidate];
      return person && person.birthDate < child.birthDate;
    });
}

function recordedChildhoodParentDeath(
  world: World,
  personId: EntityId,
  parentIds: readonly EntityId[],
): boolean {
  const child = world.people[personId]!;
  const adulthood = dateAtAge(child.birthDate, 18);
  return world.history.personDeaths.some(
    ({ personId: deceased, diedAt }) =>
      parentIds.includes(deceased) && diedAt < adulthood,
  );
}

/**
 * How disrupted a childhood was, from 0 (no move during a school year) toward
 * 1 (ever more of them): moves / (moves + K). PLACEHOLDER: K = 2 until the
 * research on how many school-year moves a child takes in stride is read.
 * Every reader weighs by this number; nothing flips at a count.
 */
const DISRUPTION_K = 2;
function disruptionFromMoves(moves: number): number {
  return moves / (moves + DISRUPTION_K);
}

/**
 * HARDWIRED display rule: the label a screen may show for a disruption number.
 * No reader uses it as a weight.
 */
function homeStabilityLabel(disruption: number): HomeStability {
  return disruption === 0
    ? "stable"
    : disruption < 0.5
      ? "some-moves"
      : "disrupted";
}

/**
 * Reads childhood and family evidence without assigning unrecorded events.
 * Family money retains its labeled sourced estimate where pay is unread.
 */
// The World is immutable. Repeated trait reads of this exact snapshot may
// share one upbringing, but another snapshot or date always reads afresh.
const UPBRINGING_READS = new WeakMap<
  World,
  { readonly date: IsoDate; readonly byPerson: Map<EntityId, PersonUpbringing> }
>();

export function upbringingFor(
  world: World,
  personId: EntityId,
): PersonUpbringing {
  let snapshot = UPBRINGING_READS.get(world);
  if (!snapshot || snapshot.date !== world.currentDate) {
    snapshot = { date: world.currentDate, byPerson: new Map() };
    UPBRINGING_READS.set(world, snapshot);
  }
  const prior = snapshot.byPerson.get(personId);
  if (prior) return prior;
  const result = readUpbringing(world, personId);
  snapshot.byPerson.set(personId, result);
  return result;
}

function readUpbringing(world: World, personId: EntityId): PersonUpbringing {
  const person = world.people[personId];
  if (!person) throw new Error(`No person ${personId} exists.`);
  const familyContext = childhoodFamilyContext(world, personId);
  const parents = familyContext.parentIds;
  const parentDied = recordedChildhoodParentDeath(world, personId, parents);
  const earlyMoney = familyMoneyFor(world, personId, "early-childhood");
  const laterMoney = familyMoneyFor(world, personId, "adolescence");
  const contextualMoney = (row: ReturnType<typeof familyMoneyFor>) =>
    row.source.kind === "public-data" &&
    (familyContext.incomeBand !== "unrecorded-pay" ||
      familyContext.estimatedIncomeBand !== undefined)
      ? {
          level:
            familyContext.incomeBand === "unrecorded-pay"
              ? familyContext.estimatedIncomeBand!
              : familyContext.incomeBand,
          source: familyContext.source,
        }
      : row;
  const money = [
    { period: "early-childhood", ...contextualMoney(earlyMoney) },
    { period: "adolescence", ...contextualMoney(laterMoney) },
  ] as const;
  const entries = recordsByStringField(
    childhoodRecordEntries(world),
    "personId",
    personId,
  );
  const disruption = disruptionFromMoves(
    entries.filter(({ kind }) => kind === "school-year-move").length,
  );
  return {
    personId,
    // Retain the legacy basis value for opening histories and save consumers.
    // It supplies only the sourced money estimate, never invented life events.
    basis: entries.some(({ kind }) => kind === "birth")
      ? "childhood-record"
      : "game-profile",
    money,
    disruption,
    homeStability: homeStabilityLabel(disruption),
    familyContext,
    caregiving:
      familyContext.caregiverCapacity === null
        ? "not-recorded"
        : "estimated-care",
    protectiveCaregiver: false,
    events: parentDied ? ["parent-death"] : [],
    schooling: [],
    firstJob: "none",
  };
}

const candidate = (
  trait: string,
  weight: number,
  because: string,
  lifePart: TraitLifePart | null = null,
  pole: "low" | "high" = "high",
): UpbringingTraitTendency => ({ trait, weight, because, lifePart, pole });

/** The approved upbringing table expressed as weighted candidates, never destiny. */
export function upbringingTraitTendencies(
  upbringing: PersonUpbringing,
): readonly UpbringingTraitTendency[] {
  const rows: UpbringingTraitTendency[] = [];
  const levels = new Set(upbringing.money.map(({ level }) => level));
  if (levels.has("secure"))
    rows.push(
      candidate("personality-v1:facet-contented", 1, "material security"),
      candidate("personality-v1:facet-generous", 1, "material security"),
      candidate("personality-v1:uncertain-outlook", 1, "material security"),
    );
  if (levels.has("strained") || levels.has("severe-scarcity"))
    rows.push(
      candidate("personality-v1:facet-practical", 2, "material scarcity"),
      candidate("personality-v1:facet-acquisitive", 1, "material scarcity"),
      candidate("personality-v1:voluntary-effort", 1, "material scarcity"),
    );
  if (
    upbringing.caregiving === "estimated-care" &&
    upbringing.familyContext?.caregiverCapacity
  )
    rows.push(
      candidate(
        "personality-v1:facet-duty-bound",
        upbringing.familyContext.caregiverCapacity,
        "estimated caregiver availability",
      ),
    );
  if (upbringing.caregiving === "protective-reliable")
    rows.push(
      candidate(
        "personality-v1:facet-affectionate",
        2,
        "reliable warm care",
        "family",
      ),
      candidate("personality-v1:facet-supportive", 2, "reliable warm care"),
      candidate("personality-v1:initial-trust", 1, "reliable warm care"),
    );
  if (upbringing.caregiving === "consistent-firm")
    rows.push(
      candidate(
        "personality-v1:facet-fair-minded",
        2,
        "consistent household rules",
      ),
      candidate(
        "personality-v1:facet-duty-bound",
        2,
        "consistent household duties",
      ),
      candidate("personality-v1:patience", 1, "consistent household limits"),
    );
  if (upbringing.caregiving === "inconsistent")
    rows.push(
      candidate(
        "personality-v1:facet-defensive",
        2,
        "unpredictable household rules",
      ),
      candidate(
        "personality-v1:facet-guarded",
        2,
        "unpredictable household rules",
      ),
      candidate(
        "personality-v1:initial-trust",
        2,
        "unpredictable household rules",
        null,
        "low",
      ),
    );
  if (
    upbringing.caregiving === "high-conflict" ||
    upbringing.caregiving === "harsh"
  )
    rows.push(
      candidate("personality-v1:facet-defensive", 2, "household conflict"),
      candidate("personality-v1:facet-sensitive", 1, "household conflict"),
      candidate("personality-v1:facet-brooding", 1, "household conflict"),
      candidate(
        "personality-v1:facet-mediating",
        1,
        "household conflict",
        "family",
      ),
    );
  // Smooth in the disruption number: learning to adapt is strongest in the
  // middle (4d(1-d)), the cost of lost homes grows with it (d).
  const d = upbringing.disruption;
  const adapting = 4 * d * (1 - d);
  if (adapting > 0)
    rows.push(
      candidate(
        "personality-v1:method-revision",
        2 * adapting,
        "repeated safe transitions",
      ),
      candidate(
        "personality-v1:facet-observant",
        adapting,
        "repeated transitions",
      ),
      candidate(
        "personality-v1:facet-independent",
        adapting,
        "repeated transitions",
      ),
    );
  if (d > 0)
    rows.push(
      candidate(
        "personality-v1:facet-nostalgic",
        2 * d,
        "lost homes and relationships",
      ),
      candidate("personality-v1:facet-guarded", 2 * d, "disruptive moves"),
      candidate(
        "personality-v1:facet-slow-to-warm-up",
        2 * d,
        "disruptive moves",
      ),
    );
  for (const event of upbringing.events) {
    if (event === "parent-death")
      rows.push(
        candidate(
          "personality-v1:facet-nostalgic",
          2,
          "a parent's death",
          "family",
        ),
        candidate("personality-v1:facet-tender-hearted", 1, "a parent's death"),
        ...(upbringing.protectiveCaregiver
          ? [
              candidate(
                "personality-v1:facet-devoted",
                2,
                "protective care after a parent's death",
                "family",
              ),
            ]
          : [
              candidate(
                "personality-v1:facet-intimacy-guarded",
                2,
                "a parent's death",
                "family",
              ),
            ]),
      );
    if (event === "parent-separation")
      rows.push(
        candidate(
          "personality-v1:facet-guarded",
          1,
          "parental separation",
          "family",
        ),
        candidate("personality-v1:facet-independent", 1, "parental separation"),
      );
    if (event === "serious-illness")
      rows.push(
        candidate("personality-v1:patience", 2, "serious childhood illness"),
        candidate(
          "personality-v1:facet-persistent",
          2,
          "serious childhood illness",
        ),
        candidate(
          "personality-v1:concern-for-distress",
          1,
          "serious childhood illness",
        ),
      );
    if (event === "family-illness-care")
      rows.push(
        candidate(
          "personality-v1:facet-nurturing",
          2,
          "family illness care",
          "family",
        ),
        candidate(
          "personality-v1:facet-duty-bound",
          2,
          "family illness care",
          "family",
        ),
      );
    if (event === "adjudicated-law-trouble")
      rows.push(
        candidate(
          "personality-v1:facet-practical",
          1,
          "accountability after adjudicated conduct",
        ),
        candidate(
          "personality-v1:facet-humble",
          1,
          "accountability after adjudicated conduct",
        ),
      );
    if (event === "harsh-authority-treatment")
      rows.push(
        candidate(
          "personality-v1:facet-cynical",
          2,
          "harsh treatment by authorities",
        ),
        candidate(
          "personality-v1:initial-trust",
          2,
          "harsh treatment by authorities",
          null,
          "low",
        ),
      );
  }
  for (const school of upbringing.schooling) {
    if (school === "reliable-support" || school === "earned-success")
      rows.push(
        candidate(
          "personality-v1:facet-studious",
          2,
          "support and effort at school",
        ),
        candidate(
          "personality-v1:facet-persistent",
          1,
          "support and effort at school",
        ),
        candidate(
          "personality-v1:self-confidence",
          1,
          "support and effort at school",
        ),
      );
    if (school === "supported-setbacks")
      rows.push(
        candidate(
          "personality-v1:facet-persistent",
          2,
          "supported school setbacks",
        ),
        candidate(
          "personality-v1:facet-humble",
          1,
          "supported school setbacks",
        ),
      );
    if (school === "peer-belonging")
      rows.push(
        candidate(
          "personality-v1:facet-friendly",
          2,
          "reciprocal peer belonging",
          "friends",
        ),
        candidate(
          "personality-v1:bond-loyalty",
          1,
          "reciprocal peer belonging",
          "friends",
        ),
      );
    if (school === "ridicule-or-exclusion" || school === "bullying")
      rows.push(
        candidate(
          "personality-v1:facet-self-conscious",
          2,
          "peer ridicule or exclusion",
          "friends",
        ),
        candidate(
          "personality-v1:facet-defensive",
          1,
          "peer ridicule or exclusion",
          "friends",
        ),
        candidate(
          "personality-v1:facet-slow-to-warm-up",
          1,
          "peer ridicule or exclusion",
          "friends",
        ),
      );
  }
  if (upbringing.firstJob === "reliable-supervision")
    rows.push(
      candidate(
        "personality-v1:facet-duty-bound",
        2,
        "responsibility in a first job",
        "work",
      ),
      candidate(
        "personality-v1:facet-meticulous",
        1,
        "reliable first-job supervision",
        "work",
      ),
    );
  if (upbringing.firstJob === "autonomy")
    rows.push(
      candidate(
        "personality-v1:facet-enterprising",
        2,
        "autonomy in a first job",
        "work",
      ),
      candidate(
        "personality-v1:facet-independent",
        1,
        "autonomy in a first job",
        "work",
      ),
    );
  if (upbringing.firstJob === "public-contact")
    rows.push(
      candidate(
        "personality-v1:facet-polite",
        2,
        "public contact in a first job",
        "work",
      ),
      candidate(
        "personality-v1:facet-tactful",
        1,
        "public contact in a first job",
        "work",
      ),
    );
  if (upbringing.firstJob === "precarious")
    rows.push(
      candidate(
        "personality-v1:facet-cynical",
        1,
        "precarious first work",
        "work",
      ),
      candidate(
        "personality-v1:facet-guarded",
        1,
        "precarious first work",
        "work",
      ),
      candidate(
        "personality-v1:facet-assertive",
        1,
        "precarious first work",
        "work",
      ),
    );
  return rows;
}

/** Core directions use the same upbringing rather than a second random biography. */
export function upbringingCoreValue(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
): TraitValue {
  return upbringingCoreValueFrom(upbringingFor(world, personId), trait);
}

/**
 * A core direction from an upbringing alone. Pure: the same upbringing gives
 * the same value in every world. An upbringing that says nothing about this
 * trait, or pulls both ways equally, leaves the person at the middle.
 */
export function upbringingCoreValueFrom(
  upbringing: PersonUpbringing,
  trait: PeopleTrait,
): TraitValue {
  let score = 0;
  if (trait === "deliberation") {
    if (upbringing.caregiving === "consistent-firm") score -= 1;
    if (upbringing.caregiving === "inconsistent") score += 1;
  } else if (trait === "sociability") {
    if (upbringing.schooling.includes("peer-belonging")) score += 1;
    if (
      upbringing.schooling.some(
        (x) => x === "bullying" || x === "ridicule-or-exclusion",
      )
    )
      score -= 1;
  } else if (trait === "conflict") {
    if (upbringing.caregiving === "protective-reliable") score -= 1;
    if (
      upbringing.caregiving === "high-conflict" ||
      upbringing.caregiving === "harsh"
    )
      score += 1;
  } else if (trait === "reliability") {
    if (upbringing.caregiving === "estimated-care")
      score += upbringing.familyContext?.caregiverCapacity ?? 0;
    if (
      upbringing.caregiving === "consistent-firm" ||
      upbringing.firstJob === "reliable-supervision"
    )
      score += 1;
    if (upbringing.caregiving === "inconsistent") score -= 1;
  } else if (trait === "risk") {
    score -= Math.max(
      upbringing.disruption,
      upbringing.events.includes("serious-illness") ? 1 : 0,
    );
    if (upbringing.firstJob === "autonomy") score += 1;
  }
  // The scale is whole numbers; the score is rounded once, at the very end.
  return (Math.round(Math.max(-2, Math.min(2, score))) + 0) as TraitValue;
}
