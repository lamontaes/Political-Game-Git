import { openingEmploymentFromRecordedRoles } from "./opening-employment";
import { createOpeningEmployerCapital } from "./opening-capital";
import { openingHistoricalCountyOwnerFacts } from "./opening-public-owner";
import {
  prepareOpeningPublicPayAuthorities,
  type OpeningPublicEmployerIdentity,
} from "./opening-public-pay";
import { canonicalOpeningSchedules } from "./opening-work";
import { openingWorkCommitments } from "./modules/work";
import coreContent from "./data/content.json" with { type: "json" };
import { realLocalities } from "./places";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "../simulation/character-history";
import {
  ageOnDate,
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
} from "../simulation/dates";
import {
  countyLandSharesForPlace,
  countyPopulationSharesForPlace,
} from "../simulation/government-units";
import {
  HOUSEHOLD_MIX_META,
  householdMixForJurisdiction,
} from "../simulation/household-mix";
import { createStableId, stableHash } from "../simulation/ids";
import {
  lifePlaceByKey,
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  type LifePlace,
} from "../simulation/life-places";
import {
  estimatedMonthlyHouseholdLivingCosts,
  livingCostsRegionForState,
  LIVING_COSTS_SOURCE,
} from "../simulation/living-costs-data";
import { organizationProfileAt } from "../simulation/life-queries";
import { ensureTownEmployment } from "../simulation/living-world/town-employment";
import { TOWN_EMPLOYMENT_META } from "../simulation/living-world/town-employment.generated";
import {
  nationalMedianAnnualWage,
  townJobRate,
  townPayPercentile,
  weeklyHoursOf,
} from "../simulation/living-world/town-pay";
import { TOWN_PAY_META } from "../simulation/living-world/town-pay.generated";
import {
  bedroomsForHousehold,
  hudRentRowFor,
} from "../simulation/living-world/town-rent";
import { TOWN_RENT_META } from "../simulation/living-world/town-rent.generated";
import {
  TOWN_RESIDENTS_VERSION,
  townHouseholdPeople,
  townHouseholdSkeleton,
  type TownHouseholdSkeleton,
} from "../simulation/living-world/town-residents";
import { placeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { PERSONALITY_PACK } from "../simulation/personality-catalogue";
import {
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
} from "../simulation/people-trait-definitions";
import {
  upbringingCoreValueFrom,
  upbringingFor,
} from "../simulation/people-upbringing";
import {
  notableQualityRoom,
  registeredTraitLean,
  upbringingQualities,
} from "../simulation/people-traits";
import { medianTransactionBalance } from "../simulation/starting-money";
import { traitRegistryFor } from "../simulation/trait-registry";
import { isOneSided, type RegisteredTrait } from "../simulation/trait-packs";
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
import { DEFAULT_CORPUS_VERSION } from "../simulation/names-data";
import { drawCanonicalNamedIdentity } from "../simulation/people";
import { nameCorpusVersionForWorld } from "../simulation/place-name-corpus";
import {
  defaultPronounsForGender,
  type GenderIdentityKey,
} from "../simulation/person-identity";
import { birthCohortGivenName } from "../simulation/given-name-cohorts";
import { SeededRng } from "../simulation/rng";
import { buildOpeningKin, OPENING_KIN } from "./opening-kin";
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
}

interface CountyContext {
  place: LifePlace;
  share: number;
}

interface HouseholdPlan {
  stableKey: string;
  id: EntityId;
  skeleton: TownHouseholdSkeleton;
  inputs: readonly CharacterHistoryContextPersonInput[];
  ids: readonly EntityId[];
  countyId?: EntityId;
}

type FamilyLink = NonNullable<CoreInput["familyLinks"]>[number];

export const POPULATION_VERSION = "p8-population-v1";
const GENERATED_PROVENANCE = {
  kind: "generated" as const,
  generatorKey: TOWN_RESIDENTS_VERSION,
};

