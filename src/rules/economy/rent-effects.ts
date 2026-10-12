/** Complete retained lease/renewal/payment/arrears/move and rental decision math. Court/trait/legal/identity sources remain external receipts. */
import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import { money } from "./cost-money";
import { resourceFlowTermsAt as termsOf } from "./credential-pay";
import { resourcePositionAt as cashOf } from "./cash-positions";
import { homePriceLevel as homeLevel } from "./housing-prices";
import {
  macroConditionsAt as macroOf,
  macroMonthHistory as macroHistory,
} from "./macro-readings";
import {
  lawInForce as legalNow,
  lawInForceAtStart as legalStart,
} from "../laws/dated-law";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../laws/effect-stamp";
import {
  TOWN_RENT_COUNTIES,
  TOWN_RENT_STATES,
  TOWN_RENT_TOWNS,
  TOWN_RENT_META,
} from "../../simulation/living-world/town-rent.generated";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import { RENT_STABILIZATION_QUESTION } from "../../simulation/law-consequences/rent-stabilization-row";
import { HOUSING_VOUCHER_QUESTION } from "../../simulation/law-consequences/housing-voucher-rows";
import type { RentReadingFacts } from "./rent-readings";
import type { TownHomeKind } from "../../simulation/living-world/town-homes";
import type { LawInForce } from "../../simulation/governing/law-in-force";
import type {
  World,
  EntityId,
  IsoDate,
  ResourceFlow,
  ResourceFlowTermsRecord,
  ResourceEndpoint,
  MoneyAmount,
  LifeRecordProvenance,
  HistoricalCutoff,
  ResourcePositionOwner,
  CurrencyCode,
} from "../../simulation/types";
import type { JudicialSeatHolder } from "../../simulation/judiciary/courts";
import type * as courts from "../../simulation/judiciary/courts";
import type { courtFor as nativeCourt } from "../../simulation/judiciary/court-for";
import type { personTrait as nativeTrait } from "../../simulation/people-traits";
import type { organizationProfileAt as nativeProfile } from "../../simulation/life-queries";
import type { readFinalEnactedLawTerm as nativeTerm } from "../../simulation/governing/final-law-term-query";
import type { RecordResourceTransferOutcomeInput } from "../../simulation/resources";
import type * as resources from "../../simulation/resources";
import type { createOrganization } from "../../simulation/life";
import type { applyLawConsequences } from "../../simulation/enacted-law-effects";
import type { recordLawExposure } from "../../simulation/law-exposure";
import type { recordWorldEvent } from "../../simulation/world";
import type { recordEventKnowledge } from "../../simulation/records";
import type { MacroScopeKey } from "../../simulation/macro-economy/types";
export interface RentEffectFacts extends RentReadingFacts {
  readonly id: EntityId;
  readonly control: World["control"];
  readonly profiles: ReadonlyMap<EntityId, ReturnType<typeof nativeProfile>>;
  readonly traits: ReadonlyMap<string, ReturnType<typeof nativeTrait>>;
  readonly construction: ReadonlyMap<string, boolean>;
  readonly finalTerms: ReadonlyMap<string, ReturnType<typeof nativeTerm>>;
  readonly courtSources: ReadonlyMap<string, ReturnType<typeof nativeCourt>>;
  readonly seats: ReadonlyMap<string, ReturnType<typeof courts.seatsForCourt>>;
  readonly holders: ReadonlyMap<string, ReturnType<typeof courts.seatHolderAt>>;
  readonly handlesCivil: ReadonlyMap<EntityId, boolean>;
  readonly identityFamilies: ReadonlyMap<string, string>;
  readonly names: ReadonlyMap<EntityId, string>;
}
// STOPGAP: economy.rent-stamp-public-receipts
export type RentEffectRequest =
  | {
      readonly kind: "recordLawExposure";
      readonly input: Parameters<typeof recordLawExposure>[1];
    }
  | {
      readonly kind: "createOrganization";
      readonly input: Parameters<typeof createOrganization>[1];
    }
  | {
      readonly kind: "recordResourceFlowTerms";
      readonly input: Parameters<typeof resources.recordResourceFlowTerms>[1];
    }
  | {
      readonly kind: "recordResourceObligationState";
      readonly input: Parameters<
        typeof resources.recordResourceObligationState
      >[1];
    }
  | {
      readonly kind: "createResourceFlow";
      readonly input: Parameters<typeof resources.createResourceFlow>[1];
    }
  | {
      readonly kind: "createResourceObligation";
      readonly input: Parameters<typeof resources.createResourceObligation>[1];
    }
  | {
      readonly kind: "applyLawConsequences";
      readonly input: Parameters<typeof applyLawConsequences>[1];
    }
  | {
      readonly kind: "recordResourceTransferOutcomes";
      readonly input: Parameters<
        typeof resources.recordResourceTransferOutcomes
      >[1];
    }
  | {
      readonly kind: "recordWorldEvent";
      readonly input: Parameters<typeof recordWorldEvent>[1];
    }
  | {
      readonly kind: "recordEventKnowledge";
      readonly input: Parameters<typeof recordEventKnowledge>[1];
    }
  | {
      readonly kind: "recordHousingTenureState";
      readonly input: Parameters<typeof resources.recordHousingTenureState>[1];
    }
  | {
      readonly kind: "recordDwellingOccupancyState";
      readonly input: Parameters<
        typeof resources.recordDwellingOccupancyState
      >[1];
    }
  | {
      readonly kind: "stampTerms";
      readonly record: ResourceFlowTermsRecord;
    }
  | {
      readonly kind: "stampEvent";
      readonly record: World["history"]["events"][number] &
        LawEffectStampedRecord;
    };
export const rentSourceKey = (...keys: unknown[]) => JSON.stringify(keys);
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key)) throw Error("Missing rental source receipt: " + key);
  return map.get(key)!;
}
function lifePlaceByJurisdictionId(facts: RentEffectFacts, id: EntityId) {
  return receipt(facts.places, id);
}
function countyGeoidsForPlace(facts: RentEffectFacts, geoid: string) {
  return receipt(facts.counties, geoid);
}
function organizationProfileAt(facts: RentEffectFacts, id: EntityId) {
  return receipt(facts.profiles, id);
}
function personTrait(facts: RentEffectFacts, id: EntityId, trait: string) {
  return receipt(facts.traits, rentSourceKey(id, trait));
}
function personName(facts: RentEffectFacts, person: World["people"][EntityId]) {
  return person ? receipt(facts.names, person.id) : "";
}
function familyNameReceipt(
  facts: RentEffectFacts,
  town: EntityId,
  index: number,
) {
  return {
    familyName: receipt(facts.identityFamilies, rentSourceKey(town, index)),
  };
}
function lawInForce(
  facts: RentEffectFacts,
  id: EntityId,
  q: EntityId,
  date: IsoDate,
) {
  return legalNow(facts.laws, id, q, date);
}
function lawInForceAtStart(
  facts: RentEffectFacts,
  id: EntityId,
  q: EntityId,
  date: IsoDate,
) {
  return legalStart(facts.laws, id, q, date);
}
function homePriceLevel(facts: RentEffectFacts, id: EntityId, date: IsoDate) {
  return homeLevel(
    { months: facts.macroEconomy?.months ?? [], laws: facts.laws },
    id,
    date,
  );
}
const macroScopeForJurisdiction = (id: string): MacroScopeKey =>
  ("jurisdiction:" + id) as MacroScopeKey;
function macroConditionsAt(
  facts: RentEffectFacts,
  scope: MacroScopeKey,
  date: IsoDate,
) {
  return macroOf(
    { months: facts.macroEconomy?.months ?? [], releases: [] },
    scope,
    date,
  );
}
function macroMonthHistory(
  facts: RentEffectFacts,
  scope: MacroScopeKey,
  date: IsoDate,
) {
  return macroHistory(
    { months: facts.macroEconomy?.months ?? [], releases: [] },
    scope,
    date,
  );
}
function resourceFlowTermsAt(
  facts: RentEffectFacts,
  id: EntityId,
  cutoff?: HistoricalCutoff,
) {
  return termsOf(
    { currentDate: facts.currentDate, records: facts.records },
    id,
    cutoff,
  );
}
function resourcePositionAt(
  facts: RentEffectFacts,
  owner: ResourcePositionOwner,
  currency: CurrencyCode,
) {
  return cashOf(
    { id: facts.id, onDate: facts.currentDate, records: facts.records },
    owner,
    currency,
  );
}
function rentConstructionCovered(
  facts: RentEffectFacts,
  row: World["history"]["dwellings"][number],
  date: IsoDate,
  _cutoff: null,
) {
  void _cutoff;
  return receipt(facts.construction, rentSourceKey(row.id, date));
}
function readFinalEnactedLawTerm(
  facts: RentEffectFacts,
  law: Parameters<typeof nativeTerm>[1],
  query: Parameters<typeof nativeTerm>[2],
) {
  return receipt(facts.finalTerms, rentSourceKey(law.measureId, query));
}
function courtFor(
  facts: RentEffectFacts,
  town: EntityId,
  _role: string,
  _matter: string,
) {
  void _role;
  void _matter;
  return receipt(facts.courtSources, rentSourceKey(town));
}
function seatsForCourt(facts: RentEffectFacts, court: string, date: IsoDate) {
  return receipt(facts.seats, rentSourceKey(court, date));
}
function seatHolderAt(facts: RentEffectFacts, seat: string, date: IsoDate) {
  return receipt(facts.holders, rentSourceKey(seat, date));
}
function playerHandlesJudicialCase(
  facts: RentEffectFacts,
  id: EntityId,
  _matter: string,
) {
  void _matter;
  return receipt(facts.handlesCivil, id);
}
export const TOWN_RENT_VERSION = "town-rent-v1";
export const RENT_BASIS = "housing:rent" as const;
const LEASE_PREFIX = `${TOWN_RENT_VERSION}:lease:`;
const LEASE_TAG_PREFIX = `${TOWN_RENT_VERSION}:lease:`;
export const RENT_EVENTS = {
  filed: "housing.eviction-filed",
  dismissed: "housing.eviction-dismissed",
  settled: "housing.eviction-settled",
  evicted: "housing.evicted",
  movedOut: "housing.moved-out-before-hearing",
} as const;
export const EVICTION_CASE_TAG = "life.opportunity:eviction-case";
export const EVICTION_CASE_ANSWER = "adult.eviction-case";
export const EVICTION_CASE_CHOICES = {
  pay: "pay-what-is-owed",
  plan: "offer-a-payment-plan",
  lawyer: "take-the-lawyer",
  moveOut: "move-out-first",
} as const;
export type EvictionCaseChoice =
  (typeof EVICTION_CASE_CHOICES)[keyof typeof EVICTION_CASE_CHOICES];
