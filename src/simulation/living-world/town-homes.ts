/**
 * Where the town's households live: a recorded home of one of six kinds,
 * rented or owned, and the moves, purchases and sales that change it.
 *
 * Before this, a town household had no dwelling on record, so every home in
 * the game read as a suburban house (`presentation/place-backdrops.ts`), and
 * nobody but the player ever bought, sold or moved within town.
 *
 * At the opening every written household in town, the player's included,
 * gets a home: a dwelling of one kind, a tenure (rented, owned outright or
 * owned with a mortgage) and the household's occupancy of it. The kind
 * depends on the size of the town, how much of the county's work is on
 * farms, and who lives in the household: a young person alone more often
 * rents an apartment, a family with children more often owns a larger house.
 *
 * Four times a year, on the town's quarterly review, after jobs and families
 * (`migration/review.ts`):
 *
 * - a home nobody lives in any longer is vacated, and an owned one is sold;
 * - a household in town with no home (newcomers, somebody who moved out
 *   after a breakup) moves into one, a vacant home of the kind it would
 *   choose when there is one, else one not recorded before;
 * - a household that rents may buy a house, more often when its adults work
 *   and less often when unemployment is high;
 * - a household with children in an apartment may move to a house;
 * - an older owner with an empty house may sell and move to something
 *   smaller;
 * - a renter may move to another rental in town.
 *
 * Each move is a dated event with the ended occupancy and tenure and the new
 * ones, written through the same resource writers home buying uses. Moving
 * away from town ends the home on the move (`migration/relocate.ts`). The
 * player's household is housed at the opening and never moved here.
 *
 * GAME ASSUMPTIONS, not read from a source: the shares of each kind of home
 * by town size, the ownership chances and the move chances below. They are
 * set near the national American Community Survey picture (about six homes in
 * ten detached houses, about one in four apartments, about one in sixteen
 * mobile homes, about two in three owned), which is inferred, not measured.
 * No rent, price or mortgage payment is recorded here.
 */