/** Geography is distinct from government: a county area need not have a county council. */
function countyContexts(place: LifePlace): readonly CountyContext[] {
  const population = place.sourceGeoid
    ? countyPopulationSharesForPlace(place.sourceGeoid)
    : [];
  const land = place.sourceGeoid
    ? new Map(countyLandSharesForPlace(place.sourceGeoid))
    : new Map<string, number>();
  const rows: CountyContext[] = [];
  for (const [geoid, populationShare] of population) {
    const county = lifePlaceByKey(`county:${geoid}`);
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
      ? lifePlaceByKey(`county:${unit.countyGeoid}`)
      : null;
    if (county && !rows.some((row) => row.place.key === county.key))
      rows.push({ place: county, share: p("one") });
  }
  return rows;
}

/** An initialization identity choice among real records, never a behavioral roll. */
function selectedPlace(
  options: PopulationOptions,
  minimumPeople: number,
): LifePlace {
  if (options.placeKey !== undefined) {
    const place = lifePlaceByKey(options.placeKey);
    if (!place || place.scope !== "locality")
      throw new Error(
        `Population requires a recorded locality: ${options.placeKey}`,
      );
    return place;
  }
  let selected: LifePlace | undefined;
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
        lifePlaceByJurisdictionId(home)?.displayName ??
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
          plan.skeleton.members[member]!.role === "child"
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
    plan.skeleton.members.forEach((member, child) => {
      if (member.role !== "child") return;
      for (const adult of adults) {
        const key = `${plan.stableKey}:kinship:${child}:${adult.index}`;
        kinships.push({
          id: createStableId("kinship", `${world.id}:${key}`),
          stableKey: key,
          sequence: nextSequence(),
          personIds: pair(plan.ids[child]!, plan.ids[adult.index]!),
          establishedAt: plan.inputs[child]!.birthDate,
          kind: "lineal:parent-child",
          provenance,
        });
      }
    });
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
  const traitSources: Record<string, Source> = {};
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
  for (const key of Object.keys(traits)) traitSources[key] = traitSource;
  return { traits, traitSources };
}

