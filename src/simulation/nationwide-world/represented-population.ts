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
  readonly population: number | null;
  readonly households: number | null;
  readonly laborForce: number | null;
  readonly employed: number | null;
  readonly adults: number | null;
  readonly householdsByKind: Readonly<Record<string, number | null>>;
  readonly source:
    | "census-estimate-2025"
    | "acs-2020-2024"
    | "island-census-2020"
    | "decennial-census-2020"
    | "researched-calibration-anchor"
    | "unknown";
  readonly vintage: number;
  readonly estimatedFields: readonly string[];
  readonly unknownFields: readonly string[];
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

/** Source references retain raw geography identity. Explicitly approved proxy
 * anchors are marked estimates; housing units never become households. */
export function populationReference(key: string): PopulationReference {
  const cached = REFERENCES.get(key);
  if (cached) return cached;
  const island = TERRITORY_POPULATION_ROWS.find((row) => row.key === key);
  const row = censusDemographics(key);
  const islandCounts = island?.demographicCounts as
    | Readonly<Partial<Record<DemographicField | "adults", number | null>>>
    | null
    | undefined;
  const anchor = island?.calibrationAnchor;
  const history = annualCounts().get(key);
  const enumerated = decennialPopulation(key);
  let population =
    history?.at(-1) ??
    row?.counts.population ??
    island?.population ??
    anchor?.population ??
    null;
  const useDecennial =
    !history &&
    !(population !== null && population > 0) &&
    (enumerated?.[0] ?? 0) > 0;
  if (useDecennial) population = enumerated![0]!;
  const unknownFields: string[] = [];
  if (population === null || !Number.isFinite(population)) {
    population = null;
    unknownFields.push("population");
  }
  const scalingPopulation =
    (row?.counts.population ?? 0) > 0
      ? row!.counts.population!
      : (islandCounts?.population ?? 0) > 0
        ? islandCounts!.population!
        : null;
  const count = (field: DemographicField): number | null => {
    const value =
      (row?.counts.population ?? 0) > 0
        ? row?.counts[field]
        : islandCounts?.[field];
    if (
      value !== null &&
      value !== undefined &&
      scalingPopulation !== null &&
      population !== null
    )
      return (value * population) / scalingPopulation;
    unknownFields.push(field);
    return null;
  };
  const rounded = (value: number | null) =>
    value === null ? null : Math.round(value);
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
    householdFields.map((field) => [field, rounded(count(field))]),
  );
  let annualChanges: number[] = [];
  if (history) {
    annualChanges = history
      .slice(1)
      .flatMap((value, i) =>
        history[i]! > 0 ? [value / history[i]! - 1] : [],
      );
  } else if (
    island &&
    (island.population ?? 0) > 0 &&
    (island.previousPopulation ?? 0) > 0
  ) {
    annualChanges = [
      Math.pow(island.population! / island.previousPopulation!, 1 / 10) - 1,
    ];
  } else if (
    (row?.counts.population ?? 0) > 0 &&
    (row?.counts.population2023 ?? 0) > 0
  ) {
    annualChanges = [row!.counts.population! / row!.counts.population2023! - 1];
  }
  if (!annualChanges.length) unknownFields.push("annualChange");
  annualChanges.sort((a, b) => a - b);
  const estimatedFields: string[] = [];
  if (anchor)
    estimatedFields.push(
      "population",
      "households",
      "laborForce",
      "employed",
      "adults",
    );
  const reference: PopulationReference = {
    population: rounded(population),
    households: rounded(households) ?? anchor?.households ?? null,
    laborForce: rounded(laborForce) ?? anchor?.laborForce ?? null,
    employed: rounded(employed) ?? anchor?.employed ?? null,
    adults:
      population !== null && under18 !== null
        ? Math.round(population - under18)
        : (anchor?.adults ?? null),
    source:
      population === null
        ? "unknown"
        : anchor
          ? "researched-calibration-anchor"
          : useDecennial
            ? "decennial-census-2020"
            : history
              ? "census-estimate-2025"
              : island
                ? "island-census-2020"
                : "acs-2020-2024",
    vintage: useDecennial ? 2020 : history ? 2025 : island ? 2020 : 2024,
    estimatedFields,
    unknownFields: unknownFields.filter(
      (field) => !estimatedFields.includes(field),
    ),
    annualChanges,
    householdsByKind,
  };
  REFERENCES.set(key, reference);
  return reference;
}

