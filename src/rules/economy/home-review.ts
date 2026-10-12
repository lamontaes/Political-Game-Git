/** Complete retained quarterly home reader, head-age, move/tenure/vacancy and event requests. */
import { ageOnDate, addDays } from "../../simulation/dates";
import type {
  World,
  DwellingClassification,
  DwellingOccupancyKind,
  EntityId,
  HousingTenureKind,
  IsoDate,
  LifeRecordProvenance,
} from "../../simulation/types";
import type * as resources from "../../simulation/resources";
import type { recordWorldEvent } from "../../simulation/world";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import { TOWN_RESIDENTS_VERSION } from "../../simulation/living-world/town-residents";
import {
  householdHousingFacts as rentalFacts,
  type HouseholdHousingFacts,
  type RentReadingFacts,
} from "./rent-readings";
import { RENT_EVENTS } from "./rent-effects";
import {
  homePurchaseTerms as purchaseTerms,
  type HomePurchaseFacts,
} from "./home-purchase-records";
export interface HomeReviewFacts extends RentReadingFacts {
  readonly control: World["control"];
  readonly purchase: HomePurchaseFacts;
}
export type HomeReviewRequest =
  | {
      readonly kind: "createDwelling";
      readonly input: Parameters<typeof resources.createDwelling>[1];
    }
  | {
      readonly kind: "createHousingTenure";
      readonly input: Parameters<typeof resources.createHousingTenure>[1];
    }
  | {
      readonly kind: "recordDwellingOccupancyState";
      readonly input: Parameters<
        typeof resources.recordDwellingOccupancyState
      >[1];
    }
  | {
      readonly kind: "recordHousingTenureState";
      readonly input: Parameters<typeof resources.recordHousingTenureState>[1];
    }
  | {
      readonly kind: "startDwellingOccupancy";
      readonly input: Parameters<typeof resources.startDwellingOccupancy>[1];
    }
  | {
      readonly kind: "recordWorldEvent";
      readonly input: Parameters<typeof recordWorldEvent>[1];
    }
  | { readonly kind: "recordDirectEventMemories"; readonly eventId: EntityId };
