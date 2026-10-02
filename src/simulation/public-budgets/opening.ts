import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import acsPlaces from "../../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import acsTowns from "../../../data/research/money/place-towns-acs-2024.json" with { type: "json" };
import {
  allGovernmentUnits,
  countyGeoidsForPlace,
  countyGovernmentUnit,
  governmentUnitsForPlace,
  governmentUnitsForState,
  type GovernmentUnitIdentity,
} from "../government-units";
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../life-places";
import {
  municipalGovernmentForPlaceGeoid,
  primaryReading,
} from "../municipal-government";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { placePopulation } from "../nationwide-world/place-population";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";
import {
  openingFundedRatio,
  openingLiabilityToSpending,
  openingPaidShare,
  pensionFlows,
  pensionPayment,
} from "./pension-share";
import { reserveRule } from "./reserve-rule";
import {
  budgetLawReadings,
  fiscalYearContaining,
  nominalEconomyIndex,
} from "./fiscal";
import {
  DEFAULT_LOCAL_INTEREST_RATE,
  DEFAULT_STATE_INTEREST_RATE,
  LOCAL_PROGRAM_SPLIT,
  LOCAL_REVENUE_RULE,
  PENSION,
} from "./rules";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PROTECTED_PROGRAMS,
  sum,
  type AdoptedBudget,
  type BudgetLevel,
  type PensionRecord,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

/**
 * THE OPENING DRAW. Each government starts from research:
 *
 * 1. A state opens at its Census 2022 state-government figures per
 *    resident times its BEA 2024 population, carried forward by the measured
 *    calibration factor (`public-budget-bases.json`). D.C.'s Census "state"
 *    column is empty, so the District reads the local column whole.
 * 2. A territory opens from its NASBO totals: one revenue line whose source is
 *    unknown and one program line whose split is unknown.
 * 3. A county or city takes its PLACEHOLDER share of its state's local
 *    figures per resident (`rules.ts`), times its own population.
 * 4. A state's opening balance and reserve are NASBO's fiscal 2026 estimates;
 *    a local government's are its state's shares of spending (PLACEHOLDER).
 *
 * A figure read for the government itself (a state's Census column, a
 * territory's NASBO totals) opens exactly as read. An estimate from an
 * average (a county's or city's share, an unsurveyed territory) opens with a
 * per-world spread around it, so two worlds differ where the game has no
 * figure of its own (Lamontae, September 26, 2026: real data calibrates, the
 * game makes its own; September 28: an estimate starts from the real average
 * with a spread). A world without a seed (a fixture) takes every figure as is.
 */

interface PerResident {
  readonly revenue: Readonly<Record<string, number>>;
  readonly spending: Readonly<Record<string, number>>;
  readonly debt: number;
}

interface PlaceBase {
  readonly name: string;
  readonly fiscalYearStart: string | null;
  readonly budgetCycle: string | null;
  readonly generalFundFY2026Millions: {
    readonly revenues: number | null;
    readonly expenditures: number | null;
    readonly endingBalance: number | null;
    readonly rainyDayFundBalance: number | null;
  };
  readonly population2024?: number | null;
  readonly state?: PerResident;
  readonly local?: PerResident;
  readonly territoryAllFundsSpendingFY2025Millions?: number | null;
  readonly islandAreaPopulation2020?: number;
  readonly puertoRicoPopulation2025?: number;
}

const PLACES = bases.places as unknown as Readonly<Record<string, PlaceBase>>;
const COUNTY_POPULATION = bases.countyPopulation2024 as Readonly<
  Record<string, number>
>;
export const BUDGET_CALIBRATION = bases.calibration.factor;

/**
 * The states whose Census state-government column is empty because one
 * government is both their state and their local government (the District of
 * Columbia): their budget reads the local-government column, and their one
 * town is that same government. Read from the data, never named in logic.
 */
const STATE_IS_LOCAL: ReadonlySet<string> = new Set(
  Object.entries(PLACES)
    .filter(
      ([, place]) =>
        place.state &&
        place.local &&
        [
          ...Object.values(place.state.revenue),
          ...Object.values(place.state.spending),
        ].every((value) => value === 0),
    )
    .map(([key]) => key),
);

/**
 * The median rainy-day balance as a share of general-fund spending, fiscal
 * 2026, over the states NASBO reports both for: what a government NASBO has
 * no balance for opens with, ESTIMATED FROM AVERAGE.
 */
