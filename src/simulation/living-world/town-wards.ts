import methods from "../../../data/research/local-government/council-election-methods.json" with { type: "json" };
import precinctPopulation from "../../districts/place-precinct-population.generated.json" with { type: "json" };
import countyReadings from "../../../data/research/local-government/county-governing-bodies.json" with { type: "json" };
import { lifePlaceByJurisdictionId } from "../life-places";
import { recordsWithFieldValue } from "../history-index";
import { governmentUnitsForState } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { householdMembershipsAt } from "../life-queries";
import { primaryDwellingOf } from "../resource-queries";
import { TOWN_HOMES_VERSION } from "./town-homes";
import { primaryReading } from "../municipal-government";
import { localGoverningBodyIdentity } from "../nationwide-world/local-governing-body-candidacy-packs";
import { localGoverningBodyRules } from "../nationwide-world/local-governing-body-rules";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import { lawInForce } from "../governing/law-in-force";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  TOWN_RESIDENTS_VERSION,
  UNKNOWN_TOWN_POPULATION,
  townRoster,
} from "./town-residents";

/**
 * TOWN WARDS (Build 25; CTO ruling of September 29, 10:02 a.m.: the
 * independent ward commission waits on the town's wards).
 *
 * A council elected by ward has each ward seat chosen by, and from, the
 * residents of one part of the town. How many of a council's seats are ward
 * seats is the charter's own composition where a compiled charter is read,
 * and otherwise ESTIMATED FROM AVERAGE: the national shares of councils
 * elected all at large, all by ward and by a combination (ICMA 2018), given
 * to a state's towns by size, the larger towns electing by ward
 * (data/research/local-government/council-election-methods.json).
 *
 * The world holds no street map inside a town, so the town's households in
 * their recorded order stand in for its streets (HARDWIRED): a ward is a run
 * of consecutive households, and a map is its cut points.
 *
 * Who draws the map decides where the cuts fall. A council draws them as
 * near equal population as it can while keeping each sitting ward member in
 * a ward of their own, within the total deviation the courts allow; a
 * commission draws equal wards and does not look at where members live.
 * Nothing is rolled: the map follows from the town's households, its members'
 * homes and who holds the pen.
 */

export type WardDrawer = "council" | "commission";

export interface CouncilWardPlan {
  readonly seats: number;
  readonly wardSeats: number;
  readonly atLargeSeats: number;
  readonly basis: "charter" | "estimated";
  readonly citation: string;
}

export interface TownWardMap {
  readonly unitId: string;
  readonly wards: number;
  readonly households: number;
  /** The first household of wards 2..n; ward 1 starts at household 0. */
  readonly cuts: readonly number[];
  /** Each ward seat's ward; seat n is ward n unless a map says otherwise. */
  readonly seatWards: ReadonlyMap<number, number>;
  readonly drawnBy: WardDrawer;
  readonly drawnAt: string;
  /** Sitting members whose homes this map put in one ward with another's. */
  readonly paired: readonly EntityId[];
}

const NATIONAL = methods.national;
const DEVIATION = methods.populationDeviation.total;
const WARDS_DRAWN = "local.wards-drawn";

const ranks = new Map<string, ReadonlyMap<string, number>>();

function population(unit: GovernmentUnitIdentity): number {
  return (
    (unit.placeGeoid
      ? placeReferencePopulation(unit.placeGeoid)?.value
      : undefined) ?? UNKNOWN_TOWN_POPULATION
  );
}

/** A town's place among its state's towns by population, 0 smallest to 1. */
function sizeRank(unit: GovernmentUnitIdentity): number {
  let state = ranks.get(unit.stateUsps);
  if (!state) {
    const towns = governmentUnitsForState(unit.stateUsps)
      .filter((row) => row.unitType === "municipality" && row.functionalActive)
      .map((row) => ({ id: row.id, population: population(row) }))
      .sort(
        (left, right) =>
          left.population - right.population || left.id.localeCompare(right.id),
      );
    state = new Map(
      towns.map((row, index) => [row.id, (index + 0.5) / towns.length]),
    );
    ranks.set(unit.stateUsps, state);
  }
  return state.get(unit.id) ?? 0;
}

