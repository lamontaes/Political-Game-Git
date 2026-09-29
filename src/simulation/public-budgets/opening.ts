import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import acsPlaces from "../../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import {
  municipalGovernmentForPlaceGeoid,
  primaryReading,
} from "../municipal-government";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { placePopulation } from "../nationwide-world/place-population";
import { SeededRng } from "../rng";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";
import { standardNormal } from "../world-setup/deterministic-math";
import { openingPaidShare, pensionPayment } from "./pension-share";
import {
  budgetLawReadings,
  fiscalYearContaining,
  nominalEconomyIndex,
} from "./fiscal";
import {
  DEFAULT_INTEREST_RATE,
  LOCAL_PROGRAM_SPLIT,
  LOCAL_REVENUE_RULE,
  OPENING_DRAW_SD,
  PENSION,
} from "./rules";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PROTECTED_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
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
 * 1. A state draws around its Census 2022 state-government figures per
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
 * Every amount is drawn once per line around its figure, so two worlds differ
 * (Lamontae, September 26, 2026: real data calibrates, the game makes its
 * own). A world without a seed (a fixture) takes the figures as they are.
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

/** NASBO's median rainy-day balance as a share of spending, fiscal 2026. */
const MEDIAN_RAINY_DAY_SHARE = 0.131;

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
 * Every government the world holds: each state, D.C. and territory, and each
 * county and city jurisdiction present. The rest are listed with the reason
 * they keep no budget.
 */
export function budgetCandidates(world: World): {
  readonly candidates: readonly BudgetCandidate[];
  readonly unknown: PublicBudgetStore["unknown"];
} {
  const candidates: BudgetCandidate[] = [];
  const unknown: { key: string; jurisdictionId: EntityId; reason: string }[] =
    [];
  const stateIds = new Set<EntityId>();
  // Washington's town is the District government itself (question-authority).
  let districtTown: EntityId | null = null;
  for (const id of world.jurisdictionOrder ?? []) {
    const place = lifePlaceByJurisdictionId(id);
    if (place?.stateJurisdictionKey === "US-DC" && place.scope !== "state")
      districtTown ??= id;
  }
  for (const usps of Object.keys(STATES)) {
    const key = `US-${usps}`;
    const jurisdiction = stateJurisdictionForKey(key);
    if (!jurisdiction) continue;
    stateIds.add(jurisdiction.id);
    candidates.push({
      key,
      jurisdictionId: jurisdiction.id,
      lawJurisdictionId:
        usps === "DC" && districtTown ? districtTown : jurisdiction.id,
      level: "state",
      name: STATES[usps]!.name,
      stateKey: key,
      geoid: null,
    });
  }
  for (const id of world.jurisdictionOrder ?? []) {
    if (stateIds.has(id) || id === NATIONAL_ELECTION_JURISDICTION.id) continue;
    if (id === districtTown) continue;
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
    candidates.push({
      key: county ? `county:${geoid}` : `place:${geoid}`,
      jurisdictionId: id,
      lawJurisdictionId: id,
      level: county ? "county" : "city",
      name: jurisdiction.name,
      stateKey,
      geoid,
    });
  }
  return { candidates, unknown };
}

function drawn(
  world: World,
  governmentKey: string,
  line: string,
  amount: number,
): number {
  if (!world.seed || amount === 0) return Math.round(amount);
  const rng = new SeededRng(world.seed).fork(
    `${PUBLIC_BUDGETS_VERSION}:open:${governmentKey}:${line}`,
  );
  return Math.round(amount * Math.exp(standardNormal(rng) * OPENING_DRAW_SD));
}

function emptyRevenue(): number[] {
  return BUDGET_SOURCES.map(() => 0);
}

function emptySpending(): number[] {
  return BUDGET_PROGRAMS.map(() => 0);
}

/** The opening pension and its actuarial contribution. PLACEHOLDER. */
export function openingPension(
  spending: number,
  paidShare: number,
): {
  pension: PensionRecord;
  required: number;
} {
  const liability = Math.round(spending * PENSION.liabilityToSpending);
  const assets = Math.round(liability * PENSION.fundedRatio);
  return {
    pension: { liability, assets, paidShare },
    required: actuarialContribution({ liability, assets }),
  };
}

/** Normal cost plus the unfunded part amortized. */
export function actuarialContribution(
  pension: Pick<PensionRecord, "liability" | "assets">,
): number {
  return Math.round(
    pension.liability * PENSION.normalCostShare +
      Math.max(0, pension.liability - pension.assets) /
        PENSION.amortizationYears,
  );
}

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