export type RentRegime = "market" | "public" | "affordable";
export type LandlordKind = "person" | "business" | "public";
export const RENT_LAW_KEYS = {
  rentStabilization: "us-policy-positions:housing-land-use.rent-stabilization",
  inclusionary: "us-policy-positions:housing-land-use.inclusionary-requirement",
  rightToCounsel:
    "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
} as const;
// STOPGAP: economy.rent-owner-fixed-shares
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
export const PUBLIC_HOUSING_RENT_OF_INCOME = 0.3;
export const PUBLIC_HOUSING_MINIMUM_RENT_MINOR = 5000;
export const PUBLIC_HOUSING_FLAT_RENT_OF_FMR = 0.8;
export const AFFORDABLE_RENT_OF_INCOME = 0.3;
export const AFFORDABLE_LIMIT_OF_VERY_LOW = 1.2;
export const HUD_FAMILY_SIZE_FACTORS = [
  0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32,
] as const;
export const RENT_STABILIZATION_CITYWIDE = {
  rentRise: 0.051,
  actsAfterDays: 365,
} as const;
export function rentLawLevel(
  facts: RentEffectFacts,
  town: EntityId,
  date: IsoDate,
): number {
  const id = propositionId(facts, RENT_LAW_KEYS.rentStabilization);
  if (!id) return 1;
  const law = lawInForce(facts, town, id, date);
  if (
    law?.origin !== "enacted" ||
    law.operativeAt > addDays(date, -RENT_STABILIZATION_CITYWIDE.actsAfterDays)
  )
    return 1;
  const now = law.answer === "yes";
  const before = lawInForceAtStart(facts, town, id, date) === "yes";
  if (now === before) return 1;
  return now
    ? 1 + RENT_STABILIZATION_CITYWIDE.rentRise
    : 1 / (1 + RENT_STABILIZATION_CITYWIDE.rentRise);
}
export function marketRentLevel(
  facts: RentEffectFacts,
  town: EntityId,
  date: IsoDate,
): number {
  return homePriceLevel(facts, town, date) * rentLawLevel(facts, town, date);
}
export const EVICTION = {
  fileAtMonthsOwed: 2,
  conciliatoryLandlordFilesAt: 3,
  conciliatoryLandlordSettlesUpTo: 3,
  lawyerKeepsHomeUpTo: 4,
  planMonths: 6,
  planLimitOfPay: 0.5,
  conciliatoryJudgeGivesTimeUpTo: 2,
  quietMonths: 3,
} as const;
export interface HudRentRow {
  readonly rents: readonly [number, number, number, number, number];
  readonly veryLow4: number | null;
  readonly low4: number | null;
  readonly population: number | null;
  readonly area: string;
  readonly estimated: boolean;
  readonly estimateBasis: string | null;
}
function parseRow(
  area: string,
  cells: string,
  estimateBasis: string | null = null,
): HudRentRow {
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
    estimated: estimateBasis !== null,
    estimateBasis,
  };
}
let countyRows: ReadonlyMap<string, HudRentRow> | null = null;
let townRows: ReadonlyMap<string, readonly [string, HudRentRow][]> | null =
  null;
let stateRows: ReadonlyMap<string, HudRentRow> | null = null;
function loadRows() {
  if (countyRows && townRows && stateRows) return;
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
  const states = new Map<string, HudRentRow>();
  for (const entry of TOWN_RENT_STATES.split(";")) {
    const split = entry.indexOf(":");
    const state = entry.slice(0, split);
    const vintage =
      TOWN_RENT_META.fairMarketRents.match(/HUD (FY\d+)/)?.[1] ?? "published";
    const basis = `ESTIMATED FROM AVERAGE: no HUD county link for this playable place; population-weighted HUD ${vintage} county rents for ${state}.`;
    states.set(
      state,
      parseRow(`state:${state}`, entry.slice(split + 1), basis),
    );
  }
  countyRows = counties;
  townRows = towns;
  stateRows = states;
}
const TOWN_SUFFIX = / (town|city|village|plantation|borough|gore|grant)$/i;
// STOPGAP: economy.rent-hud-whole-history
export function hudRentRowFor(
  facts: RentEffectFacts,
  jurisdictionId: EntityId,
): HudRentRow | null {
  const place = lifePlaceByJurisdictionId(facts, jurisdictionId);
  const geoid =
    place?.sourceGeoid && /^\d{7}$/.test(place.sourceGeoid)
      ? place.sourceGeoid
      : null;
  if (!place) return null;
  loadRows();
  const state = place.stateJurisdictionKey?.replace(/^US-/, "") ?? null;
  const countiesForPlace = geoid ? countyGeoidsForPlace(facts, geoid) : [];
  for (const county of countiesForPlace) {
    const whole = countyRows!.get(county);
    if (whole) return whole;
    const towns = townRows!.get(county);
    if (!towns || towns.length === 0) continue;
    const name = (place.displayName.split(",")[0] ?? "").trim().toLowerCase();
    const same = towns.find(
      ([town]) => town.replace(TOWN_SUFFIX, "").toLowerCase() === name,
    );
    if (same) return same[1];
    const weighted = populationWeightedTownRow(county, towns);
    if (weighted) return weighted;
  }
  return state ? (stateRows!.get(state) ?? null) : null;
}
function populationWeightedTownRow(
  county: string,
  towns: readonly [string, HudRentRow][],
): HudRentRow | null {
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
  if (weight === 0) return null;
  const basis = `ESTIMATED FROM AVERAGE: no HUD town row for this place; population-weighted HUD FY2025 town rents in county ${county}.`;
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
    estimated: true,
    estimateBasis: basis,
  };
}
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
export function affordableRentMinor(
  row: HudRentRow,
  bedrooms: number,
): number | null {
  const people = bedrooms === 0 ? 1 : bedrooms * 1.5;
  const limit = veryLowIncomeLimit(row, people);
  if (limit === null) return null;
  return Math.round(
    ((limit * AFFORDABLE_LIMIT_OF_VERY_LOW * AFFORDABLE_RENT_OF_INCOME) / 12) *
      100,
  );
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
export function bedroomsForHousehold(people: number): number {
  if (!Number.isSafeInteger(people) || people < 1)
    throw new Error("First lease requires recorded household members");
  return people === 1 ? 0 : Math.min(4, Math.ceil(people / 2));
}
export function rentPriceLevel(
  facts: RentEffectFacts,
  town: EntityId,
  date: IsoDate,
): number {
  const scope = macroScopeForJurisdiction(town);
  const now =
    macroConditionsAt(facts, scope, date) ??
    macroConditionsAt(facts, "national", date);
  const base = macroMonthHistory(facts, "national", facts.currentDate)[0];
  if (!now || !base || base.priceIndex <= 0) return 1;
  return now.priceIndex / base.priceIndex;
}
export function marketRentMinor(
  facts: RentEffectFacts,
  town: EntityId,
  row: HudRentRow,
  bedrooms: number,
  date: IsoDate,
): number {
  const fmr = row.rents[Math.max(0, Math.min(4, bedrooms))]!;
  return Math.round(fmr * marketRentLevel(facts, town, date)) * 100;
}
export function* recordInclusionaryRentExposure(
  facts: RentEffectFacts,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly measureId: EntityId;
    readonly rentMinor: number;
    readonly marketMinor: number;
    readonly sourceRecordId: EntityId;
  },
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const difference = input.marketMinor - input.rentMinor;
  return yield {
    kind: "recordLawExposure",
    input: {
      stableKey: input.stableKey,
      personId: input.personId,
      measureId: input.measureId,
      channel: "rent",
      direction: difference === 0 ? "none" : difference > 0 ? "gain" : "cost",
      amount: difference === 0 ? null : money(Math.abs(difference), "USD"),
      cadence: difference === 0 ? null : "monthly",
      sourceRecordId: input.sourceRecordId,
    },
  };
}
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
function latest<
  T extends {
    readonly effectiveAt: IsoDate;
  },