import { ageOnDate, addDays } from "../dates";
import { lifePlaceByJurisdictionId } from "../life-places";
import { SeededRng } from "../rng";
import {
  createDwelling,
  createHousingTenure,
  recordDwellingOccupancyState,
  recordHousingTenureState,
  startDwellingOccupancy,
} from "../resources";
import type {
  DwellingClassification,
  DwellingOccupancyKind,
  EntityId,
  HousingTenureKind,
  IsoDate,
  LifeRecordProvenance,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { TOWN_RESIDENTS_VERSION, townRoster } from "./town-residents";
import { townUnemploymentPressure } from "./town-labor-market";
import { townWorkplaceWeights } from "./town-employment";

export const TOWN_HOMES_VERSION = "town-homes-v1";

/** The six kinds of home, by the painted home each one shows. */
export const TOWN_HOME_KINDS = {
  "small-apartment": "residential:apartment",
  rowhouse: "residential:rowhouse",
  "suburban-house": "residential:house",
  "large-house": "residential:large-house",
  "mobile-home": "residential:mobile-home",
  "rural-farmhouse": "residential:farmhouse",
} as const satisfies Record<string, DwellingClassification>;

export type TownHomeKind = keyof typeof TOWN_HOME_KINDS;

const KINDS = Object.keys(TOWN_HOME_KINDS) as TownHomeKind[];

const KIND_LABEL: Readonly<Record<TownHomeKind, string>> = {
  "small-apartment": "an apartment",
  rowhouse: "a rowhouse",
  "suburban-house": "a house",
  "large-house": "a large house",
  "mobile-home": "a mobile home",
  "rural-farmhouse": "a farmhouse",
};

export const TOWN_HOME_EVENTS = {
  movedIn: "life.moved-into-home",
  moved: "life.moved-home",
  bought: "life.bought-home",
  sold: "life.sold-home",
} as const;

export const TOWN_TENURE_KINDS = {
  rented: "lease:rented",
  owned: "ownership:owned",
  mortgaged: "ownership:mortgaged",
} as const satisfies Record<string, HousingTenureKind>;

/** GAME ASSUMPTION: shares of each kind of home, by the town's population. */
export const TOWN_HOME_SHARES: readonly (readonly [
  number,
  Readonly<Record<TownHomeKind, number>>,
])[] = [
  [
    250_000,
    {
      "small-apartment": 0.34,
      rowhouse: 0.1,
      "suburban-house": 0.44,
      "large-house": 0.08,
      "mobile-home": 0.02,
      "rural-farmhouse": 0.02,
    },
  ],
  [
    50_000,
    {
      "small-apartment": 0.26,
      rowhouse: 0.05,
      "suburban-house": 0.52,
      "large-house": 0.09,
      "mobile-home": 0.05,
      "rural-farmhouse": 0.03,
    },
  ],
  [
    10_000,
    {
      "small-apartment": 0.18,
      rowhouse: 0.03,
      "suburban-house": 0.55,
      "large-house": 0.09,
      "mobile-home": 0.1,
      "rural-farmhouse": 0.05,
    },
  ],
  [
    0,
    {
      "small-apartment": 0.08,
      rowhouse: 0.01,
      "suburban-house": 0.52,
      "large-house": 0.07,
      "mobile-home": 0.16,
      "rural-farmhouse": 0.16,
    },
  ],
];

/** GAME ASSUMPTION: the chance a household owns a home of each kind. */
export const TOWN_OWNERSHIP_BY_KIND: Readonly<Record<TownHomeKind, number>> = {
  "small-apartment": 0.12,
  rowhouse: 0.5,
  "suburban-house": 0.75,
  "large-house": 0.88,
  "mobile-home": 0.7,
  "rural-farmhouse": 0.85,
};

/** GAME ASSUMPTION: chances per quarter of a move within town. */
export const TOWN_HOME_MOVES = {
  /** A renting household aged 27 to 55 with somebody working buys a house. */
  buy: 0.02,
  /** A household with children in an apartment moves to a house. */
  outgrow: 0.05,
  /** An owner 65 or older, one or two people in a house, sells. */
  downsize: 0.012,
  /** Any renter moves to another rental. */
  renterMove: 0.03,
} as const;

/** How long a household stays before it moves again by choice. */
const SETTLED_DAYS = 365;

/** Share of the county's jobs on farms, which weighs toward farmhouses. */
const FARM_SHARE = new Map<EntityId, number>();
function farmShare(town: EntityId): number {
  const known = FARM_SHARE.get(town);
  if (known !== undefined) return known;
  const weights = townWorkplaceWeights(town);
  let total = 0;
  for (const value of weights.values()) total += value;
  const share = total > 0 ? (weights.get("farm") ?? 0) / total : 0;
  FARM_SHARE.set(town, share);
  return share;
}

interface Household {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly members: readonly { readonly id: EntityId; readonly age: number }[];
}

function headAge(household: Household): number {
  return Math.max(0, ...household.members.map((member) => member.age));
}

/** The kind of home a household would choose, weighed and drawn. */
export function chooseTownHomeKind(
  town: EntityId,
  household: Household,
  rng: SeededRng,
  options: { readonly houseOnly?: boolean; readonly smaller?: boolean } = {},
): TownHomeKind {
  const population = townRoster(town).population;
  const shares =
    TOWN_HOME_SHARES.find(([floor]) => population >= floor)?.[1] ??
    TOWN_HOME_SHARES.at(-1)![1];
  const farm = Math.min(3, Math.max(0.3, farmShare(town) / 0.02));
  const adults = household.members.filter((member) => member.age >= 18);
  const children = household.members.length - adults.length;
  const head = headAge(household);
  const weights = KINDS.map((kind) => {
    let weight = shares[kind];
    if (kind === "rural-farmhouse") weight *= farm;
    if (adults.length <= 1 && children === 0 && head < 35) {
      if (kind === "small-apartment") weight *= 2.5;
      if (kind === "large-house") weight *= 0.3;
    }
    if (children > 0) {
      if (kind === "small-apartment") weight *= 0.5;
      if (kind === "large-house") weight *= 1.5;
    }
    if (options.houseOnly && kind === "small-apartment") weight = 0;
    if (
      options.smaller &&
      (kind === "large-house" || kind === "rural-farmhouse")
    )
      weight = 0;
    return weight;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let point = rng.next() * total;
  for (let index = 0; index < KINDS.length; index += 1) {
    point -= weights[index]!;
    if (point < 0) return KINDS[index]!;
  }
  return "suburban-house";
}

/** Rented, owned outright or owned with a mortgage. */
function chooseTenure(
  kind: TownHomeKind,
  head: number,
  rng: SeededRng,
): HousingTenureKind {
  const ageFactor =
    head < 25
      ? 0.3
      : head < 35
        ? 0.65
        : head < 45
          ? 0.9
          : head < 65
            ? 1.05
            : 1.1;
  const own = Math.min(0.97, TOWN_OWNERSHIP_BY_KIND[kind] * ageFactor);
  if (rng.fork("own").next() >= own) return TOWN_TENURE_KINDS.rented;
  return head < 60 && rng.fork("mortgage").next() < 0.7
    ? TOWN_TENURE_KINDS.mortgaged
    : TOWN_TENURE_KINDS.owned;
}

const KIND_OF_CLASSIFICATION = new Map<string, TownHomeKind>(
  Object.entries(TOWN_HOME_KINDS).map(([kind, classification]) => [
    classification,
    kind as TownHomeKind,
  ]),
);

interface Home {
  readonly occupancyId: EntityId;
  readonly occupancyStateId: EntityId;
  readonly occupancyKind: string;
  readonly startedAt: IsoDate;
  readonly dwellingId: EntityId;
  readonly kind: TownHomeKind | null;
  readonly tenureId: EntityId | null;
  readonly tenureStateId: EntityId | null;
  readonly tenureKind: string | null;
}

/** Everything one pass reads, gathered once from the history. */
interface HomesView {
  readonly households: readonly Household[];
  /** The household's active primary home, when it has one. */
  readonly homeOf: ReadonlyMap<EntityId, Home>;
  /** Households that ever had a home from this module. */
  readonly everHoused: ReadonlySet<EntityId>;
  /** Town homes with nobody in them, by kind, oldest first. */
  readonly vacant: ReadonlyMap<TownHomeKind, readonly EntityId[]>;
  readonly working: ReadonlySet<EntityId>;
}

function latestBy<T extends { readonly effectiveAt: IsoDate }>(
  rows: readonly T[],
  key: (row: T) => EntityId,
  today: IsoDate,
): Map<EntityId, T> {
  const latest = new Map<EntityId, T>();
  for (const row of rows)
    if (row.effectiveAt <= today) latest.set(key(row), row);
  return latest;
}

function readHomes(world: World, town: EntityId): HomesView {
  const today = world.currentDate;
  const h = world.history;
  const dead = new Set(h.personDeaths.map((row) => row.personId));

  const membershipState = latestBy(
    h.householdMembershipStates,
    (row) => row.membershipId,
    today,
  );
  const membersOf = new Map<EntityId, { id: EntityId; age: number }[]>();
  for (const membership of h.householdMemberships) {
    const state = membershipState.get(membership.id);
    if (!state || state.status === "ended" || state.residenceRole !== "primary")
      continue;
    const person = world.people[membership.personId];
    if (!person || dead.has(person.id) || person.homeJurisdictionId !== town)
      continue;
    const list = membersOf.get(membership.householdId) ?? [];
    list.push({ id: person.id, age: ageOnDate(person.birthDate, today) });
    membersOf.set(membership.householdId, list);
  }
  const locationOf = latestBy(
    h.householdLocations,
    (row) => row.householdId,
    today,
  );
  const households: Household[] = [];
  for (const household of h.households) {
    const members = membersOf.get(household.id);
    if (!members || members.length === 0) continue;
    if (locationOf.get(household.id)?.jurisdictionId !== town) continue;
    households.push({
      id: household.id,
      stableKey: household.stableKey,
      members,
    });
  }

  const dwellings = new Map(h.dwellings.map((row) => [row.id, row]));
  const occupancyState = latestBy(
    h.dwellingOccupancyStates,
    (row) => row.dwellingOccupancyId,
    today,
  );
  const tenureState = latestBy(
    h.housingTenureStates,
    (row) => row.housingTenureId,
    today,
  );
  const tenureOf = new Map<string, { id: EntityId; kind: string }>();
  for (const tenure of h.housingTenures) {
    if (tenure.holder.kind !== "household") continue;
    if (tenureState.get(tenure.id)?.status !== "active") continue;
    tenureOf.set(`${tenure.holder.householdId}|${tenure.dwellingId}`, tenure);
  }
  const homeOf = new Map<EntityId, Home>();
  const everHoused = new Set<EntityId>();
  const occupied = new Set<EntityId>();
  for (const occupancy of h.dwellingOccupancies) {
    if (occupancy.occupant.kind !== "household") continue;
    const householdId = occupancy.occupant.householdId;
    if (occupancy.stableKey.startsWith(TOWN_HOMES_VERSION))
      everHoused.add(householdId);
    const state = occupancyState.get(occupancy.id);
    if (!state || state.status === "ended") continue;
    occupied.add(occupancy.dwellingId);
    if (state.residenceRole !== "primary") continue;
    const dwelling = dwellings.get(occupancy.dwellingId);
    const tenure = tenureOf.get(`${householdId}|${occupancy.dwellingId}`);
    homeOf.set(householdId, {
      occupancyId: occupancy.id,
      occupancyStateId: state.id,
      occupancyKind: state.kind,
      startedAt: occupancy.startedAt,
      dwellingId: occupancy.dwellingId,
      kind: dwelling
        ? (KIND_OF_CLASSIFICATION.get(dwelling.classification) ?? null)
        : null,
      tenureId: tenure?.id ?? null,
      tenureStateId: tenure ? tenureState.get(tenure.id)!.id : null,
      tenureKind: tenure?.kind ?? null,
    });
  }
  const vacant = new Map<TownHomeKind, EntityId[]>();
  for (const dwelling of h.dwellings) {
    if (!dwelling.stableKey.startsWith(`${TOWN_HOMES_VERSION}:${town}:`))
      continue;
    if (occupied.has(dwelling.id)) continue;
    const kind = KIND_OF_CLASSIFICATION.get(dwelling.classification);
    if (!kind) continue;
    const list = vacant.get(kind) ?? [];
    list.push(dwelling.id);
    vacant.set(kind, list);
  }

  const workLatest = latestBy(
    h.workStatuses,
    (row) => row.workRelationshipId,
    today,
  );
  const working = new Set<EntityId>();
  for (const relationship of h.workRelationships)
    if (workLatest.get(relationship.id)?.status === "active")
      working.add(relationship.personId);

  return { households, homeOf, everHoused, vacant, working };
}

/** The household the player lives in, if any. */
function playerHouseholdId(world: World, view: HomesView): EntityId | null {
  if (world.control.kind !== "person") return null;
  const playerId = world.control.personId;
  return (
    view.households.find((household) =>
      household.members.some((member) => member.id === playerId),
    )?.id ?? null
  );
}

interface Writer {
  world: World;
  readonly town: EntityId;
  readonly today: IsoDate;
  readonly prefix: string;
  readonly vacant: Map<TownHomeKind, EntityId[]>;
}

/** Ends a household's home: the occupancy, and the tenure when it has one. */
function leaveHome(
  writer: Writer,
  key: string,
  home: Home,
  reason: string,
  provenance: LifeRecordProvenance,
) {
  writer.world = recordDwellingOccupancyState(writer.world, {
    stableKey: `${writer.prefix}${key}:left`,
    dwellingOccupancyId: home.occupancyId,
    effectiveAt: writer.today,
    status: "ended",
    residenceRole: "primary",
    kind: home.occupancyKind as DwellingOccupancyKind,
    reason,
    provenance,
    supersedesStateId: home.occupancyStateId,
  });
  if (home.tenureId && home.tenureStateId)
    writer.world = recordHousingTenureState(writer.world, {
      stableKey: `${writer.prefix}${key}:tenure-ended`,
      housingTenureId: home.tenureId,
      effectiveAt: writer.today,
      status: "ended",
      context: home.tenureKind?.startsWith("ownership:") ? "sold" : reason,
      provenance,
      supersedesStateId: home.tenureStateId,
    });
  if (home.kind) {
    const list = writer.vacant.get(home.kind) ?? [];
    list.push(home.dwellingId);
    writer.vacant.set(home.kind, list);
  }
}

/** Moves a household into a home of `kind`, vacant or newly recorded. */
function enterHome(
  writer: Writer,
  key: string,
  householdId: EntityId,
  kind: TownHomeKind,
  tenure: HousingTenureKind,
  provenance: LifeRecordProvenance,
) {
  const pool = writer.vacant.get(kind) ?? [];
  let dwellingId = pool.shift();
  if (!dwellingId) {
    writer.world = createDwelling(writer.world, {
      stableKey: `${writer.prefix}${key}:dwelling`,
      establishedAt: writer.today,
      jurisdictionId: writer.town,
      locationLabel: `${KIND_LABEL[kind][0]!.toUpperCase()}${KIND_LABEL[kind].slice(1)} in ${lifePlaceByJurisdictionId(writer.town)?.displayName ?? "town"}`,
      classification: TOWN_HOME_KINDS[kind],
      provenance,
    });
    dwellingId = writer.world.history.dwellings.at(-1)!.id;
  }
  writer.world = createHousingTenure(writer.world, {
    stableKey: `${writer.prefix}${key}:tenure`,
    holder: { kind: "household", householdId },
    dwellingId,
    startedAt: writer.today,
    kind: tenure,
    context: null,
    provenance,
  });
  writer.world = startDwellingOccupancy(writer.world, {
    stableKey: `${writer.prefix}${key}:occupancy`,
    occupant: { kind: "household", householdId },
    dwellingId,
    startedAt: writer.today,
    residenceRole: "primary",
    kind:
      tenure === TOWN_TENURE_KINDS.rented
        ? "residence:rented-home"
        : "residence:owned-home",
    provenance,
  });
}

function householdRng(world: World, key: string) {
  return new SeededRng(world.seed).fork(key);
}

/**
 * Gives every written household in town a home, once, at the opening. The
 * homes were there before the story started, so no move is recorded.
 */
export function ensureTownHomes(world: World, town: EntityId): World {
  const view = readHomes(world, town);
  const writer: Writer = {
    world,
    town,
    today: world.currentDate,
    prefix: `${TOWN_HOMES_VERSION}:${town}:opening:`,
    vacant: new Map(),
  };
  const provenance: LifeRecordProvenance = {
    kind: "generated",
    generatorKey: TOWN_HOMES_VERSION,
  };
  for (const household of view.households) {
    if (view.homeOf.has(household.id) || view.everHoused.has(household.id))
      continue;
    const rng = householdRng(
      world,
      `${TOWN_HOMES_VERSION}:home:${household.id}`,
    );
    const kind = chooseTownHomeKind(town, household, rng.fork("kind"));
    enterHome(
      writer,
      household.id,
      household.id,
      kind,
      chooseTenure(kind, headAge(household), rng.fork("tenure")),
      provenance,
    );
  }
  return writer.world;
}

/** One quarterly turn of the town's homes, on the world's current date. */
export function reviewTownHomes(
  world: World,
  town: EntityId,
  round: string,
): World {
  const prefix = `${TOWN_HOMES_VERSION}:${town}:${round}:`;
  if (
    world.history.dwellingOccupancies.some((row) =>
      row.stableKey.startsWith(prefix),
    ) ||
    world.history.dwellingOccupancyStates.some((row) =>
      row.stableKey.startsWith(prefix),
    )
  )
    return world;
  const view = readHomes(world, town);
  if (view.households.length === 0) return world;
  const today = world.currentDate;
  const pressure = Math.sqrt(townUnemploymentPressure(world, town));
  const player = playerHouseholdId(world, view);
  const writer: Writer = {
    world,
    town,
    today,
    prefix,
    vacant: new Map(
      [...view.vacant].map(([kind, ids]) => [kind, [...ids]] as const),
    ),
  };
  const lived = new Set(view.households.map((household) => household.id));
  const settledBefore = addDays(today, -SETTLED_DAYS);

  const event = (
    key: string,
    type: `${string}.${string}`,
    household: Household,
    summary: string,
  ): LifeRecordProvenance => {
    const adults = household.members.filter((member) => member.age >= 18);
    const people = (adults.length > 0 ? adults : household.members).map(
      (member) => member.id,
    );
    writer.world = recordWorldEvent(writer.world, {
      stableKey: `${prefix}${key}:event`,
      type,
      occurredAt: today,
      recordedAt: today,
      jurisdictionId: town,
      involvedEntityIds: [household.id, ...people],
      participants: people.map((personId) => ({
        personId,
        role: "focus:subject" as const,
        detail: summary,
      })),
      personFactConstraints: [],
      visibility: "limited",
      tags: ["life.home", TOWN_HOMES_VERSION],
      summary,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return {
      kind: "simulated-event",
      eventId: writer.world.history.events.at(-1)!.id,
    };
  };
  const nameOf = (household: Household) => {
    const record = world.history.households.find(
      (row) => row.id === household.id,
    );
    return record
      ? `The ${record.label.replace(/ household$/, "")} household`
      : "A household";
  };

  // A home nobody lives in any longer is left, and an owned one is sold.
  for (const [householdId, home] of view.homeOf) {
    if (lived.has(householdId)) continue;
    const occupancy = world.history.dwellingOccupancies.find(
      (row) => row.id === home.occupancyId,
    );
    if (!occupancy?.stableKey.startsWith(TOWN_HOMES_VERSION)) continue;
    const dwelling = world.history.dwellings.find(
      (row) => row.id === home.dwellingId,
    );
    if (dwelling?.jurisdictionId !== town) continue;
    leaveHome(writer, `empty:${householdId}`, home, "Nobody lives there now.", {
      kind: "generated",
      generatorKey: TOWN_HOMES_VERSION,
    });
  }

  for (const household of view.households) {
    const key = `household:${household.id}`;
    const rng = householdRng(world, `${prefix}${key}`);
    const home = view.homeOf.get(household.id);
    const head = headAge(household);
    const adults = household.members.filter((member) => member.age >= 18);
    const children = household.members.length - adults.length;
    if (adults.length === 0) continue;

    // A household in town with no home finds one.
    if (!home) {
      const kind = chooseTownHomeKind(town, household, rng.fork("kind"));
      const tenure = chooseTenure(kind, head, rng.fork("tenure"));
      // A written household that never had a home was always there.
      const quiet =
        household.stableKey.startsWith(`${TOWN_RESIDENTS_VERSION}:`) &&
        !view.everHoused.has(household.id);
      const provenance: LifeRecordProvenance = quiet
        ? { kind: "generated", generatorKey: TOWN_HOMES_VERSION }
        : event(
            key,
            tenure === TOWN_TENURE_KINDS.rented
              ? TOWN_HOME_EVENTS.movedIn
              : TOWN_HOME_EVENTS.bought,
            household,
            `${nameOf(household)} ${tenure === TOWN_TENURE_KINDS.rented ? "moved into" : "bought"} ${KIND_LABEL[kind]}.`,
          );
      enterHome(writer, key, household.id, kind, tenure, provenance);
      continue;
    }
    if (household.id === player) continue;
    if (home.startedAt > settledBefore || !home.kind) continue;

    const renting = home.tenureKind === TOWN_TENURE_KINDS.rented;
    const owning = home.tenureKind?.startsWith("ownership:") ?? false;
    const anyWork = adults.some((adult) => view.working.has(adult.id));
    const allWork = adults.every((adult) => view.working.has(adult.id));

    let move: {
      readonly type: `${string}.${string}`;
      readonly kind: TownHomeKind;
      readonly tenure: HousingTenureKind;
    } | null = null;
    if (
      renting &&
      head >= 27 &&
      head <= 55 &&
      anyWork &&
      rng.fork("buy").next() <
        (TOWN_HOME_MOVES.buy * (allWork ? 1.5 : 1) * (children > 0 ? 1.3 : 1)) /
          pressure
    ) {
      const kind = chooseTownHomeKind(town, household, rng.fork("buy-kind"), {
        houseOnly: true,
      });
      move = {
        type: TOWN_HOME_EVENTS.bought,
        kind,
        tenure:
          head < 60 ? TOWN_TENURE_KINDS.mortgaged : TOWN_TENURE_KINDS.owned,
      };
    } else if (
      home.kind === "small-apartment" &&
      children > 0 &&
      rng.fork("outgrow").next() < TOWN_HOME_MOVES.outgrow / pressure
    ) {
      const kind = chooseTownHomeKind(
        town,
        household,
        rng.fork("outgrow-kind"),
        { houseOnly: true },
      );
      const tenure = chooseTenure(kind, head, rng.fork("outgrow-tenure"));
      move = {
        type:
          tenure === TOWN_TENURE_KINDS.rented
            ? TOWN_HOME_EVENTS.moved
            : TOWN_HOME_EVENTS.bought,
        kind,
        tenure,
      };
    } else if (
      owning &&
      head >= 65 &&
      household.members.length <= 2 &&
      home.kind !== "small-apartment" &&
      rng.fork("downsize").next() < TOWN_HOME_MOVES.downsize
    ) {
      const kind = chooseTownHomeKind(
        town,
        household,
        rng.fork("downsize-kind"),
        { smaller: true },
      );
      move = {
        type: TOWN_HOME_EVENTS.sold,
        kind,
        tenure:
          kind === "small-apartment"
            ? TOWN_TENURE_KINDS.rented
            : TOWN_TENURE_KINDS.owned,
      };
    } else if (
      renting &&
      rng.fork("renter-move").next() < TOWN_HOME_MOVES.renterMove
    ) {
      const kind = chooseTownHomeKind(town, household, rng.fork("rent-kind"));
      move = {
        type: TOWN_HOME_EVENTS.moved,
        kind,
        tenure: TOWN_TENURE_KINDS.rented,
      };
    }
    if (!move) continue;

    const verb =
      move.type === TOWN_HOME_EVENTS.bought
        ? `bought ${KIND_LABEL[move.kind]}`
        : move.type === TOWN_HOME_EVENTS.sold
          ? `sold their ${KIND_LABEL[home.kind].replace(/^an? /, "")} and moved to ${KIND_LABEL[move.kind]}`
          : `moved to ${KIND_LABEL[move.kind]}`;
    const provenance = event(
      key,
      move.type,
      household,
      `${nameOf(household)} ${verb}.`,
    );
    leaveHome(writer, key, home, "Moved within town.", provenance);
    enterHome(writer, key, household.id, move.kind, move.tenure, provenance);
  }
  return writer.world;
}

/** What the town's homes look like today, and what changed, from records. */
export function describeTownHomes(world: World, town: EntityId) {
  const view = readHomes(world, town);
  const kinds: Partial<Record<TownHomeKind, number>> = {};
  let owned = 0;
  let housed = 0;
  for (const household of view.households) {
    const home = view.homeOf.get(household.id);
    if (!home?.kind) continue;
    housed += 1;
    kinds[home.kind] = (kinds[home.kind] ?? 0) + 1;
    if (home.tenureKind?.startsWith("ownership:")) owned += 1;
  }
  const events: Record<string, number> = {};
  for (const event of world.history.events)
    if (
      event.jurisdictionId === town &&
      event.tags.includes(TOWN_HOMES_VERSION)
    )
      events[event.type] = (events[event.type] ?? 0) + 1;
  return {
    households: view.households.length,
    housed,
    owned,
    kinds,
    events,
  };
}