/** Ward seats the compiled charter sets, or null where it sets none. */
function charterWardSeats(
  unit: GovernmentUnitIdentity,
  seats: number,
): CouncilWardPlan | null {
  const compiled = municipalGovernmentForUnit(unit);
  const composition = compiled ? primaryReading(compiled).composition : null;
  if (!compiled || !composition) return null;
  const read =
    composition.pattern === "AT_LARGE"
      ? 0
      : (composition.districtSeats ?? 0) + (composition.wardSeats ?? 0);
  if (read === 0 && composition.pattern !== "AT_LARGE") return null;
  const wardSeats = Math.min(read, seats);
  return {
    seats,
    wardSeats,
    atLargeSeats: seats - wardSeats,
    basis: "charter",
    citation: `${compiled.key}: the charter's council composition (${composition.pattern}).`,
  };
}

/** How a town's council is elected: its ward seats and its at-large seats. */
export function councilWardPlan(
  unit: GovernmentUnitIdentity,
): CouncilWardPlan | null {
  if (!localGoverningBodyIdentity(unit)) return null;
  const seats = localGoverningBodyRules(unit)?.seats?.value ?? null;
  if (seats === null || seats < 1) return null;
  const charter = charterWardSeats(unit, seats);
  if (charter) return charter;
  const rank = sizeRank(unit);
  // A body too small to split elects at large.
  const wardSeats =
    seats < 3 || rank < NATIONAL.atLarge
      ? 0
      : rank < NATIONAL.atLarge + NATIONAL.wards
        ? seats
        : Math.min(
            seats - 1,
            Math.max(2, Math.round(seats * NATIONAL.combinationWardShare)),
          );
  return {
    seats,
    wardSeats,
    atLargeSeats: seats - wardSeats,
    basis: "estimated",
    citation: NATIONAL.citation,
  };
}

/** Seat numbers are 1..n; the first `wardSeats` of them are the ward seats. */
export function isWardSeat(
  plan: CouncilWardPlan | null,
  seat: number,
): boolean {
  return plan !== null && seat >= 1 && seat <= plan.wardSeats;
}