>(
  rows: readonly T[],
  key: (row: T) => EntityId,
  onDate: IsoDate,
): Map<EntityId, T> {
  const map = new Map<EntityId, T>();
  for (const row of rows) if (row.effectiveAt <= onDate) map.set(key(row), row);
  return map;
}
export function townLeases(
  facts: RentEffectFacts,
  onDate: IsoDate = facts.currentDate,
) {
  const h = facts.records;
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
function termsOn(
  history: readonly ResourceFlowTermsRecord[],
  date: IsoDate,
): ResourceFlowTermsRecord | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1)
    if (history[index]!.effectiveAt <= date) return history[index];
  return undefined;
}
function termsByFlow(
  facts: RentEffectFacts,
  ids: ReadonlySet<EntityId>,
): Map<EntityId, ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, ResourceFlowTermsRecord[]>();
  for (const record of facts.records.resourceFlowTerms) {
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
function householdMembers(
  facts: RentEffectFacts,
  onDate: IsoDate,
): Map<EntityId, Member[]> {
  const h = facts.records;
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
    const person = facts.people[membership.personId];
    if (!person || dead.has(person.id)) continue;
    const list = members.get(membership.householdId) ?? [];
    list.push({ id: person.id, age: ageOnDate(person.birthDate, onDate) });
    members.set(membership.householdId, list);
  }
  return members;
}
export function monthlyPayByPerson(
  facts: RentEffectFacts,
  onDate: IsoDate,
): ReadonlyMap<EntityId, number> {
  return recordedMonthlyPayByPerson(facts, onDate, "work");
}
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
function isPublicBody(
  facts: RentEffectFacts,
  organizationId: EntityId,
): boolean {
  return (
    organizationProfileAt(facts, organizationId)?.classification ===
    "service:public-housing"
  );
}
function landlordStands(
  facts: RentEffectFacts,
  landlord: ResourceEndpoint,
  town: EntityId,
  onDate: IsoDate,
): boolean {
  if (landlord.kind === "organization") {
    const profile = organizationProfileAt(facts, landlord.organizationId);
    return !!profile && !profile.closed;
  }
  if (landlord.kind !== "person") return false;
  const person = facts.people[landlord.personId];
  if (!person || person.homeJurisdictionId !== town) return false;
  return !facts.records.personDeaths.some(
    (death) => death.personId === landlord.personId && death.diedAt <= onDate,
  );
}
function landlordKindOf(
  facts: RentEffectFacts,
  landlord: ResourceEndpoint,
): LandlordKind {
  if (landlord.kind === "person") return "person";
  if (
    landlord.kind === "organization" &&
    isPublicBody(facts, landlord.organizationId)
  )
    return "public";
  return "business";
}
export function landlordName(
  facts: RentEffectFacts,
  landlord: ResourceEndpoint,
): string {
  if (landlord.kind === "person") {
    const person = facts.people[landlord.personId];
    return person ? personName(facts, person) : "The landlord";
  }
  if (landlord.kind === "organization")
    return (
      organizationProfileAt(facts, landlord.organizationId)?.name ??
      "The landlord"
    );
  return "The landlord";
}
const PROVENANCE: LifeRecordProvenance = {
  kind: "generated",
  generatorKey: TOWN_RENT_VERSION,
};
function townParts(
  facts: RentEffectFacts,
  town: EntityId,
): {
  town: string;
  state: string;
} {
  const place = lifePlaceByJurisdictionId(facts, town);
  const [name = "Town", state = ""] = (place?.displayName ?? "")
    .split(",")
    .map((part) => part.trim());
  return { town: name, state };
}
function* housingAuthority(
  facts: RentEffectFacts,
  town: EntityId,
  formedAt: IsoDate,
): Generator<
  RentEffectRequest,
  {
    facts: RentEffectFacts;
    organizationId: EntityId;
  },
  RentEffectFacts
> {
  const stableKey = `${TOWN_RENT_VERSION}:${town}:housing-authority`;
  const id = createStableId("organization", `${facts.id}:${stableKey}`);
  if (facts.records.organizations.some((row) => row.id === id))
    return { facts, organizationId: id };
  return {
    facts: yield {
      kind: "createOrganization",
      input: {
        stableKey,
        formedAt,
        detailLevel: "lightweight",
        provenance: PROVENANCE,
        initialProfile: {
          name: `${townParts(facts, town).town} Housing Authority`,
          classification: "service:public-housing",
          locationJurisdictionId: town,
        },
      },
    },
    organizationId: id,
  };
}
function* propertyManager(
  facts: RentEffectFacts,
  town: EntityId,
  formedAt: IsoDate,
  index: number,
): Generator<
  RentEffectRequest,
  {
    facts: RentEffectFacts;
    organizationId: EntityId;
  },
  RentEffectFacts
