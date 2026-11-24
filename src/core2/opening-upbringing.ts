/**
 * The opening's upbringing projection: a resident's first trait values from
 * what the opening's draft records about their household, nothing drawn.
 *
 * Ported from the old engine's `people-upbringing.ts` and `people-traits.ts`
 * as the opening reached them. The opening's draft holds people, households,
 * memberships, kinships and partnerships, and the jobs just written; it holds
 * no pay, schooling, moves, deaths, congregations or childhood records, so
 * every branch of the old projection that read those is constant here and is
 * not carried over: money is always the national child distribution's stable
 * sample for the person, caregiving is always the household's estimate, and
 * disruption, events, schooling and first jobs are always empty. What varies
 * by person, and is reproduced exactly: the recorded parents, the household's
 * adults, the sibling count (recorded for a child with parents, else the
 * national distribution's stable sample), the family pattern a grown resident
 * is matched to among the town's recorded families, and the money levels.
 *
 * Every trait value this writes is read in play by the people engine; the
 * history that is to run from the player's birth year (owner, Oct 28)
 * replaces this estimate with recorded childhoods when it lands.
 */
import { dateAtAge, ageOnDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import type { EntityId, IsoDate } from "./kernel/brands";
import type { DraftPerson, OpeningDraft } from "./opening-draft";
import { PEOPLE_MIND_VERSION, PEOPLE_TRAITS } from "./people-mind";
import { PERSONALITY_PACK } from "./personality-catalogue";
import {
  isOneSided,
  strengthForMagnitude,
  type RegisteredTrait,
} from "./trait-packs";
import { parameter as p } from "./parameters";
import type { Source } from "./types";
import nationalDistributions from "../../data/research/upbringing/national-childhood-distributions.json" with { type: "json" };
import censusFamilyEstimate from "../../data/research/family-shape/census-two-parent-share.json" with { type: "json" };

type FamilyMoney = "secure" | "strained" | "severe-scarcity";
type UpbringingPeriod = "early-childhood" | "adolescence";

/** Which way each family-money level leans a child: secure up, severe scarcity down. */
const MONEY_SIDE: Record<FamilyMoney, number> = {
  secure: 1,
  strained: 0,
  "severe-scarcity": -1,
};

/**
 * ESTIMATED FROM AVERAGE: the share of U.S. children living with two parents,
 * Census Bureau, America's Families and Living Arrangements, CPS ASEC 2023
 * (Table C2), about 71 percent. It only pulls a small recorded sample toward
 * the national share; a large sample speaks for itself.
 */
const CENSUS_TWO_PARENT_SHARE = censusFamilyEstimate.twoParentShare;
/** How many recorded families the national share counts as. */
const CENSUS_PRIOR_FAMILIES = censusFamilyEstimate.priorFamilyCount;

/** Selects a stable, source-weighted estimate rather than making an outcome draw. */
function weightedObservation<T>(
  key: string,
  rows: readonly { readonly value: T; readonly weight: number }[],
): T {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let slot = Number.parseInt(stableHash(key).slice(-8), 16) % total;
  for (const row of rows) {
    if (slot < row.weight) return row.value;
    slot -= row.weight;
  }
  return rows.at(-1)!.value;
}

function hashPosition(key: string): number {
  return Number.parseInt(stableHash(key).slice(-8), 16);
}

function estimatedMoney(
  generationKey: string,
  period: UpbringingPeriod,
): { readonly level: FamilyMoney; readonly note: string } {
  const rows = nationalDistributions.familyIncome.periods[period];
  const level = weightedObservation(
    `${generationKey}:family-money:${period}`,
    rows.map((row) => ({
      value: row.level as FamilyMoney,
      weight: Math.round(row.percent * p("upbringingPercentWeightScale")),
    })),
  );
  return {
    level,
    note: `ESTIMATED FROM THE NATIONAL DISTRIBUTION: no household pay is recorded for this childhood period, so a stable sample for this person uses the ACS 2024 1-year B17024 U.S. child distribution for ${period}.`,
  };
}

function estimatedSiblingCount(generationKey: string): number {
  return weightedObservation(
    `${generationKey}:childhood-siblings`,
    nationalDistributions.siblings.categories.map((row) => ({
      value: row.siblings,
      weight: Math.round(row.percent * p("upbringingPercentWeightScale")),
    })),
  );
}

/** A recorded family: a child of the draft with recorded parents. */
interface RecordedFamilySample {
  readonly personId: EntityId;
  readonly parentIds: readonly EntityId[];
  readonly secondParent: number;
  readonly siblingCount: number;
}

interface HouseholdContext {
  readonly placeId: EntityId;
  readonly parents: readonly EntityId[];
  readonly adultMembers: readonly EntityId[];
  readonly householdId: EntityId | null;
  readonly members: readonly EntityId[];
  readonly householdType: string;
}

/** What the projection reads of the draft, indexed once per opening. */
export interface OpeningFamilyIndex {
  readonly samples: readonly RecordedFamilySample[];
  readonly byPerson: ReadonlyMap<EntityId, RecordedFamilySample>;
  readonly exact: ReadonlyMap<string, readonly RecordedFamilySample[]>;
  readonly places: ReadonlyMap<EntityId, readonly RecordedFamilySample[]>;
  readonly contextByPerson: ReadonlyMap<EntityId, HouseholdContext>;
}

function cohortKey(row: HouseholdContext): string {
  // The old key carried the household's pay band; the opening records no pay.
  return JSON.stringify([row.placeId, row.householdType, "unrecorded-pay"]);
}

export function openingFamilyIndex(draft: OpeningDraft): OpeningFamilyIndex {
  const today = draft.currentDate;
  const eighteenth = new Map<EntityId, IsoDate>();
  const eighteenthBirthday = (person: DraftPerson): IsoDate => {
    let date = eighteenth.get(person.id);
    if (!date) {
      date = dateAtAge(person.birthDate, p("childUpperAge"));
      eighteenth.set(person.id, date);
    }
    return date;
  };
  // Parents and children: the older saved person supplies the parent side.
  const parentsOf = new Map<EntityId, Set<EntityId>>();
  const childrenOf = new Map<EntityId, Set<EntityId>>();
  const add = (
    map: Map<EntityId, Set<EntityId>>,
    key: EntityId,
    id: EntityId,
  ) => {
    const values = map.get(key) ?? new Set<EntityId>();
    values.add(id);
    map.set(key, values);
  };
  for (const row of draft.history.kinshipRelationships) {
    if (row.establishedAt > today) continue;
    const [a, b] = row.personIds.map((id) => draft.people[id]);
    if (!a || !b || a.birthDate > today || b.birthDate > today) continue;
    if (row.kind === "lineal:parent-child" && a.birthDate !== b.birthDate) {
      const [parent, child] = a.birthDate < b.birthDate ? [a, b] : [b, a];
      add(parentsOf, child.id, parent.id);
      add(childrenOf, parent.id, child.id);
    }
  }
  const siblingsOf = new Map<EntityId, Set<EntityId>>();
  for (const ids of childrenOf.values())
    for (const childId of ids)
      for (const siblingId of ids)
        if (childId !== siblingId) add(siblingsOf, childId, siblingId);
  const samples: RecordedFamilySample[] = [...parentsOf.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([personId, ids]) => {
      const parentIds = [...ids].sort();
      return {
        personId,
        parentIds,
        secondParent: parentIds.length > 1 ? 1 : 0,
        siblingCount: siblingsOf.get(personId)?.size ?? 0,
      };
    });
  // Households: each person's first membership, its state's kind, its
  // members (sorted, as the old query returned them) and its location.
  const membershipOf = new Map<
    EntityId,
    (typeof draft.history.householdMemberships)[number]
  >();
  for (const row of draft.history.householdMemberships)
    if (!membershipOf.has(row.personId)) membershipOf.set(row.personId, row);
  const kindOfMembership = new Map<EntityId, string>();
  for (const row of draft.history.householdMembershipStates)
    kindOfMembership.set(row.membershipId, row.kind);
  const membersOf = new Map<EntityId, EntityId[]>();
  for (const row of draft.history.householdMemberships) {
    const list = membersOf.get(row.householdId) ?? [];
    list.push(row.personId);
    membersOf.set(row.householdId, list);
  }
  for (const list of membersOf.values()) list.sort();
  const locationOf = new Map<EntityId, EntityId>();
  for (const row of draft.history.householdLocations)
    if (row.effectiveAt <= today)
      locationOf.set(row.householdId, row.jurisdictionId);
  const recordedParents = (personId: EntityId): readonly EntityId[] => {
    const child = draft.people[personId]!;
    return [...(parentsOf.get(personId) ?? [])]
      .sort()
      .filter(
        (candidate) => draft.people[candidate]!.birthDate < child.birthDate,
      );
  };
  const selectedHousehold = (personId: EntityId) => {
    const parents = recordedParents(personId);
    const parentHousehold = parents
      .map((id) => membershipOf.get(id))
      .find(Boolean);
    const household = parentHousehold ?? membershipOf.get(personId);
    const members = household
      ? (membersOf.get(household.householdId) ?? [])
      : [];
    return { parents, household, members };
  };
  const contextOf = (personId: EntityId): HouseholdContext => {
    const { parents, household, members } = selectedHousehold(personId);
    const kinds = household
      ? members.flatMap((id) => {
          const membership = membershipOf.get(id);
          return membership && membership.householdId === household.householdId
            ? [kindOfMembership.get(membership.id) ?? ""]
            : [];
        })
      : [];
    return {
      placeId:
        (household && locationOf.get(household.householdId)) ??
        draft.people[personId]!.homeJurisdictionId,
      parents,
      adultMembers: members.filter(
        (id) => eighteenthBirthday(draft.people[id]!) <= today,
      ),
      householdId: household?.householdId ?? null,
      members,
      householdType: [...new Set(kinds)].sort().join("+"),
    };
  };
  const contextByPerson = new Map<EntityId, HouseholdContext>();
  const contextFor = (personId: EntityId) => {
    let context = contextByPerson.get(personId);
    if (!context) {
      context = contextOf(personId);
      contextByPerson.set(personId, context);
    }
    return context;
  };
  const exact = new Map<string, RecordedFamilySample[]>();
  const places = new Map<EntityId, RecordedFamilySample[]>();
  for (const sample of samples) {
    const context = contextFor(sample.personId);
    const key = cohortKey(context);
    exact.set(key, [...(exact.get(key) ?? []), sample]);
    places.set(context.placeId, [
      ...(places.get(context.placeId) ?? []),
      sample,
    ]);
  }
  for (const personId of draft.personOrder) contextFor(personId);
  return {
    samples,
    byPerson: new Map(samples.map((row) => [row.personId, row])),
    exact,
    places,
    contextByPerson,
  };
}

/**
 * The recorded two-parent share of a sample, shrunk toward the Census share
 * in proportion to how few families it holds.
 */
function shrunkTwoParentShare(
  samples: readonly RecordedFamilySample[],
): number {
  const twoParent = samples.filter((row) => row.secondParent === 1).length;
  return (
    (twoParent + CENSUS_PRIOR_FAMILIES * CENSUS_TWO_PARENT_SHARE) /
    (samples.length + CENSUS_PRIOR_FAMILIES)
  );
}

/**
 * A pick among the town's own recorded families, never an invented one. The
 * two-parent and one-parent families are weighted so the pool carries the
 * shrunk share; within each group every family weighs the same.
 */
function pickRecordedFamily(
  samples: readonly RecordedFamilySample[],
  share: number,
  position: number,
): RecordedFamilySample | undefined {
  if (!samples.length) return undefined;
  const two = samples.filter((row) => row.secondParent === 1).length;
  const one = samples.length - two;
  const weight = (row: RecordedFamilySample) =>
    two === 0 || one === 0
      ? 1 / samples.length
      : row.secondParent === 1
        ? share / two
        : (1 - share) / one;
  let total = 0;
  for (const row of samples) {
    total += weight(row);
    if (position < total) return row;
  }
  return samples.at(-1);
}

interface Upbringing {
  readonly money: readonly {
    period: UpbringingPeriod;
    level: FamilyMoney;
    note: string;
  }[];
  readonly caregiverCapacity: number | null;
  readonly estimatedParentCount: number | null;
  readonly estimatedSiblingCount: number;
  readonly parentIds: readonly EntityId[];
  readonly lean: { sociability: number; conflict: number; risk: number };
  readonly notes: readonly string[];
}

function upbringingOf(
  draft: OpeningDraft,
  index: OpeningFamilyIndex,
  personId: EntityId,
): Upbringing {
  const person = draft.people[personId]!;
  const own = index.contextByPerson.get(personId)!;
  const exact = index.exact.get(cohortKey(own));
  const place = index.places.get(own.placeId);
  // Reuse saved family patterns, first in this place, then the game.
  const peers = exact?.length ? exact : place?.length ? place : index.samples;
  const scope = exact?.length
    ? "exact"
    : place?.length
      ? "place"
      : peers.length
        ? "world"
        : own.adultMembers.length
          ? "household"
          : "no-sample";
  const recordedPattern = index.byPerson.get(personId);
  const pattern =
    recordedPattern ??
    pickRecordedFamily(
      peers,
      shrunkTwoParentShare(peers),
      hashPosition(person.generationKey) / 0x1_0000_0000,
    ) ??
    null;
  // Known parents remain primary. Otherwise the current household's recorded
  // adults are an explicitly estimated proxy; without either (a household of
  // children alone, which the opening never writes), the saved family
  // pattern's caregiver count per recorded child, else none recorded.
  const caregiverPersonIds = own.parents.length
    ? own.parents
    : own.adultMembers;
  const caregiverCapacity = caregiverPersonIds.length
    ? caregiverPersonIds.length
    : pattern
      ? pattern.parentIds.length / (pattern.siblingCount + 1)
      : null;
  const cohortScope = scope;
  const estimatedParentCount = own.parents.length
    ? null
    : (pattern?.parentIds.length ?? null);
  const siblingCount =
    recordedPattern?.siblingCount ??
    estimatedSiblingCount(person.generationKey);
  const siblingSourceKey = recordedPattern
    ? "recorded-family-sibling-count"
    : "sipp-2009-p70-126-table-4";
  const money = (["early-childhood", "adolescence"] as const).map((period) => ({
    period,
    ...estimatedMoney(person.generationKey, period),
  }));
  // Caregivers a child had, from childhood records only: the recorded
  // parents, else the saved family pattern's parents per child; with
  // neither, one caregiver is assumed.
  const childhoodCapacity = own.parents.length
    ? own.parents.length
    : estimatedParentCount !== null
      ? estimatedParentCount / (siblingCount + 1)
      : p("one");
  const level = money.at(-1)!.level;
  const unsupervised =
    p("one") - Math.min(childhoodCapacity, p("two")) / p("two");
  const lean = {
    sociability:
      (p("upbringingSociabilitySiblingWeight") * siblingCount) /
        (siblingCount + p("upbringingSiblingHalfSaturation")) +
      MONEY_SIDE[level] * p("upbringingMoneyEase") -
      p("upbringingSociabilityOffset"),
    conflict:
      p("upbringingConflictUnsupervisedWeight") * unsupervised -
      MONEY_SIDE[level] * p("upbringingMoneyStrain") -
      p("upbringingConflictOffset"),
    risk:
      p("upbringingRiskUnsupervisedWeight") * unsupervised -
      p("upbringingRiskOffset"),
  };
  const notes = [
    `ESTIMATED FROM RECORDS AND PUBLIC DATA: available parents, household adults, payroll, place and congregation records are used first. Missing sibling counts use the national U.S. Census SIPP 2009 distribution and missing pay bands use ACS 2024 B17024; both are labeled estimates and sampled by the person's stable generation key. Caregiver availability uses recorded adults or a saved family pattern's parents per child. Cohort scope: ${cohortScope}; exact place/type/income first, same place next, then the game's recorded families. Current payroll takes priority; otherwise the existing BLS May 2025 place/occupation wage reader and recorded job tenure/hours supply a labeled pay proxy. Income contributors are retained in incomeSourcePersonIds. No relative, emotional treatment, faith or event is created.`,
    `ESTIMATED FROM RECORDS AND NATIONAL DATA: siblings, congregation, household pay, caregivers per child, school-year moves and a parent's death are weighed smoothly; missing sibling counts use ${siblingSourceKey}, and missing pay bands use acs-2024-1yr-b17024-adolescence.`,
    ...money.map((row) => row.note),
  ];
  return {
    money,
    caregiverCapacity,
    estimatedParentCount,
    estimatedSiblingCount: siblingCount,
    parentIds: own.parents,
    lean,
    notes,
  };
}

/** A core direction from an upbringing alone; the score is rounded once. */
function coreValue(
  upbringing: Upbringing,
  trait: (typeof PEOPLE_TRAITS)[number],
): number {
  let score = 0;
  const estimatedCare = upbringing.caregiverCapacity !== null;
  if (trait === "sociability") score += upbringing.lean.sociability;
  else if (trait === "conflict") score += upbringing.lean.conflict;
  else if (trait === "reliability" && estimatedCare)
    score +=
      p("upbringingReliabilityCareWeight") *
      ((upbringing.caregiverCapacity ?? p("upbringingCaregiverCenter")) -
        p("upbringingCaregiverCenter"));
  else if (trait === "risk") score += upbringing.lean.risk;
  return Math.round(Math.max(-p("two"), Math.min(p("two"), score))) + p("zero");
}

interface UpbringingQuality {
  readonly trait: string;
  readonly value: 1 | -1;
  readonly weight: number;
  readonly because: readonly string[];
}

/**
 * The notable qualities an upbringing leans toward, strongest first: the
 * rows of the approved upbringing table the opening's records can reach
 * (material security or scarcity, estimated caregiver availability).
 */
function upbringingQualities(
  upbringing: Upbringing,
): readonly UpbringingQuality[] {
  const rows: { trait: string; weight: number; because: string }[] = [];
  const levels = new Set(upbringing.money.map(({ level }) => level));
  if (levels.has("secure"))
    rows.push(
      {
        trait: "personality-v1:facet-contented",
        weight: 1,
        because: "material security",
      },
      {
        trait: "personality-v1:facet-generous",
        weight: 1,
        because: "material security",
      },
      {
        trait: "personality-v1:uncertain-outlook",
        weight: 1,
        because: "material security",
      },
    );
  if (levels.has("strained") || levels.has("severe-scarcity"))
    rows.push(
      {
        trait: "personality-v1:facet-practical",
        weight: p("upbringingScarcityPracticalWeight"),
        because: "material scarcity",
      },
      {
        trait: "personality-v1:facet-acquisitive",
        weight: 1,
        because: "material scarcity",
      },
      {
        trait: "personality-v1:voluntary-effort",
        weight: 1,
        because: "material scarcity",
      },
    );
  if (upbringing.caregiverCapacity)
    rows.push({
      trait: "personality-v1:facet-duty-bound",
      weight: upbringing.caregiverCapacity,
      because: "estimated caregiver availability",
    });
  const byTrait = new Map<string, { net: number; because: string[] }>();
  for (const row of rows) {
    const entry = byTrait.get(row.trait) ?? { net: 0, because: [] };
    entry.net += row.weight;
    if (!entry.because.includes(row.because)) entry.because.push(row.because);
    byTrait.set(row.trait, entry);
  }
  return [...byTrait.entries()]
    .filter(([, entry]) => entry.net !== 0)
    .map(([trait, entry]): UpbringingQuality => ({
      trait,
      value: entry.net > 0 ? 1 : -1,
      weight: Math.abs(entry.net),
      because: entry.because,
    }))
    .sort((a, b) =>
      b.weight !== a.weight ? b.weight - a.weight : a.trait < b.trait ? -1 : 1,
    );
}

/**
 * A registered trait's first value, from the upbringing alone: the net lean
 * on its qualified key and on every catalog trait its seed `follows` sets the
 * side, and its weight picks the largest magnitude the pack's spread declares
 * on that side without passing it. No lean, no declared step, or a low lean
 * on a one-sided trait leaves the middle.
 */
function registeredTraitLean(
  trait: RegisteredTrait,
  qualities: readonly UpbringingQuality[],
): number {
  const keys = new Set([trait.qualifiedKey, ...(trait.seed?.follows ?? [])]);
  const named = qualities.filter((row) => keys.has(row.trait));
  const net = named.reduce((sum, row) => sum + row.value * row.weight, 0);
  if (net === 0) return 0;
  const side = Math.sign(net);
  if (side < 0 && isOneSided(trait)) return 0;
  const steps = [
    ...new Set(
      (trait.seed?.spread ?? [])
        .filter((value) => Math.sign(value) === side)
        .map((value) => Math.abs(value)),
    ),
  ]
    .filter((magnitude) => strengthForMagnitude(trait.scale, magnitude))
    .sort((a, b) => a - b);
  if (steps.length === 0) return 0;
  const magnitude =
    [...steps].reverse().find((step) => step <= Math.abs(net)) ?? steps[0]!;
  return side * magnitude;
}

/**
 * How many notable qualities an upbringing is allowed to write: one for a
 * small child, two for an older child, three for an adult.
 */
function notableQualityRoom(age: number): number {
  return age < p("upbringingSmallChildAge")
    ? p("one")
    : age < p("childUpperAge")
      ? p("two")
      : p("two") + p("one");
}

/** A resident's opening traits from their upbringing, and the shared source for them. */
export function openingUpbringingTraits(
  draft: OpeningDraft,
  index: OpeningFamilyIndex,
  personId: EntityId,
  registry: readonly RegisteredTrait[],
  source: Source,
): { traits: Record<string, number>; sharedTraitSource: Source } {
  const upbringing = upbringingOf(draft, index, personId);
  const traits: Record<string, number> = {};
  for (const trait of PEOPLE_TRAITS)
    traits[`${PEOPLE_MIND_VERSION}:${trait}`] = coreValue(upbringing, trait);
  const qualities = upbringingQualities(upbringing);
  for (const trait of registry) {
    if (
      trait.pack === PEOPLE_MIND_VERSION ||
      trait.conferredBy !== "seeded" ||
      trait.seed === null
    )
      continue;
    traits[trait.qualifiedKey] = registeredTraitLean(trait, qualities);
  }
  let remaining = notableQualityRoom(
    ageOnDate(draft.people[personId]!.birthDate, draft.currentDate),
  );
  const byKey = new Map(
    registry
      .filter((trait) => trait.pack === PERSONALITY_PACK)
      .map((trait) => [trait.qualifiedKey, trait]),
  );
  for (const quality of qualities) {
    if (remaining <= p("zero")) break;
    const trait = byKey.get(quality.trait);
    if (!trait || (quality.value < p("zero") && isOneSided(trait))) continue;
    traits[quality.trait] = quality.value;
    remaining -= p("one");
  }
  return {
    traits,
    sharedTraitSource: {
      ...source,
      estimatedFrom: `${upbringing.notes.join(" ")} Canonical sparse upbringing trait projection; no traits inferred from names or gender.`,
    },
  };
}
