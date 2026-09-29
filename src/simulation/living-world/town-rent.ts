/**
 * Rent day: every renting household in town pays rent on the first of the
 * month, to a landlord on record.
 *
 * Before this, a rented town home (`town-homes.ts`) had no rent behind it, and
 * the only rent in the game was one flat national $900 inside the played
 * person's living costs (`cost-of-living.ts`). Nobody was a landlord, no law
 * about housing could touch a rent, and no rent burden could be measured.
 *
 * The lease. The first rent day after a household starts renting a town home,
 * the game writes its lease through the same money records pay and loans use:
 * a monthly flow from the adult who holds the lease to the landlord, and a
 * recurring obligation that names the tenancy. What the lease records:
 *
 * - The landlord: a person (a neighbor who owns their own home), a business
 *   (a realty or property-management firm in town) or the public housing
 *   body (`<Town> Housing Authority`). A home keeps its landlord from one
 *   tenant to the next; when a person landlord dies or leaves town, or a firm
 *   closes, the home is sold to a new one.
 * - The bedrooms: fixed for the home by its first lease, drawn by the kind of
 *   home and the size of the household that first rented it.
 * - The rent, one of three ways:
 *   - market: the county's HUD Fair Market Rent for that many bedrooms
 *     (`town-rent.generated.ts`), carried forward with the world's price
 *     level, times a draw for the world's county and one for the home;
 *   - public housing: 30% of the household's monthly income (the Brooke
 *     rule, 42 U.S.C. 1437a(a)(1)), at least $50 and at most the flat rent
 *     of 80% of the Fair Market Rent; the flat rent where income is unknown;
 *   - affordable: a below-market home an inclusionary housing law required,
 *     at 30% of 60% of area median income for the home's size, to a
 *     household whose income is under that line.
 *
 * Each rent day, in order: leases end with their tenancy; new tenancies get a
 * lease; a lease whose year is up is renewed; then every lease is collected.
 * The leaseholder pays the month plus any rent still owed from their own
 * money. A leaseholder whose money the game does not track is recorded as
 * blocked, never as paid or missed: unknown is not zero.
 *
 * Laws that act on these records, read with `lawInForce` for the town:
 *
 * - Rent stabilization caps a renewal's rise on a private landlord's home at
 *   the price level's rise plus five points, at most ten percent, and makes a
 *   covered tenant 20% less likely to move (`renterMoveFactor`, Diamond,
 *   McQuade and Qian 2019, the outcome web's researched link).
 * - An inclusionary housing requirement makes a share of apartments and
 *   rowhouses recorded after it took effect affordable homes.
 * - Right to counsel in eviction gives a tenant a lawyer when their landlord
 *   files, and a represented tenant is evicted less often.
 *
 * Eviction. When a lease owes two months' rent, the landlord files. On the
 * next rent day the filing is dismissed if the rent was paid; otherwise the
 * household is evicted or settles, drawn once. An evicted household loses its
 * home that day and finds another on the town's next quarterly review, like
 * any household with no home.
 *
 * NOT MODELED, labeled: prorated first months; security deposits; a lease's
 * rent split among the household's adults (the leaseholder pays); utilities
 * (the rent is HUD's gross rent, which includes them); income verification
 * beyond recorded pay; exemptions in rent stabilization laws; housing
 * vouchers; the played person's own eviction (a filing is recorded, and the
 * household settles).
 */