export interface RepresentedPopulation extends PopulationReference {
  readonly referencePopulation: number | null;
  readonly writtenResidents: number;
  readonly writtenHouseholds: number;
  readonly unemploymentRate: number | null;
}
const SNAPSHOTS = new WeakMap<World, Map<EntityId, RepresentedPopulation>>();
function quantile(values: readonly number[], fraction: number): number {
  if (!values.length) return 0;
  const position = (values.length - 1) * fraction;
  const lower = Math.floor(position),
    upper = Math.ceil(position);
  return (
    values[lower]! * (1 - (position - lower)) +
    values[upper]! * (position - lower)
  );
}
function observedChanges(key: string): number[] {
  const history = annualCounts().get(key);
  if (history)
    return history
      .slice(1)
      .flatMap((value, index) =>
        history[index]! > 0 ? [value / history[index]! - 1] : [],
      );
  const counts = censusDemographics(key)?.counts;
  return counts?.population && counts.population2023
    ? [counts.population / counts.population2023 - 1]
    : [];
}
const PEER_GROUPS = new Map<string, readonly CensusDemographics[]>();
/** All national rows of the same geographic type and population order of
 * magnitude contribute; no selected city supplies another state's pattern. */
function comparableDemographics(
  key: string,
  population: number | null,
): readonly CensusDemographics[] {
  censusDemographics(key); // initialize the complete locked national selection
  const length = /^\d+$/.test(key) ? key.length : 7;
  const size = Math.floor(Math.log10(Math.max(1, population ?? 1)));
  const cacheKey = `${length}:${size}`;
  const cached = PEER_GROUPS.get(cacheKey);
  if (cached) return cached;
  const sameType = [...demographics!.values()].filter(
    (row) => row.geoid.length === length && (row.counts.population ?? 0) > 0,
  );
  const comparable = sameType.filter(
    (row) => Math.floor(Math.log10(row.counts.population!)) === size,
  );
  const peers = comparable.length ? comparable : sameType;
  PEER_GROUPS.set(cacheKey, peers);
  return peers;
}

