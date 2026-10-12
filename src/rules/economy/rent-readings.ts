/** Complete retained HUD/family/rent/law/price and recorded household housing/pay readers. */
import { addDays, ageOnDate } from "../../simulation/dates";
import {
  homePriceLevel as houseLevel,
  type HousingPriceFacts,
} from "./housing-prices";
import {
  lawInForce as legalNow,
  lawInForceAtStart as legalStart,
  type LawFacts,
} from "../laws/dated-law";
import {
  macroConditionsAt as macroNow,
  macroMonthHistory as macroHistory,
} from "./macro-readings";
import {
  TOWN_RENT_COUNTIES,
  TOWN_RENT_STATES,
  TOWN_RENT_TOWNS,
  TOWN_RENT_META,
} from "../../simulation/living-world/town-rent.generated";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type {
  World,
  EntityId,
  IsoDate,
  ResourceFlow,
  ResourceFlowTermsRecord,
} from "../../simulation/types";
import type { MacroScopeKey } from "../../simulation/macro-economy/types";
export interface RentReadingFacts {
  readonly currentDate: IsoDate;
  readonly records: World["history"];
  readonly people: World["people"];
  readonly policyCatalog: World["policyCatalog"];
  readonly macroEconomy: World["macroEconomy"];
  readonly laws: LawFacts;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly counties: ReadonlyMap<string, readonly string[]>;
}
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key)) throw Error("Missing raw rent source receipt: " + key);
  return map.get(key)!;
}
function lifePlaceByJurisdictionId(facts: RentReadingFacts, id: EntityId) {
  return receipt(facts.places, id);
}
function countyGeoidsForPlace(facts: RentReadingFacts, geoid: string) {
  return receipt(facts.counties, geoid);
}
function lawInForce(
  facts: RentReadingFacts,
  town: EntityId,
  q: EntityId,
  date: IsoDate,
) {
  return legalNow(facts.laws, town, q, date);
}
function lawInForceAtStart(
  facts: RentReadingFacts,
  town: EntityId,
  q: EntityId,
  date: IsoDate,
) {
  return legalStart(facts.laws, town, q, date);
}
function homePriceLevel(
  facts: RentReadingFacts,
  town: EntityId,
  date: IsoDate,
) {
  const housing: HousingPriceFacts = {
    months: facts.macroEconomy?.months ?? [],
    laws: facts.laws,
  };
  return houseLevel(housing, town, date);
}
const macroScopeForJurisdiction = (id: string): MacroScopeKey =>
  ("jurisdiction:" + id) as MacroScopeKey;