import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { countyGeoidsForPlace } from "../government-units";
import { createStableId } from "../ids";
import { createOrganization } from "../life";
import { organizationProfileAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { lawInForce } from "../governing/law-in-force";
import {
  macroConditionsAt,
  macroMonthHistory,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { drawCanonicalNameForGender, personName } from "../people";
import { nameCorpusVersionForWorld } from "../place-name-corpus";
import { recordEventKnowledge } from "../records";
import { resourceFlowTermsAt, resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  createResourceObligation,
  money,
  recordDwellingOccupancyState,
  recordHousingTenureState,
  recordResourceFlowTerms,
  recordResourceObligationState,
  recordResourceTransferOutcomes,
  type RecordResourceTransferOutcomeInput,
} from "../resources";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LifeRecordProvenance,
  ResourceEndpoint,
  ResourceFlow,
  ResourceFlowTermsRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import type { TownHomeKind } from "./town-homes";
import { TOWN_RENT_COUNTIES, TOWN_RENT_TOWNS } from "./town-rent.generated";

export const TOWN_RENT_VERSION = "town-rent-v1";
export const RENT_DAY_TRANSITION_KEY = "living-world:rent-day" as const;
export const RENT_BASIS = "housing:rent" as const;

const RENT_DAY_PREFIX = `${TOWN_RENT_VERSION}:rent-day:`;
const LEASE_PREFIX = `${TOWN_RENT_VERSION}:lease:`;
const LEASE_TAG_PREFIX = `${TOWN_RENT_VERSION}:lease:`;

export const RENT_EVENTS = {
  filed: "housing.eviction-filed",
  dismissed: "housing.eviction-dismissed",
  settled: "housing.eviction-settled",
  evicted: "housing.evicted",
} as const;

export type RentRegime = "market" | "public" | "affordable";
export type LandlordKind = "person" | "business" | "public";

/** The policy questions this module reads, by their catalog keys. */
export const RENT_LAW_KEYS = {
  rentStabilization: "us-policy-positions:housing-land-use.rent-stabilization",
  inclusionary: "us-policy-positions:housing-land-use.inclusionary-requirement",
  rightToCounsel:
    "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
} as const;

// ─── Numbers ────────────────────────────────────────────────────────────

/**
 * PLACEHOLDER(research: who-owns-rental-homes). Who owns a rented home of
 * each kind: a person, a business or the public housing body. Set near the
 * Census Rental Housing Finance Survey picture as remembered (individual
 * owners hold most rented houses and a minority of apartments; public
 * housing is a few percent of rented homes), not read from the table.
 */
export const LANDLORD_SHARES: Readonly<
  Record<TownHomeKind, Readonly<Record<LandlordKind, number>>>
> = {
  "small-apartment": { person: 0.3, business: 0.66, public: 0.04 },
  rowhouse: { person: 0.55, business: 0.42, public: 0.03 },
  "suburban-house": { person: 0.78, business: 0.21, public: 0.01 },
  "large-house": { person: 0.8, business: 0.2, public: 0 },
  "mobile-home": { person: 0.6, business: 0.4, public: 0 },
  "rural-farmhouse": { person: 0.92, business: 0.08, public: 0 },
};

/**
 * PLACEHOLDER(research: bedrooms-by-kind-of-home). The share of each kind of
 * home with an efficiency and one to four bedrooms. Not read from the
 * American Community Survey table that answers it.
 */
export const BEDROOM_SHARES: Readonly<
  Record<TownHomeKind, readonly [number, number, number, number, number]>
> = {
  "small-apartment": [0.1, 0.45, 0.37, 0.08, 0],
  rowhouse: [0, 0.08, 0.42, 0.42, 0.08],
  "suburban-house": [0, 0.03, 0.2, 0.55, 0.22],
  "large-house": [0, 0, 0.05, 0.4, 0.55],
  "mobile-home": [0, 0.08, 0.5, 0.4, 0.02],
  "rural-farmhouse": [0, 0.03, 0.22, 0.5, 0.25],
};

/**
 * PLACEHOLDER(research: rent-spread-around-fair-market-rent). How far one
 * home's rent sits from its county's Fair Market Rent (a log-normal spread),
 * and how far one world's county sits from HUD's (drawn per world).
 */
export const RENT_SPREAD = {
  home: 0.25,
  world: 0.05,
  /** A private landlord's renewal around the price level's rise. */
  renewal: 0.03,
} as const;

/** The Brooke rule: public housing rent is 30% of monthly income. */
export const PUBLIC_HOUSING_INCOME_SHARE = 0.3;
/** The highest minimum rent a housing authority may set (24 CFR 5.630). */
export const PUBLIC_HOUSING_MINIMUM_RENT_MINOR = 5_000;
/** The flat rent is at least 80% of the Fair Market Rent (Pub. L. 113-235). */
export const PUBLIC_HOUSING_FLAT_RENT_SHARE = 0.8;
/** An affordable home's rent: 30% of 60% of area median income, a month. */
export const AFFORDABLE_INCOME_SHARE = 0.3;
/** HUD's 60% limit is 120% of its very low (50%) limit. */
export const AFFORDABLE_LIMIT_OF_VERY_LOW = 1.2;
/** HUD's family-size adjustment of an income limit, one to eight people. */
export const HUD_FAMILY_SIZE_FACTORS = [
  0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32,
] as const;

/**
 * PLACEHOLDER(research: inclusionary-set-aside). The share of apartments and
 * rowhouses recorded after an inclusionary housing law took effect that it
 * makes affordable. Local laws set 10% to 20%; the game uses one figure.
 */
export const INCLUSIONARY_SHARE = 0.15;

/**
 * Rent stabilization's cap on a renewal: the price level's rise plus five
 * points, at most ten percent. Modeled on California's 2019 statute (Civil
 * Code 1947.12); one rule stands in for every place's own. PLACEHOLDER
 * (research: rent-stabilization-cap-by-place).
 */
export const RENT_STABILIZATION_CAP = { overPrices: 0.05, most: 0.1 } as const;

/** Diamond, McQuade and Qian 2019: covered renters move 20% less. */
export const RENT_STABILIZATION_MOBILITY = 0.8;

/**
 * PLACEHOLDER(research: eviction-filing-and-outcome). When a landlord files
 * (rent owed, in months) and the chance a filing ends in eviction rather
 * than a settlement, without and with a lawyer. The represented figure is
 * set near New York City's reports that most represented tenants stayed
 * home, to confirm.
 */
export const EVICTION = {
  fileAtMonthsOwed: 2,
  evictedWithoutCounsel: 0.5,
  evictedWithCounsel: 0.16,
  /** Months after a filing ends before the landlord files again. */
  quietMonths: 3,
} as const;

// ─── HUD rents ──────────────────────────────────────────────────────────

export interface HudRentRow {
  /** Fair Market Rent, dollars a month, efficiency through four bedrooms. */
  readonly rents: readonly [number, number, number, number, number];
  /** Very low (50%) income limit for a family of four, dollars a year. */
  readonly veryLow4: number | null;
  readonly low4: number | null;
  readonly population: number | null;
  /** The HUD area it was read from: a county code, or county and town. */
  readonly area: string;
}

function parseRow(area: string, cells: string): HudRentRow {
  const values = cells
    .split("/")
    .map((cell) => (cell === "" ? null : Number(cell)));
  return {
    area,
    rents: [
      values[0] ?? 0,
      values[1] ?? 0,
      values[2] ?? 0,
      values[3] ?? 0,
      values[4] ?? 0,
    ],
    veryLow4: values[5] ?? null,
    low4: values[6] ?? null,
    population: values[7] ?? null,
  };
}

let countyRows: ReadonlyMap<string, HudRentRow> | null = null;
let townRows: ReadonlyMap<string, readonly [string, HudRentRow][]> | null =
  null;
function loadRows() {
  if (countyRows && townRows) return;
  const counties = new Map<string, HudRentRow>();
  for (const entry of TOWN_RENT_COUNTIES.split(";")) {
    const [county, cells] = entry.split(":") as [string, string];
    counties.set(county, parseRow(county, cells));
  }
  const towns = new Map<string, [string, HudRentRow][]>();
  for (const entry of TOWN_RENT_TOWNS.split(";")) {
    const split = entry.lastIndexOf(":");
    const key = entry.slice(0, split);
    const [county, town] = key.split("|") as [string, string];
    const list = towns.get(county) ?? [];
    list.push([town, parseRow(key, entry.slice(split + 1))]);
    towns.set(county, list);
  }
  countyRows = counties;
  townRows = towns;
}

const TOWN_SUFFIX = / (town|city|village|plantation|borough|gore|grant)$/i;

/**
 * The HUD row for a place: its county's, or where HUD publishes a New England
 * county's towns instead, the town of the same name, else the towns weighed
 * by population. Null where HUD publishes nothing for the place; a rent there
 * is unknown and none is recorded.
 */
export function hudRentRowFor(jurisdictionId: EntityId): HudRentRow | null {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  const geoid =
    place?.sourceGeoid && /^\d{7}$/.test(place.sourceGeoid)
      ? place.sourceGeoid
      : null;
  if (!place || !geoid) return null;
  const county = countyGeoidsForPlace(geoid)[0];
  if (!county) return null;
  loadRows();
  const whole = countyRows!.get(county);
  if (whole) return whole;
  const towns = townRows!.get(county);
  if (!towns || towns.length === 0) return null;
  const name = (place.displayName.split(",")[0] ?? "").trim().toLowerCase();
  const same = towns.find(
    ([town]) => town.replace(TOWN_SUFFIX, "").toLowerCase() === name,
  );
  if (same) return same[1];
  let weight = 0;
  const rents = [0, 0, 0, 0, 0];
  let veryLow = 0;
  let low = 0;
  let limitWeight = 0;
  for (const [, row] of towns) {
    const w = Math.max(1, row.population ?? 1);
    weight += w;
    row.rents.forEach((rent, index) => (rents[index]! += rent * w));
    if (row.veryLow4 !== null && row.low4 !== null) {
      veryLow += row.veryLow4 * w;
      low += row.low4 * w;
      limitWeight += w;
    }
  }
  return {
    area: county,
    rents: rents.map((sum) => Math.round(sum / weight)) as unknown as [
      number,
      number,
      number,
      number,
      number,
    ],
    veryLow4: limitWeight > 0 ? Math.round(veryLow / limitWeight) : null,
    low4: limitWeight > 0 ? Math.round(low / limitWeight) : null,
    population: null,
  };
}

/** HUD's very low income limit for a household of `people`, dollars a year. */
export function veryLowIncomeLimit(
  row: HudRentRow,
  people: number,
): number | null {
  if (row.veryLow4 === null) return null;
  const size = Math.max(1, people);
  const factor =
    size <= 8
      ? interpolateFactor(size)
      : HUD_FAMILY_SIZE_FACTORS[7] + 0.08 * (size - 8);
  return row.veryLow4 * factor;
}

function interpolateFactor(size: number): number {
  const low = Math.floor(size);
  const high = Math.ceil(size);
  const a = HUD_FAMILY_SIZE_FACTORS[low - 1]!;
  const b = HUD_FAMILY_SIZE_FACTORS[high - 1]!;
  return a + (b - a) * (size - low);
}

/**
 * An affordable home's monthly rent in cents: 30% of the 60% income limit for
 * the home's size, a month, at HUD's 1.5 people a bedroom (one for an
 * efficiency). Null where the income limit is unknown.
 */
export function affordableRentMinor(
  row: HudRentRow,
  bedrooms: number,
): number | null {
  const people = bedrooms === 0 ? 1 : bedrooms * 1.5;
  const limit = veryLowIncomeLimit(row, people);
  if (limit === null) return null;
  return Math.round(
    ((limit * AFFORDABLE_LIMIT_OF_VERY_LOW * AFFORDABLE_INCOME_SHARE) / 12) *
      100,
  );
}

// ─── Draws ──────────────────────────────────────────────────────────────

function normal(rng: SeededRng): number {
  const u = Math.max(1e-12, rng.fork("u").next());
  const v = rng.fork("v").next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<K extends string>(
  weights: Readonly<Record<K, number>>,
  draw: number,
): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let point = draw * total;
  for (const [key, weight] of entries) {
    point -= weight;
    if (point < 0) return key;
  }
  return entries.at(-1)![0];
}

/** The bedrooms a home gets at its first lease, fitted to who rents it. */
export function drawBedrooms(
  kind: TownHomeKind,
  people: number,
  draw: number,
): number {
  // HUD's rule of thumb, two people a bedroom; one person fits an efficiency.
  const need = people <= 1 ? 0 : Math.ceil(people / 2);
  const weights = BEDROOM_SHARES[kind].map((share, bedrooms) => {
    let weight = share;
    if (bedrooms < need) weight *= 0.25;
    if (bedrooms > need + 1) weight *= 0.5;
    return weight;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return Math.min(4, need);
  let point = draw * total;
  for (let bedrooms = 0; bedrooms < weights.length; bedrooms += 1) {
    point -= weights[bedrooms]!;
    if (point < 0) return bedrooms;
  }
  return Math.min(4, need);
}

/** The price level on `date` over the world's first month, or 1. */
export function rentPriceLevel(
  world: World,
  town: EntityId,
  date: IsoDate,
): number {
  const scope = macroScopeForJurisdiction(town);
  const now =
    macroConditionsAt(world, scope, date) ??
    macroConditionsAt(world, "national", date);
  const base = macroMonthHistory(world, "national", world.currentDate)[0];
  if (!now || !base || base.priceIndex <= 0) return 1;
  return now.priceIndex / base.priceIndex;
}

/** This world's draw for a county's rents, the same all game. */
function worldCountyFactor(world: World, area: string): number {
  const rng = new SeededRng(world.seed).fork(
    `${TOWN_RENT_VERSION}:world:${area}`,
  );
  return Math.exp(RENT_SPREAD.world * normal(rng));
}

/** A home's market rent in cents on `date`. */
export function marketRentMinor(
  world: World,
  town: EntityId,
  row: HudRentRow,
  bedrooms: number,
  date: IsoDate,
  homeDraw: number,
): number {
  const fmr = row.rents[Math.max(0, Math.min(4, bedrooms))]!;
  // GAME ASSUMPTION, labeled: the Fair Market Rent is read as the median
  // rent for a home of its size. HUD sets it at the 40th percentile of what
  // recent movers pay, and recent movers pay more than tenants who stayed;
  // the two are taken to offset. PLACEHOLDER(research:
  // rent-spread-around-fair-market-rent).
  const dollars =
    fmr *
    Math.exp(RENT_SPREAD.home * homeDraw) *
    worldCountyFactor(world, row.area) *
    rentPriceLevel(world, town, date);
  return Math.round(dollars) * 100;
}

// ─── What the history holds ─────────────────────────────────────────────

interface LeaseFacts {
  readonly flow: ResourceFlow;
  readonly obligationId: EntityId;
  readonly tenureId: EntityId;
  readonly dwellingId: EntityId;
  readonly town: EntityId;
  readonly householdId: EntityId;
  readonly leaseholderId: EntityId;
  readonly bedrooms: number;
  readonly regime: RentRegime;
  readonly ended: boolean;
}

const LEASE_BASIS = /^housing:lease-(\d)-bedroom-(market|public|affordable)$/;

function latest<T extends { readonly effectiveAt: IsoDate }>(
  rows: readonly T[],
  key: (row: T) => EntityId,
  onDate: IsoDate,
): Map<EntityId, T> {
  const map = new Map<EntityId, T>();
  for (const row of rows) if (row.effectiveAt <= onDate) map.set(key(row), row);
  return map;
}

/** Every lease this module wrote, with what its records say about it. */
export function townLeases(world: World, onDate: IsoDate = world.currentDate) {
  const h = world.history;
  const flows = new Map(h.resourceFlows.map((flow) => [flow.id, flow]));
  const tenures = new Map(h.housingTenures.map((row) => [row.id, row]));
  const dwellings = new Map(h.dwellings.map((row) => [row.id, row]));
  const obligationState = latest(
    h.resourceObligationStates,
    (row) => row.resourceObligationId,
    onDate,
  );
  const leases: LeaseFacts[] = [];
  for (const obligation of h.resourceObligations) {
    const match = LEASE_BASIS.exec(obligation.basisKind);
    if (!match || !obligation.housingTenureId) continue;
    const flow = flows.get(obligation.resourceFlowId);
    const tenure = tenures.get(obligation.housingTenureId);
    if (!flow || !tenure || tenure.holder.kind !== "household") continue;
    if (flow.source.kind !== "person") continue;
    const dwelling = dwellings.get(tenure.dwellingId);
    if (!dwelling) continue;
    leases.push({
      flow,
      obligationId: obligation.id,
      tenureId: tenure.id,
      dwellingId: tenure.dwellingId,
      town: dwelling.jurisdictionId,
      householdId: tenure.holder.householdId,
      leaseholderId: flow.source.personId,
      bedrooms: Number(match[1]),
      regime: match[2] as RentRegime,
      ended: obligationState.get(obligation.id)?.status !== "active",
    });
  }
  return leases;
}

/** The terms of a flow in force on `date`: the latest that took effect. */
function termsOn(
  history: readonly ResourceFlowTermsRecord[],
  date: IsoDate,
): ResourceFlowTermsRecord | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1)
    if (history[index]!.effectiveAt <= date) return history[index];
  return undefined;
}

function termsByFlow(
  world: World,
  ids: ReadonlySet<EntityId>,
): Map<EntityId, ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, ResourceFlowTermsRecord[]>();
  for (const record of world.history.resourceFlowTerms) {
    if (!ids.has(record.resourceFlowId)) continue;
    const list = byFlow.get(record.resourceFlowId) ?? [];
    list.push(record);
    byFlow.set(record.resourceFlowId, list);
  }
  return byFlow;
}

interface Member {
  readonly id: EntityId;
  readonly age: number;
}

/** Each household's living primary members on a date. */
function householdMembers(
  world: World,
  onDate: IsoDate,
): Map<EntityId, Member[]> {
  const h = world.history;
  const dead = new Set(
    h.personDeaths
      .filter((row) => row.diedAt <= onDate)
      .map((row) => row.personId),
  );
  const state = latest(
    h.householdMembershipStates,
    (row) => row.membershipId,
    onDate,
  );
  const members = new Map<EntityId, Member[]>();
  for (const membership of h.householdMemberships) {
    const current = state.get(membership.id);
    if (
      !current ||
      current.status === "ended" ||
      current.residenceRole !== "primary"
    )
      continue;
    const person = world.people[membership.personId];
    if (!person || dead.has(person.id)) continue;
    const list = members.get(membership.householdId) ?? [];
    list.push({ id: person.id, age: ageOnDate(person.birthDate, onDate) });
    members.set(membership.householdId, list);
  }
  return members;
}

const PERIODS_PER_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/** Each person's recorded pay a month on a date, in cents, from pay terms. */
function monthlyPayByPerson(
  world: World,
  onDate: IsoDate,
): Map<EntityId, number> {
  const pay = new Map<EntityId, ResourceFlow>();
  for (const flow of world.history.resourceFlows)
    if (
      flow.basisKind === "compensation:work" &&
      flow.recipient.kind === "person"
    )
      pay.set(flow.id, flow);
  const terms = latest(
    world.history.resourceFlowTerms.filter((row) =>
      pay.has(row.resourceFlowId),
    ),
    (row) => row.resourceFlowId,
    onDate,
  );
  const byPerson = new Map<EntityId, number>();
  for (const [flowId, record] of terms) {
    if (record.status !== "active") continue;
    const match = /(weekly|biweekly|semimonthly|monthly)/.exec(
      record.cadenceKind,
    );
    const perYear = match ? PERIODS_PER_YEAR[match[1]!] : undefined;
    if (!perYear) continue;
    const flow = pay.get(flowId)!;
    const personId = (flow.recipient as { personId: EntityId }).personId;
    byPerson.set(
      personId,
      (byPerson.get(personId) ?? 0) + (record.amount.minorUnits * perYear) / 12,
    );
  }
  return byPerson;
}

/** A household's recorded pay a month, or null when nobody's pay is known. */
function householdMonthlyIncome(
  members: readonly Member[],
  pay: ReadonlyMap<EntityId, number>,
): number | null {
  let known = false;
  let total = 0;
  for (const member of members) {
    const monthly = pay.get(member.id);
    if (monthly === undefined) continue;
    known = true;
    total += monthly;
  }
  return known ? Math.round(total) : null;
}

// ─── Landlords ──────────────────────────────────────────────────────────

function isPublicBody(world: World, organizationId: EntityId): boolean {
  return (
    organizationProfileAt(world, organizationId)?.classification ===
    "service:public-housing"
  );
}

/** Whether a landlord can still hold the home on `date`. */
function landlordStands(
  world: World,
  landlord: ResourceEndpoint,
  town: EntityId,
  onDate: IsoDate,
): boolean {
  if (landlord.kind === "organization") {
    const profile = organizationProfileAt(world, landlord.organizationId);
    return !!profile && !profile.closed;
  }
  if (landlord.kind !== "person") return false;
  const person = world.people[landlord.personId];
  if (!person || person.homeJurisdictionId !== town) return false;
  return !world.history.personDeaths.some(
    (death) => death.personId === landlord.personId && death.diedAt <= onDate,
  );
}

function landlordKindOf(
  world: World,
  landlord: ResourceEndpoint,
): LandlordKind {
  if (landlord.kind === "person") return "person";
  if (
    landlord.kind === "organization" &&
    isPublicBody(world, landlord.organizationId)
  )
    return "public";
  return "business";
}

export function landlordName(world: World, landlord: ResourceEndpoint): string {
  if (landlord.kind === "person") {
    const person = world.people[landlord.personId];
    return person ? personName(person) : "The landlord";
  }
  if (landlord.kind === "organization")
    return (
      organizationProfileAt(world, landlord.organizationId)?.name ??
      "The landlord"
    );
  return "The landlord";
}

const PROVENANCE: LifeRecordProvenance = {
  kind: "generated",
  generatorKey: TOWN_RENT_VERSION,
};

function townParts(town: EntityId): { town: string; state: string } {
  const place = lifePlaceByJurisdictionId(town);
  const [name = "Town", state = ""] = (place?.displayName ?? "")
    .split(",")
    .map((part) => part.trim());
  return { town: name, state };
}

/** The town's public housing body, written the first time it is needed. */
function housingAuthority(
  world: World,
  town: EntityId,
  formedAt: IsoDate,
): { world: World; organizationId: EntityId } {
  const stableKey = `${TOWN_RENT_VERSION}:${town}:housing-authority`;
  const id = createStableId("organization", `${world.id}:${stableKey}`);
  if (world.history.organizations.some((row) => row.id === id))
    return { world, organizationId: id };
  return {
    world: createOrganization(world, {
      stableKey,
      formedAt,
      detailLevel: "lightweight",
      provenance: PROVENANCE,
      initialProfile: {
        name: `${townParts(town).town} Housing Authority`,
        classification: "service:public-housing",
        locationJurisdictionId: town,
      },
    }),
    organizationId: id,
  };
}

/** A property-management firm, when the town has no realty firm open. */
function propertyManager(
  world: World,
  town: EntityId,
  formedAt: IsoDate,
  index: number,
): { world: World; organizationId: EntityId } {
  const stableKey = `${TOWN_RENT_VERSION}:${town}:property-manager:${index}`;
  const id = createStableId("organization", `${world.id}:${stableKey}`);
  if (world.history.organizations.some((row) => row.id === id))
    return { world, organizationId: id };
  const family = drawCanonicalNameForGender(
    new SeededRng(world.seed).fork(`${stableKey}:family`),
    "unstated",
    nameCorpusVersionForWorld(world, town),
  ).familyName;
  return {
    world: createOrganization(world, {
      stableKey,
      formedAt,
      detailLevel: "lightweight",
      provenance: PROVENANCE,
      initialProfile: {
        name: `${family} Property Management`,
        classification: "enterprise:real-estate",
        locationJurisdictionId: town,
      },
    }),
    organizationId: id,
  };
}

interface TownIndex {
  /** Adults 30 and older whose household owns its home, by town. */
  readonly owners: ReadonlyMap<EntityId, readonly EntityId[]>;
  /** Open realty and property-management firms, by town. */
  readonly firms: ReadonlyMap<EntityId, readonly EntityId[]>;
}

function townIndex(
  world: World,
  onDate: IsoDate,
  members: ReadonlyMap<EntityId, readonly Member[]>,
): TownIndex {
  const h = world.history;
  const tenureState = latest(
    h.housingTenureStates,
    (row) => row.housingTenureId,
    onDate,
  );
  const owners = new Map<EntityId, EntityId[]>();
  for (const tenure of h.housingTenures) {
    if (tenure.holder.kind !== "household") continue;
    if (!tenure.kind.startsWith("ownership:")) continue;
    if (tenureState.get(tenure.id)?.status !== "active") continue;
    for (const member of members.get(tenure.holder.householdId) ?? []) {
      if (member.age < 30) continue;
      const town = world.people[member.id]?.homeJurisdictionId;
      if (!town) continue;
      const list = owners.get(town) ?? [];
      list.push(member.id);
      owners.set(town, list);
    }
  }
  const firms = new Map<EntityId, EntityId[]>();
  for (const organization of h.organizations) {
    const profile = organizationProfileAt(world, organization.id);
    if (
      !profile ||
      profile.closed ||
      profile.classification !== "enterprise:real-estate" ||
      !profile.locationJurisdictionId
    )
      continue;
    const list = firms.get(profile.locationJurisdictionId) ?? [];
    list.push(organization.id);
    firms.set(profile.locationJurisdictionId, list);
  }
  for (const list of owners.values()) list.sort();
  for (const list of firms.values()) list.sort();
  return { owners, firms };
}

// ─── Laws ───────────────────────────────────────────────────────────────

function propositionId(world: World, key: string): EntityId | null {
  return (
    Object.values(world.policyCatalog?.propositions ?? {}).find(
      (definition) => definition.stableKey === key,
    )?.id ?? null
  );
}

/** The law in force on a housing question in `town`, when it says yes. */
export function housingLawYes(
  world: World,
  town: EntityId,
  key: string,
  onDate: IsoDate,
): { readonly measureId: EntityId; readonly operativeAt: IsoDate } | null {
  const id = propositionId(world, key);
  if (!id) return null;
  const law = lawInForce(world, town, id, onDate);
  return law?.answer === "yes"
    ? { measureId: law.measureId, operativeAt: law.operativeAt }
    : null;
}

/**
 * How much less likely a renting household is to move this quarter: 20% less
 * when rent stabilization is in force in its town and a private landlord
 * holds its lease. 1 otherwise.
 */
export function renterMoveFactor(
  world: World,
  town: EntityId,
  householdId: EntityId,
): number {
  if (
    !housingLawYes(
      world,
      town,
      RENT_LAW_KEYS.rentStabilization,
      world.currentDate,
    )
  )
    return 1;
  const covered = townLeases(world).some(
    (lease) =>
      !lease.ended &&
      lease.householdId === householdId &&
      lease.regime === "market" &&
      landlordKindOf(world, lease.flow.recipient) !== "public",
  );
  return covered ? RENT_STABILIZATION_MOBILITY : 1;
}

// ─── Schedule ───────────────────────────────────────────────────────────

function firstOfNextMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

function monthsBetween(from: IsoDate, to: IsoDate): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm);
}