/** Where in the town's order a person's home is, or null outside the town. */
export function homePosition(
  world: World,
  town: EntityId,
  personId: EntityId,
): number | null {
  const { households } = townRoster(town);
  if (households === 0 || !world.people[personId]) return null;
  const prefix = `${TOWN_RESIDENTS_VERSION}:${town}:household:`;
  const memberships = householdMembershipsAt(world, personId);
  const dwelling = primaryDwellingOf(world, personId);
  if (dwelling) {
    if (dwelling.jurisdictionId !== town) return null;
    if (dwelling.stableKey.startsWith(`${TOWN_HOMES_VERSION}:${town}:`)) {
      // The first roster holder identifies this dwelling's recorded address.
      // A later tenant inherits its position, not the old tenant's identity.
      for (const tenure of world.history.housingTenures) {
        if (
          tenure.dwellingId !== dwelling.id ||
          tenure.startedAt > world.currentDate ||
          tenure.holder.kind !== "household"
        )
          continue;
        const householdId = tenure.holder.householdId;
        const holder = world.history.households.find(
          (row) => row.id === householdId,
        );
        if (!holder?.stableKey.startsWith(prefix)) continue;
        const index = Number(holder.stableKey.slice(prefix.length));
        if (Number.isInteger(index) && index >= 0 && index < households)
          return index;
      }
    }
  }
  let inTown = world.people[personId]!.homeJurisdictionId === town;
  for (const row of memberships) {
    if (row.household.stableKey.startsWith(prefix)) {
      const index = Number(row.household.stableKey.slice(prefix.length));
      if (Number.isInteger(index)) return index;
    }
    if (row.location?.jurisdictionId === town) inTown = true;
  }
  if (!inTown) return null;
  // Without a recorded roster dwelling, a household the roster did not
  // write keeps the legacy position from its own id: a
  // stand-in address, not a choice anyone makes.
  let hash = 2166136261;
  for (const char of personId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % households;
}

/** The ward holding household `position` under `map`, from 1. */
export function wardAt(map: TownWardMap, position: number): number {
  let ward = 1;
  for (const cut of map.cuts) if (position >= cut) ward += 1;
  return ward;
}

/** The households of ward `ward`, as [first, last + 1). */
export function wardRange(
  map: TownWardMap,
  ward: number,
): readonly [number, number] {
  const from = ward <= 1 ? 0 : map.cuts[ward - 2]!;
  const to = ward > map.cuts.length ? map.households : map.cuts[ward - 1]!;
  return [from, to];
}

function mapEvents(world: World, unitId: string): readonly HistoricalEvent[] {
  return world.history.events.filter(
    (event) =>
      event.type === WARDS_DRAWN && event.tags.includes(`unit:${unitId}`),
  );
}

function tagValue(event: HistoricalEvent, key: string): string | null {
  const tag = event.tags.find((row) => row.startsWith(`${key}:`));
  return tag ? tag.slice(key.length + 1) : null;
}

/** The ward map in force for a town's council, or null before one is drawn. */
export function townWardMap(
  world: World,
  unit: GovernmentUnitIdentity,
): TownWardMap | null {
  const event = mapEvents(world, unit.id).at(-1);
  if (!event) return null;
  const cuts = (tagValue(event, "cuts") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const seatWards = new Map(
    (tagValue(event, "seat-wards") ?? "")
      .split(",")
      .filter(Boolean)
      .map((pair) => pair.split("=").map(Number) as [number, number]),
  );
  return {
    unitId: unit.id,
    wards: cuts.length + 1,
    households: Number(tagValue(event, "households") ?? 0),
    cuts,
    seatWards,
    drawnBy: (tagValue(event, "drawn-by") ?? "council") as WardDrawer,
    drawnAt: event.occurredAt,
    paired: (tagValue(event, "paired") ?? "")
      .split(",")
      .filter(Boolean) as EntityId[],
  };
}

/** The ward a ward seat represents under the map in force. */
export function seatWard(map: TownWardMap, seat: number): number {
  return map.seatWards.get(seat) ?? seat;
}

/**
 * The policy question "Should an independent commission draw city council
 * districts?". A county or city ordinance, or a state law over its towns,
 * answers it through `lawInForce`.
 */
export const WARD_COMMISSION_QUESTION =
  "us-policy-positions:government-operations.independent-ward-commission";

/**
 * The town's law on an independent ward commission on `onDate`: "yes", "no",
 * or null where no law answers it. With no law, the council draws its own
 * map, the most common real rule (HARDWIRED: no town starts with a commission,
 * because the starting law does not answer this question).
 */
export function wardCommissionLaw(
  world: World,
  town: EntityId,
  onDate: IsoDate,
): "yes" | "no" | null {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === WARD_COMMISSION_QUESTION);
  if (!proposition) return null;
  const answer = lawInForce(world, town, proposition.id, onDate)?.answer;
  return answer === "yes" || answer === "no" ? answer : null;
}

/**
 * Who draws the town's next map. A law in force decides: an independent
 * commission while the town's (or its state's) law says yes, the council once
 * a law says no. Where no law answers, whoever drew the map in force keeps the
 * pen, and the council where none is drawn.
 */
export function wardDrawerInForce(
  world: World,
  unit: GovernmentUnitIdentity,
  town?: EntityId,
): WardDrawer {
  const law = town ? wardCommissionLaw(world, town, world.currentDate) : null;
  if (law === "yes") return "commission";
  if (law === "no") return "council";
  return townWardMap(world, unit)?.drawnBy ?? "council";
}

/** A person's ward under the map in force, or null. */
export function wardOfPerson(
  world: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  personId: EntityId,
): number | null {
  const map = townWardMap(world, unit);
  const position = homePosition(world, town, personId);
  return map && position !== null ? wardAt(map, position) : null;
}

export interface WardMember {
  readonly seat: number;
  readonly personId: EntityId;
}

/**
 * Cut points for `wards` wards over `households` households. A commission
 * cuts at equal population. A council moves each cut, within the allowed
 * deviation and as little as it can, so that no ward holds two of its
 * sitting members' homes.
 */
export function drawWardCuts(
  households: number,
  wards: number,
  drawnBy: WardDrawer,
  homes: readonly number[],
): number[] {
  const ideal = households / wards;
  // Each ward may be up to half the total deviation above or below ideal.
  const slack = Math.floor((ideal * DEVIATION) / 2);
  const sorted = [...homes].sort((left, right) => left - right);
  const cuts: number[] = [];
  let previous = 0;
  for (let k = 1; k < wards; k += 1) {
    const target = Math.round(ideal * k);
    if (drawnBy === "commission" || slack === 0) {
      cuts.push(target);
      previous = target;
      continue;
    }
    const lowest = Math.max(previous + 1, target - slack);
    const highest = Math.min(households - (wards - k), target + slack);
    const inWard = (cut: number) =>
      sorted.filter((home) => home >= previous && home < cut).length;
    let best = target;
    for (let step = 0; step <= slack; step += 1) {
      const options = step === 0 ? [target] : [target - step, target + step];
      const fits = options.find(
        (cut) => cut >= lowest && cut <= highest && inWard(cut) <= 1,
      );
      if (fits !== undefined) {
        best = fits;
        break;
      }
    }
    cuts.push(best);
    previous = best;
  }
  return cuts;
}

/**
 * Draws the town's ward map and records it. Each sitting ward member's seat
 * goes with the ward their home is in when that ward is not already taken by
 * another member; otherwise the seat keeps its own number. Unchanged for a
 * council with no ward seats.
 */
export function redrawTownWards(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly town: EntityId;
    readonly drawnBy: WardDrawer;
    readonly members: readonly WardMember[];
    readonly reason: string;
  },
): World {
  const plan = councilWardPlan(input.unit);
  if (!plan || plan.wardSeats < 2) return world;
  const { households } = townRoster(input.town);
  if (households < plan.wardSeats) return world;
  const wardMembers = input.members.filter((row) => isWardSeat(plan, row.seat));
  const homes = wardMembers.flatMap((row) => {
    const home = homePosition(world, input.town, row.personId);
    return home === null ? [] : [{ ...row, home }];
  });
  const cuts = drawWardCuts(
    households,
    plan.wardSeats,
    input.drawnBy,
    homes.map((row) => row.home),
  );
  const draft: TownWardMap = {
    unitId: input.unit.id,
    wards: plan.wardSeats,
    households,
    cuts,
    seatWards: new Map(),
    drawnBy: input.drawnBy,
    drawnAt: world.currentDate,
    paired: [],
  };
  // Seats follow their members' homes where they can; the rest keep their
  // own numbers in the wards left over.
  const seatWards = new Map<number, number>();
  const claimed = new Set<number>();
  for (const row of homes) {
    const ward = wardAt(draft, row.home);
    if (claimed.has(ward)) continue;
    seatWards.set(row.seat, ward);
    claimed.add(ward);
  }
  const free = Array.from({ length: plan.wardSeats }, (_, i) => i + 1).filter(
    (ward) => !claimed.has(ward),
  );
  for (let seat = 1; seat <= plan.wardSeats; seat += 1)
    if (!seatWards.has(seat)) seatWards.set(seat, free.shift()!);
  const shared = homes.filter(
    (row) => seatWards.get(row.seat) !== wardAt(draft, row.home),
  );
  const paired = homes.filter((row) =>
    homes.some(
      (other) =>
        other.personId !== row.personId &&
        wardAt(draft, other.home) === wardAt(draft, row.home),
    ),
  );
  const sizes = Array.from({ length: plan.wardSeats }, (_, i) => {
    const [from, to] = wardRange(draft, i + 1);
    return to - from;
  });
  const deviation =
    (Math.max(...sizes) - Math.min(...sizes)) / (households / plan.wardSeats);
  const by =
    input.drawnBy === "commission"
      ? "an independent commission"
      : "the council";
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === WARD_COMMISSION_QUESTION,
  );
  const governingLaw = question
    ? lawInForce(world, input.town, question.id, world.currentDate)
    : null;
  const lawfulDrawer =
    governingLaw?.answer === "yes"
      ? "commission"
      : governingLaw?.answer === "no"
        ? "council"
        : null;
  const stamp =
    lawfulDrawer === input.drawnBy
      ? lawEffectStamp(governingLaw, {
          effectKind: "local.wards-drawn",
          questionKey: WARD_COMMISSION_QUESTION,
          jurisdictionId: input.town,
          appliedAt: world.currentDate,
        })
      : null;
  const attribution: LawEffectStampedRecord = stamp
    ? { lawEffectStamps: [stamp] }
    : {};
  return recordWorldEvent(world, {
    ...attribution,
    stableKey: `town-wards:${input.unit.id}:${world.currentDate}:${input.drawnBy}`,
    type: WARDS_DRAWN,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.town,
    // The town is always involved; the members the map pairs are too.
    involvedEntityIds: [input.town, ...paired.map((row) => row.personId)],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "town-wards-v1",
      `unit:${input.unit.id}`,
      `drawn-by:${input.drawnBy}`,
      `households:${households}`,
      `cuts:${cuts.join(",")}`,
      `seat-wards:${[...seatWards].map(([seat, ward]) => `${seat}=${ward}`).join(",")}`,
      `plan-basis:${plan.basis}`,
      `drawn-out:${shared.length}`,
      `paired:${paired.map((row) => row.personId).join(",")}`,
    ],
    summary: `${plan.wardSeats} council wards were drawn by ${by}, ${input.reason}; the largest and smallest differ by ${(deviation * 100).toFixed(1)}% of an even ward${
      shared.length > 0
        ? `, and ${shared.length} sitting ${shared.length === 1 ? "member lives" : "members live"} outside the ward ${shared.length === 1 ? "their seat" : "their seats"} now ${shared.length === 1 ? "represents" : "represent"}`
        : ""
    }.`,
    context: {
      location: {
        jurisdictionId: input.town,
        label: input.unit.name,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Precincts are voting geography beside wards, never legislative districts. */
export interface VotingPrecinctPlan {
  readonly version: "voting-precinct-population/v1";
  readonly assignmentBasis: "estimated-address-free-population-share";
  readonly townId: EntityId;
  readonly placeGeoid: string | null;
  readonly populationVintage: "census-2020";
  readonly basis:
    | "census-vtd-population"
    | "estimated-from-state-vtd-average"
    | "estimated-from-compiled-vtd-average";
  readonly sourceStateFips: readonly string[];
  readonly precincts: readonly {
    readonly key: string;
    readonly population: number;
  }[];
}

interface PrecinctPopulationCatalog {
  readonly format: string;
  readonly populations: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  readonly stateAverages: Readonly<
    Record<
      string,
      {
        readonly population: number | null;
        readonly vtdCount: number | null;
        readonly meanPopulation: number | null;
      }
    >
  >;
}
const precinctCatalog =
  precinctPopulation as unknown as PrecinctPopulationCatalog;
if (precinctCatalog.format !== "ocd-place-precinct-population/v1")
  throw new Error("Unrecognized voting-precinct population source.");
const precinctStateCodes = countyReadings.municipalCodes as Readonly<
  Record<string, { readonly stateFips: string }>
>;
const PRECINCT_MAP = "local.voting-precinct-map";
const PRECINCT_ARRIVAL = "local.voting-precinct-arrival";
const PRECINCT_TAG = "voting-precinct-record:";
interface SavedPrecinctMap {
  readonly plan: VotingPrecinctPlan;
  readonly assignments: Readonly<Record<EntityId, string>>;
}
interface SavedPrecinctArrival {
  readonly mapId: EntityId;
  readonly personId: EntityId;
  readonly precinctKey: string;
}
const parsedPrecinctRecords = new WeakMap<
  HistoricalEvent,
  SavedPrecinctMap | SavedPrecinctArrival
>();
function precinctRecord(
  event: HistoricalEvent,
): SavedPrecinctMap | SavedPrecinctArrival {
  const cached = parsedPrecinctRecords.get(event);
  if (cached) return cached;
  const tag = event.tags.find((value) => value.startsWith(PRECINCT_TAG));
  if (!tag) throw new Error(`Missing saved precinct payload: ${event.id}`);
  const record = JSON.parse(tag.slice(PRECINCT_TAG.length)) as
    SavedPrecinctMap | SavedPrecinctArrival;
  parsedPrecinctRecords.set(event, record);
  return record;
}
function latestPrecinctMap(
  world: World,
  townId: EntityId,
  asOf: IsoDate,
): HistoricalEvent | null {
  let latest: HistoricalEvent | null = null;
  for (const event of recordsWithFieldValue(
    world.history.events,
    "jurisdictionId",
    townId,
  )) {
    if (event.type !== PRECINCT_MAP || event.occurredAt > asOf) continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}
function primaryPrecinctHome(
  world: World,
  personId: EntityId,
  asOf: IsoDate,
): EntityId | null {
  const person = world.people[personId];
  if (!person || person.birthDate > asOf) return null;
  if (
    recordsWithFieldValue(
      world.history.personDeaths,
      "personId",
      personId,
    ).some((death) => death.diedAt <= asOf)
  )
    return null;
  const homes = householdMembershipsAt(world, personId, {
    asOfDate: asOf,
    historySequenceExclusive: world.history.nextSequence,
  });
  const primary = homes.filter(
    (row) => row.state.residenceRole === "primary" && row.location !== null,
  );
  if (primary.length > 1) return null;
  if (primary.length === 1) return primary[0]!.location!.jurisdictionId;
  // Old saves without primary-home records retain their canonical person home.
  return homes.length === 0 ? person.homeJurisdictionId : null;
}

/** Population inputs stay sourced; membership is an estimated address-free join. */
export function votingPrecinctPlan(
  world: World,
  townId: EntityId,
): VotingPrecinctPlan {
  const place = lifePlaceByJurisdictionId(townId);
  if (!place || !world.jurisdictions[townId])
    throw new Error("Precinct membership requires a recorded home place.");
  const placeGeoid = place.sourceGeoid ?? null;
  const recorded = placeGeoid
    ? precinctCatalog.populations[`${placeGeoid}:voting-precinct`]
    : undefined;
  const rows = Object.entries(recorded ?? {})
    .filter(([, count]) => Number.isSafeInteger(count) && count > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  if (rows.length > 0)
    return {
      version: "voting-precinct-population/v1",
      assignmentBasis: "estimated-address-free-population-share",
      townId,
      placeGeoid,
      populationVintage: "census-2020",
      basis: "census-vtd-population",
      sourceStateFips: [placeGeoid!.slice(0, 2)],
      precincts: rows.map(([key, population]) => ({ key, population })),
    };
  const stateUsps = place.stateJurisdictionKey?.slice(3);
  const stateFips = stateUsps
    ? precinctStateCodes[stateUsps]?.stateFips
    : undefined;
  const own = stateFips ? precinctCatalog.stateAverages[stateFips] : undefined;
  const donors = Object.entries(precinctCatalog.stateAverages).filter(
    ([, value]) =>
      value.population !== null &&
      value.vtdCount !== null &&
      value.vtdCount > 0 &&
      value.population > 0,
  );
  const ownAverage = own?.meanPopulation;
  const average =
    ownAverage && ownAverage > 0
      ? ownAverage
      : donors.reduce((sum, [, value]) => sum + value.population!, 0) /
        donors.reduce((sum, [, value]) => sum + value.vtdCount!, 0);
  if (!Number.isFinite(average) || average <= 0)
    throw new Error(
      "No admitted VTD population average for a precinct estimate.",
    );
  const reference = placeGeoid
    ? placeReferencePopulation(placeGeoid)?.value
    : undefined;
  const residents = world.personOrder.filter(
    (id) => primaryPrecinctHome(world, id, world.currentDate) === townId,
  ).length;
  const population = Math.max(
    reference ?? townRoster(townId).population,
    residents,
    1,
  );
  const count = Math.max(1, Math.round(population / average));
  return {
    version: "voting-precinct-population/v1",
    assignmentBasis: "estimated-address-free-population-share",
    townId,
    placeGeoid,
    populationVintage: "census-2020",
    basis:
      ownAverage && ownAverage > 0
        ? "estimated-from-state-vtd-average"
        : "estimated-from-compiled-vtd-average",
    sourceStateFips:
      ownAverage && ownAverage > 0
        ? [stateFips!]
        : donors.map(([fips]) => fips).sort(),
    precincts: Array.from({ length: count }, (_, index) => ({
      key: `estimated:${townId}:${index + 1}`,
      population: population / count,
    })),
  };
}

interface PrecinctSnapshot {
  readonly map: HistoricalEvent;
  readonly record: SavedPrecinctMap;
  readonly assignments: ReadonlyMap<string, string>;
}
const precinctSnapshots = new WeakMap<
  readonly HistoricalEvent[],
  Map<string, PrecinctSnapshot | null>
>();
function savedPrecinctSnapshot(
  world: World,
  townId: EntityId,
  asOf: IsoDate,
): PrecinctSnapshot | null {
  let snapshots = precinctSnapshots.get(world.history.events);
  if (!snapshots) {
    snapshots = new Map();
    precinctSnapshots.set(world.history.events, snapshots);
  }
  const key = JSON.stringify([townId, asOf]);
  if (snapshots.has(key)) return snapshots.get(key)!;
  const map = latestPrecinctMap(world, townId, asOf);
  if (!map) {
    snapshots.set(key, null);
    return null;
  }
  const record = precinctRecord(map) as SavedPrecinctMap;
  const assignments = new Map(Object.entries(record.assignments));
  const latest = new Map<EntityId, HistoricalEvent>();
  for (const event of recordsWithFieldValue(
    world.history.events,
    "jurisdictionId",
    townId,
  )) {
    if (event.type !== PRECINCT_ARRIVAL || event.occurredAt > asOf) continue;
    const arrival = precinctRecord(event) as SavedPrecinctArrival;
    if (arrival.mapId !== map.id) continue;
    const previous = latest.get(arrival.personId);
    if (
      !previous ||
      event.occurredAt > previous.occurredAt ||
      (event.occurredAt === previous.occurredAt &&
        event.sequence > previous.sequence)
    ) {
      latest.set(arrival.personId, event);
      assignments.set(arrival.personId, arrival.precinctKey);
    }
  }
  const snapshot = { map, record, assignments };
  snapshots.set(key, snapshot);
  return snapshot;
}

/** Saved membership only: never manufactures a precinct while reading a vote. */
export function votingPrecinctOfPerson(
  world: World,
  townId: EntityId,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): {
  readonly precinctKey: string;
  readonly mapId: EntityId;
  readonly plan: VotingPrecinctPlan;
} | null {
  if (primaryPrecinctHome(world, personId, asOf) !== townId) return null;
  const snapshot = savedPrecinctSnapshot(world, townId, asOf);
  if (!snapshot) return null;
  const key = snapshot.assignments.get(personId);
  return key
    ? { precinctKey: key, mapId: snapshot.map.id, plan: snapshot.record.plan }
    : null;
}

/** Dated canonical home join; never guesses a precinct for an old save. */
export function votingPrecinctForResident(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): ReturnType<typeof votingPrecinctOfPerson> {
  const townId = primaryPrecinctHome(world, personId, asOf);
  return townId ? votingPrecinctOfPerson(world, townId, personId, asOf) : null;
}

/** Latest saved plan on the count date, including its canonical event ID. */
export function votingPrecinctMapForTown(
  world: World,
  townId: EntityId,
  asOf: IsoDate = world.currentDate,
): { readonly mapId: EntityId; readonly plan: VotingPrecinctPlan } | null {
  const snapshot = savedPrecinctSnapshot(world, townId, asOf);
  return snapshot
    ? { mapId: snapshot.map.id, plan: snapshot.record.plan }
    : null;
}

function writePrecinctEvent(
  world: World,
  townId: EntityId,
  type: typeof PRECINCT_MAP | typeof PRECINCT_ARRIVAL,
  stableKey: string,
  payload: SavedPrecinctMap | SavedPrecinctArrival,
  people: readonly EntityId[],
): World {
  return recordWorldEvent(world, {
    stableKey,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: townId,
    involvedEntityIds: [townId, ...people],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "voting-precinct-population/v1",
      `${PRECINCT_TAG}${JSON.stringify(payload)}`,
    ],
    summary:
      "Voting precinct membership follows the recorded home and population-share plan.",
    context: {
      location: {
        jurisdictionId: townId,
        label: world.jurisdictions[townId]!.name,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Opening/census producer: personOrder fills exact largest-remainder shares. */
export function establishVotingPrecinctMembership(
  world: World,
  townId: EntityId,
  reason: "opening" | "census" = "opening",
): World {
  if (reason === "census" && Number(world.currentDate.slice(0, 4)) % 10 !== 1)
    return world;
  const previous = latestPrecinctMap(world, townId, world.currentDate);
  if (previous && reason === "opening") return world;
  if (
    reason === "census" &&
    (!previous ||
      Number(world.currentDate.slice(0, 4)) % 10 !== 1 ||
      previous.occurredAt.slice(0, 4) === world.currentDate.slice(0, 4))
  )
    return world;
  const plan = votingPrecinctPlan(world, townId);
  const residents = world.personOrder.filter(
    (id) => primaryPrecinctHome(world, id, world.currentDate) === townId,
  );
  const total = plan.precincts.reduce((sum, row) => sum + row.population, 0);
  const shares = plan.precincts.map((row) => {
    const exact = (residents.length * row.population) / total;
    return {
      key: row.key,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const remainder =
    residents.length - shares.reduce((sum, row) => sum + row.count, 0);
  for (const row of [...shares]
    .sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key))
    .slice(0, remainder))
    row.count += 1;
  const assignments: Record<EntityId, string> = {};
  let at = 0;
  for (const share of shares)
    for (let n = 0; n < share.count; n += 1)
      assignments[residents[at++]!] = share.key;
  return writePrecinctEvent(
    world,
    townId,
    PRECINCT_MAP,
    `voting-precinct-map:${townId}:${world.currentDate}:${reason}`,
    { plan, assignments },
    residents,
  );
}

/** Arrival producer: keeps all prior assignments, fills the largest shortfall. */
export function syncVotingPrecinctArrival(
  world: World,
  personId: EntityId,
): World {
  const townId = primaryPrecinctHome(world, personId, world.currentDate);
  if (!townId) return world;
  let next = establishVotingPrecinctMembership(world, townId);
  if (votingPrecinctOfPerson(next, townId, personId)) return next;
  const map = latestPrecinctMap(next, townId, next.currentDate)!;
  const { plan } = precinctRecord(map) as SavedPrecinctMap;
  const counts = new Map(plan.precincts.map((row) => [row.key, 0]));
  let residents = 0;
  for (const id of next.personOrder) {
    if (primaryPrecinctHome(next, id, next.currentDate) !== townId) continue;
    residents += 1;
    const membership = votingPrecinctOfPerson(next, townId, id);
    if (membership)
      counts.set(
        membership.precinctKey,
        counts.get(membership.precinctKey)! + 1,
      );
  }
  const total = plan.precincts.reduce((sum, row) => sum + row.population, 0);
  const winner = [...plan.precincts].sort(
    (a, b) =>
      (residents * b.population) / total -
        counts.get(b.key)! -
        ((residents * a.population) / total - counts.get(a.key)!) ||
      a.key.localeCompare(b.key),
  )[0]!;
  next = writePrecinctEvent(
    next,
    townId,
    PRECINCT_ARRIVAL,
    `voting-precinct-arrival:${map.id}:${personId}:${next.history.nextSequence}`,
    { mapId: map.id, personId, precinctKey: winner.key },
    [personId],
  );
  return next;
}
