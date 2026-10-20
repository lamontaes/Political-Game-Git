import { resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, startingLawRows } from "./laws-starting";
import { openingEmploymentFromRecordedRoles } from "./opening-employment";
import { createOpeningEmployerCapital } from "./opening-capital";
import {
  departmentGovernment,
  departmentLinkSource,
  departmentOwnersOf,
} from "./opening-department-pay";
import { openingHistoricalCountyOwnerFacts } from "./opening-public-owner";
import {
  prepareOpeningPublicPayAuthorities,
  type OpeningPublicEmployerIdentity,
} from "./opening-public-pay";
import { canonicalOpeningSchedules } from "./opening-work";
import { openingWorkCommitments } from "./modules/work";
import { openingWorkPayrollCalendars } from "./opening-payroll-calendar";
import coreContent from "./data/content.json" with { type: "json" };
import { realLocalities } from "./places";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "./opening-people";
import {
  ageOnDate,
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
} from "./kernel/dates";
import {
  countyLandSharesForPlace,
  countyPopulationSharesForPlace,
} from "./reference/government-units";
import {
  HOUSEHOLD_MIX_META,
  householdMixForJurisdiction,
  type HouseholdMix,
  type HouseholdShape,
} from "./household-mix";
import { createStableId, stableHash } from "./kernel/ids";
import {
  corePlaceByKey,
  corePlaceByJurisdictionId,
  coreStateJurisdiction,
  type CorePlace,
} from "./place-lookup";
import {
  estimatedMonthlyHouseholdLivingCosts,
  livingCostsRegionForState,
  LIVING_COSTS_SOURCE,
} from "./reference/living-costs-data";
import { organizationProfileAt } from "../simulation/life-queries";
import { ensureTownEmployment } from "../simulation/living-world/town-employment";
import { TOWN_EMPLOYMENT_META } from "../simulation/living-world/town-employment.generated";
import {
  nationalMedianAnnualWage,
  townJobRate,
  townPayPercentile,
  weeklyHoursOf,
} from "./town-pay";
import { TOWN_PAY_META } from "./reference/town-pay.generated";
import { bedroomsForHousehold, hudRentRowFor } from "./hud-rents";
import { TOWN_RENT_META } from "./reference/town-rent.generated";
import {
  TOWN_RESIDENTS_VERSION,
  townHouseholdPeople,
  townHouseholdSkeleton,
  type TownHouseholdSkeleton,
} from "./town-households";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { PEOPLE_MIND_VERSION, PEOPLE_TRAITS } from "./people-mind";
import {
  upbringingCoreValueFrom,
  upbringingFor,
} from "../simulation/people-upbringing";
import {
  notableQualityRoom,
  registeredTraitLean,
  upbringingQualities,
} from "../simulation/people-traits";
import { medianTransactionBalance } from "./starting-cash";
import { seedableTraits } from "./opening-trait-table";
import { PERSONALITY_PACK } from "./personality-catalogue";
import { isOneSided, type RegisteredTrait } from "./trait-packs";
import type {
  EntityId,
  Household,
  HouseholdLocationRecord,
  HouseholdMembership,
  HouseholdMembershipStateRecord,
  IsoDate as WorldDate,
  KinshipRelationship,
  Partnership,
  PartnershipStateRecord,
  World,
} from "../simulation/types";
import {
  assertWorldIntegrity,
  createWorld,
  writeWithWorldIntegrityOnce,
} from "../simulation/world";
import { DEFAULT_CORPUS_VERSION } from "./gov-rules/names-data";
import { drawCanonicalNamedIdentity } from "./person-names";
import {
  defaultPronounsForGender,
  type GenderIdentityKey,
} from "./gov-rules/person-identity";
import { birthCohortGivenName } from "./gov-rules/given-name-cohorts";
import { inventedPersonBirthDate } from "./gov-rules/invented-person-age";
import { SeededRng } from "./kernel/rng";
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { buildOpeningKin, OPENING_KIN } from "./opening-kin";
import { partnerAgedHousehold, partnershipGeo } from "./opening-partnership";
import { openingTemperaments } from "./opening-personality";
import { PARAMETERS, parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type {
  CoreInput,
  HouseholdInput,
  JobInput,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

export interface PopulationOptions {
  seed: string;
  placeKey?: string;
  startedAt: string;
  minimumPeople?: number;
  /** Opening generation only; false preserves the original canonical employment projection. */
  openingEmployment?: boolean;
  /** Independent schedule import switch; runtime can also disable scheduled work. */
  scheduledWork?: boolean;
  /**
   * An age the opening always holds at least one resident of (the bench's
   * player is a 17-year-old who turns 18 in play).
   */
  cohortAge?: number;
}

interface CountyContext {
  place: CorePlace;
  share: number;
}

interface HouseholdPlan {
  stableKey: string;
  id: EntityId;
  skeleton: TownHouseholdSkeleton;
  inputs: readonly CharacterHistoryContextPersonInput[];
  ids: readonly EntityId[];
  countyId?: EntityId;
  /** P15: members who are grown children of `grownChildParents` (opening-partnership.ts). */
  grownChildren?: readonly number[];
  grownChildParents?: readonly number[];
}

/** Each [child, parent] member pair of a household: children under 18 with every adult, and a grown child with their parent. */
function parentChildMembers(plan: HouseholdPlan): [number, number][] {
  // The household's parents: its adults other than grown children living at
  // home, and old enough to have had the child (a grown sibling is not a
  // parent of the younger children).
  const members = plan.skeleton.members;
  const adults = members.flatMap((member, index) =>
    member.role === "adult" && !plan.grownChildren?.includes(index)
      ? [index]
      : [],
  );
  const pairs = members.flatMap((member, child) =>
    member.role === "child"
      ? adults
          .filter(
            (parent) =>
              members[parent]!.age - member.age >= p("minimumParentAgeAtBirth"),
          )
          .map((parent) => [child, parent] as [number, number])
      : [],
  );
  for (const child of plan.grownChildren ?? [])
    for (const parent of plan.grownChildParents ?? [])
      pairs.push([child, parent]);
  return pairs;
}

type FamilyLink = NonNullable<CoreInput["familyLinks"]>[number];

export const POPULATION_VERSION = "p8-population-v1";
const GENERATED_PROVENANCE = {
  kind: "generated" as const,
  generatorKey: TOWN_RESIDENTS_VERSION,
};

/** Geography is distinct from government: a county area need not have a county council. */
function countyContexts(place: CorePlace): readonly CountyContext[] {
  const population = place.sourceGeoid
    ? countyPopulationSharesForPlace(place.sourceGeoid)
    : [];
  const land = place.sourceGeoid
    ? new Map(countyLandSharesForPlace(place.sourceGeoid))
    : new Map<string, number>();
  const rows: CountyContext[] = [];
  for (const [geoid, populationShare] of population) {
    const county = corePlaceByKey(`county:${geoid}`);
    if (county)
      rows.push({
        place: county,
        share: populationShare ?? land.get(geoid) ?? p("zero"),
      });
  }
  if (rows.length > p("zero")) return rows;
  // Declared county equivalents use the same identity loader; this also admits municipios.
  for (const unit of placeLocalGovernmentUnits(place).counties) {
    const county = unit.countyGeoid
      ? corePlaceByKey(`county:${unit.countyGeoid}`)
      : null;
    if (county && !rows.some((row) => row.place.key === county.key))
      rows.push({ place: county, share: p("one") });
  }
  return rows;
}

/** The minimum wage in force on a date at a place, from the starting law, in dollars an hour; null where none is recorded. */
function startMinimumWage(placeKey: string, date: string): number | null {
  const chain = lawChainForPlace(placeKey);
  const answer = resolveLawInForce({
    series: "minimum-wage",
    chain,
    date,
    // Local minimums are not modeled in pay: the state and federal rows only.
    rows: startingLawRows(chain).filter(
      (row) =>
        row.series === "minimum-wage" &&
        (row.level === "federal" || row.level === "state"),
    ),
  });
  return answer.value === null ? null : answer.value / p("minorPerDollar");
}

/** An initialization identity choice among real records, never a behavioral roll. */
function selectedPlace(
  options: PopulationOptions,
  minimumPeople: number,
): CorePlace {
  if (options.placeKey !== undefined) {
    const place = corePlaceByKey(options.placeKey);
    if (!place || place.scope !== "locality")
      throw new Error(
        `Population requires a recorded locality: ${options.placeKey}`,
      );
    return place;
  }
  let selected: CorePlace | undefined;
  let selectedHash: string | undefined;
  for (const place of realLocalities()) {
    if (place.scope !== "locality" || !place.sourceGeoid) continue;
    if (
      (placeReferencePopulation(place.sourceGeoid)?.value ?? p("zero")) <
      minimumPeople
    )
      continue;
    if (countyContexts(place).length !== p("one")) continue;
    const hash = stableHash(
      `${POPULATION_VERSION}:place:${options.seed}:${place.key}`,
    );
    if (selectedHash === undefined || hash < selectedHash) {
      selected = place;
      selectedHash = hash;
    }
  }
  if (!selected)
    throw new Error(
      "No real locality with a sourced county context fits the requested opening cohort.",
    );
  return selected;
}

function estimatedSource(
  startedAt: string,
  citation: string,
  estimatedFrom: string,
): Source {
  return { tag: "ESTIMATED", citation, asOf: startedAt, estimatedFrom };
}

function pair(left: EntityId, right: EntityId): readonly [EntityId, EntityId] {
  return left < right ? [left, right] : [right, left];
}

function yearsBefore(date: WorldDate, years: number): WorldDate {
  const [year, month, day] = date.split("-").map(Number);
  try {
    return isoDateFromParts(year! - years, month!, day!);
  } catch {
    // The only valid source date that becomes invalid in another year is leap day.
    return isoDateFromParts(year! - years, month!, day! - p("one"));
  }
}

/**
 * Same IDs, fields and generated family semantics as materializeTownHousehold/life.ts.
 * Each complete typed history table is appended once; per-person immutable writers
 * would repeatedly copy membership tables. This temporary World is validated before
 * any canonical job/upbringing reader receives it and is discarded after import.
 */
function withFamilyContext(
  world: World,
  plans: readonly HouseholdPlan[],
): World {
  const households: Household[] = [];
  const locations: HouseholdLocationRecord[] = [];
  const memberships: HouseholdMembership[] = [];
  const membershipStates: HouseholdMembershipStateRecord[] = [];
  const kinships: KinshipRelationship[] = [];
  const partnerships: Partnership[] = [];
  const partnershipStates: PartnershipStateRecord[] = [];
  let sequence = world.history.nextSequence;
  const nextSequence = () => {
    const prior = sequence;
    sequence += p("one");
    return prior;
  };
  for (const plan of plans) {
    const provenance = GENERATED_PROVENANCE;
    const today = world.currentDate;
    const label = plan.inputs[p("zero")]!.familyName;
    households.push({
      id: plan.id,
      stableKey: plan.stableKey,
      sequence: nextSequence(),
      formedAt: today,
      label,
      provenance,
    });
    const locationKey = `${plan.stableKey}:location`;
    const home = plan.inputs[p("zero")]!.homeJurisdictionId;
    locations.push({
      id: createStableId("household-location", `${world.id}:${locationKey}`),
      stableKey: locationKey,
      sequence: nextSequence(),
      householdId: plan.id,
      effectiveAt: today,
      jurisdictionId: home,
      label:
        corePlaceByJurisdictionId(home)?.displayName ??
        world.jurisdictions[home]!.name,
      kind: "residence:home",
      provenance,
      supersedesLocationId: null,
    });
    plan.ids.forEach((personId, member) => {
      const key = `${plan.stableKey}:membership:${member}`;
      const id = createStableId("household-membership", `${world.id}:${key}`);
      memberships.push({
        id,
        stableKey: key,
        sequence: nextSequence(),
        personId,
        householdId: plan.id,
        startedAt: today,
        provenance,
      });
      const stateKey = `${key}:state:initial`;
      membershipStates.push({
        id: createStableId(
          "household-membership-state",
          `${world.id}:${stateKey}`,
        ),
        stableKey: stateKey,
        sequence: nextSequence(),
        membershipId: id,
        effectiveAt: today,
        status: "resident",
        residenceRole: "primary",
        kind:
          plan.skeleton.members[member]!.role === "child" ||
          plan.grownChildren?.includes(member)
            ? "resident:child"
            : plan.skeleton.shape === "housemates"
              ? "resident:roommate"
              : member === p("one")
                ? "resident:spouse"
                : "resident:member",
        provenance,
        supersedesStateId: null,
      });
    });
    const adults = plan.skeleton.members
      .map((member, index) => ({ ...member, index }))
      .filter((member) => member.role === "adult");
    if (
      plan.skeleton.shape === "couple" ||
      plan.skeleton.shape === "couple-with-children"
    ) {
      const key = `${plan.stableKey}:partnership`;
      const id = createStableId("partnership", `${world.id}:${key}`);
      const startedAt = yearsBefore(
        today,
        Math.max(
          p("zero"),
          Math.min(...adults.map((adult) => adult.age)) -
            p("marriageReferenceAge"),
        ),
      );
      partnerships.push({
        id,
        stableKey: key,
        sequence: nextSequence(),
        personIds: pair(plan.ids[p("zero")]!, plan.ids[p("one")]!),
        startedAt,
        kind: "legal:marriage",
        provenance,
      });
      const stateKey = `${key}:state:initial`;
      partnershipStates.push({
        id: createStableId("partnership-state", `${world.id}:${stateKey}`),
        stableKey: stateKey,
        sequence: nextSequence(),
        partnershipId: id,
        effectiveAt: startedAt,
        status: "active",
        provenance,
        supersedesStateId: null,
      });
    }
    for (const [child, parent] of parentChildMembers(plan)) {
      const key = `${plan.stableKey}:kinship:${child}:${parent}`;
      kinships.push({
        id: createStableId("kinship", `${world.id}:${key}`),
        stableKey: key,
        sequence: nextSequence(),
        personIds: pair(plan.ids[child]!, plan.ids[parent]!),
        establishedAt: plan.inputs[child]!.birthDate,
        kind: "lineal:parent-child",
        provenance,
      });
    }
  }
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      households: [...world.history.households, ...households],
      householdLocations: [...world.history.householdLocations, ...locations],
      householdMemberships: [
        ...world.history.householdMemberships,
        ...memberships,
      ],
      householdMembershipStates: [
        ...world.history.householdMembershipStates,
        ...membershipStates,
      ],
      kinshipRelationships: [
        ...world.history.kinshipRelationships,
        ...kinships,
      ],
      partnerships: [...world.history.partnerships, ...partnerships],
      partnershipStates: [
        ...world.history.partnershipStates,
        ...partnershipStates,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function openingTraits(
  world: World,
  personId: EntityId,
  registry: readonly RegisteredTrait[],
  source: Source,
) {
  const upbringing = upbringingFor(world, personId);
  const traits: Record<string, number> = {};
  for (const trait of PEOPLE_TRAITS)
    traits[`${PEOPLE_MIND_VERSION}:${trait}`] = upbringingCoreValueFrom(
      upbringing,
      trait,
    );
  const qualities = upbringingQualities(upbringing);
  for (const trait of registry) {
    if (
      trait.pack === PEOPLE_MIND_VERSION ||
      trait.conferredBy !== "seeded" ||
      trait.seed === null
    )
      continue;
    traits[trait.qualifiedKey] = registeredTraitLean(trait, qualities).value;
  }
  let remaining = notableQualityRoom(
    ageOnDate(world.people[personId]!.birthDate, world.currentDate),
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
  const explanation = [
    upbringing.familyContext?.source.note,
    upbringing.recordedLean?.source.note,
    ...upbringing.money.map((row) => row.source.note),
  ]
    .filter(Boolean)
    .join(" ");
  const traitSource = {
    ...source,
    estimatedFrom: `${explanation} Canonical sparse upbringing trait projection; no traits inferred from names or gender.`,
  };
  return { traits, sharedTraitSource: traitSource };
}

/** One-time legacy-source importer; no legacy clock, world generation or advance. */
export function buildPopulation(options: PopulationOptions): CoreInput {
  const target = options.minimumPeople ?? p("targetPopulation");
  if (!Number.isSafeInteger(target) || target < p("one"))
    throw new Error("Opening population must be a positive whole count.");
  const startedAt = makeIsoDate(options.startedAt);
  const place = selectedPlace(options, target);
  // A town smaller than the target opens at its real size (its Census
  // reference population); a size asked for by name is kept as asked.
  const real = place.sourceGeoid
    ? placeReferencePopulation(place.sourceGeoid)?.value
    : undefined;
  const minimumPeople =
    options.minimumPeople === undefined &&
    real !== undefined &&
    real >= p("one")
      ? Math.min(target, real)
      : target;
  const town = place.context.jurisdiction.id;
  // The floor the opening's pay rests on is the minimum wage the starting law
  // gives on the start date (dollars an hour), not a later year's rate.
  const startMinimumHourly = startMinimumWage(place.key, startedAt);
  const counties = countyContexts(place);
  const jurisdictions = new Map([[town, place.context.jurisdiction]]);
  if (place.stateJurisdictionKey) {
    const state = coreStateJurisdiction(place.stateJurisdictionKey);
    if (state) jurisdictions.set(state.id, state);
  }
  for (const county of counties)
    jurisdictions.set(
      county.place.context.jurisdiction.id,
      county.place.context.jurisdiction,
    );
  const seedWorld = createWorld({
    seed: `${POPULATION_VERSION}:${options.seed}:${place.key}`,
    currentDate: startedAt,
    jurisdictions: [...jurisdictions.values()],
    people: [],
  });
  const mix = householdMixForJurisdiction(town);
  const source = estimatedSource(
    startedAt,
    `${HOUSEHOLD_MIX_META.source} ${TOWN_RESIDENTS_VERSION}; ${place.context.jurisdiction.provenance.source ?? "recorded locality identity"}; ${LIVING_COSTS_SOURCE}; ${TOWN_RENT_META.fairMarketRents}; Federal Reserve SCF 2022 Tables 1/6; src/simulation/people-upbringing.ts.`,
    `Generated opening cohort at ${startedAt}; ${mix.basis} household mix held from ACS 2020–2024, identities from existing Gazetteer/territory provider. This is not an observed census roster. Opening money is a household SCF reserve or labeled expense buffer, apportioned among adults; costs are CES categories plus a hypothetical HUD shelter budget, not observed bills.`,
  );
  stopgap("SG-P8-family-network-coverage");
  stopgap("SG-P8-person-trait-diversity");
  const gaps = new Set<string>([
    `Opening vintage: ${startedAt} household and population estimates are calibrated from the latest source vintages, which calibrate the world without dating it.`,
    "Deep past: schools, faith, losses, earlier residences and earlier jobs are absent unless the canonical opening generator establishes them; no event inferred from a trait.",
    "Labor context: no school enrollment, primary care responsibility, pensions, business books or funded public staffing imported; canonical matcher reads the records actually present.",
    "Money: CES nonhousing categories and a hypothetical HUD shelter budget exclude actual tenure, debts, taxes, insurance contracts and medical service bills; no housing contract is invented.",
  ]);
  if (counties.length === p("zero"))
    gaps.add(
      `County context absent from existing geographic/county-equivalent records for ${place.displayName}; no county authority invented.`,
    );
  if (counties.length > p("one"))
    gaps.add(
      "County allocation keeps whole households by largest population-share deficit; existing job and pay sources retain their own multi-county blend/first-area semantics.",
    );
  const plans: HouseholdPlan[] = [];
  const inputs: CharacterHistoryContextPersonInput[] = [];
  const allocated = new Map(
    counties.map((county) => [county.place.key, p("zero")]),
  );
  const totalShare = counties.reduce(
    (sum, county) => sum + county.share,
    p("zero"),
  );
  // P15: members are aged from the place's records by household type, and
  // some housemates are a parent and grown child (opening-partnership.ts).
  const drawHousehold = (index: number, shape?: HouseholdShape) =>
    partnerAgedHousehold({
      seed: options.seed,
      geo: partnershipGeo(corePlaceByJurisdictionId(town)?.sourceGeoid),
      skeleton: townHouseholdSkeleton(seedWorld.seed, town, index, shape),
      people: townHouseholdPeople(seedWorld, town, index, shape),
      rebirth: (person, age, sex) => {
        const birthDate = inventedPersonBirthDate(
          new SeededRng(seedWorld.seed).fork(`${person.stableKey}:p15-birth`),
          {
            role: "household-member",
            referenceDate: startedAt,
            age,
            placement: "drawn-exact",
          },
        );
        // A sex drawn with age brings its own pronouns and first name.
        const identity =
          sex && sex !== person.identity?.gender
            ? { gender: sex, pronouns: defaultPronounsForGender(sex) }
            : person.identity;
        const drawnName =
          identity === person.identity || !identity
            ? person.givenName
            : drawCanonicalNamedIdentity(
                new SeededRng(seedWorld.seed)
                  .fork(`${person.stableKey}:p15-sex`)
                  .fork("name"),
                identity,
                { corpusVersion: DEFAULT_CORPUS_VERSION },
              ).givenName;
        const gender = identity?.gender as GenderIdentityKey | undefined;
        return {
          ...person,
          birthDate,
          ...(identity ? { identity } : {}),
          givenName: gender
            ? birthCohortGivenName(seedWorld.seed, person.stableKey, {
                givenName: drawnName,
                familyName: person.familyName,
                birthDate,
                gender,
              })
            : drawnName,
        };
      },
      addPerson: (key, sex, age, familyName) => {
        const identity = {
          gender: sex,
          pronouns: defaultPronounsForGender(sex),
        };
        const named = drawCanonicalNamedIdentity(
          new SeededRng(seedWorld.seed).fork(key).fork("name"),
          identity,
          { corpusVersion: DEFAULT_CORPUS_VERSION },
        );
        const birthDate = inventedPersonBirthDate(
          new SeededRng(seedWorld.seed).fork(`${key}:p15-birth`),
          {
            role: "household-member",
            referenceDate: startedAt,
            age,
            placement: "drawn-exact",
          },
        );
        const surname = familyName ?? named.familyName;
        return {
          stableKey: key,
          givenName: birthCohortGivenName(seedWorld.seed, key, {
            givenName: named.givenName,
            familyName: surname,
            birthDate,
            gender: sex,
          }),
          familyName: surname,
          identity,
          birthDate,
          homeJurisdictionId: town,
        };
      },
    });
  const addHousehold = (
    index: number,
    {
      skeleton,
      people: householdPeople,
      grownChildren,
      grownChildParents,
    }: ReturnType<typeof drawHousehold>,
  ) => {
    const stableKey = `${TOWN_RESIDENTS_VERSION}:${town}:household:${index}`;
    const county = [...counties].sort((left, right) => {
      const gap = (row: CountyContext) =>
        (totalShare > p("zero")
          ? row.share / totalShare
          : p("one") / counties.length) *
          (inputs.length + householdPeople.length) -
        allocated.get(row.place.key)!;
      return (
        gap(right) - gap(left) || left.place.key.localeCompare(right.place.key)
      );
    })[p("zero")];
    if (county)
      allocated.set(
        county.place.key,
        allocated.get(county.place.key)! + householdPeople.length,
      );
    plans.push({
      stableKey,
      id: createStableId("household", `${seedWorld.id}:${stableKey}`),
      skeleton,
      inputs: householdPeople,
      ids: householdPeople.map((person) =>
        characterHistoryContextPersonId(seedWorld, person.stableKey),
      ),
      ...(county ? { countyId: county.place.context.jurisdiction.id } : {}),
      ...(grownChildren.length ? { grownChildren, grownChildParents } : {}),
    });
    inputs.push(...householdPeople);
  };
  let index = p("zero");
  for (; inputs.length < minimumPeople; index += p("one"))
    addHousehold(index, drawHousehold(index));
  // The player's cohort: a town whose own sample shows no family with a
  // child that age (a small place's survey count can show none at all)
  // still opens with one. The town's next households are drawn as families,
  // in the place's split of couples and single parents with children (the
  // nation's where the place shows neither), and the first holding a child
  // that age moves in, every member aged from the place's records as above.
  const cohortAge = options.cohortAge;
  const ofCohort = (person: CharacterHistoryContextPersonInput) =>
    ageOnDate(makeIsoDate(person.birthDate), startedAt) === cohortAge;
  if (cohortAge !== undefined && !inputs.some(ofCohort)) {
    const familyShares = (shares: HouseholdMix["shares"]) =>
      shares.filter(
        ([shape, share]) =>
          share > p("zero") &&
          (shape === "couple-with-children" ||
            shape === "parent-with-children"),
      );
    const families = familyShares(mix.shares).length
      ? familyShares(mix.shares)
      : familyShares(householdMixForJurisdiction(null).shares);
    const total = families.reduce((sum, [, share]) => sum + share, p("zero"));
    // Searched no further than as many households again as the town has, and
    // never fewer than the floor: a town of a few people has a few households.
    const last =
      index + Math.max(plans.length, p("cohortSearchMinimumHouseholds"));
    for (; ; index += p("one")) {
      if (index > last)
        throw new Error(
          `No household of ${place.displayName} holds a resident aged ${cohortAge}.`,
        );
      let point =
        new SeededRng(seedWorld.seed)
          .fork(`${TOWN_RESIDENTS_VERSION}:${town}:household:${index}:cohort`)
          .next() * total;
      const shape =
        families.find(([, share]) => (point -= share) < p("zero"))?.[0] ??
        families.at(-1)![0];
      const drawn = drawHousehold(index, shape);
      if (drawn.people.some(ofCohort)) {
        addHousehold(index, drawn);
        break;
      }
    }
  }
  const peopleWorld = withFamilyContext(
    createCharacterHistoryContextPeople(seedWorld, inputs),
    plans,
  );
  stopgap("SG-P8-authored-job-mix");
  const world = writeWithWorldIntegrityOnce(peopleWorld, () =>
    ensureTownEmployment(peopleWorld, town, null),
  );
  const employmentSource = estimatedSource(
    startedAt,
    `${TOWN_EMPLOYMENT_META.countyBusinessPatterns.source} ${TOWN_EMPLOYMENT_META.publicEmployment.source} src/simulation/living-world/town-employment.ts`,
    "Existing deterministic matcher and authored workplace/role mix, interpreted as an opening estimate; employment vintages are not observed opening-day jobs.",
  );
  const roles = new Map(
    world.history.workRoles
      .filter((role) => role.effectiveAt <= startedAt)
      .map((role) => [role.workRelationshipId, role]),
  );
  const workById = new Map(
    world.history.workRelationships.map((relationship) => [
      relationship.id,
      relationship,
    ]),
  );
  const openingStatuses = new Map(
    world.history.workStatuses
      .filter((row) => row.effectiveAt <= startedAt)
      .map((row) => [row.workRelationshipId, row.status]),
  );
  const jobs: JobInput[] = [];
  const jobByPerson = new Map<string, JobInput>();
  for (const relationship of world.history.workRelationships) {
    const role = roles.get(relationship.id);
    if (
      !role ||
      !relationship.organizationId ||
      relationship.startedAt > startedAt ||
      openingStatuses.get(relationship.id) !== "active" ||
      relationship.compensation !== "paid"
    )
      continue;
    const hoursDaily = weeklyHoursOf(role) / p("daysPerWeek");
    const percentile = townPayPercentile(
      daysBetween(relationship.startedAt, startedAt) / p("daysPerMeanYear"),
    );
    const rate = townJobRate(
      role.occupationClassification,
      role.locationJurisdictionId,
      percentile,
      startMinimumHourly,
    );
    const fallbackAnnual = role.occupationClassification
      ? nationalMedianAnnualWage(role.occupationClassification)
      : null;
    const hourlyMinor =
      rate?.hourlyMinor ??
      (fallbackAnnual === null
        ? p("fallbackAnnualWageMinor") / p("annualWorkHours")
        : (fallbackAnnual * p("minorPerDollar")) / p("annualWorkHours"));
    if (!rate)
      gaps.add(
        `Estimated pay fallback for ${role.occupationClassification ?? role.title}; retained recorded job, no measured local wage claimed.`,
      );
    const wageCitation =
      !rate && fallbackAnnual === null
        ? PARAMETERS.fallbackAnnualWageMinor!.citation
        : TOWN_PAY_META.wages;
    const job: JobInput = {
      id: relationship.id,
      personId: relationship.personId,
      organizationId: relationship.organizationId,
      title: role.title,
      occupationClassification: role.occupationClassification ?? undefined,
      hoursDaily,
      hourlyMinor: Math.round(hourlyMinor),
      wageDailyMinor: Math.round(hourlyMinor * hoursDaily),
      source: estimatedSource(
        startedAt,
        `${wageCitation} ${employmentSource.citation}`,
        `${rate ? `SOC ${rate.soc}, area ${rate.area}, percentile ${rate.percentile}` : "National same-occupation median or registered missing-occupation fallback"}; weekly hours from the generated role; calendar-day average. Job tenure, wage and minimum floor are opening proxies, not historical contracts.`,
      ),
    };
    jobs.push(job);
    jobByPerson.set(job.personId, job);
  }
  const countyGeoidByPerson = new Map<string, string>();
  for (const plan of plans) {
    const county = counties.find(
      (row) => row.place.context.jurisdiction.id === plan.countyId,
    );
    if (county?.place.sourceGeoid)
      for (const id of plan.ids)
        countyGeoidByPerson.set(id, county.place.sourceGeoid);
  }
  const openingAllocation =
    options.openingEmployment === false
      ? {
          jobs: [],
          startedAtByJob: new Map<string, WorldDate>(),
          templateJobIdByJob: new Map<string, string>(),
          receipt: { enabled: false, omitted: [], ageTargets: [] },
        }
      : openingEmploymentFromRecordedRoles(
          world,
          town,
          options.seed,
          undefined,
          countyGeoidByPerson,
          undefined,
          startMinimumHourly ?? undefined,
        );
  for (const job of openingAllocation.jobs) {
    jobs.push(job);
    jobByPerson.set(job.personId, job);
  }
  if (openingAllocation.receipt.omitted.length)
    gaps.add(
      "Unsupported opening workplace/occupation shares remain omitted; unassigned actors are not declared unemployed.",
    );
  if (
    openingAllocation.receipt.ageTargets.some(
      (row) => !row.basis.startsWith("county-ACS-"),
    )
  )
    gaps.add(
      "Opening employment uses national CPS age priors with tunable missing-county scaling; no sourced local or territorial employment rate is claimed.",
    );
  const publicPayIdentities: OpeningPublicEmployerIdentity[] = [];
  const departmentOwners = departmentOwnersOf(place);
  const historicalCountyPayingOwnerIds: Record<string, string> = {};
  const organizations: OrganizationInput[] = world.history.organizations.map(
    (organization) => {
      const profile = organizationProfileAt(world, organization.id)!;
      const publicOwner = openingHistoricalCountyOwnerFacts({
        organizationId: organization.id,
        organizationStableKey: organization.stableKey,
        worldId: world.id,
        name: profile.name,
        classification: profile.classification,
        placeId: profile.locationJurisdictionId ?? town,
        startedAt,
      });
      for (const gap of publicOwner.gaps) gaps.add(gap);
      const department = publicOwner.governmentFacts
        ? undefined
        : departmentGovernment(profile.classification, departmentOwners);
      if (publicOwner.governmentFacts && publicOwner.identitySource) {
        const governmentKey = publicOwner.governmentFacts.governmentKey!;
        const priorOwnerId = historicalCountyPayingOwnerIds[governmentKey];
        if (priorOwnerId !== undefined && priorOwnerId !== organization.id)
          throw new Error(
            `Ambiguous actual historical county account: ${governmentKey}`,
          );
        historicalCountyPayingOwnerIds[governmentKey] = organization.id;
        publicPayIdentities.push({
          organizationId: organization.id,
          identity: {
            kind: "local-government",
            governmentKey: publicOwner.governmentFacts.governmentKey!,
            jurisdictionId: publicOwner.governmentFacts
              .governmentJurisdictionId! as EntityId,
          },
          basisRecordIds: [
            publicOwner.governmentFacts["openingPublicOwner.recordId"]!,
          ],
          source: publicOwner.identitySource,
        });
      } else if (!profile.publicGovernmentIdentity && department) {
        stopgap("SG-WORLD-department-government");
        publicPayIdentities.push({
          organizationId: organization.id,
          identity: department.identity,
          basisRecordIds: [profile.id],
          source: departmentLinkSource(employmentSource, profile.id),
        });
      } else if (profile.publicGovernmentIdentity) {
        publicPayIdentities.push({
          organizationId: organization.id,
          identity: profile.publicGovernmentIdentity,
          basisRecordIds: [profile.id],
          source: {
            ...employmentSource,
            citation: `${employmentSource.citation} Actual saved organization profile ${profile.id}, effective ${profile.effectiveAt}; government identity is an owner link, not appropriation.`,
          },
        });
      }
      return {
        id: organization.id,
        placeId: profile.locationJurisdictionId ?? town,
        name: profile.name,
        kind: "employer",
        classification: profile.classification,
        governmentFacts:
          publicOwner.governmentFacts ??
          department?.governmentFacts ??
          (profile.publicGovernmentIdentity
            ? {
                governmentKind: profile.publicGovernmentIdentity.kind,
                governmentJurisdictionId:
                  profile.publicGovernmentIdentity.jurisdictionId,
                ...("governmentKey" in profile.publicGovernmentIdentity
                  ? {
                      governmentKey:
                        profile.publicGovernmentIdentity.governmentKey,
                    }
                  : {}),
              }
            : undefined),
        // Fresh opening stocks are bound after the actual schedule plans below.
        liquidMinor: p("zero"),
        source: employmentSource,
      };
    },
  );
  const households: HouseholdInput[] = plans.map((plan) => ({
    id: plan.id,
    placeId: town,
    memberIds: plan.ids,
    source,
  }));
  const familyLinks: FamilyLink[] = [];
  const familyPast = new Map<
    string,
    NonNullable<PersonInput["pastFacts"]>[number][]
  >();
  const partnershipsById = new Map(
    world.history.partnerships.map((partnership) => [
      partnership.id,
      partnership,
    ]),
  );
  const recordFamilyPast = (
    personId: EntityId,
    otherId: EntityId,
    id: string,
    date: WorldDate,
    relation: string,
  ) => {
    const other = world.people[otherId]!;
    const rows = familyPast.get(personId) ?? [];
    rows.push({
      id: `${id}:past:${personId}`,
      date,
      kind: `family:${relation}`,
      summary: `${other.givenName} ${other.familyName} is recorded as this person's ${relation} in the generated opening household.`,
      source,
      // M0-06: the relative's own record, not only their name in the summary.
      facts: { otherPersonId: otherId },
    });
    familyPast.set(personId, rows);
  };
  const familyByPerson = new Map<string, Set<string>>();
  const knownByPerson = new Map<string, readonly string[]>();
  const link = (left: EntityId, right: EntityId) => {
    const leftFamily = familyByPerson.get(left) ?? new Set<string>();
    leftFamily.add(right);
    familyByPerson.set(left, leftFamily);
    const rightFamily = familyByPerson.get(right) ?? new Set<string>();
    rightFamily.add(left);
    familyByPerson.set(right, rightFamily);
  };
  const living = new Map<string, number>();
  const cash = new Map<string, number>();
  const rent = hudRentRowFor(town);
  if (!rent)
    gaps.add(
      `No HUD shelter budget covers ${place.displayName}; only sourced nonhousing categories retained.`,
    );
  for (const plan of plans) {
    const adults = plan.ids.filter(
      (_, member) => plan.skeleton.members[member]!.role === "adult",
    );
    const children = plan.ids.filter(
      (_, member) => plan.skeleton.members[member]!.role === "child",
    );
    if (
      plan.skeleton.shape === "couple" ||
      plan.skeleton.shape === "couple-with-children"
    ) {
      const id = createStableId(
        "partnership",
        `${world.id}:${plan.stableKey}:partnership`,
      );
      familyLinks.push({
        id,
        kind: "partner",
        personIds: [adults[p("zero")]!, adults[p("one")]!],
      });
      link(adults[p("zero")]!, adults[p("one")]!);
      recordFamilyPast(
        adults[p("zero")]!,
        adults[p("one")]!,
        id,
        partnershipsById.get(id)!.startedAt,
        "partner",
      );
      recordFamilyPast(
        adults[p("one")]!,
        adults[p("zero")]!,
        id,
        partnershipsById.get(id)!.startedAt,
        "partner",
      );
    }
    for (const [childMember, parentMember] of parentChildMembers(plan)) {
      const child = plan.ids[childMember]!;
      const parent = plan.ids[parentMember]!;
      const id = createStableId(
        "kinship",
        `${world.id}:${plan.stableKey}:kinship:${childMember}:${parentMember}`,
      );
      familyLinks.push({
        id,
        kind: "parent-child",
        personIds: [parent, child],
      });
      link(parent, child);
      recordFamilyPast(
        child,
        parent,
        id,
        world.people[child]!.birthDate,
        "parent",
      );
      recordFamilyPast(
        parent,
        child,
        id,
        world.people[child]!.birthDate,
        "child",
      );
    }
    // Children at home, minors and grown, are each other's siblings.
    const siblings = [
      ...children,
      ...(plan.grownChildren ?? []).map((member) => plan.ids[member]!),
    ];
    for (const child of siblings) {
      for (const sibling of siblings) {
        if (sibling === child) continue;
        link(child, sibling);
        const born = [
          world.people[child]!.birthDate,
          world.people[sibling]!.birthDate,
        ].sort();
        recordFamilyPast(
          child,
          sibling,
          `${plan.stableKey}:sibling:${[child, sibling].sort().join(":")}`,
          born[p("one")]!,
          "sibling",
        );
      }
    }
    for (const id of plan.ids)
      knownByPerson.set(
        id,
        plan.ids.filter((member) => member !== id),
      );
    const costs = estimatedMonthlyHouseholdLivingCosts(
      livingCostsRegionForState(place.stateJurisdictionKey),
      plan.ids.length,
    );
    const monthlyShelterMinor = rent
      ? rent.rents[bedroomsForHousehold(plan.ids.length)]! * p("minorPerDollar")
      : p("zero");
    const householdDailyCost = Math.round(
      ((costs.monthlyMinor + monthlyShelterMinor) * p("monthsPerYear")) /
        p("daysPerMeanYear"),
    );
    const dailyPay = plan.ids.reduce(
      (sum, id) => sum + (jobByPerson.get(id)?.wageDailyMinor ?? p("zero")),
      p("zero"),
    );
    const reserve =
      dailyPay > p("zero")
        ? Math.round(
            medianTransactionBalance(
              (dailyPay * p("daysPerMeanYear")) / p("minorPerDollar"),
            ) * p("minorPerDollar"),
          )
        : householdDailyCost * p("moneyBufferDays");
    for (const id of plan.ids) {
      const adultIndex = adults.indexOf(id);
      const share = (total: number) =>
        Math.floor(total / adults.length) +
        (adultIndex < total % adults.length ? p("one") : p("zero"));
      living.set(
        id,
        adultIndex >= p("zero") ? share(householdDailyCost) : p("zero"),
      );
      cash.set(id, adultIndex >= p("zero") ? share(reserve) : p("zero"));
    }
  }
  const planByPerson = new Map(
    plans.flatMap((plan) => plan.ids.map((id) => [id, plan] as const)),
  );
  const registry = seedableTraits();
  const people: PersonInput[] = world.personOrder.map((id) => {
    const person = world.people[id]!;
    const plan = planByPerson.get(id)!;
    const job = jobByPerson.get(id);
    const pastFacts = [
      ...(person.establishedFacts ?? []).map((fact) => ({
        id: fact.id,
        date: fact.occurredAt,
        kind: fact.kind,
        summary: fact.summary,
        source,
        facts: {
          ...(fact.jurisdictionId ? { placeId: fact.jurisdictionId } : {}),
          ...("endedAt" in fact && fact.endedAt
            ? { endedAt: fact.endedAt }
            : {}),
        },
      })),
      ...(familyPast.get(id) ?? []),
    ];
    if (job) {
      const relationship = workById.get(job.id as EntityId);
      const workStartedAt =
        relationship?.startedAt ?? openingAllocation.startedAtByJob.get(job.id);
      if (!workStartedAt)
        throw new Error("Opening job has no admitted source start date.");
      pastFacts.push({
        id: `${job.id}:past:opening`,
        date: workStartedAt,
        kind: "work:opening",
        summary: `The generated opening job as ${job.title} has an estimated start on ${workStartedAt}.`,
        source: job.source,
      });
    }
    return {
      id,
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate,
      placeId: town,
      ...(plan.countyId ? { countyId: plan.countyId } : {}),
      householdId: plan.id,
      tier: coreContent.openingTier,
      ...openingTraits(world, id, registry, source),
      liquidMinor: cash.get(id)!,
      livingCostDailyMinor: living.get(id)!,
      source,
      familyIds: [...(familyByPerson.get(id) ?? [])].sort(),
      knownIds: knownByPerson.get(id)!,
      ...(job ? { jobId: job.id } : {}),
      looks: {
        ...(person.identity
          ? {
              gender: person.identity.gender,
              pronouns: person.identity.pronouns,
            }
          : {}),
        ...(person.appearance
          ? {
              appearanceSeed: person.appearance.seed,
              recipeVersion: person.appearance.recipeVersion,
            }
          : {}),
      },
      pastFacts,
    };
  });
  const plannedCommitments = openingWorkCommitments(
    jobs,
    organizations,
    startedAt,
    undefined,
    undefined,
    canonicalOpeningSchedules(
      world,
      jobs,
      openingAllocation.templateJobIdByJob,
    ),
  );
  // A job states the week its schedule runs: the hourly rate (the occupation's
  // market rate) is paid for those minutes, so the stated hours and daily pay
  // follow them, and a hire that copies the job copies the same week.
  const scheduledMinutes = new Map(
    plannedCommitments.map((row) => [row.jobId, row.expectedWeeklyMinutes]),
  );
  for (const [index, job] of jobs.entries()) {
    const minutes = scheduledMinutes.get(job.id);
    if (minutes === undefined || !(minutes > p("zero"))) continue;
    const hoursDaily = minutes / p("minutesPerHour") / p("daysPerWeek");
    if (hoursDaily === job.hoursDaily) continue;
    const hourlyMinor =
      job.hourlyMinor ?? Math.round(job.wageDailyMinor / job.hoursDaily);
    jobs[index] = {
      ...job,
      hoursDaily,
      wageDailyMinor: Math.round(hourlyMinor * hoursDaily),
    };
  }
  const openingCapital = createOpeningEmployerCapital(
    {
      seed: options.seed,
      startedAt,
      people,
      jobs,
      organizations,
      workCommitments: plannedCommitments,
    },
    new Set(organizations.map((organization) => organization.id)),
  );
  const publicPay = prepareOpeningPublicPayAuthorities(
    {
      startedAt,
      people,
      jobs,
      organizations: openingCapital.organizations,
      workCommitments:
        options.scheduledWork === false ? [] : plannedCommitments,
    },
    publicPayIdentities,
    { ownerIdByGovernmentKey: historicalCountyPayingOwnerIds },
  );
  const payroll = openingWorkPayrollCalendars({
    seed: options.seed,
    startedAt,
    people,
    jobs,
    organizations: publicPay.organizations,
    workCommitments: publicPay.workCommitments,
  });
  const family = openingFamilies({
    seed: options.seed,
    world,
    town,
    stateId: place.stateJurisdictionKey
      ? coreStateJurisdiction(place.stateJurisdictionKey)?.id
      : undefined,
    stateKey: place.stateJurisdictionKey ?? undefined,
    startedAt,
    plans,
    people,
    source,
  });
  stopgap("SG-P15-kin-generation");
  return {
    seed: options.seed,
    startedAt,
    people: family.people,
    households: [...households, ...family.households],
    jobs,
    organizations: publicPay.organizations,
    workCommitments: payroll.workCommitments,
    workPayrollCalendars: payroll.calendars,
    familyLinks: [...familyLinks, ...family.familyLinks],
    focusPersonIds: [],
    focusPlaceIds: [],
    visiblePlaceIds: [
      town,
      ...counties.map((county) => county.place.context.jurisdiction.id),
    ],
    calendarDates: [],
    gaps: [...gaps, ...openingCapital.gaps, ...publicPay.gaps, ...payroll.gaps],
    placeMetadata: {
      openingEmploymentReceipt: JSON.stringify(openingAllocation.receipt),
      openingPayrollCalendarReceipt: JSON.stringify({
        status: "MODELED_PAY_CALENDARS_ONLY_NO_EARNINGS_OR_CASH",
        estimates: payroll.estimates,
        gaps: payroll.gaps,
      }),
      openingPublicPayReceipt: JSON.stringify({
        status: "MODELED_ZERO_STOCK_DUE_FLOW_LINKS_ONLY",
        authorities: publicPay.authorities,
        outsideOwnerIds: publicPay.outsideOwnerIds,
        gaps: publicPay.gaps,
      }),
      openingEmployerCashReceipt: JSON.stringify({
        estimates: openingCapital.estimates,
        scheduleBasis:
          options.scheduledWork === false
            ? "Generated opening plans used for stock estimation; runtime work commitments disabled."
            : "Returned recorded opening work commitments; no future attendance or payment assumed.",
      }),
      placeKey: place.key,
      placeName: place.displayName,
      countyNames: counties
        .map((county) => county.place.displayName)
        .join("; "),
      countyBasis: counties.length
        ? "recorded-geography-or-declared-county-equivalent"
        : "not-established",
      householdMixBasis: mix.basis,
      referencePopulation: String(
        place.sourceGeoid
          ? (placeReferencePopulation(place.sourceGeoid)?.value ?? "not-held")
          : "not-held",
      ),
      referencePopulationSource: place.sourceGeoid
        ? (placeReferencePopulation(place.sourceGeoid)?.source ?? "not-held")
        : "not-held",
      livingCostSource: `${LIVING_COSTS_SOURCE}; ${TOWN_RENT_META.fairMarketRents}`,
      cashSource:
        "Federal Reserve SCF 2022 tables 1/6, families holding transaction accounts; src/core2/starting-cash.ts. No-job household reserve is an explicit expense-buffer estimate.",
      temporaryWorld:
        "Valid createWorld plus one person batch, one family-table batch and one canonical town employment batch; never advanced or returned.",
    },
  };
}

interface OpeningFamilyInput {
  seed: string;
  world: World;
  town: EntityId;
  stateId?: string;
  /** The state's USPS jurisdiction key ("US-CA"), for its ACS leaving rates. */
  stateKey?: string;
  startedAt: WorldDate;
  plans: readonly HouseholdPlan[];
  people: readonly PersonInput[];
  source: Source;
}

/**
 * P15: every resident's kin outside the household as husk-tier people, and the
 * five temperament dimensions spread to real norms for residents and kin alike.
 */
function openingFamilies(input: OpeningFamilyInput): {
  people: PersonInput[];
  households: HouseholdInput[];
  familyLinks: FamilyLink[];
} {
  const { world, startedAt, source } = input;
  const kin = buildOpeningKin(
    input.plans.map((plan) => ({
      id: plan.id,
      stableKey: plan.stableKey,
      couple:
        plan.skeleton.shape === "couple" ||
        plan.skeleton.shape === "couple-with-children",
      ...(plan.countyId ? { countyId: plan.countyId } : {}),
      members: plan.ids.map((id, member) => ({
        id,
        // A grown child at home is their parent's child in the kin model.
        role: plan.grownChildren?.includes(member)
          ? ("child" as const)
          : plan.skeleton.members[member]!.role,
        birthDate: world.people[id]!.birthDate,
        ...(world.people[id]!.identity
          ? { gender: world.people[id]!.identity!.gender }
          : {}),
        familyName: world.people[id]!.familyName,
      })),
    })),
    {
      seed: input.seed,
      worldId: world.id,
      startedAt,
      townId: input.town,
      ...(input.stateId ? { stateId: input.stateId } : {}),
      departurePerYearByAge: (
        moverRates.places[input.stateKey as keyof typeof moverRates.places] ??
        moverRates.national
      ).departurePerYearByAge,
      name: ({ stableKey, gender, birthDate, familyName }) => {
        const key = gender as GenderIdentityKey;
        const named = drawCanonicalNamedIdentity(
          new SeededRng(world.seed).fork(stableKey).fork("name"),
          { gender: key, pronouns: defaultPronounsForGender(key) },
          { corpusVersion: DEFAULT_CORPUS_VERSION },
        );
        const surname = familyName ?? named.familyName;
        return {
          familyName: surname,
          givenName: birthCohortGivenName(world.seed, stableKey, {
            givenName: named.givenName,
            familyName: surname,
            birthDate: makeIsoDate(birthDate),
            gender: key,
          }),
        };
      },
    },
  );
  const names = new Map<string, string>();
  for (const person of input.people)
    names.set(person.id, `${person.givenName} ${person.familyName}`);
  for (const person of kin.people)
    names.set(person.id, `${person.givenName} ${person.familyName}`);
  const byPerson = new Map<string, typeof kin.relations>();
  for (const row of kin.relations) {
    const rows = byPerson.get(row.personId) ?? [];
    rows.push(row);
    byPerson.set(row.personId, rows);
  }
  const kinSource: Source = {
    ...source,
    // Kin sources only; the town's housing and money sources stay on the households.
    citation: `${OPENING_KIN.householdBasis} ${OPENING_KIN.completedFertility.citation} ${OPENING_KIN.fertilityByAge.citation} ${OPENING_KIN.firstBirthAge.citation} SSA cohort life tables by birth year (Actuarial Study No. 120).`,
    estimatedFrom:
      "Generated opening kin: who exists follows the life table and Census fertility by cohort and age; relatives outside the household are husk-tier records, not observed people.",
  };
  // P15 part 3: each recorded move is a dated fact on the person who moved.
  const movesOf = new Map<string, typeof kin.moves>();
  for (const move of kin.moves)
    movesOf.set(move.personId, [...(movesOf.get(move.personId) ?? []), move]);
  const moveSource: Source = {
    ...source,
    citation: `${source.citation} ${OPENING_KIN.moves.source}`,
    estimatedFrom: OPENING_KIN.moves.source,
  };
  // A parent who died in the year before day one is a dated fact on the
  // resident who survives them; the news archive reports it.
  const diedOf = new Map<string, typeof kin.deaths>();
  for (const death of kin.deaths)
    diedOf.set(death.survivorId, [
      ...(diedOf.get(death.survivorId) ?? []),
      death,
    ]);
  const familyFacts = (personId: string) => {
    const relations = byPerson.get(personId) ?? [];
    const pastFacts = [
      ...(diedOf.get(personId) ?? []).map((death) => ({
        id: `${personId}:family-died:${death.relation}`,
        date: death.date,
        kind: "family:parent-died",
        summary: `${death.givenName} ${death.familyName}, this person's ${death.relation}, died.`,
        source: kinSource,
        facts: {
          relation: death.relation,
          givenName: death.givenName,
          familyName: death.familyName,
          birthDate: death.birthDate,
        },
      })),
      ...relations.map((row) => ({
        id: `${personId}:family:${row.otherId}`,
        date: row.date,
        kind: `family:${row.relation}`,
        summary: `${names.get(row.otherId)} is recorded as this person's ${row.relation} in the generated opening family.`,
        source: kinSource,
        facts: { otherPersonId: row.otherId },
      })),
      ...(movesOf.get(personId) ?? []).map((move) => ({
        id: `${personId}:move:${move.date}`,
        date: move.date,
        kind:
          move.kind === "in"
            ? OPENING_KIN.moves.movedInKind
            : OPENING_KIN.moves.movedAwayKind,
        summary:
          move.kind === "in"
            ? OPENING_KIN.moves.movedInSummary
            : OPENING_KIN.moves.movedAwaySummary,
        source: moveSource,
      })),
    ];
    const knownIdSources = Object.fromEntries(
      relations.map((row) => [
        row.otherId,
        {
          sourceFactId: `${personId}:family:${row.otherId}`,
          learnedAt: row.date,
        },
      ]),
    );
    return {
      ids: relations.map((row) => row.otherId),
      pastFacts,
      knownIdSources,
    };
  };
  const residentTraits = new Map(
    input.people.map((person) => [person.id, person.traits] as const),
  );
  const temperament = openingTemperaments(
    [
      ...input.people.map((person) => ({
        id: person.id,
        birthDate: person.birthDate,
        ...(person.looks?.gender ? { gender: person.looks.gender } : {}),
        parents: kin.parentsOf.get(person.id) ?? [],
        upbringing: Object.fromEntries(
          Object.entries(residentTraits.get(person.id) ?? {})
            .filter(([key]) => key.startsWith(`${PEOPLE_MIND_VERSION}:`))
            .map(([key, value]) => [
              key.slice(PEOPLE_MIND_VERSION.length + p("one")),
              value,
            ]),
        ),
      })),
      ...kin.people.map((person) => ({
        id: person.id,
        birthDate: person.birthDate,
        gender: person.gender,
        parents: kin.parentsOf.get(person.id) ?? [],
      })),
    ],
    { seed: input.seed, startedAt },
  );
  const temperamentSource: Source = {
    ...source,
    citation: `${OPENING_KIN.householdBasis} ${OPENING_KIN.personality.citation} ${PARAMETERS.personalityHeritability!.citation}`,
    estimatedFrom:
      "Generated opening temperament: sourced facet age and sex differences, an inherited share from parents, a small upbringing shift and a person's own part, cut at the owner-accepted 10/20/40/20/10 spread.",
  };
  const withTemperament = (
    id: string,
    traits: Record<string, number>,
    traitSources: Record<string, Source> | undefined,
    sharedTraitSource: Source | undefined,
  ) => {
    const core = temperament.get(id) ?? {};
    // A recorded facet from upbringing shifts the generated level by its
    // recorded value (within the -2..2 levels), so the record counts and a
    // person can still sit low; the five temperament dimensions always come
    // from the temperament model.
    const recorded = Object.fromEntries(
      Object.entries(traits)
        .filter(([key]) => !key.startsWith(`${PEOPLE_MIND_VERSION}:`))
        .map(([key, value]) => [
          key,
          Math.max(
            -p("two"),
            Math.min(p("two"), (core[key] ?? p("zero")) + value),
          ),
        ]),
    );
    // Facets are notable-only (the trait registry): a facet at the middle
    // level is not recorded, so no record reads as unknown, never as average.
    const all: Record<string, number> = {};
    for (const row of [traits, core, recorded])
      for (const key in row) {
        const value = row[key]!;
        if (value === p("zero") && !key.startsWith(`${PEOPLE_MIND_VERSION}:`))
          delete all[key];
        else all[key] = value;
      }
    const sources: Record<string, Source> = {
      ...(sharedTraitSource
        ? Object.fromEntries(
            Object.keys(recorded).map((key) => [key, sharedTraitSource]),
          )
        : {}),
      ...(traitSources ?? {}),
      ...Object.fromEntries(
        Object.keys(core)
          .filter((key) => key.startsWith(`${PEOPLE_MIND_VERSION}:`))
          .map((key) => [key, temperamentSource]),
      ),
    };
    for (const key of Object.keys(sources))
      if (!(key in all)) delete sources[key];
    return {
      traits: all,
      traitSources: sources,
      sharedTraitSource: temperamentSource,
    };
  };
  const residents = input.people.map((person) => {
    const facts = familyFacts(person.id);
    return {
      ...person,
      ...withTemperament(
        person.id,
        person.traits,
        person.traitSources,
        person.sharedTraitSource,
      ),
      familyIds: [...new Set([...person.familyIds, ...facts.ids])].sort(),
      knownIds: [...new Set([...person.knownIds, ...facts.ids])],
      ...(facts.ids.length
        ? {
            knownIdSources: {
              ...(person.knownIdSources ?? {}),
              ...facts.knownIdSources,
            },
          }
        : {}),
      pastFacts: [...(person.pastFacts ?? []), ...facts.pastFacts],
    };
  });
  const relatives: PersonInput[] = kin.people.map((person) => {
    const facts = familyFacts(person.id);
    const ids = [...new Set(facts.ids)];
    return {
      id: person.id,
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate,
      placeId: person.placeId,
      ...(person.countyId ? { countyId: person.countyId } : {}),
      householdId: person.householdId,
      tier: OPENING_KIN.kinTier,
      // One shared source for the relative's temperament, not one per trait.
      traits: { ...(temperament.get(person.id) ?? {}) },
      sharedTraitSource: temperamentSource,
      liquidMinor: p("zero"),
      livingCostDailyMinor: p("zero"),
      source: kinSource,
      familyIds: [...ids].sort(),
      knownIds: ids,
      ...(ids.length ? { knownIdSources: facts.knownIdSources } : {}),
      looks: {
        gender: person.gender,
        pronouns: defaultPronounsForGender(person.gender as GenderIdentityKey),
      },
      pastFacts: facts.pastFacts,
    };
  });
  return {
    people: [...residents, ...relatives],
    households: kin.households.map((row) => ({
      id: row.id,
      placeId: row.placeId,
      memberIds: row.memberIds,
      source: kinSource,
    })),
    familyLinks: kin.parentChildLinks.map((row) => ({
      id: row.id,
      kind: "parent-child" as const,
      personIds: [row.parentId, row.childId] as const,
    })),
  };
}