/** Schedules the first rent day for a life opened at the current version. */
export function ensureRentDaySchedule(world: World): World {
  if (
    world.history.futureDueItems.some((item) =>
      item.stableKey.startsWith(RENT_DAY_PREFIX),
    )
  )
    return world;
  const dueAt = firstOfNextMonth(world.currentDate);
  return scheduleFutureDueItem(world, {
    stableKey: `${RENT_DAY_PREFIX}${dueAt}`,
    dueAt,
    transitionKey: RENT_DAY_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: TOWN_RENT_VERSION },
  });
}

export function rentDayHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== RENT_DAY_TRANSITION_KEY)
    throw new Error("Rent day received another transition.");
  const dueOn = makeIsoDate(dueItem.stableKey.slice(RENT_DAY_PREFIX.length));
  let next = collectTownRent(world, dueOn);
  const following = firstOfNextMonth(next.currentDate);
  next = scheduleFutureDueItem(next, {
    stableKey: `${RENT_DAY_PREFIX}${following}`,
    dueAt: following,
    transitionKey: RENT_DAY_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "rent-day:collected",
    context: null,
    outcomeEventId: null,
  };
}

export const RENT_DAY_HANDLERS = [
  [RENT_DAY_TRANSITION_KEY, rentDayHandler],
] as const;