const MEDIAN_RAINY_DAY_SHARE = (() => {
  const shares = Object.values(PLACES)
    .filter(
      (place) =>
        place.state &&
        place.generalFundFY2026Millions.rainyDayFundBalance !== null &&
        place.generalFundFY2026Millions.expenditures,
    )
    .map(
      (place) =>
        place.generalFundFY2026Millions.rainyDayFundBalance! /
        place.generalFundFY2026Millions.expenditures!,
    )
    .sort((a, b) => a - b);
  const middle = Math.floor(shares.length / 2);
  return shares.length % 2
    ? shares[middle]!
    : (shares[middle - 1]! + shares[middle]!) / 2;
})();

/**
 * An island area NASBO does not survey (American Samoa, the Northern Mariana
 * Islands) opens ESTIMATED FROM AVERAGE: the island areas NASBO does survey
 * (Guam, the U.S. Virgin Islands), averaged per resident over the Census
 * Bureau's 2020 Island Areas populations (Claude CTO, September 28, 2026,
 * 10:32 p.m. EDT: no value is left unknown).
 */
const ISLAND_AREA_AVERAGE = (() => {
  const peers = Object.values(PLACES).filter(
    (place) =>
      place.islandAreaPopulation2020 &&
      place.territoryAllFundsSpendingFY2025Millions &&
      place.generalFundFY2026Millions.revenues &&
      place.generalFundFY2026Millions.expenditures,
  );
  const mean = (values: readonly number[]) => sum(values) / values.length;
  const shareOf = (value: number | null, place: PlaceBase) =>
    (value ?? 0) / place.generalFundFY2026Millions.expenditures!;
  return {
    peers: peers.map((place) => place.name),
    spendingPerResident: mean(
      peers.map(
        (place) =>
          (place.territoryAllFundsSpendingFY2025Millions! * 1_000_000) /
          place.islandAreaPopulation2020!,
      ),
    ),
    revenueToSpending: mean(
      peers.map((place) =>
        shareOf(place.generalFundFY2026Millions.revenues, place),
      ),
    ),
    balanceShare: mean(
      peers.map((place) =>
        shareOf(place.generalFundFY2026Millions.endingBalance, place),
      ),
    ),
    reserveShare: mean(
      peers.map((place) =>
        shareOf(place.generalFundFY2026Millions.rainyDayFundBalance, place),
      ),
    ),
  };
})();

/**
 * Local-government finances for a place whose state has none in Census
 * (Puerto Rico): ESTIMATED FROM AVERAGE, the Census 2022 local-government
 * figures per resident of the 50 states and D.C., weighted by their BEA 2024
 * populations (Claude CTO, September 28, 2026, 10:32 p.m. EDT).
 */
const NATIONAL_LOCAL_AVERAGE: PerResident = (() => {
  const peers = Object.values(PLACES).filter(
    (place) => place.local && (place.population2024 ?? 0) > 0,
  );
  const people = sum(peers.map((place) => place.population2024!));
  const average = (read: (local: PerResident) => number) =>
    sum(peers.map((place) => read(place.local!) * place.population2024!)) /
    people;
  const keys = (
    pick: (local: PerResident) => Readonly<Record<string, number>>,
  ) => [...new Set(peers.flatMap((place) => Object.keys(pick(place.local!))))];
  return {
    revenue: Object.fromEntries(
      keys((local) => local.revenue).map((key) => [
        key,
        average((local) => local.revenue[key] ?? 0),
      ]),
    ),
    spending: Object.fromEntries(
      keys((local) => local.spending).map((key) => [
        key,
        average((local) => local.spending[key] ?? 0),
      ]),
    ),
    debt: average((local) => local.debt),
  };
})();

/**
 * Places the Census 2025 estimates leave out (census-designated places and
 * Puerto Rico): the ACS 2020-2024 five-year population.
 */
const ACS_PLACE_POPULATION = acsPlaces.places as Readonly<
  Record<string, number>
>;

/** Each such place's residents by county (ACS 2020-2024), largest first. */
const ACS_PLACE_COUNTIES = acsPlaces.placeCounties as unknown as Readonly<
  Record<string, readonly (readonly [string, number])[]>
>;

/** Puerto Rico's municipios, which the BEA county figures leave out: ACS 2020-2024. */
const ACS_MUNICIPIO_POPULATION = acsPlaces.puertoRicoMunicipios as Readonly<
  Record<string, number>
>;

/**
 * Each place the Vintage 2025 estimates leave out whose county area has no
 * county government: its residents by county subdivision (ACS 2020-2024),
 * largest first, and each subdivision's population.
 */
const ACS_PLACE_TOWNS = acsTowns.placeTowns as unknown as Readonly<
  Record<string, readonly (readonly [string, number])[]>