> {
  const stableKey = `${TOWN_RENT_VERSION}:${town}:property-manager:${index}`;
  const id = createStableId("organization", `${facts.id}:${stableKey}`);
  if (facts.records.organizations.some((row) => row.id === id))
    return { facts, organizationId: id };
  const family = familyNameReceipt(facts, town, index).familyName;
  return {
    facts: yield {
      kind: "createOrganization",
      input: {
        stableKey,
        formedAt,
        detailLevel: "lightweight",
        provenance: PROVENANCE,
        initialProfile: {
          name: `${family} Property Management`,
          classification: "enterprise:real-estate",
          locationJurisdictionId: town,
        },
      },
    },
    organizationId: id,
  };
}
interface TownIndex {
  readonly owners: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly firms: ReadonlyMap<EntityId, readonly EntityId[]>;
}
function townIndex(
  facts: RentEffectFacts,
  onDate: IsoDate,
  members: ReadonlyMap<EntityId, readonly Member[]>,
): TownIndex {
  const h = facts.records;
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
      const town = facts.people[member.id]?.homeJurisdictionId;
      if (!town) continue;
      const list = owners.get(town) ?? [];
      list.push(member.id);
      owners.set(town, list);
    }
  }
  const firms = new Map<EntityId, EntityId[]>();
  for (const organization of h.organizations) {
    const profile = organizationProfileAt(facts, organization.id);
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
function propositionId(facts: RentEffectFacts, key: string): EntityId | null {
  return (
    Object.values(facts.policyCatalog?.propositions ?? {}).find(
      (definition) => definition.stableKey === key,
    )?.id ?? null
  );
}
export function housingLawYes(
  facts: RentEffectFacts,
  town: EntityId,
  key: string,
  onDate: IsoDate,
): LawInForce | null {
  const id = propositionId(facts, key);
  if (!id) return null;
  const law = lawInForce(facts, town, id, onDate);
  return law?.answer === "yes" ? law : null;
}
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
export function* endTownLeases(
  facts: RentEffectFacts,
  dueOn: IsoDate,
  onlyFlowId?: EntityId,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const h = facts.records;
  const tenureState = latest(
    h.housingTenureStates,
    (row) => row.housingTenureId,
    dueOn,
  );
  const members = householdMembers(facts, dueOn);
  const leases = townLeases(facts, dueOn).filter(
    (lease) =>
      !lease.ended &&
      (onlyFlowId === undefined || lease.flow.id === onlyFlowId),
  );
  if (leases.length === 0) return facts;
  const terms = termsByFlow(
    facts,
    new Set(leases.map((lease) => lease.flow.id)),
  );
  const obligationState = latest(
    h.resourceObligationStates,
    (row) => row.resourceObligationId,
    dueOn,
  );
  let next = facts;
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
      next = yield {
        kind: "recordResourceFlowTerms",
        input: {
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
        },
      };
    const state = obligationState.get(lease.obligationId);
    if (!state || state.status !== "active") continue;
    next = yield {
      kind: "recordResourceObligationState",
      input: {
        stableKey: `${lease.flow.stableKey}:obligation-ended`,
        resourceObligationId: lease.obligationId,
        effectiveAt: dueOn,
        status: "ended",
        reason: tenancyEnded ? "Tenancy ended." : "Leaseholder left.",
        provenance: PROVENANCE,
        supersedesStateId: state.id,
      },
    };
  }
  return next;
}
function chooseLeaseholder(
  household: readonly Member[],
  pay: ReadonlyMap<EntityId, number>,
): EntityId | null {
  const adults = household.filter((member) => member.age >= 18);
  if (adults.length === 0) return null;
  return [...adults].sort(
    (a, b) =>
      (pay.get(b.id) ?? -1) - (pay.get(a.id) ?? -1) ||
      b.age - a.age ||
      a.id.localeCompare(b.id),
  )[0]!.id;
}
function landlordKindsByHome(
  facts: RentEffectFacts,
  dueOn: IsoDate,
): Map<EntityId, LandlordKind> {
  const rosters = new Map<EntityId, Map<TownHomeKind, EntityId[]>>();
  for (const home of facts.records.dwellings) {
    if (home.establishedAt > dueOn) continue;
    const town =
      rosters.get(home.jurisdictionId) ?? new Map<TownHomeKind, EntityId[]>();
    const kind = homeKindOf(home.classification);
    const homes = town.get(kind) ?? [];
    homes.push(home.id);
    town.set(kind, homes);
    rosters.set(home.jurisdictionId, town);
  }
  const kinds = new Map<EntityId, LandlordKind>();
  for (const town of rosters.values())
    for (const [kind, homes] of town)
      homes.forEach((id, index) => {
        kinds.set(
          id,
          pick(LANDLORD_SHARES[kind], (index + 0.5) / homes.length),
        );
      });
  return kinds;
}
// STOPGAP: economy.rent-start-legal-boundaries
export function* startTownLeases(
  facts: RentEffectFacts,
  dueOn: IsoDate,
  onlyHouseholdId?: EntityId,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const h = facts.records;
  const tenureState = latest(
    h.housingTenureStates,
    (row) => row.housingTenureId,
    dueOn,
  );
  const leases = townLeases(facts, dueOn);
  const leased = new Set(
    leases.filter((lease) => !lease.ended).map((lease) => lease.tenureId),
  );
  const dwellings = new Map(h.dwellings.map((row) => [row.id, row]));
  const candidates = h.housingTenures.filter(
    (tenure) =>
      tenure.kind === "lease:rented" &&
      tenure.holder.kind === "household" &&
      (onlyHouseholdId === undefined ||
        tenure.holder.householdId === onlyHouseholdId) &&
      tenure.startedAt <= dueOn &&
      !leased.has(tenure.id) &&
      tenureState.get(tenure.id)?.status === "active" &&
      dwellings.has(tenure.dwellingId),
  );
  if (candidates.length === 0) return facts;
  const owners = new Map<EntityId, typeof h.housingTenures>();
  for (const tenure of h.housingTenures) {
    if (
      !tenure.kind.startsWith("ownership:") ||
      tenure.startedAt > dueOn ||
      tenureState.get(tenure.id)?.status !== "active"
    )
      continue;
    owners.set(tenure.dwellingId, [
      ...(owners.get(tenure.dwellingId) ?? []),
      tenure,
    ]);
  }
  const landlordKinds = landlordKindsByHome(facts, dueOn);
  const members = householdMembers(facts, dueOn);
  const pay = monthlyPayByPerson(facts, dueOn);
  const index = townIndex(facts, dueOn, members);
  const lastOnHome = new Map<EntityId, LeaseFacts>();
  for (const lease of leases) lastOnHome.set(lease.dwellingId, lease);
  const held = new Map<string, number>();
  for (const lease of leases)
    if (!lease.ended) {
      const key = endpointKey(lease.flow.recipient);
      held.set(key, (held.get(key) ?? 0) + 1);
    }
  const affordableLet = new Map<EntityId, number>();
  for (const lease of leases)
    if (!lease.ended && lease.regime === "affordable")
      affordableLet.set(lease.town, (affordableLet.get(lease.town) ?? 0) + 1);
  let next = facts;
  for (const tenure of candidates) {
    if (tenure.holder.kind !== "household") continue;
    const dwelling = dwellings.get(tenure.dwellingId)!;
    const town = dwelling.jurisdictionId;
    const row = hudRentRowFor(facts, town);
    if (!row) continue;
    const household = members.get(tenure.holder.householdId) ?? [];
    const leaseholderId = chooseLeaseholder(household, pay);
    if (!leaseholderId) continue;
    const stableKey = `${LEASE_PREFIX}${tenure.id}:${leaseholderId}`;
    if (next.records.resourceFlows.some((flow) => flow.stableKey === stableKey))
      continue;
    const previous = lastOnHome.get(dwelling.id);
    const kind = homeKindOf(dwelling.classification);
    const bedrooms =
      previous?.bedrooms ?? bedroomsForHousehold(household.length);
    let landlord: ResourceEndpoint | null =
      previous && landlordStands(next, previous.flow.recipient, town, dueOn)
        ? previous.flow.recipient
        : null;
    const recordedOwners = owners.get(dwelling.id) ?? [];
    if (recordedOwners.length) {
      if (recordedOwners.length !== 1) continue;
      const owner = recordedOwners[0]!.holder;
      if (owner.kind === "household") continue;
      if (owner.kind === "person") {
        if (
          !next.people[owner.personId] ||
          next.records.personDeaths.some(
            (death) =>
              death.personId === owner.personId && death.diedAt <= dueOn,
          )
        )
          continue;
      } else {
        const profile = organizationProfileAt(next, owner.organizationId);
        if (!profile || profile.closed) continue;
      }
      landlord = owner;
    }
    if (!landlord) {
      const landlordKind: LandlordKind =
        previous && landlordKindOf(next, previous.flow.recipient) === "public"
          ? "public"
          : landlordKinds.get(dwelling.id)!;
      const chosen = yield* chooseLandlord(
        next,
        index,
        town,
        landlordKind,
        household,
        { held, pay },
        tenure.startedAt,
      );
      next = chosen.facts;
      landlord = chosen.landlord;
      const key = endpointKey(landlord);
      held.set(key, (held.get(key) ?? 0) + 1);
    }
    const isPublic = landlordKindOf(next, landlord) === "public";
    const income = householdMonthlyIncome(household, pay);
    let regime: RentRegime = "market";
    let rentMinor: number;
    let basis: string;
    const fmrMinor = row.rents[bedrooms]! * 100;
    const inclusionary = inclusionaryHome(
      next,
      dwelling,
      kind,
      town,
      affordableLet.get(town) ?? 0,
    );
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
      affordableLet.set(town, (affordableLet.get(town) ?? 0) + 1);
      basis = `an affordable home under ${inclusionary!.designation}, 30% of 60% of area median income`;
    } else {
      rentMinor = marketRentMinor(next, town, row, bedrooms, dueOn);
      basis = `the market, near the county's Fair Market Rent of $${row.rents[bedrooms]} (HUD FY2025, area ${row.area})`;
    }
    const landlordSince =
      landlord.kind === "organization"
        ? (next.records.organizations.find(
            (row) => row.id === landlord!.organizationId,
          )?.formedAt ?? tenure.startedAt)
        : tenure.startedAt;
    const replaces = leases.some((lease) => lease.tenureId === tenure.id);
    const from = replaces ? addDays(dueOn, -1) : tenure.startedAt;
    const startsAt = landlordSince > from ? landlordSince : from;
    next = yield {
      kind: "createResourceFlow",
      input: {
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
          note: `${TOWN_RENT_VERSION}: ${bedroomLabel(bedrooms)}, rent set by ${basis}.${row.estimateBasis ? ` ${row.estimateBasis}` : ""}`,
        },
      },
    };
    const flow = next.records.resourceFlows.at(-1)!;
    if (regime === "affordable" && inclusionary) {
      const terms = next.records.resourceFlowTerms.at(-1)!;
      const stamp = lawEffectStamp(inclusionary.law, {
        effectKind: "inclusionary-affordable-rent",
        questionKey: RENT_LAW_KEYS.inclusionary,
        jurisdictionId: town,
        appliedAt: dueOn,
        sourceRecordIds: [
          ...inclusionary.sourceRecordIds,
          flow.id,
          terms.id,
          tenure.id,
          dwelling.id,
          leaseholderId,
        ],
      });
      if (stamp) {
        next = yield {
          kind: "stampTerms",
          record: {
            ...terms,
            lawEffectStamps: [...(terms.lawEffectStamps ?? []), stamp],
          },
        };
        next = yield* recordInclusionaryRentExposure(next, {
          stableKey: `inclusionary-rent:${terms.id}`,
          personId: leaseholderId,
          measureId: inclusionary.law.measureId,
          rentMinor,
          marketMinor: marketRentMinor(next, town, row, bedrooms, dueOn),
          sourceRecordId: terms.id,
        });
      }
    }
    next = yield {
      kind: "createResourceObligation",
      input: {
        stableKey: `${stableKey}:lease`,
        resourceFlowId: flow.id,
        establishedAt: startsAt,
        basisKind: `housing:lease-${bedrooms}-bedroom-${regime}`,
        principal: null,
        careResponsibilityId: null,
        housingTenureId: tenure.id,
        provenance: PROVENANCE,
      },
    };
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
export function publicHousingRentMinor(
  monthlyIncomeMinor: number | null,
  fmrMinor: number,
): number {
  const flat =
    Math.round((fmrMinor * PUBLIC_HOUSING_FLAT_RENT_OF_FMR) / 100) * 100;
  if (monthlyIncomeMinor === null) return flat;
  const share =
    Math.round((monthlyIncomeMinor * PUBLIC_HOUSING_RENT_OF_INCOME) / 100) *
    100;
  return Math.min(flat, Math.max(PUBLIC_HOUSING_MINIMUM_RENT_MINOR, share));
}
export function inclusionaryHome(
  facts: RentEffectFacts,
  dwelling: RentEffectFacts["records"]["dwellings"][number],
  kind: TownHomeKind,
  town: EntityId,
  affordableLet: number,
): {
  readonly designation: string;
  readonly law: LawInForce;
  readonly sourceRecordIds: readonly EntityId[];
} | null {
  if (
    !coveredKind(kind) ||
    rentConstructionCovered(facts, dwelling, dwelling.establishedAt, null)
  )
    return null;
  const law = housingLawYes(
    facts,
    town,
    RENT_LAW_KEYS.inclusionary,
    dwelling.establishedAt,
  );
  if (!law) return null;
  const share = readFinalEnactedLawTerm(facts, law, {
    questionKey: RENT_LAW_KEYS.inclusionary,
    termKey: "share",
    unit: "ratio",
    onDate: dwelling.establishedAt,
  });
  if (!share || share.value < 0 || share.value > 1) return null;
  if (dwelling.establishedAt <= law.operativeAt) return null;
  const covered = facts.records.dwellings.filter(
    (row) =>
      row.jurisdictionId === town &&
      coveredKind(homeKindOf(row.classification)) &&
      !rentConstructionCovered(facts, row, row.establishedAt, null) &&
      row.establishedAt > law.operativeAt &&
      (row.establishedAt < dwelling.establishedAt ||
        (row.establishedAt === dwelling.establishedAt &&
          row.id.localeCompare(dwelling.id) <= 0)),
  ).length;
  if (!inclusionarySetAsideOpen(affordableLet, covered, share.value))
    return null;
  return {
    designation: measureDesignation(facts, law.measureId),
    law,
    sourceRecordIds: share.sourceRecordIds,
  };
}
export function inclusionarySetAsideOpen(
  affordableLet: number,
  coveredHomes: number,
  recordedShare: number,
): boolean {
  return affordableLet < Math.ceil(coveredHomes * recordedShare - 1e-9);
}
function coveredKind(kind: TownHomeKind): boolean {
  return kind === "small-apartment" || kind === "rowhouse";
}
function measureDesignation(
  facts: RentEffectFacts,
  measureId: EntityId,
): string {
  const measure = facts.records.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (measure) return measure.designation;
  return measureId.startsWith("starting-law:")
    ? "the state's law"
    : "the law in force";
}
function endpointKey(endpoint: ResourceEndpoint): string {
  return endpoint.kind === "person"
    ? `person:${endpoint.personId}`
    : endpoint.kind === "organization"
      ? `organization:${endpoint.organizationId}`
      : endpoint.kind;
}
function* chooseLandlord(
  facts: RentEffectFacts,
  index: TownIndex,
  town: EntityId,
  kind: LandlordKind,
  tenants: readonly Member[],
  read: {
    readonly held: ReadonlyMap<string, number>;
    readonly pay: ReadonlyMap<EntityId, number>;
  },
  onDate: IsoDate,
): Generator<
  RentEffectRequest,
  {
    facts: RentEffectFacts;
    landlord: ResourceEndpoint;
  },
  RentEffectFacts