// ─── Rent day ───────────────────────────────────────────────────────────

/**
 * One rent day: end leases whose tenancy ended, write leases for new
 * tenancies, renew leases whose year is up, collect, and file or settle
 * evictions. Idempotent by stable key: running it twice for one month writes
 * nothing new.
 */
export function collectTownRent(world: World, dueOn: IsoDate): World {
  let next = endTownLeases(world, dueOn);
  next = startTownLeases(next, dueOn);
  next = renewTownLeases(next, dueOn);
  next = payTownRent(next, dueOn);
  return next;
}

/** Ends every lease whose tenancy ended or whose leaseholder left or died. */
export function endTownLeases(world: World, dueOn: IsoDate): World {
  const h = world.history;
  const tenureState = latest(
    h.housingTenureStates,
    (row) => row.housingTenureId,
    dueOn,
  );
  const members = householdMembers(world, dueOn);
  const leases = townLeases(world, dueOn).filter((lease) => !lease.ended);
  if (leases.length === 0) return world;
  const terms = termsByFlow(
    world,
    new Set(leases.map((lease) => lease.flow.id)),
  );
  const obligationState = latest(
    h.resourceObligationStates,
    (row) => row.resourceObligationId,
    dueOn,
  );
  let next = world;
  for (const lease of leases) {
    const tenure = tenureState.get(lease.tenureId);
    const household = members.get(lease.householdId) ?? [];
    const tenancyEnded = !tenure || tenure.status !== "active";
    const holderGone = !household.some(
      (member) => member.id === lease.leaseholderId,
    );
    if (!tenancyEnded && !holderGone) continue;
    const endedAt =
      tenancyEnded && tenure && tenure.effectiveAt <= dueOn
        ? tenure.effectiveAt
        : dueOn;
    const current = termsOn(terms.get(lease.flow.id) ?? [], dueOn);
    if (current && current.status !== "ended")
      next = recordResourceFlowTerms(next, {
        stableKey: `${lease.flow.stableKey}:ended`,
        resourceFlowId: lease.flow.id,
        effectiveAt:
          endedAt < current.effectiveAt ? current.effectiveAt : endedAt,
        status: "ended",
        amount: current.amount,
        cadenceKind: current.cadenceKind,
        reason: tenancyEnded
          ? "The household left the home."
          : "The leaseholder no longer lives there.",
        provenance: PROVENANCE,
        supersedesTermsId: current.id,
      });
    const state = obligationState.get(lease.obligationId);
    if (!state || state.status !== "active") continue;
    next = recordResourceObligationState(next, {
      stableKey: `${lease.flow.stableKey}:obligation-ended`,
      resourceObligationId: lease.obligationId,
      effectiveAt: dueOn,
      status: "ended",
      reason: tenancyEnded ? "Tenancy ended." : "Leaseholder left.",
      provenance: PROVENANCE,
      supersedesStateId: state.id,
    });
  }
  return next;
}