/** One-time legacy-source importer; no legacy clock, world generation or advance. */
export function buildPopulation(options: PopulationOptions): CoreInput {
  const minimumPeople = options.minimumPeople ?? p("targetPopulation");
  if (!Number.isSafeInteger(minimumPeople) || minimumPeople < p("one"))
    throw new Error("Opening population must be a positive whole count.");
  const startedAt = makeIsoDate(options.startedAt);
  const place = selectedPlace(options, minimumPeople);
  const town = place.context.jurisdiction.id;
  const counties = countyContexts(place);
  const jurisdictions = new Map([[town, place.context.jurisdiction]]);
  if (place.stateJurisdictionKey) {
    const state = stateJurisdictionForKey(place.stateJurisdictionKey);
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
    `Generated opening cohort at ${startedAt}; ${mix.basis} household mix held from ACS 2020–2024, identities from existing Gazetteer/territory provider. This is not an observed census roster or an exact 2021 population. Opening money is a household SCF reserve or labeled expense buffer, apportioned among adults; costs are CES categories plus a hypothetical HUD shelter budget, not observed bills.`,
  );
  stopgap("SG-P8-opening-vintage");
  stopgap("SG-P8-historical-start");
  stopgap("SG-P8-family-network-coverage");
  stopgap("SG-P8-person-trait-diversity");
  const gaps = new Set<string>([
    `Opening vintage: ${startedAt} household/population estimates retain later source vintages; no reconstructed 2021 census or migration history.`,
    "Deep past: schools, faith, losses, earlier residences and earlier jobs are absent unless the canonical opening generator establishes them; no event inferred from a trait.",
    "Baseline law and offices: January 2021 laws, officeholder rosters and powers are not reconstructed; later place/government/institution identity records remain opening proxies, with no actual 2021 officeholder count claimed.",
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
  for (
    let index = p("zero");
    inputs.length < minimumPeople;
    index += p("one")
  ) {
    const skeleton = townHouseholdSkeleton(seedWorld, town, index);
    const householdPeople = townHouseholdPeople(seedWorld, town, index);
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
    });
    inputs.push(...householdPeople);
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
    "Existing deterministic matcher and authored workplace/role mix, interpreted as an opening estimate; later employment vintages are not observed 2021 jobs.",
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
        `${rate ? `SOC ${rate.soc}, area ${rate.area}, percentile ${rate.percentile}` : "National same-occupation median or registered missing-occupation fallback"}; weekly hours from the generated role; calendar-day average. Job tenure, wage and minimum floor are opening proxies, not historical 2021 contracts.`,
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
    for (const child of children) {
      for (const parent of adults) {
        const id = createStableId(
          "kinship",
          `${world.id}:${plan.stableKey}:kinship:${plan.ids.indexOf(child)}:${plan.ids.indexOf(parent)}`,
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
      for (const sibling of children) {
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
  const registry = [...traitRegistryFor(world).traits.values()];
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
  const family = openingFamilies({
    seed: options.seed,
    world,
    town,
    stateId: place.stateJurisdictionKey
      ? stateJurisdictionForKey(place.stateJurisdictionKey)?.id
      : undefined,
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
    workCommitments: publicPay.workCommitments,
    familyLinks: [...familyLinks, ...family.familyLinks],
    focusPersonIds: [],
    focusPlaceIds: [],
    visiblePlaceIds: [
      town,
      ...counties.map((county) => county.place.context.jurisdiction.id),
    ],
    calendarDates: [],
    gaps: [...gaps, ...openingCapital.gaps, ...publicPay.gaps],
    placeMetadata: {
      openingEmploymentReceipt: JSON.stringify(openingAllocation.receipt),
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
        "Federal Reserve SCF 2022 tables 1/6, families holding transaction accounts; src/simulation/starting-money.ts. No-job household reserve is an explicit expense-buffer estimate.",
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
  const corpusVersion = nameCorpusVersionForWorld(world, input.town);
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
        role: plan.skeleton.members[member]!.role,
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
      name: ({ stableKey, gender, birthDate, familyName }) => {
        const key = gender as GenderIdentityKey;
        const named = drawCanonicalNamedIdentity(
          new SeededRng(world.seed).fork(stableKey).fork("name"),
          { gender: key, pronouns: defaultPronounsForGender(key) },
          { corpusVersion },
        );
        const surname = familyName ?? named.familyName;
        return {
          familyName: surname,
          givenName:
            corpusVersion === DEFAULT_CORPUS_VERSION
              ? birthCohortGivenName(world.seed, stableKey, {
                  givenName: named.givenName,
                  familyName: surname,
                  birthDate: makeIsoDate(birthDate),
                  gender: key,
                })
              : named.givenName,
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
    citation: `${source.citation} ${OPENING_KIN.completedFertility.citation} ${OPENING_KIN.fertilityByAge.citation} ${OPENING_KIN.firstBirthAge.citation} SSA 2023 period life table.`,
    estimatedFrom:
      "Generated opening kin: who exists follows the life table and Census fertility by cohort and age; relatives outside the household are husk-tier records, not observed people.",
  };
  const familyFacts = (personId: string) => {
    const relations = byPerson.get(personId) ?? [];
    const pastFacts = relations.map((row) => ({
      id: `${personId}:family:${row.otherId}`,
      date: row.date,
      kind: `family:${row.relation}`,
      summary: `${names.get(row.otherId)} is recorded as this person's ${row.relation} in the generated opening family.`,
      source: kinSource,
    }));
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
    citation: `${source.citation} ${OPENING_KIN.personality.citation} ${PARAMETERS.personalityHeritability!.citation}`,
    estimatedFrom:
      "Generated opening temperament: sourced facet age and sex differences, an inherited share from parents, a small upbringing shift and a person's own part, cut at the owner-accepted 10/20/40/20/10 spread.",
  };
  const withTemperament = (
    id: string,
    traits: Record<string, number>,
    traitSources: Record<string, Source> | undefined,
  ) => {
    const core = temperament.get(id) ?? {};
    return {
      traits: { ...traits, ...core },
      traitSources: {
        ...(traitSources ?? {}),
        ...Object.fromEntries(
          Object.keys(core).map((key) => [key, temperamentSource]),
        ),
      },
    };
  };
  const residents = input.people.map((person) => {
    const facts = familyFacts(person.id);
    return {
      ...person,
      ...withTemperament(person.id, person.traits, person.traitSources),
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
      ...withTemperament(person.id, {}, undefined),
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
