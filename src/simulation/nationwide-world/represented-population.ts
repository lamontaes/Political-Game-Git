import {
  DECENNIAL_POPULATION_ROWS,
  ANNUAL_POPULATION_ROWS,
  TERRITORY_POPULATION_ROWS,
  PLACE_DEMOGRAPHIC_COLUMNS,
  PLACE_DEMOGRAPHIC_ROWS,
} from "./place-demographics.generated";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
} from "../life-queries";
import { SeededRng } from "../rng";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { recordByStableKey } from "../history-index";
import { recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";

export type DemographicField = (typeof PLACE_DEMOGRAPHIC_COLUMNS)[number];
export interface CensusDemographics {
  readonly geoid: string;
  readonly vintage: number;
  readonly counts: Readonly<Record<DemographicField, number | null>>;
}
let demographics: ReadonlyMap<string, CensusDemographics> | null = null;
export function censusDemographics(geoid: string): CensusDemographics | null {
  if (!demographics) {
    const map = new Map<string, CensusDemographics>();
    for (const row of PLACE_DEMOGRAPHIC_ROWS.split(";")) {
      const [id, vintage, ...cells] = row.split(",");
      const counts = Object.fromEntries(
        PLACE_DEMOGRAPHIC_COLUMNS.map((field, i) => [
          field,
          cells[i] === "" ? null : Number(cells[i]),
        ]),
      ) as unknown as CensusDemographics["counts"];
      map.set(id!, { geoid: id!, vintage: Number(vintage), counts });
    }
    demographics = map;
  }
  return demographics.get(geoid) ?? null;
}
let annual: ReadonlyMap<string, readonly number[]> | null = null;
function annualCounts(): ReadonlyMap<string, readonly number[]> {
  if (!annual)
    annual = new Map(
      ANNUAL_POPULATION_ROWS.split(";").map((row) => {
        const [id, ...cells] = row.split(",");
        return [id!, cells.map(Number)];
      }),
    );
  return annual;
}

export interface PopulationReference {
  readonly population: number;
  readonly households: number;
  readonly laborForce: number;
  readonly employed: number;
  readonly adults: number;
  readonly householdsByKind: Readonly<Record<string, number>>;
  readonly source:
    | "census-estimate-2025"
    | "acs-2020-2024"
    | "island-census-2020"
    | "decennial-census-2020"
    | "ESTIMATED FROM AVERAGE";
  readonly vintage: number;
  readonly estimatedFields: readonly string[];
  /** Observed net changes among comparable geographies, never a fixed percent. */
  readonly annualChanges: readonly number[];
}
let decennial: ReadonlyMap<string, readonly number[]> | null = null;
export function decennialPopulation(key: string): readonly number[] | null {
  decennial ??= new Map(
    DECENNIAL_POPULATION_ROWS.split(";").map((row) => {
      const [id, ...cells] = row.split(",");
      return [id!, cells.map((cell) => (cell === "" ? NaN : Number(cell)))];
    }),
  );
  return decennial.get(key) ?? null;
}
const REFERENCES = new Map<string, PopulationReference>();

/** A zero annual Census estimate, or a zero survey corroborated by a zero
 * enumeration, identifies an empty geography. A survey zero alone does not. */
export function referencePopulationIsEmpty(key: string): boolean {
  const annual = annualCounts().get(key);
  if (annual) return annual.at(-1) === 0;
  const survey = censusDemographics(key)?.counts.population;
  const enumerated = decennialPopulation(key)?.[0];
  return survey === 0 && enumerated === 0;
}

/** Positive data from a matching geography, with explicit peer estimates for
 * cells withheld by Census. A household estimate never means housing units. */
export function populationReference(key: string): PopulationReference {
  const cached = REFERENCES.get(key);
  if (cached) return cached;
  const island = TERRITORY_POPULATION_ROWS.find((row) => row.key === key);
  const row = censusDemographics(key);
  const islandCounts = island?.demographicCounts as
    | Readonly<Partial<Record<DemographicField | "adults", number | null>>>
    | null
    | undefined;
  const history = annualCounts().get(key);
  const enumerated = decennialPopulation(key);
  let population =
    history?.at(-1) ?? row?.counts.population ?? island?.population ?? null;
  const useDecennial =
    !(population !== null && population > 0) && (enumerated?.[0] ?? 0) > 0;
  if (useDecennial) population = enumerated![0]!;
  const estimatedFields: string[] = [];
  const sameKind = [...demographics!.values()].filter(
    (candidate) =>
      candidate.geoid.length === (island ? 7 : key.length) &&
      (candidate.counts.population ?? 0) > 0,
  );
  const peerRows = sameKind.filter((candidate) =>
    candidate.geoid.startsWith(key.slice(0, 2)),
  );
  const peers = peerRows.length ? peerRows : sameKind;
  const mean = (field: DemographicField) => {
    const valid = peers.filter((candidate) => candidate.counts[field] !== null);
    return (
      valid.reduce((sum, candidate) => sum + candidate.counts[field]!, 0) /
      Math.max(1, valid.length)
    );
  };
  if (!(population !== null && population > 0)) {
    const islandPeers = island
      ? TERRITORY_POPULATION_ROWS.filter(
          (candidate) =>
            candidate.key.split(":")[1] === key.split(":")[1] &&
            candidate.scope === island.scope &&
            (candidate.population ?? 0) > 0,
        )
      : [];
    population =
      island?.estimate?.value ??
      (islandPeers.length
        ? islandPeers.reduce(
            (sum, candidate) => sum + candidate.population!,
            0,
          ) / islandPeers.length
        : mean("population"));
    estimatedFields.push("population");
  }
  if (!(population > 0))
    throw new Error(`No positive census peer population for ${key}`);
  const scalingPopulation =
    row?.counts.population && row.counts.population > 0
      ? row.counts.population
      : (islandCounts?.population ?? 0) > 0
        ? islandCounts!.population!
        : mean("population");
  const count = (field: DemographicField) => {
    const value =
      (row?.counts.population ?? 0) > 0
        ? row?.counts[field]
        : (islandCounts?.[field] ?? null);
    if (value !== null && value !== undefined && scalingPopulation > 0)
      return (value * population!) / scalingPopulation;
    estimatedFields.push(field);
    const peerPopulation = mean("population");
    return (mean(field) * population!) / peerPopulation;
  };
  const households = count("households");
  const laborForce = count("laborForce");
  const employed = count("employed");
  const under18 = count("under18");
  const householdFields = [
    "marriedCoupleHouseholds",
    "maleFamilyHeadHouseholds",
    "femaleFamilyHeadHouseholds",
    "aloneHouseholds",
    "housemateHouseholds",
  ] as const;
  const householdsByKind = Object.fromEntries(
    householdFields.map((field) => [field, Math.round(count(field))]),
  );
  let annualChanges: number[] = [];
  if (history) {
    annualChanges = history
      .slice(1)
      .flatMap((value, i) =>
        history[i]! > 0 ? [value / history[i]! - 1] : [],
      );
  } else if (island) {
    // Comparable Island Areas use the same decennial window and geography
    // kind. Keep the place's own observed change among its nearest donors.
    const comparable = TERRITORY_POPULATION_ROWS.filter(
      (candidate) =>
        candidate.scope === island.scope &&
        (candidate.population ?? 0) > 0 &&
        (candidate.previousPopulation ?? 0) > 0,
    ).sort(
      (a, b) =>
        Math.abs(Math.log(a.population! / population!)) -
        Math.abs(Math.log(b.population! / population!)),
    );
    annualChanges = comparable
      .slice(0, 20)
      .map(
        (candidate) =>
          Math.pow(
            candidate.population! / candidate.previousPopulation!,
            1 / 10,
          ) - 1,
      );
  } else {
    // ACS rolling estimates are noisy. Use comparable positive population
    // rows, weighted smoothly by log population distance, as empirical donors.
    annualChanges = peers
      .filter((candidate) => (candidate.counts.population2023 ?? 0) > 0)
      .sort(
        (a, b) =>
          Math.abs(Math.log(a.counts.population! / population!)) -
          Math.abs(Math.log(b.counts.population! / population!)),
      )
      .slice(0, 50)
      .map(
        (candidate) =>
          candidate.counts.population! / candidate.counts.population2023! - 1,
      );
  }
  annualChanges.sort((a, b) => a - b);
  const reference: PopulationReference = {
    population: Math.round(population),
    households: Math.round(households),
    laborForce: Math.round(laborForce),
    employed: Math.round(employed),
    adults: Math.round(population - under18),
    source: estimatedFields.includes("population")
      ? "ESTIMATED FROM AVERAGE"
      : useDecennial
        ? "decennial-census-2020"
        : history
          ? "census-estimate-2025"
          : island
            ? "island-census-2020"
            : "acs-2020-2024",
    vintage: useDecennial ? 2020 : history ? 2025 : island ? 2020 : 2024,
    estimatedFields,
    annualChanges,
    householdsByKind,
  };
  REFERENCES.set(key, reference);
  return reference;
}

export interface RepresentedPopulation extends PopulationReference {
  readonly referencePopulation: number;
  readonly writtenResidents: number;
  readonly writtenHouseholds: number;
  readonly unemploymentRate: number;
}
const SNAPSHOTS = new WeakMap<World, Map<EntityId, RepresentedPopulation>>();
interface OpeningPopulation {
  readonly reference: PopulationReference;
  readonly annualChange: number;
  readonly writtenAt?: string;
  readonly writtenResidents?: readonly EntityId[];
  readonly writtenEmployed?: readonly EntityId[];
}
const layerKey = (town: EntityId) =>
  `represented-population-v1:${town}:opening`;
function openingPopulation(world: World, town: EntityId): OpeningPopulation {
  const recorded = recordByStableKey(world.history.events, layerKey(town));
  if (recorded?.context.socialContext)
    return JSON.parse(recorded.context.socialContext) as OpeningPopulation;
  const place = lifePlaceByJurisdictionId(town);
  if (!place) throw new Error(`No place identity for ${town}`);
  const reference = populationReference(place.sourceGeoid ?? place.key);
  const spread = reference.annualChanges;
  const draw = new SeededRng(world.seed)
    .fork(`population-opening:${place.key}`)
    .next();
  const position = spread.length
    ? (spread.length - 1) * (0.25 + draw * 0.5)
    : 0;
  const lower = Math.floor(position),
    upper = Math.ceil(position);
  const annualChange =
    (spread[lower] ?? 0) * (1 - (position - lower)) +
    (spread[upper] ?? 0) * (position - lower);
  return { reference, annualChange };
}
/** Save the compact population layer through the existing history writer.
 * Changing a source vintage cannot change an established save's opening. */
export function ensurePopulationLayer(world: World, town: EntityId): World {
  if (recordByStableKey(world.history.events, layerKey(town))) return world;
  const base = openingPopulation(world, town);
  const dead = new Set(
    world.history.personDeaths
      .filter((row) => row.diedAt <= world.currentDate)
      .map((row) => row.personId),
  );
  const writtenResidents = world.personOrder.filter(
    (id) => world.people[id]?.homeJurisdictionId === town && !dead.has(id),
  );
  const writtenEmployed = writtenResidents.filter((id) =>
    activeWorkRelationshipsAt(world, id).some(
      (work) =>
        work.relationship.compensation === "paid" ||
        work.relationship.compensation === "mixed",
    ),
  );
  const opening: OpeningPopulation = {
    ...base,
    writtenAt: world.currentDate,
    writtenResidents,
    writtenEmployed,
  };
  return recordWorldEvent(world, {
    stableKey: layerKey(town),
    type: "place.population-layer-established",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [town],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["population-layer"],
    summary:
      "The place's represented households and residents were established.",
    context: {
      location: null,
      socialContext: JSON.stringify(opening),
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
/** The written residents belong to the census-sized household layer. One
 * observed resident is one resident; materializing a neighbor never replicates
 * their job loss across thousands of unobserved people. Aggregate labor drift
 * follows the world's recorded macro conditions rather than the sample rate. */
export function representedPopulation(
  world: World,
  town: EntityId,
): RepresentedPopulation {
  let snapshots = SNAPSHOTS.get(world);
  if (!snapshots) {
    snapshots = new Map();
    SNAPSHOTS.set(world, snapshots);
  }
  const cached = snapshots.get(town);
  if (cached) return cached;
  const place = lifePlaceByJurisdictionId(town);
  if (!place)
    throw new Error(`No place identity for represented population ${town}`);
  const layer = openingPopulation(world, town);
  const { reference, annualChange } = layer;
  const years =
    (Date.parse(world.currentDate) - Date.parse(world.startedAt)) /
    (365.25 * 86400000);
  const scale = (1 + annualChange) * Math.pow(1 + annualChange, years);
  const dead = new Set(
    world.history.personDeaths
      .filter((row) => row.diedAt <= world.currentDate)
      .map((row) => row.personId),
  );
  const residents = world.personOrder.filter(
    (id) => world.people[id]?.homeJurisdictionId === town && !dead.has(id),
  );
  const residentIds = new Set(residents);
  const households = new Set<EntityId>();
  for (const personId of residents)
    for (const membership of householdMembershipsAt(world, personId)) {
      if (membership.location?.jurisdictionId === town)
        households.add(membership.household.id);
    }
  const macro =
    macroConditionsAt(
      world,
      macroScopeForJurisdiction(town),
      world.currentDate,
    ) ?? macroConditionsAt(world, "national", world.currentDate);
  const opening =
    macroConditionsAt(
      world,
      macroScopeForJurisdiction(town),
      world.startedAt,
    ) ?? macroConditionsAt(world, "national", world.startedAt);
  const baseRate =
    (100 * (reference.laborForce - reference.employed)) /
    Math.max(1, reference.laborForce);
  const rate = Math.max(
    0,
    Math.min(
      100,
      baseRate +
        (macro?.unemploymentPct ?? baseRate) -
        (opening?.unemploymentPct ?? baseRate),
    ),
  );
  const laborForce = Math.round(reference.laborForce * scale);
  const known = new Set(layer.writtenResidents ?? []);
  const activeKnown = (layer.writtenResidents ?? []).filter((id) =>
    residentIds.has(id),
  );
  const born = residents.filter(
    (id) =>
      !known.has(id) &&
      world.people[id]!.birthDate > (layer.writtenAt ?? world.startedAt),
  );
  const writtenYears =
    (Date.parse(world.currentDate) -
      Date.parse(layer.writtenAt ?? world.startedAt)) /
    (365.25 * 86400000);
  const yearsGrowth = Math.pow(1 + annualChange, writtenYears);
  const knownEmployed = activeKnown.filter((id) =>
    activeWorkRelationshipsAt(world, id).some(
      (work) =>
        work.relationship.compensation === "paid" ||
        work.relationship.compensation === "mixed",
    ),
  ).length;
  const employmentResidual = layer.writtenEmployed
    ? knownEmployed - layer.writtenEmployed.length * yearsGrowth
    : 0;
  const employed = Math.max(
    0,
    Math.min(
      laborForce,
      Math.round(laborForce * (1 - rate / 100) + employmentResidual),
    ),
  );
  const populationResidual = layer.writtenResidents
    ? activeKnown.length +
      born.length -
      layer.writtenResidents.length * yearsGrowth
    : 0;
  const snapshot: RepresentedPopulation = {
    ...reference,
    referencePopulation: reference.population,
    population: Math.max(
      residents.length,
      Math.round(reference.population * scale + populationResidual),
    ),
    households: Math.max(
      households.size,
      Math.round(reference.households * scale),
    ),
    adults: Math.round(reference.adults * scale),
    laborForce,
    employed,
    householdsByKind: Object.fromEntries(
      Object.entries(reference.householdsByKind).map(([kind, count]) => [
        kind,
        Math.round(count * scale),
      ]),
    ),
    writtenResidents: residents.length,
    writtenHouseholds: households.size,
    unemploymentRate: (100 * (laborForce - employed)) / Math.max(1, laborForce),
  };
  snapshots.set(town, snapshot);
  return snapshot;
}