/** The adult who holds a new lease: the player if an adult member, else the best paid. */
function chooseLeaseholder(
  world: World,
  household: readonly Member[],
  pay: ReadonlyMap<EntityId, number>,
): EntityId | null {
  const adults = household.filter((member) => member.age >= 18);
  if (adults.length === 0) return null;
  const played =
    world.control.kind === "person" ? world.control.personId : null;
  if (played && adults.some((adult) => adult.id === played)) return played;
  return [...adults].sort(
    (a, b) =>
      (pay.get(b.id) ?? -1) - (pay.get(a.id) ?? -1) ||
      b.age - a.age ||
      a.id.localeCompare(b.id),
  )[0]!.id;
}

/** Writes a lease for every rented town home that has none. */
export function startTownLeases(world: World, dueOn: IsoDate): World {
  const h = world.history;
  const tenureState = latest(
    h.housingTenureStates,
    (row) => row.housingTenureId,
    dueOn,
  );
  const leases = townLeases(world, dueOn);
  const leased = new Set(
    leases.filter((lease) => !lease.ended).map((lease) => lease.tenureId),
  );
  const dwellings = new Map(h.dwellings.map((row) => [row.id, row]));
  const candidates = h.housingTenures.filter(
    (tenure) =>
      tenure.kind === "lease:rented" &&
      tenure.holder.kind === "household" &&
      tenure.startedAt <= dueOn &&
      !leased.has(tenure.id) &&
      tenureState.get(tenure.id)?.status === "active" &&
      dwellings.has(tenure.dwellingId),
  );
  if (candidates.length === 0) return world;
  const members = householdMembers(world, dueOn);
  const pay = monthlyPayByPerson(world, dueOn);
  const index = townIndex(world, dueOn, members);
  // The last lease on each home: its landlord and bedrooms carry over.
  const lastOnHome = new Map<EntityId, LeaseFacts>();
  for (const lease of leases) lastOnHome.set(lease.dwellingId, lease);
  let next = world;
  for (const tenure of candidates) {
    if (tenure.holder.kind !== "household") continue;
    const dwelling = dwellings.get(tenure.dwellingId)!;
    const town = dwelling.jurisdictionId;
    const row = hudRentRowFor(town);
    // No HUD figure for the place: the rent is unknown, and none is written.
    if (!row) continue;
    const household = members.get(tenure.holder.householdId) ?? [];
    const leaseholderId = chooseLeaseholder(next, household, pay);
    if (!leaseholderId) continue;
    const stableKey = `${LEASE_PREFIX}${tenure.id}:${leaseholderId}`;
    if (next.history.resourceFlows.some((flow) => flow.stableKey === stableKey))
      continue;
    const rng = new SeededRng(next.seed).fork(
      `${TOWN_RENT_VERSION}:home:${dwelling.id}`,
    );
    const previous = lastOnHome.get(dwelling.id);
    const kind = homeKindOf(dwelling.classification);
    const bedrooms =
      previous?.bedrooms ??
      drawBedrooms(kind, household.length, rng.fork("bedrooms").next());

    // The landlord: the home's own, unless it no longer can hold it.
    let landlord: ResourceEndpoint | null =
      previous && landlordStands(next, previous.flow.recipient, town, dueOn)
        ? previous.flow.recipient
        : null;
    if (!landlord) {
      const sold = previous ? `:sold:${dueOn}` : "";
      const landlordKind: LandlordKind =
        previous && landlordKindOf(next, previous.flow.recipient) === "public"
          ? "public"
          : pick(LANDLORD_SHARES[kind], rng.fork(`landlord${sold}`).next());
      const chosen = chooseLandlord(
        next,
        index,
        town,
        landlordKind,
        household,
        rng.fork(`who${sold}`),
        // A body written now was there when the tenancy began.
        tenure.startedAt,
      );
      next = chosen.world;
      landlord = chosen.landlord;
    }
    const isPublic = landlordKindOf(next, landlord) === "public";
    const income = householdMonthlyIncome(household, pay);

    // The rent, by regime.
    let regime: RentRegime = "market";
    let rentMinor: number;
    let basis: string;
    const fmrMinor = row.rents[bedrooms]! * 100;
    const inclusionary = inclusionaryHome(next, dwelling, kind, town);
    const affordable = inclusionary ? affordableRentMinor(row, bedrooms) : null;
    const limit = veryLowIncomeLimit(row, household.length);
    if (isPublic) {
      regime = "public";
      rentMinor = publicHousingRentMinor(income, fmrMinor);
      basis =
        income === null
          ? "the flat rent, 80% of the Fair Market Rent, since the household's income is not on record"
          : "30% of the household's income";
    } else if (
      affordable !== null &&
      income !== null &&
      limit !== null &&
      income * 12 <= limit * AFFORDABLE_LIMIT_OF_VERY_LOW * 100
    ) {
      regime = "affordable";
      rentMinor = affordable;
      basis = `an affordable home under ${inclusionary!.designation}, 30% of 60% of area median income`;
    } else {
      rentMinor = marketRentMinor(
        next,
        town,
        row,
        bedrooms,
        dueOn,
        normal(rng.fork(`rent:${tenure.id}`)),
      );
      basis = `the market, near the county's Fair Market Rent of $${row.rents[bedrooms]} (HUD FY2025, area ${row.area})`;
    }
    // A lease runs from the tenancy, or from the day its landlord existed.
    const landlordSince =
      landlord.kind === "organization"
        ? (next.history.organizations.find(
            (row) => row.id === landlord!.organizationId,
          )?.formedAt ?? tenure.startedAt)
        : tenure.startedAt;
    const startsAt =
      landlordSince > tenure.startedAt ? landlordSince : tenure.startedAt;
    next = createResourceFlow(next, {
      stableKey,
      source: { kind: "person", personId: leaseholderId },
      recipient: landlord,
      startsAt,
      amount: money(rentMinor, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: RENT_BASIS,
      basisReference: { kind: "housing", housingTenureId: tenure.id },
      restrictionKind: null,
      jurisdictionId: town,
      provenance: {
        kind: "authored",
        note: `${TOWN_RENT_VERSION}: ${bedroomLabel(bedrooms)}, rent set by ${basis}.`,
      },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = createResourceObligation(next, {
      stableKey: `${stableKey}:lease`,
      resourceFlowId: flow.id,
      establishedAt: dueOn < startsAt ? startsAt : startsAt,
      basisKind: `housing:lease-${bedrooms}-bedroom-${regime}`,
      principal: null,
      careResponsibilityId: null,
      housingTenureId: tenure.id,
      provenance: PROVENANCE,
    });
  }
  return next;
}

const KIND_BY_CLASSIFICATION: Readonly<Record<string, TownHomeKind>> = {
  "residential:apartment": "small-apartment",
  "residential:rowhouse": "rowhouse",
  "residential:house": "suburban-house",
  "residential:large-house": "large-house",
  "residential:mobile-home": "mobile-home",
  "residential:farmhouse": "rural-farmhouse",
};

function homeKindOf(classification: string): TownHomeKind {
  return KIND_BY_CLASSIFICATION[classification] ?? "suburban-house";
}

export function bedroomLabel(bedrooms: number): string {
  return bedrooms === 0
    ? "an efficiency"
    : `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`;
}

/** Public housing rent in cents: 30% of income, within the minimum and the flat rent. */
export function publicHousingRentMinor(
  monthlyIncomeMinor: number | null,
  fmrMinor: number,
): number {
  const flat =
    Math.round((fmrMinor * PUBLIC_HOUSING_FLAT_RENT_SHARE) / 100) * 100;
  if (monthlyIncomeMinor === null) return flat;
  const share =
    Math.round((monthlyIncomeMinor * PUBLIC_HOUSING_INCOME_SHARE) / 100) * 100;
  return Math.min(flat, Math.max(PUBLIC_HOUSING_MINIMUM_RENT_MINOR, share));
}

/**
 * Whether an inclusionary law made this home affordable: an apartment or
 * rowhouse recorded after the law took effect in its town, one in the law's
 * share, drawn once for the home.
 */
function inclusionaryHome(
  world: World,
  dwelling: { readonly id: EntityId; readonly establishedAt: IsoDate },
  kind: TownHomeKind,
  town: EntityId,
): { readonly designation: string } | null {
  if (kind !== "small-apartment" && kind !== "rowhouse") return null;
  const law = housingLawYes(
    world,
    town,
    RENT_LAW_KEYS.inclusionary,
    dwelling.establishedAt,
  );
  if (!law) return null;
  // A law in force at the opening applies only to homes built after it.
  if (dwelling.establishedAt <= law.operativeAt) return null;
  const draw = new SeededRng(world.seed)
    .fork(`${TOWN_RENT_VERSION}:inclusionary:${dwelling.id}`)
    .next();
  if (draw >= INCLUSIONARY_SHARE) return null;
  return { designation: measureDesignation(world, law.measureId) };
}

function measureDesignation(world: World, measureId: EntityId): string {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (measure) return measure.designation;
  return measureId.startsWith("starting-law:")
    ? "the state's law"
    : "the law in force";
}

function chooseLandlord(
  world: World,
  index: TownIndex,
  town: EntityId,
  kind: LandlordKind,
  tenants: readonly Member[],
  rng: SeededRng,
  onDate: IsoDate,
): { world: World; landlord: ResourceEndpoint } {
  if (kind === "public") {
    const authority = housingAuthority(world, town, onDate);
    return {
      world: authority.world,
      landlord: {
        kind: "organization",
        organizationId: authority.organizationId,
      },
    };
  }
  if (kind === "person") {
    const tenantIds = new Set(tenants.map((member) => member.id));
    const owners = (index.owners.get(town) ?? []).filter(
      (id) => !tenantIds.has(id),
    );
    if (owners.length > 0)
      return {
        world,
        landlord: {
          kind: "person",
          personId:
            owners[Math.floor(rng.fork("owner").next() * owners.length)]!,
        },
      };
  }
  const firms = index.firms.get(town) ?? [];
  if (firms.length > 0)
    return {
      world,
      landlord: {
        kind: "organization",
        organizationId:
          firms[Math.floor(rng.fork("firm").next() * firms.length)]!,
      },
    };
  const manager = propertyManager(world, town, onDate, 0);
  return {
    world: manager.world,
    landlord: { kind: "organization", organizationId: manager.organizationId },
  };
}

/**
 * A private landlord's renewal: last year's rent moved by the price level's
 * rise and the landlord's own draw, held to rent stabilization's cap when it
 * covers the home. Whole dollars, in cents.
 */
export function renewedMarketRent(
  oldMinor: number,
  prices: number,
  draw: number,
  stabilized: boolean,
): {
  readonly amountMinor: number;
  readonly uncappedMinor: number;
  readonly capped: boolean;
  readonly cap: number;
} {
  const market = prices * Math.exp(RENT_SPREAD.renewal * draw);
  const cap = Math.min(
    RENT_STABILIZATION_CAP.most,
    prices - 1 + RENT_STABILIZATION_CAP.overPrices,
  );
  const capped = stabilized && market - 1 > cap;
  const uncappedMinor = Math.round((oldMinor * market) / 100) * 100;
  return {
    amountMinor: capped
      ? Math.round((oldMinor * (1 + cap)) / 100) * 100
      : uncappedMinor,
    uncappedMinor,
    capped,
    cap,
  };
}

/**
 * Renews each lease whose year is up: a private landlord's rent moves with
 * the market, capped where rent stabilization is in force; a public housing
 * rent is recalculated from income; an affordable rent follows the income
 * limit.
 */
export function renewTownLeases(world: World, dueOn: IsoDate): World {
  const leases = townLeases(world, dueOn).filter((lease) => !lease.ended);
  if (leases.length === 0) return world;
  const terms = termsByFlow(
    world,
    new Set(leases.map((lease) => lease.flow.id)),
  );
  const members = householdMembers(world, dueOn);
  const pay = monthlyPayByPerson(world, dueOn);
  let next = world;
  for (const lease of leases) {
    const months = monthsBetween(lease.flow.startsAt, dueOn);
    if (months < 12 || months % 12 !== 0) continue;
    const year = months / 12;
    const stableKey = `${lease.flow.stableKey}:renewal:${year}`;
    const history = terms.get(lease.flow.id) ?? [];
    if (history.some((row) => row.stableKey === stableKey)) continue;
    const current = termsOn(history, dueOn);
    if (!current || current.status !== "active") continue;
    const row = hudRentRowFor(lease.town);
    if (!row) continue;
    const old = current.amount.minorUnits;
    let amount = old;
    let reason: string;
    let provenance: LifeRecordProvenance = PROVENANCE;
    if (lease.regime === "public") {
      const income = householdMonthlyIncome(
        members.get(lease.householdId) ?? [],
        pay,
      );
      amount = publicHousingRentMinor(income, row.rents[lease.bedrooms]! * 100);
      reason = "The housing authority recalculated the rent from income.";
    } else if (lease.regime === "affordable") {
      amount = affordableRentMinor(row, lease.bedrooms) ?? old;
      amount = Math.round(amount * rentPriceLevel(next, lease.town, dueOn));
      amount = Math.round(amount / 100) * 100;
      reason = "The affordable rent was reset to this year's income limit.";
    } else {
      const lastYear = addDays(dueOn, -365);
      const prices =
        rentPriceLevel(next, lease.town, dueOn) /
        rentPriceLevel(next, lease.town, lastYear);
      const draw = normal(new SeededRng(next.seed).fork(`${stableKey}:market`));
      const rule = housingLawYes(
        next,
        lease.town,
        RENT_LAW_KEYS.rentStabilization,
        dueOn,
      );
      const renewal = renewedMarketRent(
        old,
        prices,
        draw,
        rule !== null &&
          landlordKindOf(next, lease.flow.recipient) !== "public",
      );
      const { capped, cap } = renewal;
      amount = renewal.amountMinor;
      if (capped) {
        const uncapped = renewal.uncappedMinor;
        const designation = measureDesignation(next, rule!.measureId);
        reason = `Rent stabilization under ${designation} held the increase to ${(cap * 100).toFixed(1)}% (the landlord sought ${dollarsOf(uncapped)}).`;
        const enactment = next.history.legislativeEnactments?.find(
          (row) => row.measureId === rule!.measureId,
        );
        if (enactment?.outcomeEventId)
          provenance = {
            kind: "simulated-event",
            eventId: enactment.outcomeEventId,
          };
      } else reason = "The landlord renewed the lease at this year's rent.";
    }
    if (amount === old && lease.regime !== "market") continue;
    next = recordResourceFlowTerms(next, {
      stableKey,
      resourceFlowId: lease.flow.id,
      effectiveAt: dueOn,
      status: "active",
      amount: money(amount, current.amount.currency),
      cadenceKind: current.cadenceKind,
      reason,
      provenance,
      supersedesTermsId: current.id,
    });
  }
  return next;
}

function dollarsOf(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

interface Filing {
  readonly filedOn: IsoDate;
  readonly resolvedOn: IsoDate | null;
}

/** Each lease's eviction filings, from the events that record them. */
function filingsByLease(world: World): Map<string, Filing[]> {
  const byLease = new Map<string, Filing[]>();
  for (const event of world.history.events) {
    if (!event.type.startsWith("housing.")) continue;
    const tag = event.tags.find((row) => row.startsWith(LEASE_TAG_PREFIX));
    if (!tag) continue;
    const flowId = tag.slice(LEASE_TAG_PREFIX.length);
    const list = byLease.get(flowId) ?? [];
    if (event.type === RENT_EVENTS.filed)
      list.push({ filedOn: event.occurredAt, resolvedOn: null });
    else if (list.length > 0 && list.at(-1)!.resolvedOn === null)
      list[list.length - 1] = { ...list.at(-1)!, resolvedOn: event.occurredAt };
    byLease.set(flowId, list);
  }
  return byLease;
}

/** The flow basis of a payment toward rent owed from earlier months. */
export const RENT_ARREARS_BASIS = "housing:rent-arrears" as const;

/**
 * Collects the month's rent on every lease, then anything still owed from
 * earlier months, then files or settles evictions.
 *
 * Rent owed is read from the record, never kept on the side: every month the
 * lease charged less what was paid, less what the leaseholder has paid since
 * toward it on the lease's arrears flow (a second flow to the same landlord,
 * written the first month there is something to pay toward).
 */
export function payTownRent(world: World, dueOn: IsoDate): World {
  const leases = townLeases(world, dueOn).filter((lease) => !lease.ended);
  if (leases.length === 0) return world;
  const leaseByFlow = new Map(leases.map((lease) => [lease.flow.id, lease]));
  const arrearsFlowOf = new Map<EntityId, ResourceFlow>();
  const arrearsKeys = new Map(
    leases.map((lease) => [`${lease.flow.stableKey}:arrears`, lease.flow.id]),
  );
  for (const flow of world.history.resourceFlows) {
    const leaseFlowId = arrearsKeys.get(flow.stableKey);
    if (leaseFlowId) arrearsFlowOf.set(leaseFlowId, flow);
  }
  const arrearsFlowIds = new Map(
    [...arrearsFlowOf].map(([leaseFlowId, flow]) => [flow.id, leaseFlowId]),
  );
  const terms = termsByFlow(world, new Set(leaseByFlow.keys()));
  const owedBefore = new Map<EntityId, number>();
  const already = new Set<string>();
  for (const outcome of world.history.resourceTransferOutcomes) {
    const leaseFlowId = leaseByFlow.has(outcome.resourceFlowId)
      ? outcome.resourceFlowId
      : arrearsFlowIds.get(outcome.resourceFlowId);
    if (!leaseFlowId) continue;
    already.add(outcome.stableKey);
    const owed = owedBefore.get(leaseFlowId) ?? 0;
    if (outcome.resourceFlowId === leaseFlowId) {
      if (outcome.status !== "blocked")
        owedBefore.set(
          leaseFlowId,
          owed +
            outcome.attemptedAmount.minorUnits -
            outcome.transferredAmount.minorUnits,
        );
    } else
      owedBefore.set(leaseFlowId, owed - outcome.transferredAmount.minorUnits);
  }

  let next = world;
  const inputs: RecordResourceTransferOutcomeInput[] = [];
  const owedAfter = new Map<EntityId, { owed: number; rent: number }>();
  for (const lease of leases) {
    // Rent is due from the first of the month after the lease began.
    if (firstOfNextMonth(lease.flow.startsAt) > dueOn) continue;
    const stableKey = `${lease.flow.stableKey}:${dueOn}`;
    if (already.has(stableKey)) continue;
    const current = termsOn(terms.get(lease.flow.id) ?? [], dueOn);
    if (!current || current.status !== "active") continue;
    const currency = current.amount.currency;
    const rent = current.amount.minorUnits;
    const position = resourcePositionAt(
      next,
      { kind: "person", personId: lease.leaseholderId },
      currency,
    );
    if (!position) {
      inputs.push({
        stableKey,
        resourceFlowId: lease.flow.id,
        periodStartsAt: dueOn,
        periodEndsAt: dueOn,
        occurredAt: dueOn,
        status: "blocked",
        attemptedAmount: current.amount,
        transferredAmount: money(0, currency),
        reasonKind: "capacity:money-unknown",
        note: "The leaseholder's money is not tracked.",
        provenance: PROVENANCE,
      });
      continue;
    }
    const balance = Math.max(0, position.liquidBalance.minorUnits);
    const paid = Math.min(balance, rent);
    inputs.push({
      stableKey,
      resourceFlowId: lease.flow.id,
      periodStartsAt: dueOn,
      periodEndsAt: dueOn,
      occurredAt: dueOn,
      status: paid === rent ? "completed" : paid > 0 ? "partial" : "missed",
      attemptedAmount: current.amount,
      transferredAmount: money(paid, currency),
      reasonKind: paid === rent ? null : "capacity:insufficient-funds",
      note: "Rent.",
      provenance: PROVENANCE,
    });
    const owed = Math.max(0, owedBefore.get(lease.flow.id) ?? 0);
    const toward = Math.min(owed, balance - paid);
    if (toward > 0) {
      let arrears = arrearsFlowOf.get(lease.flow.id);
      if (!arrears) {
        next = createResourceFlow(next, {
          stableKey: `${lease.flow.stableKey}:arrears`,
          source: lease.flow.source,
          recipient: lease.flow.recipient,
          startsAt: dueOn,
          amount: money(owed, currency),
          cadenceKind: "schedule:monthly",
          basisKind: RENT_ARREARS_BASIS,
          basisReference: {
            kind: "housing",
            housingTenureId: lease.tenureId,
          },
          restrictionKind: null,
          jurisdictionId: lease.town,
          provenance: PROVENANCE,
        });
        arrears = next.history.resourceFlows.at(-1)!;
      } else {
        const owedTerms = resourceFlowTermsAt(next, arrears.id, {
          asOfDate: dueOn,
          historySequenceExclusive: next.history.nextSequence,
        });
        if (owedTerms && owedTerms.amount.minorUnits !== owed)
          next = recordResourceFlowTerms(next, {
            stableKey: `${arrears.stableKey}:owed:${dueOn}`,
            resourceFlowId: arrears.id,
            effectiveAt: dueOn,
            status: "active",
            amount: money(owed, currency),
            cadenceKind: owedTerms.cadenceKind,
            reason: "Rent still owed from earlier months.",
            provenance: PROVENANCE,
            supersedesTermsId: owedTerms.id,
          });
      }
      inputs.push({
        stableKey: `${arrears.stableKey}:${dueOn}`,
        resourceFlowId: arrears.id,
        periodStartsAt: dueOn,
        periodEndsAt: dueOn,
        occurredAt: dueOn,
        status: toward === owed ? "completed" : "partial",
        attemptedAmount: money(owed, currency),
        transferredAmount: money(toward, currency),
        reasonKind: toward === owed ? null : "capacity:insufficient-funds",
        note: "Toward rent owed from earlier months.",
        provenance: PROVENANCE,
      });
    }
    owedAfter.set(lease.flow.id, { owed: owed + rent - paid - toward, rent });
  }
  if (inputs.length === 0) return next;
  next = recordResourceTransferOutcomes(next, inputs);
  return actOnArrears(next, leases, owedAfter, dueOn);
}

function actOnArrears(
  world: World,
  leases: readonly LeaseFacts[],
  owedAfter: ReadonlyMap<EntityId, { owed: number; rent: number }>,
  dueOn: IsoDate,
): World {
  const filings = filingsByLease(world);
  const played =
    world.control.kind === "person" ? world.control.personId : null;
  const members = householdMembers(world, dueOn);
  let next = world;
  for (const lease of leases) {
    const owed = owedAfter.get(lease.flow.id);
    if (!owed) continue;
    const history = filings.get(lease.flow.id) ?? [];
    const open = history.at(-1)?.resolvedOn === null ? history.at(-1)! : null;
    const household = members.get(lease.householdId) ?? [];
    const adults = household.filter((member) => member.age >= 18);
    if (open) {
      if (open.filedOn >= dueOn) continue;
      if (owed.owed === 0) {
        next = rentEvent(next, lease, adults, dueOn, RENT_EVENTS.dismissed, {
          summary: `${landlordName(next, lease.flow.recipient)} dropped the eviction case against ${householdName(next, lease.householdId)} once the rent was paid.`,
        });
        continue;
      }
      const counsel = housingLawYes(
        next,
        lease.town,
        RENT_LAW_KEYS.rightToCounsel,
        open.filedOn,
      );
      const chance = counsel
        ? EVICTION.evictedWithCounsel
        : EVICTION.evictedWithoutCounsel;
      const draw = new SeededRng(next.seed)
        .fork(`${lease.flow.stableKey}:eviction:${open.filedOn}`)
        .next();
      const theirs = played !== null && household.some((m) => m.id === played);
      const lawyer = counsel
        ? ` A lawyer represented them under ${measureDesignation(next, counsel.measureId)}.`
        : "";
      if (draw < chance && !theirs) {
        next = rentEvent(next, lease, adults, dueOn, RENT_EVENTS.evicted, {
          summary: `${householdName(next, lease.householdId)} was evicted from ${bedroomHome(lease)} for ${dollarsOf(owed.owed)} in unpaid rent.${lawyer}`,
        });
        next = evict(next, lease, dueOn);
      } else {
        next = rentEvent(next, lease, adults, dueOn, RENT_EVENTS.settled, {
          summary: `${householdName(next, lease.householdId)} settled the eviction case with ${landlordName(next, lease.flow.recipient)} and kept the home, still owing ${dollarsOf(owed.owed)}.${lawyer}`,
        });
      }
      continue;
    }
    if (owed.owed < EVICTION.fileAtMonthsOwed * owed.rent) continue;
    const lastResolved = history.at(-1)?.resolvedOn ?? null;
    if (
      lastResolved !== null &&
      monthsBetween(lastResolved, dueOn) < EVICTION.quietMonths
    )
      continue;
    next = rentEvent(next, lease, adults, dueOn, RENT_EVENTS.filed, {
      summary: `${landlordName(next, lease.flow.recipient)} filed to evict ${householdName(next, lease.householdId)} for ${dollarsOf(owed.owed)} in unpaid rent.`,
    });
  }
  return next;
}

function bedroomHome(lease: LeaseFacts): string {
  return lease.bedrooms === 0
    ? "their efficiency"
    : `their ${lease.bedrooms}-bedroom home`;
}

function householdName(world: World, householdId: EntityId): string {
  const record = world.history.households.find((row) => row.id === householdId);
  return record
    ? `The ${record.label.replace(/ household$/, "")} household`
    : "A household";
}

function rentEvent(
  world: World,
  lease: LeaseFacts,
  adults: readonly Member[],
  onDate: IsoDate,
  type: (typeof RENT_EVENTS)[keyof typeof RENT_EVENTS],
  text: { readonly summary: string },
): World {
  const stableKey = `${lease.flow.stableKey}:${type}:${onDate}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const people = adults.map((member) => member.id);
  const landlord =
    lease.flow.recipient.kind === "person"
      ? [lease.flow.recipient.personId]
      : [];
  let next = recordWorldEvent(world, {
    stableKey,
    type,
    occurredAt: onDate,
    recordedAt: onDate,
    jurisdictionId: lease.town,
    involvedEntityIds: [lease.householdId, ...people, ...landlord],
    participants: people.map((personId) => ({
      personId,
      role: "focus:subject" as const,
      detail: text.summary,
    })),
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "life.home",
      TOWN_RENT_VERSION,
      `${LEASE_TAG_PREFIX}${lease.flow.id}`,
    ],
    summary: text.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  for (const personId of [...people, ...landlord])
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:knowledge:${personId}`,
      personId,
      eventId,
      learnedAt: onDate,
      believedSummary: text.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  return next;
}

/** Ends the tenancy and the household's occupancy of the home. */
function evict(world: World, lease: LeaseFacts, onDate: IsoDate): World {
  const h = world.history;
  const provenance: LifeRecordProvenance = {
    kind: "simulated-event",
    eventId: h.events.at(-1)!.id,
  };
  const tenureState = latest(
    h.housingTenureStates.filter(
      (row) => row.housingTenureId === lease.tenureId,
    ),
    (row) => row.housingTenureId,
    onDate,
  ).get(lease.tenureId);
  let next = world;
  if (tenureState && tenureState.status === "active")
    next = recordHousingTenureState(next, {
      stableKey: `${lease.flow.stableKey}:evicted:tenure`,
      housingTenureId: lease.tenureId,
      effectiveAt: onDate,
      status: "ended",
      context: "evicted",
      provenance,
      supersedesStateId: tenureState.id,
    });
  const occupancyStates = latest(
    h.dwellingOccupancyStates,
    (row) => row.dwellingOccupancyId,
    onDate,
  );
  for (const occupancy of h.dwellingOccupancies) {
    if (
      occupancy.dwellingId !== lease.dwellingId ||
      occupancy.occupant.kind !== "household" ||
      occupancy.occupant.householdId !== lease.householdId
    )
      continue;
    const state = occupancyStates.get(occupancy.id);
    if (!state || state.status !== "active") continue;
    next = recordDwellingOccupancyState(next, {
      stableKey: `${lease.flow.stableKey}:evicted:occupancy:${occupancy.id}`,
      dwellingOccupancyId: occupancy.id,
      effectiveAt: onDate,
      status: "ended",
      residenceRole: state.residenceRole,
      kind: state.kind,
      reason: "Evicted.",
      provenance,
      supersedesStateId: state.id,
    });
  }
  return endTownLeases(next, onDate);
}

// ─── Reading it back ────────────────────────────────────────────────────

export interface TownRentSnapshot {
  readonly onDate: IsoDate;
  readonly leases: number;
  readonly byLandlord: Readonly<Record<LandlordKind, number>>;
  readonly byRegime: Readonly<Record<RentRegime, number>>;
  /** Median rent due this month, cents, across leases with rent on record. */
  readonly medianRentMinor: number | null;
  /** Median rent paid this month, cents, across leases whose money is tracked. */
  readonly medianPaidMinor: number | null;
  /** Median rent over recorded household pay, across households with pay. */
  readonly medianBurden: number | null;
  /** Share of leases with pay on record paying more than 30% of it. */
  readonly burdenedShare: number | null;
  readonly paid: number;
  readonly short: number;
  readonly unknown: number;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** The town's leases on one rent day, read from records. */
export function townRentSnapshot(
  world: World,
  town: EntityId,
  onDate: IsoDate,
): TownRentSnapshot {
  const leases = townLeases(world, onDate).filter(
    (lease) => !lease.ended && lease.town === town,
  );
  const ids = new Set(leases.map((lease) => lease.flow.id));
  const terms = termsByFlow(world, ids);
  const outcomes = new Map<EntityId, { paid: number; status: string }>();
  for (const outcome of world.history.resourceTransferOutcomes)
    if (ids.has(outcome.resourceFlowId) && outcome.periodStartsAt === onDate)
      outcomes.set(outcome.resourceFlowId, {
        paid: outcome.transferredAmount.minorUnits,
        status: outcome.status,
      });
  const members = householdMembers(world, onDate);
  const pay = monthlyPayByPerson(world, onDate);
  const byLandlord: Record<LandlordKind, number> = {
    person: 0,
    business: 0,
    public: 0,
  };
  const byRegime: Record<RentRegime, number> = {
    market: 0,
    public: 0,
    affordable: 0,
  };
  const rents: number[] = [];
  const paidRents: number[] = [];
  const burdens: number[] = [];
  let paid = 0;
  let short = 0;
  let unknown = 0;
  for (const lease of leases) {
    byLandlord[landlordKindOf(world, lease.flow.recipient)] += 1;
    byRegime[lease.regime] += 1;
    const rent = termsOn(terms.get(lease.flow.id) ?? [], onDate);
    if (!rent || rent.status !== "active") continue;
    rents.push(rent.amount.minorUnits);
    const outcome = outcomes.get(lease.flow.id);
    if (outcome?.status === "completed") {
      paid += 1;
      paidRents.push(rent.amount.minorUnits);
    } else if (outcome?.status === "partial" || outcome?.status === "missed")
      short += 1;
    else if (outcome?.status === "blocked") unknown += 1;
    const income = householdMonthlyIncome(
      members.get(lease.householdId) ?? [],
      pay,
    );
    if (income !== null && income > 0)
      burdens.push(rent.amount.minorUnits / income);
  }
  return {
    onDate,
    leases: leases.length,
    byLandlord,
    byRegime,
    medianRentMinor: median(rents),
    medianPaidMinor: median(paidRents),
    medianBurden: median(burdens),
    burdenedShare:
      burdens.length > 0
        ? burdens.filter((burden) => burden > 0.3).length / burdens.length
        : null,
    paid,
    short,
    unknown,
  };
}