function householdHousingFacts(facts: HomeReviewFacts, date: IsoDate) {
  return rentalFacts(facts, date);
}
function homePurchaseTerms(
  facts: HomeReviewFacts,
  town: EntityId,
  buyer: null,
) {
  return purchaseTerms(facts.purchase, town, buyer);
}
function lifePlaceByJurisdictionId(
  facts: HomeReviewFacts,
  town: EntityId,
): ReturnType<typeof nativePlace> {
  if (!facts.places.has(town)) throw Error("Missing raw home place");
  return facts.places.get(town)!;
}
export const TOWN_HOMES_VERSION = "town-homes-v1";
export const TOWN_HOME_KINDS = {
  "small-apartment": "residential:apartment",
  rowhouse: "residential:rowhouse",
  "suburban-house": "residential:house",
  "large-house": "residential:large-house",
  "mobile-home": "residential:mobile-home",
  "rural-farmhouse": "residential:farmhouse",
} as const satisfies Record<string, DwellingClassification>;
export type TownHomeKind = keyof typeof TOWN_HOME_KINDS;
// STOPGAP: economy.home-review-native-English
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
export const TOWN_HOME_DECISIONS = {
  buyAtPayOfPayment: 1 / 0.28,
  severeRentBurden: 0.5,
  downsizeFromAge: 65,
  evictionOnRecordDays: 7 * 365,
} as const;
export const TOWN_HOME_PRICE_FACTOR: Readonly<Record<TownHomeKind, number>> = {
  "small-apartment": 0.6,
  rowhouse: 0.8,
  "suburban-house": 1,
  "large-house": 1.6,
  "mobile-home": 0.35,
  "rural-farmhouse": 1,
};
export const TOWN_HOME_REASONS = {
  canBuy: "their pay now carries the payments on a home",
  outgrew: "the family outgrew the apartment",
  rentOutranPay: "the rent reached half of what they earn",
  leftAlone: "one of them was left alone in the house",
  noHome: "they had no home in town yet",
  evicted: "they were evicted from their last home",
} as const;
export function homeForNewHousehold(
  household: {
    readonly members: readonly {
      readonly age: number;
    }[];
  },
  working: boolean,
  payMinor: number | null,
  paymentMinor: number | null,
  mayBorrow = true,
  farm = false,
): {
  readonly kind: TownHomeKind;
  readonly tenure: HousingTenureKind;
} {
  const head = Math.max(0, ...household.members.map((member) => member.age));
  const carries = (kind: TownHomeKind) =>
    mayBorrow &&
    working &&
    paymentMinor !== null &&
    payMinor !== null &&
    payMinor >=
      paymentMinor *
        TOWN_HOME_PRICE_FACTOR[kind] *
        TOWN_HOME_DECISIONS.buyAtPayOfPayment;
  const tenure =
    head < 60 ? TOWN_TENURE_KINDS.mortgaged : TOWN_TENURE_KINDS.owned;
  if (farm && carries("rural-farmhouse"))
    return { kind: "rural-farmhouse", tenure };
  if (household.members.length >= 5 && carries("large-house"))
    return { kind: "large-house", tenure };
  if (carries("suburban-house")) return { kind: "suburban-house", tenure };
  if (carries("mobile-home")) return { kind: "mobile-home", tenure };
  return {
    kind: household.members.length <= 2 ? "small-apartment" : "rowhouse",
    tenure: TOWN_TENURE_KINDS.rented,
  };
}
const REVIEW_INTERVAL_DAYS = 91;
const SETTLED_DAYS = 1;
interface Household {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly members: readonly {
    readonly id: EntityId;
    readonly age: number;
  }[];
}
// STOPGAP: economy.home-review-head-age-windows
function headAge(household: Household): number {
  return Math.max(0, ...household.members.map((member) => member.age));
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
interface HomesView {
  readonly households: readonly Household[];
  readonly homeOf: ReadonlyMap<EntityId, Home>;
  readonly everHoused: ReadonlySet<EntityId>;
  readonly vacant: ReadonlyMap<TownHomeKind, readonly EntityId[]>;
  readonly working: ReadonlySet<EntityId>;
  readonly farmWorkers: ReadonlySet<EntityId>;
}
function latestBy<
  T extends {
    readonly effectiveAt: IsoDate;
  },
>(
  rows: readonly T[],
  key: (row: T) => EntityId,
  today: IsoDate,
): Map<EntityId, T> {
  const latest = new Map<EntityId, T>();
  for (const row of rows)
    if (row.effectiveAt <= today) latest.set(key(row), row);
  return latest;
}
// STOPGAP: economy.home-review-history-frontier
function readHomes(sourceFacts: HomeReviewFacts, town: EntityId): HomesView {
  const today = sourceFacts.currentDate;
  const h = sourceFacts.records;
  const dead = new Set(h.personDeaths.map((row) => row.personId));
  const membershipState = latestBy(
    h.householdMembershipStates,
    (row) => row.membershipId,
    today,
  );
  const membersOf = new Map<
    EntityId,
    {
      id: EntityId;
      age: number;
    }[]
  >();
  for (const membership of h.householdMemberships) {
    const state = membershipState.get(membership.id);
    if (!state || state.status === "ended" || state.residenceRole !== "primary")
      continue;
    const person = sourceFacts.people[membership.personId];
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
  const tenureOf = new Map<
    string,
    {
      id: EntityId;
      kind: string;
    }
  >();
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
  const farmEmployers = new Set(
    h.organizations
      .filter((row) => row.stableKey.includes(":employer:farm:"))
      .map((row) => row.id),
  );
  const working = new Set<EntityId>();
  const farmWorkers = new Set<EntityId>();
  for (const relationship of h.workRelationships)
    if (workLatest.get(relationship.id)?.status === "active") {
      working.add(relationship.personId);
      if (
        relationship.organizationId &&
        farmEmployers.has(relationship.organizationId)
      )
        farmWorkers.add(relationship.personId);
    }
  return { households, homeOf, everHoused, vacant, working, farmWorkers };
}
function playerHouseholdId(
  sourceFacts: HomeReviewFacts,
  view: HomesView,
): EntityId | null {
  if (sourceFacts.control.kind !== "person") return null;
  const playerId = sourceFacts.control.personId;
  return (
    view.households.find((household) =>
      household.members.some((member) => member.id === playerId),
    )?.id ?? null
  );
}
interface Writer {
  sourceFacts: HomeReviewFacts;
  readonly town: EntityId;
  readonly today: IsoDate;
  readonly prefix: string;
  readonly vacant: Map<TownHomeKind, EntityId[]>;
}
function* leaveHome(
  writer: Writer,
  key: string,
  home: Home,
  reason: string,
  provenance: LifeRecordProvenance,
): Generator<HomeReviewRequest, void, HomeReviewFacts> {
  writer.sourceFacts = yield {
    kind: "recordDwellingOccupancyState",
    input: {
      stableKey: `${writer.prefix}${key}:left`,
      dwellingOccupancyId: home.occupancyId,
      effectiveAt: writer.today,
      status: "ended",
      residenceRole: "primary",
      kind: home.occupancyKind as DwellingOccupancyKind,
      reason,
      provenance,
      supersedesStateId: home.occupancyStateId,
    },
  };
  if (home.tenureId && home.tenureStateId)
    writer.sourceFacts = yield {
      kind: "recordHousingTenureState",
      input: {
        stableKey: `${writer.prefix}${key}:tenure-ended`,
        housingTenureId: home.tenureId,
        effectiveAt: writer.today,
        status: "ended",
        context: home.tenureKind?.startsWith("ownership:") ? "sold" : reason,
        provenance,
        supersedesStateId: home.tenureStateId,
      },
    };
  if (home.kind) {
    const list = writer.vacant.get(home.kind) ?? [];
    list.push(home.dwellingId);
    writer.vacant.set(home.kind, list);
  }
}
function* enterHome(
  writer: Writer,
  key: string,
  householdId: EntityId,
  kind: TownHomeKind,
  tenure: HousingTenureKind,
  provenance: LifeRecordProvenance,
): Generator<HomeReviewRequest, void, HomeReviewFacts> {
  const pool = writer.vacant.get(kind) ?? [];
  let dwellingId = pool.shift();
  if (!dwellingId) {
    writer.sourceFacts = yield {
      kind: "createDwelling",
      input: {
        stableKey: `${writer.prefix}${key}:dwelling`,
        establishedAt: writer.today,
        jurisdictionId: writer.town,
        locationLabel: `${KIND_LABEL[kind][0]!.toUpperCase()}${KIND_LABEL[kind].slice(1)} in ${lifePlaceByJurisdictionId(writer.sourceFacts, writer.town)?.displayName ?? "town"}`,
        classification: TOWN_HOME_KINDS[kind],
        provenance,
      },
    };
    dwellingId = writer.sourceFacts.records.dwellings.at(-1)!.id;
  }
  writer.sourceFacts = yield {
    kind: "createHousingTenure",
    input: {
      stableKey: `${writer.prefix}${key}:tenure`,
      holder: { kind: "household", householdId },
      dwellingId,
      startedAt: writer.today,
      kind: tenure,
      context: null,
      provenance,
    },
  };
  writer.sourceFacts = yield {
    kind: "startDwellingOccupancy",
    input: {
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
    },
  };
}
export function* reviewTownHomes(
  sourceFacts: HomeReviewFacts,
  town: EntityId,
  round: string,
): Generator<HomeReviewRequest, HomeReviewFacts, HomeReviewFacts> {
  const prefix = `${TOWN_HOMES_VERSION}:${town}:${round}:`;
  if (
    sourceFacts.records.dwellingOccupancies.some((row) =>
      row.stableKey.startsWith(prefix),
    ) ||
    sourceFacts.records.dwellingOccupancyStates.some((row) =>
      row.stableKey.startsWith(prefix),
    )
  )
    return sourceFacts;
  const view = readHomes(sourceFacts, town);
  if (view.households.length === 0) return sourceFacts;
  const today = sourceFacts.currentDate;
  const factsNow = householdHousingFacts(sourceFacts, today);
  const factsBefore = householdHousingFacts(
    sourceFacts,
    addDays(today, -REVIEW_INTERVAL_DAYS),
  );
  const paymentMinor = homePurchaseTerms(
    sourceFacts,
    town,
    null,
  ).monthlyPaymentMinor;
  const player = playerHouseholdId(sourceFacts, view);
  const writer: Writer = {
    sourceFacts,
    town,
    today,
    prefix,
    vacant: new Map(
      [...view.vacant].map(([kind, ids]) => [kind, [...ids]] as const),
    ),
  };
  const lived = new Set(view.households.map((household) => household.id));
  const settledBefore = addDays(today, -SETTLED_DAYS);
  const event = function* (
    key: string,
    type: `${string}.${string}`,
    household: Household,
    summary: string,
  ): Generator<HomeReviewRequest, LifeRecordProvenance, HomeReviewFacts> {
    const adults = household.members.filter((member) => member.age >= 18);
    const people = (adults.length > 0 ? adults : household.members).map(
      (member) => member.id,
    );
    writer.sourceFacts = yield {
      kind: "recordWorldEvent",
      input: {
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
      },
    };
    return {
      kind: "simulated-event",
      eventId: writer.sourceFacts.records.events.at(-1)!.id,
    };
  };
  const nameOf = (household: Household) => {
    const record = sourceFacts.records.households.find(
      (row) => row.id === household.id,
    );
    if (record && /'s household$/.test(record.label)) return record.label;
    return record
      ? `The ${record.label.replace(/ household$/, "")} household`
      : "A household";
  };
  for (const [householdId, home] of view.homeOf) {
    if (lived.has(householdId)) continue;
    const occupancy = sourceFacts.records.dwellingOccupancies.find(
      (row) => row.id === home.occupancyId,
    );
    if (!occupancy?.stableKey.startsWith(TOWN_HOMES_VERSION)) continue;
    const dwelling = sourceFacts.records.dwellings.find(
      (row) => row.id === home.dwellingId,
    );
    if (dwelling?.jurisdictionId !== town) continue;
    yield* leaveHome(
      writer,
      `empty:${householdId}`,
      home,
      "Nobody lives there now.",
      {
        kind: "generated",
        generatorKey: TOWN_HOMES_VERSION,
      },
    );
  }
  for (const household of view.households) {
    const key = `household:${household.id}`;
    const home = view.homeOf.get(household.id);
    const head = headAge(household);
    const adults = household.members.filter((member) => member.age >= 18);
    const children = household.members.length - adults.length;
    if (adults.length === 0) continue;
    if (!home) {
      const quiet =
        household.stableKey.startsWith(`${TOWN_RESIDENTS_VERSION}:`) &&
        !view.everHoused.has(household.id);
      if (quiet) {
        const placed = homeForNewHousehold(
          household,
          adults.some((adult) => view.working.has(adult.id)),
          factsNow.get(household.id)?.payMinor ?? null,
          paymentMinor,
          true,
          adults.some((adult) => view.farmWorkers.has(adult.id)),
        );
        yield* enterHome(
          writer,
          key,
          household.id,
          placed.kind,
          placed.tenure,
          {
            kind: "generated",
            generatorKey: TOWN_HOMES_VERSION,
          },
        );
        continue;
      }
      const evictions = sourceFacts.records.events.filter(
        (row) =>
          row.type === RENT_EVENTS.evicted &&
          row.involvedEntityIds.includes(household.id),
      );
      const evicted = evictions.some(
        (row) => row.occurredAt > addDays(today, -REVIEW_INTERVAL_DAYS),
      );
      const found = homeForNewHousehold(
        household,
        adults.some((adult) => view.working.has(adult.id)),
        factsNow.get(household.id)?.payMinor ?? null,
        paymentMinor,
        !evictions.some(
          (row) =>
            row.occurredAt >
            addDays(today, -TOWN_HOME_DECISIONS.evictionOnRecordDays),
        ),
        adults.some((adult) => view.farmWorkers.has(adult.id)),
      );
      const provenance = yield* event(
        key,
        found.tenure === TOWN_TENURE_KINDS.rented
          ? TOWN_HOME_EVENTS.movedIn
          : TOWN_HOME_EVENTS.bought,
        household,
        `${nameOf(household)} ${found.tenure === TOWN_TENURE_KINDS.rented ? "moved into" : "bought"} ${KIND_LABEL[found.kind]}: ${evicted ? TOWN_HOME_REASONS.evicted : TOWN_HOME_REASONS.noHome}.`,
      );
      yield* enterHome(
        writer,
        key,
        household.id,
        found.kind,
        found.tenure,
        provenance,
      );
      continue;
    }
    if (household.id === player) continue;
    if (home.startedAt > settledBefore || !home.kind) continue;
    const renting = home.tenureKind === TOWN_TENURE_KINDS.rented;
    const owning = home.tenureKind?.startsWith("ownership:") ?? false;
    const anyWork = adults.some((adult) => view.working.has(adult.id));
    const facts = factsNow.get(household.id);
    const was = factsBefore.get(household.id);
    if (!facts || !was) continue;
    const canBuy = (row: HouseholdHousingFacts) =>
      anyWork &&
      row.payMinor !== null &&
      paymentMinor !== null &&
      row.payMinor >= paymentMinor * TOWN_HOME_DECISIONS.buyAtPayOfPayment;
    const burdened = (row: HouseholdHousingFacts) =>
      row.rentMinor !== null &&
      row.payMinor !== null &&
      row.rentMinor >= row.payMinor * TOWN_HOME_DECISIONS.severeRentBurden;
    const house: TownHomeKind =
      facts.members >= 5 ? "large-house" : "suburban-house";
    const bought =
      head < 60 ? TOWN_TENURE_KINDS.mortgaged : TOWN_TENURE_KINDS.owned;
    let move: {
      readonly type: `${string}.${string}`;
      readonly kind: TownHomeKind;
      readonly tenure: HousingTenureKind;
      readonly reason: string;
    } | null = null;
    if (renting && canBuy(facts) && !canBuy(was)) {
      move = {
        type: TOWN_HOME_EVENTS.bought,
        kind: house,
        tenure: bought,
        reason: TOWN_HOME_REASONS.canBuy,
      };
    } else if (
      home.kind === "small-apartment" &&
      children > 0 &&
      facts.members > was.members
    ) {
      const buys = canBuy(facts);
      move = {
        type: buys ? TOWN_HOME_EVENTS.bought : TOWN_HOME_EVENTS.moved,
        kind: buys ? house : "rowhouse",
        tenure: buys ? bought : TOWN_TENURE_KINDS.rented,
        reason: TOWN_HOME_REASONS.outgrew,
      };
    } else if (
      renting &&
      home.kind !== "small-apartment" &&
      burdened(facts) &&
      !burdened(was)
    ) {
      move = {
        type: TOWN_HOME_EVENTS.moved,
        kind: "small-apartment",
        tenure: TOWN_TENURE_KINDS.rented,
        reason: TOWN_HOME_REASONS.rentOutranPay,
      };
    } else if (
      owning &&
      head >= TOWN_HOME_DECISIONS.downsizeFromAge &&
      facts.members === 1 &&
      was.members >= 2 &&
      home.kind !== "small-apartment"
    ) {
      move = {
        type: TOWN_HOME_EVENTS.sold,
        kind: "small-apartment",
        tenure: TOWN_TENURE_KINDS.rented,
        reason: TOWN_HOME_REASONS.leftAlone,
      };
    }
    if (!move) continue;
    const verb =
      move.type === TOWN_HOME_EVENTS.bought
        ? `bought ${KIND_LABEL[move.kind]}`
        : move.type === TOWN_HOME_EVENTS.sold
          ? `sold their ${KIND_LABEL[home.kind].replace(/^an? /, "")} and moved to ${KIND_LABEL[move.kind]}`
          : `moved to ${KIND_LABEL[move.kind]}`;
    const provenance = yield* event(
      key,
      move.type,
      household,
      `${nameOf(household)} ${verb}: ${move.reason}.`,
    );
    yield* leaveHome(writer, key, home, "Moved within town.", provenance);
    yield* enterHome(
      writer,
      key,
      household.id,
      move.kind,
      move.tenure,
      provenance,
    );
  }
  const eventIds = writer.sourceFacts.records.events
    .filter((row) => row.stableKey.startsWith(prefix))
    .map((row) => row.id);
  for (const eventId of eventIds)
    writer.sourceFacts = yield {
      kind: "recordDirectEventMemories",
      eventId: eventId,
    };
  return writer.sourceFacts;
}
export function describeTownHomes(
  sourceFacts: HomeReviewFacts,
  town: EntityId,
) {
  const view = readHomes(sourceFacts, town);
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
  for (const event of sourceFacts.records.events)
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