interface OpeningPopulation {
  readonly reference: PopulationReference;
  readonly annualChange: number | null;
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
  const peers = comparableDemographics(
    place.sourceGeoid ?? place.key,
    reference.population,
  );
  const rng = new SeededRng(world.seed).fork(`population-opening:${place.key}`);
  const growth = peers
    .flatMap((peer) => observedChanges(peer.geoid))
    .sort((a, b) => a - b);
  const localGrowth = reference.annualChanges;
  const center = quantile(localGrowth.length ? localGrowth : growth, 0.5);
  const annualChange = growth.length
    ? center + quantile(growth, 0.25 + rng.next() * 0.5) - quantile(growth, 0.5)
    : localGrowth.length
      ? quantile(localGrowth, rng.next())
      : null;
  const population =
    reference.population === null
      ? null
      : Math.max(
          0,
          Math.round(reference.population * (1 + (annualChange ?? 0) - center)),
        );
  const estimatedFields = new Set(reference.estimatedFields);
  if (population !== null) estimatedFields.add("population");
  if (annualChange !== null) estimatedFields.add("annualChange");
  const sample = (
    field: DemographicField,
    anchor: number | null,
  ): number | null => {
    if (population === null) return null;
    if (population === 0) return 0;
    const ratios = peers
      .flatMap((peer) => {
        const value = peer.counts[field],
          total = peer.counts.population;
        return value !== null && total !== null && total > 0
          ? [value / total]
          : [];
      })
      .sort((a, b) => a - b);
    if (!ratios.length) return anchor;
    const median = quantile(ratios, 0.5);
    const draw = quantile(ratios, 0.25 + rng.next() * 0.5);
    estimatedFields.add(field);
    const ratio =
      anchor === null || !reference.population
        ? draw
        : (anchor / reference.population) * (median > 0 ? draw / median : 1);
    return Math.max(0, Math.min(population, Math.round(population * ratio)));
  };
  const households = sample("households", reference.households);
  const laborForce = sample("laborForce", reference.laborForce);
  const employed = sample("employed", reference.employed);
  const under18 = sample(
    "under18",
    reference.population !== null && reference.adults !== null
      ? reference.population - reference.adults
      : null,
  );
  if (under18 !== null) estimatedFields.add("adults");
  const kinds = Object.fromEntries(
    Object.entries(reference.householdsByKind).map(([field, value]) => [
      field,
      sample(field as DemographicField, value),
    ]),
  );
  const totalKinds = Object.values(kinds).reduce<number>(
    (total, value) => total + (value ?? 0),
    0,
  );
  if (households !== null && totalKinds > 0) {
    let remaining = households;
    const fields = Object.keys(kinds);
    fields.forEach((field, index) => {
      kinds[field] =
        index === fields.length - 1
          ? remaining
          : Math.min(
              remaining,
              Math.round((households * (kinds[field] ?? 0)) / totalKinds),
            );
      remaining -= kinds[field]!;
    });
  }
  return {
    reference: {
      ...reference,
      population,
      households,
      laborForce,
      employed:
        laborForce !== null && employed !== null
          ? Math.min(laborForce, employed)
          : employed,
      adults:
        population !== null && under18 !== null ? population - under18 : null,
      householdsByKind: kinds,
      estimatedFields: [...estimatedFields],
      unknownFields: reference.unknownFields.filter(
        (field) => !estimatedFields.has(field),
      ),
    },
    annualChange,
  };
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
  // Missing local growth observations disable projection; they are not a zero growth fact.
  const scale =
    annualChange === null
      ? 1
      : (1 + annualChange) * Math.pow(1 + annualChange, years);
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
    reference.laborForce !== null && reference.employed !== null
      ? (100 * (reference.laborForce - reference.employed)) /
        Math.max(1, reference.laborForce)
      : null;
  const rate =
    baseRate === null
      ? null
      : Math.max(
          0,
          Math.min(
            100,
            baseRate +
              (macro?.unemploymentPct ?? baseRate) -
              (opening?.unemploymentPct ?? baseRate),
          ),
        );
  const laborForce =
    reference.laborForce === null
      ? null
      : Math.round(reference.laborForce * scale);
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
  const yearsGrowth =
    annualChange === null ? 1 : Math.pow(1 + annualChange, writtenYears);
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
  const employed =
    laborForce === null || rate === null
      ? null
      : Math.max(
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
    population:
      reference.population === null
        ? null
        : Math.max(
            residents.length,
            Math.round(reference.population * scale + populationResidual),
          ),
    households:
      reference.households === null
        ? null
        : Math.max(households.size, Math.round(reference.households * scale)),
    adults:
      reference.adults === null ? null : Math.round(reference.adults * scale),
    laborForce,
    employed,
    householdsByKind: Object.fromEntries(
      Object.entries(reference.householdsByKind).map(([kind, count]) => [
        kind,
        count === null ? null : Math.round(count * scale),
      ]),
    ),
    writtenResidents: residents.length,
    writtenHouseholds: households.size,
    unemploymentRate:
      laborForce === null || employed === null
        ? null
        : (100 * (laborForce - employed)) / Math.max(1, laborForce),
  };
  snapshots.set(town, snapshot);
  return snapshot;
}