>;
const ACS_TOWN_POPULATION = acsTowns.townPopulation as Readonly<
  Record<string, number>
>;

export interface BudgetCandidate {
  readonly key: string;
  readonly jurisdictionId: EntityId;
  readonly lawJurisdictionId: EntityId;
  readonly level: BudgetLevel;
  readonly name: string;
  readonly stateKey: string;
  readonly geoid: string | null;
}

/**
 * Every government the world holds: each state, D.C. and territory, each
 * county present, and each city present that has a government of its own. A
 * census-designated place present brings in the government that serves it
 * (`servingGovernment`): its county, municipio, New England town or
 * consolidated government; where the state serves it directly, the state's
 * budget is already held. The rest are listed with the reason they keep no
 * budget.
 */
export function budgetCandidates(world: World): {
  readonly candidates: readonly BudgetCandidate[];
  readonly unknown: PublicBudgetStore["unknown"];
} {
  const candidates: BudgetCandidate[] = [];
  const unknown: { key: string; jurisdictionId: EntityId; reason: string }[] =
    [];
  const stateIds = new Set<EntityId>();
  // A state that is also its own local government: its town is that same
  // government (question-authority), so its laws are read there.
  const stateTowns = new Map<string, EntityId>();
  for (const id of world.jurisdictionOrder ?? []) {
    const place = lifePlaceByJurisdictionId(id);
    const stateKey = place?.stateJurisdictionKey;
    if (stateKey && STATE_IS_LOCAL.has(stateKey) && place.scope !== "state")
      if (!stateTowns.has(stateKey)) stateTowns.set(stateKey, id);
  }
  const townIds = new Set(stateTowns.values());
  for (const usps of Object.keys(STATES)) {
    const key = `US-${usps}`;
    const jurisdiction = chiefExecutiveJurisdiction(usps);
    if (!jurisdiction) continue;
    stateIds.add(jurisdiction.id);
    candidates.push({
      key,
      jurisdictionId: jurisdiction.id,
      lawJurisdictionId: stateTowns.get(key) ?? jurisdiction.id,
      level: "state",
      name: STATES[usps]!.name,
      stateKey: key,
      geoid: null,
    });
  }
  for (const id of world.jurisdictionOrder ?? []) {
    if (stateIds.has(id) || id === NATIONAL_ELECTION_JURISDICTION.id) continue;
    if (townIds.has(id)) continue;
    const jurisdiction = world.jurisdictions[id];
    const place = lifePlaceByJurisdictionId(id);
    const stateKey = place?.stateJurisdictionKey ?? null;
    if (!jurisdiction || jurisdiction.kind === "state-placeholder") continue;
    if (place?.scope === "state") continue;
    const county = jurisdiction.kind === "census-county";
    const geoid = place?.sourceGeoid ?? null;
    if (!stateKey || !geoid) {
      unknown.push({
        key: `jurisdiction:${id}`,
        jurisdictionId: id,
        reason:
          "No research identity (a Census code and a state) to draw a budget from.",
      });
      continue;
    }
    if (county || governmentUnitsForPlace(geoid).length > 0) {
      candidates.push({
        key: county ? `county:${geoid}` : `place:${geoid}`,
        jurisdictionId: id,
        lawJurisdictionId: id,
        level: county ? "county" : "city",
        name: jurisdiction.name,
        stateKey,
        geoid,
      });
      continue;
    }
    // A census-designated place has no government of its own. The
    // government that serves its residents keeps the budget.
    const serving = servingGovernment(geoid, stateKey, id);
    if (typeof serving === "string") {
      unknown.push({
        key: `place:${geoid}`,
        jurisdictionId: id,
        reason: serving,
      });
      continue;
    }
    // The state serves it directly, and the state's budget is already held.
    if (serving.level === "state") continue;
    candidates.push({
      key: serving.key,
      jurisdictionId: serving.jurisdictionId,
      lawJurisdictionId: serving.jurisdictionId,
      level: serving.level,
      name: serving.name,
      stateKey,
      geoid: serving.geoid,
    });
  }
  const seen = new Set<string>();
  return {
    candidates: candidates.filter((candidate) => {
      if (seen.has(candidate.key)) return false;
      seen.add(candidate.key);
      return true;
    }),
    unknown,
  };
}

export interface ServingGovernment {
  /** The budget's key: `county:<GEOID>`, `town:<county subdivision GEOID>` or the state's. */
  readonly key: string;
  readonly level: BudgetLevel;
  readonly geoid: string | null;
  readonly jurisdictionId: EntityId;
  readonly name: string;
}

