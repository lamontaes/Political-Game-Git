/** Full retained candidate/geography joins, raw research selection and opening government/pension amounts. No account, World or budget writer is created. */
import paid from "../../../data/research/money/pension-contribution-paid.json";
import flows from "../../../data/research/money/pension-flows.json";
import funded from "../../../data/research/money/pension-funded-ratio.json";
import liabilityRatio from "../../../data/research/money/pension-liability-ratio.json";
import bases from "../../../data/research/money/public-budget-bases.json";
import acsPlaces from "../../../data/research/money/place-population-acs-2024.json";
import acsTowns from "../../../data/research/money/place-towns-acs-2024.json";
import { reserveRule } from "./budget-reserve";
import {
  budgetLawReadings,
  fiscalYearContaining,
  nominalEconomyIndex,
  budgetObligationPayment,
  type BudgetFiscalFacts,
} from "./budget-fiscal";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  sum,
  DEFAULT_LOCAL_INTEREST_RATE,
  DEFAULT_STATE_INTEREST_RATE,
  LOCAL_PROGRAM_SPLIT,
  LOCAL_REVENUE_RULE,
} from "./budget-policy";
import { openingPension, carvePension } from "./budget-pension";
import type { PublicGovernmentIdentityCarrier } from "../../simulation/public-government-identity";
import type { EntityId, IsoDate, World } from "../../simulation/types";
import type { GovernmentUnitIdentity } from "../../simulation/government-units";
import type * as geo from "../../simulation/government-units";
import type * as place from "../../simulation/life-places";
import type * as municipal from "../../simulation/municipal-government";
import type * as government from "../../simulation/nationwide-world/government-jurisdiction";
import type * as population from "../../simulation/nationwide-world/place-population";
import type { STATES as nativeStates } from "../../simulation/state-reference";
import type {
  AdoptedBudget,
  BudgetLevel,
  PublicBudgetGovernment,
  PublicBudgetStore,
} from "../../simulation/public-budgets/store";
import type { BudgetCandidate as NativeCandidate } from "../../simulation/public-budgets/opening";
/** Separately owned static geography/city-rule source views. They return records, identities or source readings and never take a World. */
export interface BudgetGeographyViews {
  readonly allGovernmentUnits: typeof geo.allGovernmentUnits;
  readonly countyGeoidsForPlace: typeof geo.countyGeoidsForPlace;
  readonly countyGovernmentUnit: typeof geo.countyGovernmentUnit;
  readonly governmentUnitJurisdictionId: typeof geo.governmentUnitJurisdictionId;
  readonly governmentUnitsForPlace: typeof geo.governmentUnitsForPlace;
  readonly governmentUnitsForState: typeof geo.governmentUnitsForState;
  readonly lifePlaceByJurisdictionId: typeof place.lifePlaceByJurisdictionId;
  readonly lifePlaceByKey: typeof place.lifePlaceByKey;
  readonly stateJurisdictionForKey: typeof place.stateJurisdictionForKey;
  readonly municipalGovernmentForPlaceGeoid: typeof municipal.municipalGovernmentForPlaceGeoid;
  readonly primaryReading: typeof municipal.primaryReading;
  readonly chiefExecutiveJurisdiction: typeof government.chiefExecutiveJurisdiction;
  readonly placePopulation: typeof population.placePopulation;
  readonly states: typeof nativeStates;
  readonly federalId: EntityId;
}
export interface OpeningBudgetFacts {
  readonly jurisdictionOrder: World["jurisdictionOrder"];
  readonly jurisdictions: World["jurisdictions"];
  readonly fiscal: BudgetFiscalFacts;
  readonly views: BudgetGeographyViews;
}
const readers = new WeakMap<
  BudgetGeographyViews,
  ReturnType<typeof compileOpening>