function macroConditionsAt(
  facts: RentReadingFacts,
  scope: MacroScopeKey,
  date: IsoDate,
) {
  return macroNow(
    { months: facts.macroEconomy?.months ?? [], releases: [] },
    scope,
    date,
  );
}
function macroMonthHistory(
  facts: RentReadingFacts,
  scope: MacroScopeKey,
  date: IsoDate,
) {
  return macroHistory(
    { months: facts.macroEconomy?.months ?? [], releases: [] },
    scope,
    date,
  );
}
// STOPGAP: economy.rent-hud-weighted-source
export type RentRegime = "market" | "public" | "affordable";
export const RENT_LAW_KEYS = {
  rentStabilization: "us-policy-positions:housing-land-use.rent-stabilization",
  inclusionary: "us-policy-positions:housing-land-use.inclusionary-requirement",
  rightToCounsel:
    "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
} as const;
export const AFFORDABLE_RENT_OF_INCOME = 0.3;
export const AFFORDABLE_LIMIT_OF_VERY_LOW = 1.2;
export const HUD_FAMILY_SIZE_FACTORS = [
  0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32,
] as const;
export const RENT_STABILIZATION_CITYWIDE = {
  rentRise: 0.051,
  actsAfterDays: 365,
} as const;
// STOPGAP: economy.rent-law-citywide-delay
export function rentLawLevel(
  sourceFacts: RentReadingFacts,
  town: EntityId,
  date: IsoDate,
): number {
  const id = propositionId(sourceFacts, RENT_LAW_KEYS.rentStabilization);
  if (!id) return 1;
  const law = lawInForce(sourceFacts, town, id, date);
  if (
    law?.origin !== "enacted" ||
    law.operativeAt > addDays(date, -RENT_STABILIZATION_CITYWIDE.actsAfterDays)
  )
    return 1;
  const now = law.answer === "yes";
  const before = lawInForceAtStart(sourceFacts, town, id, date) === "yes";
  if (now === before) return 1;
  return now
    ? 1 + RENT_STABILIZATION_CITYWIDE.rentRise
    : 1 / (1 + RENT_STABILIZATION_CITYWIDE.rentRise);
}
export function marketRentLevel(
  sourceFacts: RentReadingFacts,
  town: EntityId,
  date: IsoDate,
): number {
  return (
    homePriceLevel(sourceFacts, town, date) *
    rentLawLevel(sourceFacts, town, date)
  );
}
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
export function hudRentRowFor(
  sourceFacts: RentReadingFacts,
  jurisdictionId: EntityId,
): HudRentRow | null {
  const place = lifePlaceByJurisdictionId(sourceFacts, jurisdictionId);
  const geoid =
    place?.sourceGeoid && /^\d{7}$/.test(place.sourceGeoid)
      ? place.sourceGeoid
      : null;
  if (!place) return null;
  loadRows();
  const state = place.stateJurisdictionKey?.replace(/^US-/, "") ?? null;
  const countiesForPlace = geoid
    ? countyGeoidsForPlace(sourceFacts, geoid)
    : [];
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
// STOPGAP: economy.rent-affordable-family-factors
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
// STOPGAP: economy.rent-price-initial-index
export function rentPriceLevel(
  sourceFacts: RentReadingFacts,
  town: EntityId,
  date: IsoDate,
): number {
  const scope = macroScopeForJurisdiction(town);
  const now =
    macroConditionsAt(sourceFacts, scope, date) ??
    macroConditionsAt(sourceFacts, "national", date);
  const base = macroMonthHistory(
    sourceFacts,
    "national",
    sourceFacts.currentDate,
  )[0];
  if (!now || !base || base.priceIndex <= 0) return 1;
  return now.priceIndex / base.priceIndex;
}
export function marketRentMinor(
  sourceFacts: RentReadingFacts,
  town: EntityId,
  row: HudRentRow,
  bedrooms: number,
  date: IsoDate,
): number {
  const fmr = row.rents[Math.max(0, Math.min(4, bedrooms))]!;
  return Math.round(fmr * marketRentLevel(sourceFacts, town, date)) * 100;
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
  sourceFacts: RentReadingFacts,
  onDate: IsoDate = sourceFacts.currentDate,
) {
  const h = sourceFacts.records;
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
  sourceFacts: RentReadingFacts,
  ids: ReadonlySet<EntityId>,
): Map<EntityId, ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, ResourceFlowTermsRecord[]>();
  for (const record of sourceFacts.records.resourceFlowTerms) {
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
// STOPGAP: economy.rent-household-plain-date-frontier
function householdMembers(
  sourceFacts: RentReadingFacts,
  onDate: IsoDate,
): Map<EntityId, Member[]> {
  const h = sourceFacts.records;
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
    const person = sourceFacts.people[membership.personId];
    if (!person || dead.has(person.id)) continue;
    const list = members.get(membership.householdId) ?? [];
    list.push({ id: person.id, age: ageOnDate(person.birthDate, onDate) });
    members.set(membership.householdId, list);
  }
  return members;
}
export function monthlyPayByPerson(
  sourceFacts: RentReadingFacts,
  onDate: IsoDate,
): ReadonlyMap<EntityId, number> {
  return recordedMonthlyPayByPerson(sourceFacts, onDate, "work");
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
function propositionId(
  sourceFacts: RentReadingFacts,
  key: string,
): EntityId | null {
  return (
    Object.values(sourceFacts.policyCatalog?.propositions ?? {}).find(
      (definition) => definition.stableKey === key,
    )?.id ?? null
  );
}
export interface HouseholdHousingFacts {
  readonly members: number;
  readonly payMinor: number | null;
  readonly rentMinor: number | null;
}
export function householdHousingFacts(
  sourceFacts: RentReadingFacts,
  onDate: IsoDate,
): Map<EntityId, HouseholdHousingFacts> {
  const members = householdMembers(sourceFacts, onDate);
  const pay = monthlyPayByPerson(sourceFacts, onDate);
  const leases = townLeases(sourceFacts, onDate).filter(
    (lease) => !lease.ended && lease.flow.startsAt <= onDate,
  );
  const terms = termsByFlow(
    sourceFacts,
    new Set(leases.map((lease) => lease.flow.id)),
  );
  const rentOf = new Map<EntityId, number>();
  for (const lease of leases) {
    const current = termsOn(terms.get(lease.flow.id) ?? [], onDate);
    if (current?.status === "active")
      rentOf.set(lease.householdId, current.amount.minorUnits);
  }
  const facts = new Map<EntityId, HouseholdHousingFacts>();
  for (const [householdId, list] of members)
    facts.set(householdId, {
      members: list.length,
      payMinor: householdMonthlyIncome(list, pay),
      rentMinor: rentOf.get(householdId) ?? null,
    });
  return facts;
}
// STOPGAP: economy.rent-renewal-native-English
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
  RentReadingFacts["records"]["resourceFlowTerms"],
  {
    flows: RentReadingFacts["records"]["resourceFlows"];
    onDate: IsoDate;
    pay: ReadonlyMap<EntityId, number>;
  }
>();
export function recordedMonthlyPayByPerson(
  sourceFacts: RentReadingFacts,
  onDate: IsoDate,
  basis: RecordedPayBasis = "compensation",
): ReadonlyMap<EntityId, number> {
  const cached =
    basis === "compensation"
      ? MONTHLY_PAY_CACHE.get(sourceFacts.records.resourceFlowTerms)
      : undefined;
  if (
    cached?.flows === sourceFacts.records.resourceFlows &&
    cached.onDate === onDate
  )
    return cached.pay;
  const recipients = new Map<EntityId, EntityId>();
  for (const flow of sourceFacts.records.resourceFlows)
    if (
      (basis === "work"
        ? flow.basisKind === "compensation:work"
        : flow.basisKind.startsWith("compensation:")) &&
      flow.recipient.kind === "person"
    )
      recipients.set(flow.id, flow.recipient.personId);
  const latest = new Map<
    EntityId,
    (typeof sourceFacts.records.resourceFlowTerms)[number]
  >();
  for (const row of sourceFacts.records.resourceFlowTerms)
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
    MONTHLY_PAY_CACHE.set(sourceFacts.records.resourceFlowTerms, {
      flows: sourceFacts.records.resourceFlows,
      onDate,
      pay: byPerson,
    });
  return byPerson;
}