> {
  if (kind === "public") {
    const authority = yield* housingAuthority(facts, town, onDate);
    return {
      facts: authority.facts,
      landlord: {
        kind: "organization",
        organizationId: authority.organizationId,
      },
    };
  }
  const letting = (key: string) => read.held.get(key) ?? 0;
  if (kind === "person") {
    const tenantIds = new Set(tenants.map((member) => member.id));
    const owners = (index.owners.get(town) ?? []).filter(
      (id) => !tenantIds.has(id),
    );
    if (owners.length > 0) {
      const [personId] = [...owners].sort(
        (a, b) =>
          letting(`person:${a}`) - letting(`person:${b}`) ||
          (read.pay.get(b) ?? -1) - (read.pay.get(a) ?? -1) ||
          a.localeCompare(b),
      );
      return { facts, landlord: { kind: "person", personId: personId! } };
    }
  }
  const firms = index.firms.get(town) ?? [];
  if (firms.length > 0) {
    const [organizationId] = [...firms].sort(
      (a, b) =>
        letting(`organization:${a}`) - letting(`organization:${b}`) ||
        a.localeCompare(b),
    );
    return {
      facts,
      landlord: { kind: "organization", organizationId: organizationId! },
    };
  }
  const manager = yield* propertyManager(facts, town, onDate, 0);
  return {
    facts: manager.facts,
    landlord: { kind: "organization", organizationId: manager.organizationId },
  };
}
export function marketRentRenewalReason(
  homePriceLevelChange: number,
  estimateBasis?: string,
): string {
  if (!Number.isFinite(homePriceLevelChange) || homePriceLevelChange <= 0)
    throw new Error(
      "Market rent renewal requires a positive price-level change",
    );
  const reason = `The local housing-market level changed rent by ${((homePriceLevelChange - 1) * 100).toFixed(1)}% over the renewal year.`;
  return estimateBasis ? `${reason} ${estimateBasis}` : reason;
}
// STOPGAP: economy.rent-renewal-window
export function* renewTownLeases(
  facts: RentEffectFacts,
  dueOn: IsoDate,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const leases = townLeases(facts, dueOn).filter((lease) => !lease.ended);
  if (leases.length === 0) return facts;
  const terms = termsByFlow(
    facts,
    new Set(leases.map((lease) => lease.flow.id)),
  );
  const members = householdMembers(facts, dueOn);
  const pay = monthlyPayByPerson(facts, dueOn);
  let next = facts;
  for (const lease of leases) {
    const months = monthsBetween(lease.flow.startsAt, dueOn);
    if (months < 12 || months % 12 !== 0) continue;
    const year = months / 12;
    const stableKey = `${lease.flow.stableKey}:renewal:${year}`;
    const history = terms.get(lease.flow.id) ?? [];
    if (history.some((row) => row.stableKey === stableKey)) continue;
    const current = termsOn(history, dueOn);
    if (!current || current.status !== "active") continue;
    const row = hudRentRowFor(facts, lease.town);
    if (!row) continue;
    const old = current.amount.minorUnits;
    let amount = old;
    let reason: string;
    const provenance: LifeRecordProvenance = PROVENANCE;
    let lawEffectStamps: LawEffectStampedRecord["lawEffectStamps"];
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
      const dwelling = next.records.dwellings.find(
        (home) => home.id === lease.dwellingId,
      );
      const rule =
        dwelling &&
        housingLawYes(
          next,
          lease.town,
          RENT_LAW_KEYS.inclusionary,
          dwelling.establishedAt,
        );
      if (rule && dwelling.establishedAt > rule.operativeAt) {
        const stamp = lawEffectStamp(rule, {
          effectKind: "inclusionary-affordable-rent",
          questionKey: RENT_LAW_KEYS.inclusionary,
          jurisdictionId: lease.town,
          appliedAt: dueOn,
          sourceRecordIds: [
            lease.flow.id,
            current.id,
            lease.tenureId,
            lease.dwellingId,
            lease.leaseholderId,
          ],
        });
        if (stamp) lawEffectStamps = [stamp];
      }
    } else {
      const lastYear = addDays(dueOn, -365);
      const homePrices =
        marketRentLevel(next, lease.town, dueOn) /
        marketRentLevel(next, lease.town, lastYear);
      const rule = housingLawYes(
        next,
        lease.town,
        RENT_LAW_KEYS.rentStabilization,
        dueOn,
      );
      const finalCap = rule
        ? readFinalEnactedLawTerm(next, rule, {
            questionKey: RENT_LAW_KEYS.rentStabilization,
            termKey: "cap",
            unit: "ratio",
            onDate: dueOn,
          })
        : null;
      if (
        rule &&
        landlordKindOf(next, lease.flow.recipient) !== "public" &&
        finalCap === null
      )
        continue;
      amount = Math.round((old * homePrices) / 100) * 100;
      reason = marketRentRenewalReason(
        homePrices,
        row.estimateBasis ?? undefined,
      );
    }
    if (amount === old && lease.regime !== "market") continue;
    next = yield {
      kind: "recordResourceFlowTerms",
      input: {
        stableKey,
        resourceFlowId: lease.flow.id,
        effectiveAt: dueOn,
        status: "active",
        amount: money(amount, current.amount.currency),
        cadenceKind: current.cadenceKind,
        reason,
        provenance,
        supersedesTermsId: current.id,
        ...(lawEffectStamps ? { lawEffectStamps } : {}),
      },
    };
    const renewal = next.records.resourceFlowTerms.at(-1)!;
    const inclusionaryStamp = lawEffectStamps?.find(
      (stamp) => stamp.effectKind === "inclusionary-affordable-rent",
    );
    if (inclusionaryStamp) {
      next = yield* recordInclusionaryRentExposure(next, {
        stableKey: `inclusionary-rent:${renewal.id}`,
        personId: lease.leaseholderId,
        measureId: inclusionaryStamp.governingLawKey,
        rentMinor: amount,
        marketMinor: marketRentMinor(
          next,
          lease.town,
          row,
          lease.bedrooms,
          dueOn,
        ),
        sourceRecordId: renewal.id,
      });
    }
    next = yield {
      kind: "applyLawConsequences",
      input: {
        activity: "renewal",
        activityId: renewal.id,
        subjectIds: [lease.leaseholderId],
        onDate: dueOn,
        questionKey: RENT_STABILIZATION_QUESTION,
      },
    };
    const voucherQuestion = Object.values(next.policyCatalog.propositions).find(
      (question) => question.stableKey === HOUSING_VOUCHER_QUESTION,
    );
    if (
      voucherQuestion &&
      lawInForce(
        next,
        NATIONAL_ELECTION_JURISDICTION.id,
        voucherQuestion.id,
        dueOn,
      )?.origin === "enacted"
    )
      next = yield {
        kind: "applyLawConsequences",
        input: {
          activity: "renewal",
          activityId: renewal.id,
          subjectIds: [lease.leaseholderId],
          onDate: dueOn,
          questionKey: HOUSING_VOUCHER_QUESTION,
        },
      };
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
function filingsByLease(facts: RentEffectFacts): Map<string, Filing[]> {
  const byLease = new Map<string, Filing[]>();
  for (const event of facts.records.events) {
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
export const RENT_ARREARS_BASIS = "housing:rent-arrears" as const;
// STOPGAP: economy.rent-batch-cash-frontier
export function* payTownRent(
  facts: RentEffectFacts,
  dueOn: IsoDate,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const leases = townLeases(facts, dueOn).filter((lease) => !lease.ended);
  if (leases.length === 0) return facts;
  const leaseByFlow = new Map(leases.map((lease) => [lease.flow.id, lease]));
  const arrearsFlowOf = new Map<EntityId, ResourceFlow>();
  const arrearsKeys = new Map(
    leases.map((lease) => [`${lease.flow.stableKey}:arrears`, lease.flow.id]),
  );
  for (const flow of facts.records.resourceFlows) {
    const leaseFlowId = arrearsKeys.get(flow.stableKey);
    if (leaseFlowId) arrearsFlowOf.set(leaseFlowId, flow);
  }
  const arrearsFlowIds = new Map(
    [...arrearsFlowOf].map(([leaseFlowId, flow]) => [flow.id, leaseFlowId]),
  );
  const terms = termsByFlow(facts, new Set(leaseByFlow.keys()));
  const owedBefore = new Map<EntityId, number>();
  const already = new Set<string>();
  for (const outcome of facts.records.resourceTransferOutcomes) {
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
  let next = facts;
  const inputs: RecordResourceTransferOutcomeInput[] = [];
  const owedAfter = new Map<
    EntityId,
    {
      owed: number;
      rent: number;
    }
  >();
  for (const lease of leases) {
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
      const ready = yield* arrearsFlowOwing(
        next,
        lease,
        arrearsFlowOf.get(lease.flow.id),
        money(owed, currency),
        dueOn,
      );
      next = ready.facts;
      inputs.push(
        arrearsPayment(
          ready.arrears,
          money(owed, currency),
          toward,
          dueOn,
          `${ready.arrears.stableKey}:${dueOn}`,
        ),
      );
    }
    owedAfter.set(lease.flow.id, { owed: owed + rent - paid - toward, rent });
  }
  if (inputs.length === 0) return next;
  next = yield {
    kind: "recordResourceTransferOutcomes",
    input: inputs,
  };
  return yield* actOnArrears(next, leases, owedAfter, dueOn);
}
function* arrearsFlowOwing(
  facts: RentEffectFacts,
  lease: LeaseFacts,
  existing: ResourceFlow | undefined,
  owed: MoneyAmount,
  onDate: IsoDate,
): Generator<
  RentEffectRequest,
  {
    readonly facts: RentEffectFacts;
    readonly arrears: ResourceFlow;
  },
  RentEffectFacts
> {
  if (!existing) {
    const next = yield {
      kind: "createResourceFlow",
      input: {
        stableKey: `${lease.flow.stableKey}:arrears`,
        source: lease.flow.source,
        recipient: lease.flow.recipient,
        startsAt: onDate,
        amount: owed,
        cadenceKind: "schedule:monthly",
        basisKind: RENT_ARREARS_BASIS,
        basisReference: {
          kind: "housing",
          housingTenureId: lease.tenureId,
        },
        restrictionKind: null,
        jurisdictionId: lease.town,
        provenance: PROVENANCE,
      },
    };
    return { facts: next, arrears: next.records.resourceFlows.at(-1)! };
  }
  const owedTerms = resourceFlowTermsAt(facts, existing.id, {
    asOfDate: onDate,
    historySequenceExclusive: facts.records.nextSequence,
  });
  if (!owedTerms || owedTerms.amount.minorUnits === owed.minorUnits)
    return { facts, arrears: existing };
  return {
    facts: yield {
      kind: "recordResourceFlowTerms",
      input: {
        stableKey: `${existing.stableKey}:owed:${onDate}`,
        resourceFlowId: existing.id,
        effectiveAt: onDate,
        status: "active",
        amount: owed,
        cadenceKind: owedTerms.cadenceKind,
        reason: "Rent still owed from earlier months.",
        provenance: PROVENANCE,
        supersedesTermsId: owedTerms.id,
      },
    },
    arrears: existing,
  };
}
function arrearsPayment(
  arrears: ResourceFlow,
  owed: MoneyAmount,
  toward: number,
  onDate: IsoDate,
  stableKey: string,
): RecordResourceTransferOutcomeInput {
  return {
    stableKey,
    resourceFlowId: arrears.id,
    periodStartsAt: onDate,
    periodEndsAt: onDate,
    occurredAt: onDate,
    status: toward === owed.minorUnits ? "completed" : "partial",
    attemptedAmount: owed,
    transferredAmount: money(toward, owed.currency),
    reasonKind:
      toward === owed.minorUnits ? null : "capacity:insufficient-funds",
    note: "Toward rent owed from earlier months.",
    provenance: PROVENANCE,
  };
}
function* actOnArrears(
  facts: RentEffectFacts,
  leases: readonly LeaseFacts[],
  owedAfter: ReadonlyMap<
    EntityId,
    {
      owed: number;
      rent: number;
    }
  >,
  dueOn: IsoDate,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const filings = filingsByLease(facts);
  const played =
    facts.control.kind === "person" ? facts.control.personId : null;
  const members = householdMembers(facts, dueOn);
  let pay: ReadonlyMap<EntityId, number> | undefined;
  let next = facts;
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
        next = yield* rentEvent(
          next,
          lease,
          adults,
          dueOn,
          RENT_EVENTS.dismissed,
          {
            summary: `${landlordName(next, lease.flow.recipient)} dropped the eviction case against ${householdName(next, lease.householdId, true)} once the rent was paid.`,
          },
        );
        continue;
      }
      pay ??= monthlyPayByPerson(next, dueOn);
      const facts = evictionCaseFacts(
        next,
        lease,
        adults,
        owed,
        open.filedOn,
        dueOn,
        {
          played,
          pay,
        },
      );
      if (!facts?.judicialAuthority) continue;
      const filing = next.records.events.find(
        (event) =>
          event.stableKey ===
          `${lease.flow.stableKey}:${RENT_EVENTS.filed}:${open.filedOn}`,
      );
      if (!filing) continue;
      const decision = decideEvictionCase(facts);
      const lawyer = facts.lawyer
        ? ` A lawyer represented them under ${facts.lawyer}.`
        : "";
      if (decision.outcome === "evicted") {
        next = yield* rentEvent(
          next,
          lease,
          adults,
          dueOn,
          RENT_EVENTS.evicted,
          {
            summary: `${householdName(next, lease.householdId)} was evicted from ${bedroomHome(lease)} for ${dollarsOf(owed.owed)} in unpaid rent: ${decision.reason(facts.court)}.${lawyer}`,
            lawEffectStamps: facts.lawEffectStamps,
            judicialAuthority: facts.judicialAuthority,
            filingEventId: filing.id,
          },
        );
        next = yield* endTenancy(next, lease, dueOn, "evicted", "Evicted.");
      } else {
        next = yield* rentEvent(
          next,
          lease,
          adults,
          dueOn,
          RENT_EVENTS.settled,
          {
            summary: `${householdName(next, lease.householdId)} kept ${bedroomHome(lease)}, still owing ${landlordName(next, lease.flow.recipient)} ${dollarsOf(owed.owed)}: ${decision.reason(facts.court)}.${lawyer}`,
            lawEffectStamps: facts.lawEffectStamps,
            judicialAuthority: facts.judicialAuthority,
            filingEventId: filing.id,
          },
        );
      }
      continue;
    }
    if (owed.owed < fileAtMonths(next, lease) * owed.rent) continue;
    const lastResolved = history.at(-1)?.resolvedOn ?? null;
    if (
      lastResolved !== null &&
      monthsBetween(lastResolved, dueOn) < EVICTION.quietMonths
    )
      continue;
    next = yield* rentEvent(next, lease, adults, dueOn, RENT_EVENTS.filed, {
      summary: `${landlordName(next, lease.flow.recipient)} filed to evict ${householdName(next, lease.householdId, true)} for ${dollarsOf(owed.owed)} in unpaid rent.`,
    });
    if (
      played !== null &&
      lease.leaseholderId === played &&
      adults.some((member) => member.id === played)
    )
      next = yield* recordEvictionNotice(next, lease, played, dueOn, owed.owed);
  }
  return next;
}
// STOPGAP: economy.rent-arrears-filing-thresholds
function fileAtMonths(facts: RentEffectFacts, lease: LeaseFacts): number {
  const landlord = lease.flow.recipient;
  return landlord.kind === "person" &&
    personTrait(facts, landlord.personId, "conflict").value < 0
    ? EVICTION.conciliatoryLandlordFilesAt
    : EVICTION.fileAtMonthsOwed;
}
export interface EvictionCaseFacts extends LawEffectStampedRecord {
  readonly judicialAuthority?: JudicialSeatHolder & {
    readonly courtId: string;
  };
  readonly monthsBehind: number;
  readonly landlordPursues: boolean;
  readonly tenantAnswers: boolean;
  readonly lawyer: string | null;
  readonly planCarried: boolean | null;
  readonly judgeLean: -1 | 0 | 1 | null;
  readonly court: string;
}
function trialJudge(
  facts: RentEffectFacts,
  town: EntityId,
  onDate: IsoDate,
):
  | (JudicialSeatHolder & {
      readonly courtId: string;
    })
  | null {
  const court = courtFor(facts, town, "local-general-trial", "civil");
  if (!court) return null;
  const courtId = court.courtId;
  for (const seat of seatsForCourt(facts, courtId, onDate)) {
    const holder = seatHolderAt(facts, seat.seatId, onDate);
    if (
      holder &&
      facts.people[holder.personId] &&
      !playerHandlesJudicialCase(facts, holder.personId, "civil")
    )
      return { ...holder, courtId };
  }
  return null;
}
// STOPGAP: economy.rent-case-trait-source
function evictionCaseFacts(
  facts: RentEffectFacts,
  lease: LeaseFacts,
  adults: readonly Member[],
  owed: {
    readonly owed: number;
    readonly rent: number;
  },
  filedOn: IsoDate,
  hearingOn: IsoDate,
  read: {
    readonly played: EntityId | null;
    readonly pay: ReadonlyMap<EntityId, number>;
  },
): EvictionCaseFacts | null {
  const monthsBehind = owed.rent > 0 ? owed.owed / owed.rent : 0;
  const landlord = lease.flow.recipient;
  const landlordPursues = !(
    landlord.kind === "person" &&
    personTrait(facts, landlord.personId, "conflict").value < 0 &&
    monthsBehind <= EVICTION.conciliatoryLandlordSettlesUpTo
  );
  const householdPay = adults.reduce(
    (sum, member) => sum + (read.pay.get(member.id) ?? 0),
    0,
  );
  const carried =
    owed.rent + owed.owed / EVICTION.planMonths <=
    householdPay * EVICTION.planLimitOfPay;
  let tenantAnswers: boolean;
  let planCarried: boolean | null;
  if (
    read.played !== null &&
    lease.leaseholderId === read.played &&
    facts.records.events.some(
      (event) => event.stableKey === evictionNoticeKey(lease, filedOn),
    )
  ) {
    const answer = evictionCaseAnswer(facts, read.played, filedOn);
    tenantAnswers = answer !== null;
    planCarried = answer === EVICTION_CASE_CHOICES.plan ? carried : null;
  } else {
    tenantAnswers =
      personTrait(facts, lease.leaseholderId, "reliability").value >= 0;
    planCarried = tenantAnswers && carried ? true : null;
  }
  const judge = trialJudge(facts, lease.town, hearingOn);
  if (!judge) return null;
  const conflict = personTrait(facts, judge.personId, "conflict").value;
  return {
    judicialAuthority: judge,
    monthsBehind,
    landlordPursues,
    tenantAnswers,
    lawyer: null,
    planCarried,
    judgeLean: conflict < 0 ? -1 : conflict > 0 ? 1 : 0,
    court: `Judge ${personName(facts, facts.people[judge.personId]!)}`,
  };
}
export function decideEvictionCase(facts: EvictionCaseFacts): {
  readonly outcome: "evicted" | "settled";
  readonly reason: (court: string) => string;
} {
  const lenient = facts.judgeLean === -1;
  if (!facts.landlordPursues)
    return {
      outcome: "settled",
      reason: () => "the landlord agreed to wait for the rent",
    };
  if (!facts.tenantAnswers)
    return {
      outcome: "evicted",
      reason: (court) =>
        `the tenant did not answer the case, and ${court} ruled for the landlord`,
    };
  if (facts.lawyer && facts.monthsBehind <= EVICTION.lawyerKeepsHomeUpTo)
    return {
      outcome: "settled",
      reason: () => "their lawyer settled the case",
    };
  if (facts.lawyer && facts.planCarried !== true)
    return {
      outcome: "evicted",
      reason: (court) =>
        `${court} found them too far behind to stay, even with a lawyer`,
    };
  if (facts.planCarried === true)
    return {
      outcome: "settled",
      reason: (court) =>
        `${court} accepted a plan to pay it off over ${EVICTION.planMonths} months`,
    };
  if (lenient && facts.monthsBehind <= EVICTION.conciliatoryJudgeGivesTimeUpTo)
    return {
      outcome: "settled",
      reason: (court) => `${court} gave them time to pay`,
    };
  return {
    outcome: "evicted",
    reason: (court) =>
      facts.planCarried === false
        ? `${court} found their pay could not carry the plan they offered`
        : `${court} ruled for the landlord`,
  };
}
function longDate(date: IsoDate): string {
  return new Date(`${date}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
function evictionNoticeKey(lease: LeaseFacts, filedOn: IsoDate): string {
  return `${lease.flow.stableKey}:eviction-notice:${filedOn}`;
}
function* recordEvictionNotice(
  facts: RentEffectFacts,
  lease: LeaseFacts,
  personId: EntityId,
  filedOn: IsoDate,
  owedMinor: number,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const stableKey = evictionNoticeKey(lease, filedOn);
  if (facts.records.events.some((event) => event.stableKey === stableKey))
    return facts;
  const law = housingLawYes(
    facts,
    lease.town,
    RENT_LAW_KEYS.rightToCounsel,
    filedOn,
  );
  const summary =
    `${landlordName(facts, lease.flow.recipient)} has gone to court to evict you from ${bedroomHome(lease)} for ${dollarsOf(owedMinor)} in unpaid rent. The case will be decided on ${longDate(firstOfNextMonth(filedOn))}.` +
    (law
      ? ` Under ${measureDesignation(facts, law.measureId)}, a lawyer will represent you if you take one.`
      : "");
  const next = yield {
    kind: "recordWorldEvent",
    input: {
      stableKey,
      type: "life.eviction-notice",
      occurredAt: filedOn,
      recordedAt: filedOn,
      jurisdictionId: lease.town,
      involvedEntityIds: [personId, lease.householdId],
      participants: [
        { personId, role: "focus:subject", detail: "Taken to court over rent" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        EVICTION_CASE_TAG,
        TOWN_RENT_VERSION,
        `${LEASE_TAG_PREFIX}${lease.flow.id}`,
      ],
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
  return yield {
    kind: "recordEventKnowledge",
    input: {
      stableKey: `${stableKey}:knowledge`,
      personId,
      eventId: next.records.events.at(-1)!.id,
      learnedAt: filedOn,
      believedSummary: summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    },
  };
}
function evictionCaseAnswer(
  facts: RentEffectFacts,
  personId: EntityId,
  filedOn: IsoDate,
): EvictionCaseChoice | null {
  const choices = new Set<string>(Object.values(EVICTION_CASE_CHOICES));
  let answer: EvictionCaseChoice | null = null;
  for (const event of facts.records.events) {
    if (event.occurredAt < filedOn) continue;
    if (!event.tags.includes(EVICTION_CASE_ANSWER)) continue;
    if (!event.involvedEntityIds.includes(personId)) continue;
    const choice = event.tags
      .find((tag) => tag.startsWith("choice."))
      ?.slice("choice.".length);
    if (choice && choices.has(choice)) answer = choice as EvictionCaseChoice;
  }
  return answer;
}
function leaseHeldBy(
  facts: RentEffectFacts,
  personId: EntityId,
  onDate: IsoDate,
): LeaseFacts | null {
  return (
    townLeases(facts, onDate).find(
      (lease) => !lease.ended && lease.leaseholderId === personId,
    ) ?? null
  );
}
function rentOwedMinor(facts: RentEffectFacts, lease: LeaseFacts): number {
  const arrears = facts.records.resourceFlows.find(
    (flow) => flow.stableKey === `${lease.flow.stableKey}:arrears`,
  );
  let owed = 0;
  for (const outcome of facts.records.resourceTransferOutcomes) {
    if (outcome.resourceFlowId === lease.flow.id) {
      if (outcome.status !== "blocked")
        owed +=
          outcome.attemptedAmount.minorUnits -
          outcome.transferredAmount.minorUnits;
    } else if (arrears && outcome.resourceFlowId === arrears.id)
      owed -= outcome.transferredAmount.minorUnits;
  }
  return Math.max(0, owed);
}
export function canPayRentOwed(
  facts: RentEffectFacts,
  personId: EntityId,
  onDate: IsoDate = facts.currentDate,
): boolean {
  const lease = leaseHeldBy(facts, personId, onDate);
  const terms = lease ? resourceFlowTermsAt(facts, lease.flow.id) : null;
  if (!lease || !terms) return false;
  const owed = rentOwedMinor(facts, lease);
  const position = resourcePositionAt(
    facts,
    { kind: "person", personId },
    terms.amount.currency,
  );
  return (
    owed > 0 &&
    position != null &&
    position.liquidBalance.minorUnits >= owed &&
    !arrearsPaidOn(facts, lease, onDate)
  );
}
function arrearsPaidOn(
  facts: RentEffectFacts,
  lease: LeaseFacts,
  onDate: IsoDate,
): boolean {
  const arrears = facts.records.resourceFlows.find(
    (flow) => flow.stableKey === `${lease.flow.stableKey}:arrears`,
  );
  return (
    arrears !== undefined &&
    facts.records.resourceTransferOutcomes.some(
      (outcome) =>
        outcome.resourceFlowId === arrears.id &&
        outcome.periodStartsAt === onDate,
    )
  );
}
// STOPGAP: economy.rent-recovery-and-move
export function* payRentOwed(
  facts: RentEffectFacts,
  personId: EntityId,
  onDate: IsoDate = facts.currentDate,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const lease = leaseHeldBy(facts, personId, onDate);
  if (!lease) return facts;
  const owed = rentOwedMinor(facts, lease);
  const terms = resourceFlowTermsAt(facts, lease.flow.id);
  if (owed === 0 || !terms || arrearsPaidOn(facts, lease, onDate)) return facts;
  const position = resourcePositionAt(
    facts,
    { kind: "person", personId },
    terms.amount.currency,
  );
  if (!position) return facts;
  const toward = Math.min(owed, Math.max(0, position.liquidBalance.minorUnits));
  if (toward === 0) return facts;
  const owedMoney = money(owed, terms.amount.currency);
  const ready = yield* arrearsFlowOwing(
    facts,
    lease,
    facts.records.resourceFlows.find(
      (flow) => flow.stableKey === `${lease.flow.stableKey}:arrears`,
    ),
    owedMoney,
    onDate,
  );
  const paid = yield {
    kind: "recordResourceTransferOutcomes",
    input: [
      arrearsPayment(
        ready.arrears,
        owedMoney,
        toward,
        onDate,
        `${ready.arrears.stableKey}:paid:${onDate}`,
      ),
    ],
  };
  const open = filingsByLease(paid).get(lease.flow.id)?.at(-1);
  if (toward < owed || !open || open.resolvedOn !== null) return paid;
  const adults = (
    householdMembers(paid, onDate).get(lease.householdId) ?? []
  ).filter((member) => member.age >= 18);
  return yield* rentEvent(paid, lease, adults, onDate, RENT_EVENTS.dismissed, {
    summary: `${landlordName(paid, lease.flow.recipient)} dropped the eviction case against ${householdName(paid, lease.householdId, true)} once the rent was paid.`,
  });
}
export function* moveOutBeforeHearing(
  facts: RentEffectFacts,
  personId: EntityId,
  onDate: IsoDate = facts.currentDate,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const lease = leaseHeldBy(facts, personId, onDate);
  if (!lease) return facts;
  const adults = (
    householdMembers(facts, onDate).get(lease.householdId) ?? []
  ).filter((member) => member.age >= 18);
  const owed = rentOwedMinor(facts, lease);
  const next = yield* rentEvent(
    facts,
    lease,
    adults,
    onDate,
    RENT_EVENTS.movedOut,
    {
      summary: `${householdName(facts, lease.householdId)} moved out of ${bedroomHome(lease)} before the eviction hearing, and ${landlordName(facts, lease.flow.recipient)} dropped the case. ${dollarsOf(owed)} in rent is still owed.`,
    },
  );
  return yield* endTenancy(
    next,
    lease,
    onDate,
    "moved-out",
    "Moved out before the eviction hearing.",
  );
}
function bedroomHome(lease: LeaseFacts): string {
  return lease.bedrooms === 0
    ? "their efficiency"
    : `their ${lease.bedrooms}-bedroom home`;
}
function householdName(
  facts: RentEffectFacts,
  householdId: EntityId,
  midSentence = false,
): string {
  const record = facts.records.households.find((row) => row.id === householdId);
  if (record && /'s household$/.test(record.label)) return record.label;
  const name = record
    ? `The ${record.label.replace(/ household$/, "")} household`
    : "A household";
  return midSentence ? `${name[0]!.toLowerCase()}${name.slice(1)}` : name;
}
// STOPGAP: economy.rent-native-English
function* rentEvent(
  facts: RentEffectFacts,
  lease: LeaseFacts,
  adults: readonly Member[],
  onDate: IsoDate,
  type: (typeof RENT_EVENTS)[keyof typeof RENT_EVENTS],
  text: {
    readonly summary: string;
    readonly judicialAuthority?: EvictionCaseFacts["judicialAuthority"];
    readonly filingEventId?: EntityId;
  } & LawEffectStampedRecord,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const stableKey = `${lease.flow.stableKey}:${type}:${onDate}`;
  if (facts.records.events.some((event) => event.stableKey === stableKey))
    return facts;
  const people = adults.map((member) => member.id);
  const landlord =
    lease.flow.recipient.kind === "person"
      ? [lease.flow.recipient.personId]
      : [];
  const authority =
    type === RENT_EVENTS.evicted || type === RENT_EVENTS.settled
      ? text.judicialAuthority
      : undefined;
  let next = yield {
    kind: "recordWorldEvent",
    input: {
      stableKey,
      type,
      occurredAt: onDate,
      recordedAt: onDate,
      jurisdictionId: lease.town,
      involvedEntityIds: [
        lease.householdId,
        ...people,
        ...landlord,
        ...(authority
          ? [
              authority.personId,
              lease.flow.id,
              lease.obligationId,
              lease.tenureId,
              lease.dwellingId,
            ]
          : []),
      ],
      participants: [
        ...people.map((personId) => ({
          personId,
          role: "focus:subject" as const,
          detail: text.summary,
        })),
        ...(authority
          ? [
              {
                personId: authority.personId,
                role: "focus:judge" as const,
                detail: text.summary,
              },
            ]
          : []),
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        "life.home",
        TOWN_RENT_VERSION,
        `${LEASE_TAG_PREFIX}${lease.flow.id}`,
        ...(authority
          ? [
              `justice:court-record:${authority.courtId}`,
              `justice:seat-record:${authority.seatId}`,
              `justice:tenure-record:${authority.tenureId}`,
              ...(text.filingEventId
                ? [`justice:filing-record:${text.filingEventId}`]
                : []),
            ]
          : []),
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
    },
  };
  const eventId = next.records.events.at(-1)!.id;
  if (text.lawEffectStamps?.length) {
    const event = next.records.events.at(-1)!;
    const stampedEvent: typeof event & LawEffectStampedRecord = {
      ...event,
      lawEffectStamps: text.lawEffectStamps.map((stamp) => ({
        ...stamp,
        appliedAt: onDate,
        sourceRecordIds: [...(stamp.sourceRecordIds ?? []), eventId],
      })),
    };
    next = yield {
      kind: "stampEvent",
      record: stampedEvent,
    };
  }
  for (const personId of [...people, ...landlord])
    next = yield {
      kind: "recordEventKnowledge",
      input: {
        stableKey: `${stableKey}:knowledge:${personId}`,
        personId,
        eventId,
        learnedAt: onDate,
        believedSummary: text.summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      },
    };
  return next;
}
function* endTenancy(
  facts: RentEffectFacts,
  lease: LeaseFacts,
  onDate: IsoDate,
  context: "evicted" | "moved-out",
  reason: string,
): Generator<RentEffectRequest, RentEffectFacts, RentEffectFacts> {
  const h = facts.records;
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
  let next = facts;
  if (tenureState && tenureState.status === "active")
    next = yield {
      kind: "recordHousingTenureState",
      input: {
        stableKey: `${lease.flow.stableKey}:${context}:tenure`,
        housingTenureId: lease.tenureId,
        effectiveAt: onDate,
        status: "ended",
        context,
        provenance,
        supersedesStateId: tenureState.id,
      },
    };
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
    next = yield {
      kind: "recordDwellingOccupancyState",
      input: {
        stableKey: `${lease.flow.stableKey}:${context}:occupancy:${occupancy.id}`,
        dwellingOccupancyId: occupancy.id,
        effectiveAt: onDate,
        status: "ended",
        residenceRole: state.residenceRole,
        kind: state.kind,
        reason,
        provenance,
        supersedesStateId: state.id,
      },
    };
  }
  return yield* endTownLeases(next, onDate, lease.flow.id);
}
export interface TownRentSnapshot {
  readonly onDate: IsoDate;
  readonly leases: number;
  readonly byLandlord: Readonly<Record<LandlordKind, number>>;
  readonly byRegime: Readonly<Record<RentRegime, number>>;
  readonly medianRentMinor: number | null;
  readonly medianPaidMinor: number | null;
  readonly medianBurden: number | null;
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
export function townRentSnapshot(
  facts: RentEffectFacts,
  town: EntityId,
  onDate: IsoDate,
): TownRentSnapshot {
  const leases = townLeases(facts, onDate).filter(
    (lease) => !lease.ended && lease.town === town,
  );
  const ids = new Set(leases.map((lease) => lease.flow.id));
  const terms = termsByFlow(facts, ids);
  const outcomes = new Map<
    EntityId,
    {
      paid: number;
      status: string;
    }
  >();
  for (const outcome of facts.records.resourceTransferOutcomes)
    if (ids.has(outcome.resourceFlowId) && outcome.periodStartsAt === onDate)
      outcomes.set(outcome.resourceFlowId, {
        paid: outcome.transferredAmount.minorUnits,
        status: outcome.status,
      });
  const members = householdMembers(facts, onDate);
  const pay = monthlyPayByPerson(facts, onDate);
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
    byLandlord[landlordKindOf(facts, lease.flow.recipient)] += 1;
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
const PERIODS_PER_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
export type RecordedPayBasis = "compensation" | "work";
export function annualizedRecordedPayMinor(
  amountMinor: number,
  cadenceKind: string,
): number | null {
  const match = /(weekly|biweekly|semimonthly|monthly)/.exec(cadenceKind);
  const perYear = match ? PERIODS_PER_YEAR[match[1]!] : undefined;
  return perYear ? amountMinor * perYear : null;
}
const MONTHLY_PAY_CACHE = new WeakMap<
  RentEffectFacts["records"]["resourceFlowTerms"],
  {
    flows: RentEffectFacts["records"]["resourceFlows"];
    onDate: IsoDate;
    pay: ReadonlyMap<EntityId, number>;
  }
>();
export function recordedMonthlyPayByPerson(
  facts: RentEffectFacts,
  onDate: IsoDate,
  basis: RecordedPayBasis = "compensation",
): ReadonlyMap<EntityId, number> {
  const cached =
    basis === "compensation"
      ? MONTHLY_PAY_CACHE.get(facts.records.resourceFlowTerms)
      : undefined;
  if (cached?.flows === facts.records.resourceFlows && cached.onDate === onDate)
    return cached.pay;
  const recipients = new Map<EntityId, EntityId>();
  for (const flow of facts.records.resourceFlows)
    if (
      (basis === "work"
        ? flow.basisKind === "compensation:work"
        : flow.basisKind.startsWith("compensation:")) &&
      flow.recipient.kind === "person"
    )
      recipients.set(flow.id, flow.recipient.personId);
  const latest = new Map<
    EntityId,
    (typeof facts.records.resourceFlowTerms)[number]
  >();
  for (const row of facts.records.resourceFlowTerms)
    if (recipients.has(row.resourceFlowId) && row.effectiveAt <= onDate)
      latest.set(row.resourceFlowId, row);
  const byPerson = new Map<EntityId, number>();
  for (const [flowId, row] of latest) {
    if (row.status !== "active") continue;
    const annualMinor = annualizedRecordedPayMinor(
      row.amount.minorUnits,
      row.cadenceKind,
    );
    if (annualMinor === null) continue;
    const personId = recipients.get(flowId)!;
    byPerson.set(personId, (byPerson.get(personId) ?? 0) + annualMinor / 12);
  }
  if (basis === "compensation")
    MONTHLY_PAY_CACHE.set(facts.records.resourceFlowTerms, {
      flows: facts.records.resourceFlows,
      onDate,
      pay: byPerson,
    });
  return byPerson;
}