function stateOpening(
  world: World,
  candidate: BudgetCandidate,
  base: PlaceBase,
): OpeningAmounts | string {
  const general = base.generalFundFY2026Millions;
  const notes: string[] = [];
  const revenue = emptyRevenue();
  const spending = emptySpending();
  let debt = 0;
  let interestRate = DEFAULT_INTEREST_RATE;
  let population = base.population2024 ?? 0;
  const column =
    candidate.key === "US-DC" ? base.local : (base.state ?? undefined);
  if (column && population > 0) {
    const scale = population * BUDGET_CALIBRATION;
    for (const [at, source] of BUDGET_SOURCES.entries())
      revenue[at] = drawn(
        world,
        candidate.key,
        source,
        (column.revenue[source] ?? 0) * scale,
      );
    for (const [at, program] of BUDGET_PROGRAMS.entries())
      spending[at] = drawn(
        world,
        candidate.key,
        program,
        (column.spending[program] ?? 0) * scale,
      );
    debt = drawn(world, candidate.key, "debt", column.debt * population);
    const interest = column.spending.interest ?? 0;
    if (column.debt > 0 && interest > 0) interestRate = interest / column.debt;
    notes.push(
      candidate.key === "US-DC"
        ? "Census 2022 local-government column, since D.C.'s state column is empty, per resident times BEA 2024 population, times the calibration factor."
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
    spending[BUDGET_PROGRAMS.indexOf("programUnknown")] = drawn(
      world,
      candidate.key,
      "programUnknown",
      total,
    );
    revenue[BUDGET_SOURCES.indexOf("sourceUnknown")] = drawn(
      world,
      candidate.key,
      "sourceUnknown",
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
  notes.push(
    balance === null
      ? "Opening balance unknown in NASBO; opens at none."
      : "Opening balance: NASBO's estimate of the fiscal 2026 general fund ending balance.",
    rainy === null
      ? "Opening reserve: NASBO has no figure, so the national median rainy-day share of spending (PLACEHOLDER)."
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
  world: World,
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
      ? (COUNTY_POPULATION[candidate.geoid!] ?? null)
      : (placePopulation(candidate.geoid!) ?? acsPopulation);
  if (population === null || population <= 0)
    return "No population for this place in the research.";
  const populationSource =
    candidate.level === "county"
      ? "BEA 2024"
      : placePopulation(candidate.geoid!) !== null
        ? "Census 2025"
        : "ACS 2020-2024 five-year";
  const scale = population * BUDGET_CALIBRATION;
  const level = candidate.level === "county" ? "county" : "city";
  const spending = emptySpending();
  for (const [at, program] of BUDGET_PROGRAMS.entries()) {
    const share = LOCAL_PROGRAM_SPLIT[program]?.[level] ?? 0;
    spending[at] = drawn(
      world,
      candidate.key,
      program,
      (local.spending[program] ?? 0) * share * scale,
    );
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
    revenue[at] = drawn(
      world,
      candidate.key,
      source,
      (local.revenue[source] ?? 0) * scale * share,
    );
  const debt = drawn(
    world,
    candidate.key,
    "debt",
    local.debt * population * share,
  );
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
  return {
    population,
    revenue,
    spending,
    debt,
    interestRate:
      local.debt > 0 && interest > 0
        ? interest / local.debt
        : DEFAULT_INTEREST_RATE,
    balance: Math.round(total * balanceShare),
    reserve: Math.round(total * reserveShare),
    notes: [
      base.local
        ? `Census 2022 local-government figures per resident in ${base.name}, the ${level} share of each program (PLACEHOLDER table, research: local-government-finances-by-type), times ${populationSource} population, times the calibration factor.`
        : `ESTIMATED FROM AVERAGE: Census publishes no local-government finances for ${base.name}, so the national average per resident (the 50 states and D.C., weighted by population), the ${level} share of each program (PLACEHOLDER table), times ${populationSource} population, times the calibration factor.`,
      `Revenue: ${LOCAL_REVENUE_RULE}.`,
      "Opening balance and reserve: the state's general fund balance and rainy-day shares of spending (PLACEHOLDER, research: local-government-finances-by-type).",
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
      ? stateOpening(world, candidate, base)
      : localOpening(world, candidate, base);
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
  const { pension, required } = openingPension(
    sum(spending),
    openingPaidShare(world, candidate.key),
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
      "Pension: liability, funded ratio and contribution are PLACEHOLDER (research: public-pension-funding-by-state), carved out of salary-paying programs.",
      ...(basis === "state-start-placeholder"
        ? [
            "Fiscal year: the state's start (PLACEHOLDER, research: local-government-finances-by-type).",
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