/**
 * The government that serves a place with no government of its own, found in
 * the county area holding most of its residents (ACS 2020-2024), or else most
 * of its land (2020 Census files):
 *
 * 1. that area's county government, or its municipio where the listing holds
 *    no governments for the territory (Puerto Rico);
 * 2. else the town holding most of the place's residents (ACS 2020-2024
 *    county subdivisions), where the Census Bureau's 2025 listing files that
 *    town as a government (a New England town); the place's own jurisdiction
 *    carries its laws;
 * 3. else, in an area with no town governments, its consolidated government:
 *    the area's one municipality filed under a county-level name or with no
 *    place of its own (the City and County of Honolulu; the City-Parish of
 *    Lafayette), which keeps the county area's budget;
 * 4. else, in an area with no county, town or consolidated government
 *    (Alaska's unorganized borough), the state, which serves it directly.
 *
 * Otherwise, the reason no government is linked.
 */
export function servingGovernment(
  placeGeoid: string,
  stateKey: string,
  placeJurisdictionId: EntityId,
): ServingGovernment | string {
  const countyGeoid =
    ACS_PLACE_COUNTIES[placeGeoid]?.[0]?.[0] ??
    countyGeoidsForPlace(placeGeoid)[0];
  if (!countyGeoid)
    return "No government of its own, and no county is recorded for it.";
  const area = localUnitsByCountyArea().get(countyGeoid);
  const county = (): ServingGovernment | string => {
    const place = lifePlaceByKey(`county:${countyGeoid}`);
    if (!place)
      return "No government of its own, and the county that serves it is not in the places corpus.";
    return {
      key: `county:${countyGeoid}`,
      level: "county",
      geoid: countyGeoid,
      jurisdictionId: place.context.jurisdiction.id,
      name: place.context.jurisdiction.name,
    };
  };
  const usps = stateKey.replace(/^US-/, "");
  // Where the listing holds no governments for the whole state or territory
  // (Puerto Rico's municipios), the county equivalent is its government.
  if (
    countyGovernmentUnit(countyGeoid) ||
    governmentUnitsForState(usps).length === 0
  )
    return county();
  const townGeoid = ACS_PLACE_TOWNS[placeGeoid]?.[0]?.[0];
  const town = townGeoid
    ? localUnitsByCountyArea()
        .get(townGeoid.slice(0, 5))
        ?.townships.find(
          (unit) =>
            unit.stateUsps === usps &&
            unit.publisherPlaceCode === townGeoid.slice(5),
        )
    : undefined;
  if (townGeoid && town)
    return {
      key: `town:${townGeoid}`,
      level: "city",
      geoid: townGeoid,
      jurisdictionId: placeJurisdictionId,
      name: `${titleCase(town.name)}, ${STATES[usps]?.name ?? usps}`,
    };
  if (!area?.townships.length) {
    if (area?.consolidated) return county();
    const state = stateJurisdictionForKey(stateKey);
    if (state)
      return {
        key: stateKey,
        level: "state",
        geoid: null,
        jurisdictionId: state.id,
        name: STATES[usps]?.name ?? usps,
      };
  }
  return "No government of its own, and the town that serves it is not linked: its county area has no county government, and no town in the Census Bureau's 2025 listing holds most of its residents.";
}

interface CountyAreaUnits {
  /** The area's consolidated government, if exactly one is found. */
  readonly consolidated: GovernmentUnitIdentity | null;
  readonly townships: readonly GovernmentUnitIdentity[];
}

let countyAreaUnits: Map<string, CountyAreaUnits> | null = null;

/**
 * A municipality the Census Bureau files under a county-level name ("City and
 * County of Honolulu", "City-Parish of Lafayette", "Consolidated Government of
 * Terrebonne"): the publisher's own name for a government that
 * governs its whole county area.
 */
const COUNTY_LEVEL_NAME =
  /\b(COUNTY|PARISH)\b|\bCITY AND BOROUGH\b|\bCONSOLIDATED GOVERNMENT\b/;

/**
 * Each county area's consolidated government and townships, from the Census
 * Bureau's 2025 listing. The consolidated government is the area's one
 * municipality filed under a county-level name or with no place of its own.
 */