>();
function reader(views: BudgetGeographyViews) {
  let read = readers.get(views);
  if (!read) {
    read = compileOpening(views);
    readers.set(views, read);
  }
  return read;
}
export function budgetCandidates(facts: OpeningBudgetFacts) {
  return reader(facts.views).candidates(facts);
}
export function openGovernmentBudget(
  facts: OpeningBudgetFacts,
  candidate: NativeCandidate,
  today: IsoDate,
) {
  return reader(facts.views).opening(facts, candidate, today);
}
export function servingGovernment(
  facts: Pick<OpeningBudgetFacts, "views">,
  placeGeoid: string,
  stateKey: string,
  id: EntityId,
) {
  return reader(facts.views).serving(placeGeoid, stateKey, id);
}
function compileOpening(views: BudgetGeographyViews) {
  const {
    allGovernmentUnits,
    countyGeoidsForPlace,
    countyGovernmentUnit,
    governmentUnitJurisdictionId,
    governmentUnitsForPlace,
    governmentUnitsForState,
    lifePlaceByJurisdictionId,
    lifePlaceByKey,
    stateJurisdictionForKey,
    municipalGovernmentForPlaceGeoid,
    primaryReading,
    chiefExecutiveJurisdiction,
    placePopulation,
  } = views;
  const STATES = views.states,
    NATIONAL_ELECTION_JURISDICTION = { id: views.federalId };
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
  const BUDGET_CALIBRATION = bases.calibration.factor;
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
  const MEDIAN_ENDING_BALANCE_SHARE = (() => {
    const shares = Object.values(PLACES)
      .filter(
        (place) =>
          place.state &&
          place.generalFundFY2026Millions.endingBalance !== null &&
          place.generalFundFY2026Millions.expenditures,
      )
      .map(
        (place) =>
          place.generalFundFY2026Millions.endingBalance! /
          place.generalFundFY2026Millions.expenditures!,
      )
      .sort((a, b) => a - b);
    const middle = Math.floor(shares.length / 2);
    return shares.length % 2
      ? shares[middle]!
      : (shares[middle - 1]! + shares[middle]!) / 2;
  })();
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
            (place.territoryAllFundsSpendingFY2025Millions! * 1000000) /
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
    ) => [
      ...new Set(peers.flatMap((place) => Object.keys(pick(place.local!)))),
    ];
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
  const ACS_PLACE_POPULATION = acsPlaces.places as Readonly<
    Record<string, number>
  >;
  const ACS_PLACE_COUNTIES = acsPlaces.placeCounties as unknown as Readonly<
    Record<string, readonly (readonly [string, number])[]>
  >;
  const ACS_MUNICIPIO_POPULATION = acsPlaces.puertoRicoMunicipios as Readonly<
    Record<string, number>
  >;
  const ACS_PLACE_TOWNS = acsTowns.placeTowns as unknown as Readonly<
    Record<string, readonly (readonly [string, number])[]>
  >;
  const ACS_TOWN_POPULATION = acsTowns.townPopulation as Readonly<
    Record<string, number>
  >;
  interface BudgetCandidate extends PublicGovernmentIdentityCarrier {
    readonly key: string;
    readonly jurisdictionId: EntityId;
    readonly lawJurisdictionId: EntityId;
    readonly level: BudgetLevel;
    readonly name: string;
    readonly stateKey: string;
    readonly geoid: string | null;
  }
  function computeBudgetCandidates(facts: OpeningBudgetFacts): {
    readonly candidates: readonly BudgetCandidate[];
    readonly unknown: PublicBudgetStore["unknown"];
  } {
    const candidates: BudgetCandidate[] = [];
    const unknown: {
      key: string;
      jurisdictionId: EntityId;
      reason: string;
    }[] = [];
    const stateIds = new Set<EntityId>();
    const stateTowns = new Map<string, EntityId>();
    for (const id of facts.jurisdictionOrder ?? []) {
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
    for (const id of facts.jurisdictionOrder ?? []) {
      if (stateIds.has(id) || id === NATIONAL_ELECTION_JURISDICTION.id)
        continue;
      if (townIds.has(id)) continue;
      const jurisdiction = facts.jurisdictions[id];
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
      const serving = servingGovernment(geoid, stateKey, id);
      if (typeof serving === "string") {
        unknown.push({
          key: `place:${geoid}`,
          jurisdictionId: id,
          reason: serving,
        });
        continue;
      }
      if (serving.level === "state") continue;
      candidates.push({
        key: serving.key,
        jurisdictionId: serving.jurisdictionId,
        lawJurisdictionId: serving.lawJurisdictionId ?? serving.jurisdictionId,
        ...(serving.publicGovernmentIdentity
          ? { publicGovernmentIdentity: serving.publicGovernmentIdentity }
          : {}),
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
  interface ServingGovernment extends PublicGovernmentIdentityCarrier {
    readonly lawJurisdictionId?: EntityId;
    readonly key: string;
    readonly level: BudgetLevel;
    readonly geoid: string | null;
    readonly jurisdictionId: EntityId;
    readonly name: string;
  }
  function servingGovernment(
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
        jurisdictionId: governmentUnitJurisdictionId(town),
        lawJurisdictionId: placeJurisdictionId,
        publicGovernmentIdentity: {
          kind: "local-government",
          governmentKey: town.id,
          jurisdictionId: governmentUnitJurisdictionId(town),
        },
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
    readonly consolidated: GovernmentUnitIdentity | null;
    readonly townships: readonly GovernmentUnitIdentity[];
  }
  let countyAreaUnits: Map<string, CountyAreaUnits> | null = null;
  const COUNTY_LEVEL_NAME =
    /\b(COUNTY|PARISH)\b|\bCITY AND BOROUGH\b|\bCONSOLIDATED GOVERNMENT\b/;
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
    for (const county of new Set([
      ...consolidated.keys(),
      ...townships.keys(),
    ])) {
      const loose = consolidated.get(county) ?? [];
      countyAreaUnits.set(county, {
        consolidated: loose.length === 1 ? loose[0]! : null,
        townships: townships.get(county) ?? [],
      });
    }
    return countyAreaUnits;
  }
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
  // stopgapId: "economy.budget-native-English"
  function interestNote(rate: number, fallback: number): string {
    const percent = Math.round(rate * 10000) / 100;
    return rate === fallback
      ? `Interest rate: ESTIMATED FROM AVERAGE, ${percent}%, the national effective rate for its level (Census 2022 interest on debt over debt outstanding); its own column shows no debt or no interest.`
      : `Interest rate: ${percent}%, its own Census 2022 interest on debt over its debt outstanding.`;
  }
  // stopgapId: "economy.budget-opening-source-proxies"
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
      if (column.debt > 0 && interest > 0)
        interestRate = interest / column.debt;
      notes.push(
        STATE_IS_LOCAL.has(candidate.key)
          ? `Census 2022 local-government column, since ${base.name}'s state column is empty, per resident times BEA 2024 population, times the calibration factor.`
          : "Census 2022 state-government figures per resident times BEA 2024 population, times the calibration factor.",
      );
    } else {
      population =
        base.islandAreaPopulation2020 ?? base.puertoRicoPopulation2025 ?? 0;
      const surveyed =
        (base.territoryAllFundsSpendingFY2025Millions ??
          general.expenditures) &&
        general.revenues &&
        general.expenditures;
      if (!surveyed && population <= 0)
        return "No NASBO totals, no Census finances and no population for this territory.";
      const total = surveyed
        ? (base.territoryAllFundsSpendingFY2025Millions ??
            general.expenditures)! * 1000000
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
        ? `Opening balance: ESTIMATED FROM AVERAGE, NASBO has no figure, so ${Math.round(MEDIAN_ENDING_BALANCE_SHARE * 1000) / 1000} of spending, the median ending-balance share of the states and D.C. that NASBO reports (fiscal 2026).`
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
      balance: Math.round(
        balance === null
          ? totalSpending * MEDIAN_ENDING_BALANCE_SHARE
          : balance * 1000000,
      ),
      reserve: Math.round(
        rainy === null
          ? totalSpending * MEDIAN_RAINY_DAY_SHARE
          : rainy * 1000000,
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
        : MEDIAN_ENDING_BALANCE_SHARE;
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
          ? `Census 2022 local-government figures per resident in ${base.name}, times the estimated ${level} share of each program used across the 50 states and D.C., times ${populationSource} population, times the calibration factor.`
          : `ESTIMATED FROM AVERAGE: Census publishes no local-government finances for ${base.name}, so the national average per resident (the 50 states and D.C., weighted by population), times the estimated ${level} share of each program used across those places, times ${populationSource} population, times the calibration factor.`,
        `Revenue: ${LOCAL_REVENUE_RULE}.`,
        `Opening balance and reserve: estimated at the state's recorded general-fund ending-balance and rainy-day shares of spending; where NASBO records no state share, the estimate uses the median among the states and D.C. it reports (${Math.round(MEDIAN_ENDING_BALANCE_SHARE * 1000) / 1000} balance and ${Math.round(MEDIAN_RAINY_DAY_SHARE * 1000) / 1000} reserve).`,
        interestNote(localRate, DEFAULT_LOCAL_INTEREST_RATE),
      ],
    };
  }
  // stopgapId: "economy.budget-local-fiscal-year-proxy"
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
  function computeGovernmentOpening(
    facts: OpeningBudgetFacts,
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
      facts.fiscal,
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
    carvePension(
      spending,
      budgetObligationPayment(required, pension.paidShare, laws.pensions),
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
        ? nominalEconomyIndex(facts.fiscal, stateId, today)
        : null,
      laws,
    };
    return {
      key: candidate.key,
      jurisdictionId: candidate.jurisdictionId,
      lawJurisdictionId: candidate.lawJurisdictionId,
      ...(candidate.publicGovernmentIdentity
        ? { publicGovernmentIdentity: candidate.publicGovernmentIdentity }
        : {}),
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
              "Budget year: ESTIMATED FROM AVERAGE to begin when its state's does; every county and city without a recorded city rule uses its state's NASBO fiscal-year start, across the 50 states and D.C.",
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
  // stopgapId: "economy.budget-pension-source-medians"
  const MEDIAN_PAID_SHARE: number = paid.share.median;
  const BY_STATE: Readonly<
    Record<
      string,
      {
        readonly share: number;
      }
    >
  > = paid.byState;
  const BY_LOCAL = new Map(
    paid.byLocal.map((row) => [
      `${row.state}|${row.kind}|${row.name.toLowerCase()}`,
      row.share,
    ]),
  );
  interface PaidShareSource {
    readonly share: number;
    readonly basis: "reported" | "estimated-from-average";
  }
  function openingPaidShare(
    stateKey: string,
    level: BudgetLevel,
    name: string,
  ): PaidShareSource {
    const usps = stateKey.replace(/^US-/, "");
    const reported =
      level === "state"
        ? BY_STATE[usps]?.share
        : BY_LOCAL.get(
            `${usps}|${level}|${name.split(",")[0]!.trim().toLowerCase()}`,
          );
    return reported === undefined
      ? { share: MEDIAN_PAID_SHARE, basis: "estimated-from-average" }
      : { share: reported, basis: "reported" };
  }
  const MEDIAN_FUNDED_RATIO: number = funded.median;
  const FUNDED_BY_STATE: Readonly<
    Record<
      string,
      {
        readonly fundedRatio: number;
      }
    >
  > = funded.byState;
  const FUNDED_BY_LOCAL = new Map(
    funded.byLocal.map((row) => [
      `${row.state}|${row.kind}|${row.name.toLowerCase()}`,
      row.fundedRatio,
    ]),
  );
  interface FundedRatioSource {
    readonly fundedRatio: number;
    readonly basis: "reported" | "estimated-from-average";
  }
  function openingFundedRatio(
    stateKey: string,
    level: BudgetLevel,
    name: string,
  ): FundedRatioSource {
    const usps = stateKey.replace(/^US-/, "");
    const reported =
      level === "state"
        ? FUNDED_BY_STATE[usps]?.fundedRatio
        : FUNDED_BY_LOCAL.get(
            `${usps}|${level}|${name.split(",")[0]!.trim().toLowerCase()}`,
          );
    return reported === undefined
      ? { fundedRatio: MEDIAN_FUNDED_RATIO, basis: "estimated-from-average" }
      : { fundedRatio: reported, basis: "reported" };
  }
  const MEDIAN_LIABILITY_TO_SPENDING: number = liabilityRatio.median;
  const LIABILITY_BY_STATE: Readonly<
    Record<
      string,
      {
        readonly liabilityToSpending: number;
      }
    >
  > = liabilityRatio.byState;
  interface LiabilityToSpendingSource {
    readonly liabilityToSpending: number;
    readonly basis: "state-plans" | "estimated-from-average";
  }
  function openingLiabilityToSpending(
    stateKey: string,
  ): LiabilityToSpendingSource {
    const measured =
      LIABILITY_BY_STATE[stateKey.replace(/^US-/, "")]?.liabilityToSpending;
    return measured === undefined
      ? {
          liabilityToSpending: MEDIAN_LIABILITY_TO_SPENDING,
          basis: "estimated-from-average",
        }
      : { liabilityToSpending: measured, basis: "state-plans" };
  }
  const MEDIAN_NORMAL_COST_SHARE: number = flows.median.normalCostShare;
  const MEDIAN_BENEFIT_SHARE: number = flows.median.benefitShare;
  interface FlowRow {
    readonly normalCostShare?: number;
    readonly benefitShare?: number;
  }
  const FLOWS_BY_STATE: Readonly<Record<string, FlowRow>> = flows.byState;
  const FLOWS_BY_LOCAL = new Map<string, FlowRow>(
    flows.byLocal.map((row) => [
      `${row.state}|${row.kind}|${row.name.toLowerCase()}`,
      row,
    ]),
  );
  interface PensionFlows {
    readonly normalCostShare: number;
    readonly benefitShare: number;
    readonly normalCostBasis: "reported" | "estimated-from-average";
    readonly benefitBasis: "reported" | "estimated-from-average";
  }
  function pensionFlows(
    government: Pick<PublicBudgetGovernment, "stateKey" | "level" | "name">,
  ): PensionFlows {
    const usps = government.stateKey.replace(/^US-/, "");
    const row =
      government.level === "state"
        ? FLOWS_BY_STATE[usps]
        : FLOWS_BY_LOCAL.get(
            `${usps}|${government.level}|${government.name.split(",")[0]!.trim().toLowerCase()}`,
          );
    return {
      normalCostShare: row?.normalCostShare ?? MEDIAN_NORMAL_COST_SHARE,
      benefitShare: row?.benefitShare ?? MEDIAN_BENEFIT_SHARE,
      normalCostBasis:
        row?.normalCostShare === undefined
          ? "estimated-from-average"
          : "reported",
      benefitBasis:
        row?.benefitShare === undefined ? "estimated-from-average" : "reported",
    };
  }
  return {
    serving: servingGovernment,
    candidates: computeBudgetCandidates,
    opening: computeGovernmentOpening,
  };
}