function localUnitsByCountyArea(): ReadonlyMap<string, CountyAreaUnits> {
  if (countyAreaUnits) return countyAreaUnits;
  const consolidated = new Map<string, GovernmentUnitIdentity[]>();
  const townships = new Map<string, GovernmentUnitIdentity[]>();
  for (const unit of allGovernmentUnits()) {
    if (!unit.countyGeoid) continue;
    const into =
      unit.unitType === "township"
        ? townships
        : unit.unitType === "municipality" &&
            (!unit.placeGeoid || COUNTY_LEVEL_NAME.test(unit.name))
          ? consolidated
          : null;
    if (!into) continue;
    into.set(unit.countyGeoid, [...(into.get(unit.countyGeoid) ?? []), unit]);
  }
  countyAreaUnits = new Map();
  for (const county of new Set([...consolidated.keys(), ...townships.keys()])) {
    const loose = consolidated.get(county) ?? [];
    countyAreaUnits.set(county, {
      consolidated: loose.length === 1 ? loose[0]! : null,
      townships: townships.get(county) ?? [],
    });
  }
  return countyAreaUnits;
}

/** "TOWN OF EAST WINDSOR" as "Town of East Windsor". */
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word, at) =>
      at > 0 && ["of", "and", "the"].includes(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function emptyRevenue(): number[] {
  return BUDGET_SOURCES.map(() => 0);
}

function emptySpending(): number[] {
  return BUDGET_PROGRAMS.map(() => 0);
}

/**
 * The opening pension and its actuarial contribution. The assets are the
 * liability times the government's own reported funded ratio
 * (`openingFundedRatio`), and the contribution's normal cost is its own
 * plans' (`pensionFlows`); the liability is a year's spending times its
 * state's measured ratio (`openingLiabilityToSpending`).
 */
export function openingPension(
  spending: number,
  paidShare: number,
  fundedRatio: number,
  normalCostShare: number,
  liabilityToSpending: number,
): {
  pension: PensionRecord;
  required: number;
} {
  const liability = Math.round(spending * liabilityToSpending);
  const assets = Math.round(liability * fundedRatio);
  return {
    pension: { liability, assets, paidShare },
    required: actuarialContribution({ liability, assets }, normalCostShare),
  };
}

/**
 * The employer's normal cost, as its own plans' share of the liability
 * (`pensionFlows`), plus the unfunded part amortized as a level-dollar
 * payment at the assumed return. The unfunded part accrues interest at that
 * return, so a payment of only its thirtieth would let it grow even when the
 * whole contribution is paid.
 */
export function actuarialContribution(
  pension: Pick<PensionRecord, "liability" | "assets">,
  normalCostShare: number,
): number {
  return Math.round(
    pension.liability * normalCostShare +
      Math.max(0, pension.liability - pension.assets) * AMORTIZATION_FACTOR,
  );
}

/** The level-dollar payment per dollar of unfunded liability. */
export const AMORTIZATION_FACTOR =
  PENSION.assumedReturn /
  (1 - (1 + PENSION.assumedReturn) ** -PENSION.amortizationYears);

/**
 * Carves the pension contribution out of the programs that pay salaries, so
 * the opening total stays the research total (Census counts employer
 * contributions inside each function's spending).
 */
function carvePension(spending: number[], contribution: number): void {
  const index = BUDGET_PROGRAMS.indexOf("pensionContribution");
  const cuttable = BUDGET_PROGRAMS.map((program, at) =>
    PROTECTED_PROGRAMS.has(program) || program === "localAid"
      ? 0
      : spending[at]!,
  );
  const base = sum(cuttable);
  if (base <= 0) return;
  const paid = Math.min(contribution, base);
  const scale = (base - paid) / base;
  for (let at = 0; at < spending.length; at += 1)
    if (cuttable[at]! > 0) spending[at] = Math.round(spending[at]! * scale);
  spending[index] = paid;
}

interface OpeningAmounts {
  readonly population: number;
  readonly revenue: number[];
  readonly spending: number[];
  readonly debt: number;
  readonly interestRate: number;
  readonly balance: number;
  readonly reserve: number;
  readonly notes: string[];
}

/** Where an opening interest rate came from, for the opening notes. */
function interestNote(rate: number, fallback: number): string {
  const percent = Math.round(rate * 10_000) / 100;
  return rate === fallback
    ? `Interest rate: ESTIMATED FROM AVERAGE, ${percent}%, the national effective rate for its level (Census 2022 interest on debt over debt outstanding); its own column shows no debt or no interest.`
    : `Interest rate: ${percent}%, its own Census 2022 interest on debt over its debt outstanding.`;
}

function stateOpening(
  candidate: BudgetCandidate,
  base: PlaceBase,
): OpeningAmounts | string {
  const general = base.generalFundFY2026Millions;
  const notes: string[] = [];
  const revenue = emptyRevenue();
  const spending = emptySpending();
  let debt = 0;
  let interestRate = DEFAULT_STATE_INTEREST_RATE;
  let population = base.population2024 ?? 0;
  const column = STATE_IS_LOCAL.has(candidate.key)
    ? base.local
    : (base.state ?? undefined);
  if (column && population > 0) {
    const scale = population * BUDGET_CALIBRATION;
    for (const [at, source] of BUDGET_SOURCES.entries())
      revenue[at] = Math.round((column.revenue[source] ?? 0) * scale);
    for (const [at, program] of BUDGET_PROGRAMS.entries())
      spending[at] = Math.round((column.spending[program] ?? 0) * scale);
    debt = Math.round(column.debt * population);
    const interest = column.spending.interest ?? 0;
    if (column.debt > 0 && interest > 0) interestRate = interest / column.debt;
    notes.push(
      STATE_IS_LOCAL.has(candidate.key)
        ? `Census 2022 local-government column, since ${base.name}'s state column is empty, per resident times BEA 2024 population, times the calibration factor.`
        : "Census 2022 state-government figures per resident times BEA 2024 population, times the calibration factor.",
    );
  } else {
    // A territory: NASBO totals, or the surveyed island areas' average.
    population =
      base.islandAreaPopulation2020 ?? base.puertoRicoPopulation2025 ?? 0;
    const surveyed =
      (base.territoryAllFundsSpendingFY2025Millions ?? general.expenditures) &&
      general.revenues &&
      general.expenditures;
    if (!surveyed && population <= 0)
      return "No NASBO totals, no Census finances and no population for this territory.";
    const total = surveyed
      ? (base.territoryAllFundsSpendingFY2025Millions ??
          general.expenditures)! * 1_000_000
      : ISLAND_AREA_AVERAGE.spendingPerResident * population;
    const revenueToSpending = surveyed
      ? general.revenues! / general.expenditures!
      : ISLAND_AREA_AVERAGE.revenueToSpending;
    spending[BUDGET_PROGRAMS.indexOf("programUnknown")] = Math.round(total);
    revenue[BUDGET_SOURCES.indexOf("sourceUnknown")] = Math.round(
      total * revenueToSpending,
    );
    notes.push(
      surveyed
        ? "NASBO all-funds spending, with revenue at the general fund's ratio of revenue to spending; the split by source and by program is not in the research."
        : `ESTIMATED FROM AVERAGE: NASBO does not survey this territory, so spending is the per-resident average of ${ISLAND_AREA_AVERAGE.peers.join(" and ")} times its Census 2020 population, with their average ratio of revenue to spending, balance and reserve.`,
      "Debt is not in the research for territories and opens at none recorded (research: local-government-finances-by-type).",
    );
    if (!surveyed) {
      const totalSpending = sum(spending);
      notes.push(interestNote(interestRate, DEFAULT_STATE_INTEREST_RATE));
      return {
        population,
        revenue,
        spending,
        debt,
        interestRate,
        balance: Math.round(totalSpending * ISLAND_AREA_AVERAGE.balanceShare),
        reserve: Math.round(totalSpending * ISLAND_AREA_AVERAGE.reserveShare),
        notes,
      };
    }
  }
  const balance = general.endingBalance;
  const rainy = general.rainyDayFundBalance;
  const totalSpending = sum(spending);
  notes.push(interestNote(interestRate, DEFAULT_STATE_INTEREST_RATE));
  notes.push(
    balance === null
      ? "Opening balance unknown in NASBO; opens at none."
      : "Opening balance: NASBO's estimate of the fiscal 2026 general fund ending balance.",
    rainy === null
      ? `Opening reserve: ESTIMATED FROM AVERAGE, NASBO has no figure, so ${Math.round(MEDIAN_RAINY_DAY_SHARE * 1000) / 1000} of spending, the median rainy-day share of the states NASBO reports (fiscal 2026).`
      : "Opening reserve: NASBO's fiscal 2026 rainy-day fund balance.",
  );
  return {
    population,
    revenue,
    spending,
    debt,
    interestRate,
    balance: Math.round((balance ?? 0) * 1_000_000),
    reserve: Math.round(
      rainy === null
        ? totalSpending * MEDIAN_RAINY_DAY_SHARE
        : rainy * 1_000_000,
    ),
    notes,
  };
}

function localOpening(
  candidate: BudgetCandidate,
  base: PlaceBase,
): OpeningAmounts | string {
  const local = base.local ?? NATIONAL_LOCAL_AVERAGE;
  const acsPopulation =
    candidate.level === "county"
      ? null
      : (ACS_PLACE_POPULATION[candidate.geoid!] ?? null);
  const population =
    candidate.level === "county"
      ? (COUNTY_POPULATION[candidate.geoid!] ??
        ACS_MUNICIPIO_POPULATION[candidate.geoid!] ??
        null)
      : (placePopulation(candidate.geoid!) ??
        acsPopulation ??
        ACS_TOWN_POPULATION[candidate.geoid!] ??
        null);
  if (population === null || population <= 0)
    return "No population for this place in the research.";
  const populationSource =
    candidate.level === "county"
      ? COUNTY_POPULATION[candidate.geoid!] !== undefined
        ? "BEA 2024"
        : "ACS 2020-2024 five-year"
      : placePopulation(candidate.geoid!) !== null
        ? "Census 2025"
        : "ACS 2020-2024 five-year";
  const scale = population * BUDGET_CALIBRATION;
  const level = candidate.level === "county" ? "county" : "city";
  const spending = emptySpending();
  for (const [at, program] of BUDGET_PROGRAMS.entries()) {
    const share = LOCAL_PROGRAM_SPLIT[program]?.[level] ?? 0;
    spending[at] = Math.round((local.spending[program] ?? 0) * share * scale);
  }
  const localSpendingPerResident = sum(
    BUDGET_PROGRAMS.map((program) =>
      program === "localAid" ? 0 : (local.spending[program] ?? 0),
    ),
  );
  const share =
    localSpendingPerResident > 0
      ? sum(spending) / (localSpendingPerResident * scale)
      : 0;
  const revenue = emptyRevenue();
  for (const [at, source] of BUDGET_SOURCES.entries())
    revenue[at] = Math.round((local.revenue[source] ?? 0) * scale * share);
  const debt = Math.round(local.debt * population * share);
  const interest = local.spending.interest ?? 0;
  const general = base.generalFundFY2026Millions;
  const stateSpend = general.expenditures;
  const balanceShare =
    stateSpend && general.endingBalance !== null
      ? Math.max(0, general.endingBalance / stateSpend)
      : 0;
  const reserveShare =
    stateSpend && general.rainyDayFundBalance !== null
      ? general.rainyDayFundBalance / stateSpend
      : MEDIAN_RAINY_DAY_SHARE;
  const total = sum(spending);
  const localRate =
    local.debt > 0 && interest > 0
      ? interest / local.debt
      : DEFAULT_LOCAL_INTEREST_RATE;
  return {
    population,
    revenue,
    spending,
    debt,
    interestRate: localRate,
    balance: Math.round(total * balanceShare),
    reserve: Math.round(total * reserveShare),
    notes: [
      base.local
        ? `Census 2022 local-government figures per resident in ${base.name}, the ${level} share of each program (PLACEHOLDER table, research: local-government-finances-by-type), times ${populationSource} population, times the calibration factor.`
        : `ESTIMATED FROM AVERAGE: Census publishes no local-government finances for ${base.name}, so the national average per resident (the 50 states and D.C., weighted by population), the ${level} share of each program (PLACEHOLDER table), times ${populationSource} population, times the calibration factor.`,
      `Revenue: ${LOCAL_REVENUE_RULE}.`,
      "Opening balance and reserve: the state's general fund balance and rainy-day shares of spending (PLACEHOLDER, research: local-government-finances-by-type).",
      interestNote(localRate, DEFAULT_LOCAL_INTEREST_RATE),
    ],
  };
}

function fiscalStartFor(
  candidate: BudgetCandidate,
  base: PlaceBase,
): {
  start: string;
  basis: PublicBudgetGovernment["fiscalYearStartBasis"];
} {
  if (candidate.level === "city" && candidate.geoid) {
    const government = municipalGovernmentForPlaceGeoid(candidate.geoid);
    const sourced = government
      ? primaryReading(government).budget?.fiscalYear?.beginsMonthDay
      : null;
    if (sourced) return { start: sourced, basis: "city-rule-pack" };
  }
  return {
    start: base.fiscalYearStart ?? "07-01",
    basis: candidate.level === "state" ? "nasbo" : "state-start-placeholder",
  };
}

/** Opens one government's budget on `today`, or says why it cannot. */
export function openGovernmentBudget(
  world: World,
  candidate: BudgetCandidate,
  today: IsoDate,
): PublicBudgetGovernment | string {
  const base = PLACES[candidate.stateKey];
  if (!base) return "Not in the budget research.";
  const opening =
    candidate.level === "state"
      ? stateOpening(candidate, base)
      : localOpening(candidate, base);
  if (typeof opening === "string") return opening;
  const { start, basis } = fiscalStartFor(candidate, base);
  const year = fiscalYearContaining(today, start);
  const laws = budgetLawReadings(
    world,
    candidate.lawJurisdictionId,
    today,
    candidate.level !== "state",
  );
  const spending = opening.spending;
  const paid = openingPaidShare(
    candidate.stateKey,
    candidate.level,
    candidate.name,
  );
  const funding = openingFundedRatio(
    candidate.stateKey,
    candidate.level,
    candidate.name,
  );
  const flows = pensionFlows(candidate);
  const size = openingLiabilityToSpending(candidate.stateKey);
  const { pension, required } = openingPension(
    sum(spending),
    paid.share,
    funding.fundedRatio,
    flows.normalCostShare,
    size.liabilityToSpending,
  );
  // The opening year's contribution: in full under a law requiring it, and
  // at the government's own share otherwise.
  carvePension(
    spending,
    pensionPayment(required, pension.paidShare, laws.pensions),
  );
  const stateId = stateJurisdictionForKey(candidate.stateKey)?.id ?? null;
  const adopted: AdoptedBudget = {
    fiscalYear: year.fiscalYear,
    startsOn: year.startsOn,
    endsOn: year.endsOn,
    adoptedOn: today,
    basis: "opening",
    expectedRevenue: opening.revenue,
    appropriations: spending,
    reserveDeposit: 0,
    pensionRequired: required,
    pensionShare: pension.paidShare,
    economyAtAdoption: stateId
      ? nominalEconomyIndex(world, stateId, today)
      : null,
    laws,
  };
  return {
    key: candidate.key,
    jurisdictionId: candidate.jurisdictionId,
    lawJurisdictionId: candidate.lawJurisdictionId,
    level: candidate.level,
    name: candidate.name,
    stateKey: candidate.stateKey,
    population: opening.population,
    fiscalYearStart: start,
    fiscalYearStartBasis: basis,
    budgetCycle:
      base.budgetCycle === "annual" || base.budgetCycle === "biennial"
        ? base.budgetCycle
        : null,
    openingNotes: [
      ...opening.notes,
      `Calibration factor ${BUDGET_CALIBRATION}: ${bases.calibration.basis}`,
      size.basis === "state-plans"
        ? `Pension liability: ${size.liabilityToSpending} times a year's spending, its state's public plans in the Public Plans Database against the state's combined state and local spending (Census 2022); the contribution is carved out of salary-paying programs.`
        : `Pension liability: ESTIMATED FROM AVERAGE, ${size.liabilityToSpending} times a year's spending, the median of the states' measured ratios; no plan in its place is listed. The contribution is carved out of salary-paying programs.`,
      funding.basis === "reported"
        ? `Pension funded ratio: ${funding.fundedRatio}, as its own plans filed with the Public Plans Database.`
        : `Pension funded ratio: ESTIMATED FROM AVERAGE, ${funding.fundedRatio}, the median of every plan in the Public Plans Database; its own plans are not listed.`,
      `Pension normal cost: ${flows.normalCostShare} of the liability a year, ${flows.normalCostBasis === "reported" ? "as its own plans filed with the Public Plans Database" : "ESTIMATED FROM AVERAGE, the median of every plan in the Public Plans Database; its own plans do not file it"}. Benefits paid: ${flows.benefitShare} of the liability a year, ${flows.benefitBasis === "reported" ? "as its own plans filed" : "ESTIMATED FROM AVERAGE, the median of every plan"}.`,
      `Reserve target under a minimum-reserve law: ${reserveRule(candidate).floorShare} of a year's spending, at most ${reserveRule(candidate).depositShare} a year: ${reserveRule(candidate).basis}.`,
      paid.basis === "reported"
        ? `Pension share paid: ${paid.share}, as its own plans filed with the Public Plans Database.`
        : `Pension share paid: ${paid.share}, ESTIMATED FROM AVERAGE (the median of every plan in the Public Plans Database, fiscal 2022 to 2024); its own plans are not listed.`,
      ...(basis === "state-start-placeholder"
        ? [
            "Budget year: begins when the state's does (PLACEHOLDER, research: local-government-finances-by-type).",
          ]
        : []),
      "Adoption is automatic each year; a budget passed as a bill comes later.",
    ],
    balance: opening.balance,
    reserve: opening.reserve,
    debt: opening.debt,
    interestRate: opening.interestRate,
    cut: 0,
    pension,
    years: [adopted],
    months: [],
  };
}
