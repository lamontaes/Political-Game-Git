/**
 * The country as counts, one month at a time, as pure math (docs/design/country-tier.md).
 *
 * Every state holds its households as cells (income fifth by age band), its employers as one
 * cell per sector, and a ledger for its state and local governments. A month runs the steps a
 * town runs, times the counts: who moved, was born, aged and died; pay, the taxes the law in
 * force withholds, benefits; what households spend; what firms sell, whom they let go and hire;
 * pay and prices; each ledger's revenue and budget. The nation is the sum of the states: nothing
 * here is a national formula, and nothing is pulled back to a level.
 *
 * Every dollar has a payer and a payee (`countryMoney` is the same before and after a month),
 * and every person is counted once (`countryProblems`). Dollars are whole dollars, a month's
 * unless a name says a year's. The law is passed in, so this file knows no statute.
 */
import type { MacroParameter } from "./macro-model";
import type { CoreAPI } from "./types";

export const COUNTRY_SECTORS = [
  "construction",
  "education-health",
  "financial",
  "government",
  "information",
  "leisure-hospitality",
  "manufacturing",
  "mining-logging",
  "other-services",
  "professional-business",
  "trade-transport-utilities",
] as const;
export type CountrySector = (typeof COUNTRY_SECTORS)[number];
export const COUNTRY_AGE_BANDS = [
  "18-29",
  "30-44",
  "45-64",
  "65-plus",
] as const;
export const COUNTRY_FIFTHS = 5;
const PUBLIC: CountrySector = "government";
const HOMES: CountrySector = "construction";
const OLDEST = COUNTRY_AGE_BANDS.length - 1;
/** Below this a count or a dollar figure is treated as nothing. */
const TINY = 1e-9;

type BySector = Record<CountrySector, number>;

/** Every number the month's rules use, read once from the parameter table (data/country/parameters.json). */
export interface CountryRules {
  monthsPerYear: number;
  adultShare: readonly number[];
  participation: readonly number[];
  fifthPay: readonly number[];
  hoursPerYear: number;
  laborShare: BySector;
  sectorPay: BySector;
  basket: BySector;
  tradedShare: BySector;
  investGoods: BySector;
  lowPay: BySector;
  inputShare: number;
  firmCashMonths: number;
  investPerSales: number;
  investPerGrowth: number;
  investPerRealRatePoint: number;
  homesPerRealRatePoint: number;
  outlayShare: readonly number[];
  cashMonths: readonly number[];
  cashSpentPerMonth: number;
  heldBackPerPoint: number;
  joblessInsuredShare: number;
  retirementYear: readonly number[];
  otherTransferYear: readonly number[];
  salesTaxedShare: number;
  payoutShare: number;
  ownership: readonly number[];
  firmSpread: number;
  staffAdjustPerMonth: number;
  openingsPerSeeker: number;
  postingsLapsePerMonth: number;
  matchSeekerWeight: number;
  payPerLogTightness: number;
  usualTightnessMonths: number;
  pricePassPerMonth: number;
  priceBusyPerYear: number;
  inflationViewMonths: number;
  salesViewMonths: number;
  salesLevelViewMonths: number;
  tradeElasticity: number;
  outsideShareOfOtherBuyers: number;
  outsideGrowthYear: number;
  outsideInflationYear: number;
  outsideElasticity: number;
  overtime: number;
  productivityGrowthYear: number;
  moveIncomeElasticity: number;
  movePushElasticity: number;
  moveJobsPullPerPoint: number;
  birthsPerAdultYear: readonly number[];
  deathsPerYear: readonly number[];
  yearsAsChild: number;
  yearsInBand: readonly number[];
  /** Of people arriving from abroad, the share who are children and the share in each adult age band; together they are everyone. */
  abroadChildShare: number;
  abroadShare: readonly number[];
  lowPayOverFloor: number;
  placeFitPasses: number;
  placeFitStep: number;
  unemploymentViewMonths: number;
}

const pascal = (name: string) =>
  name
    .split("-")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join("");
const BAND_KEYS = ["Age18To29", "Age30To44", "Age45To64", "Age65Plus"];
const FIFTH_KEYS = ["Fifth1", "Fifth2", "Fifth3", "Fifth4", "Fifth5"];

/** The parameter table's rows as the rules the month reads. */
export function countryRules(p: MacroParameter): CountryRules {
  const bands = (name: string) => BAND_KEYS.map((key) => p(`${name}${key}`));
  const fifths = (name: string) => FIFTH_KEYS.map((key) => p(`${name}${key}`));
  const sectors = (name: string) =>
    Object.fromEntries(
      COUNTRY_SECTORS.map((sector) => [sector, p(`${name}${pascal(sector)}`)]),
    ) as BySector;
  return {
    monthsPerYear: p("macroMonthsPerYear"),
    adultShare: bands("countryAdultShare"),
    participation: bands("countryParticipation"),
    fifthPay: fifths("countryPayRelative"),
    hoursPerYear: p("countryHoursPerYear"),
    laborShare: sectors("countryLaborShare"),
    sectorPay: sectors("countrySectorPay"),
    basket: sectors("countryBasket"),
    tradedShare: sectors("countryTraded"),
    investGoods: sectors("countryInvestGoods"),
    lowPay: sectors("countryLowPay"),
    inputShare: p("countryInputShare"),
    firmCashMonths: p("countryFirmCashMonths"),
    investPerSales: p("countryInvestPerSales"),
    investPerGrowth: p("countryInvestPerGrowth"),
    investPerRealRatePoint: p("countryInvestPerRealRatePoint"),
    homesPerRealRatePoint: p("countryHomesPerRealRatePoint"),
    outlayShare: fifths("countryOutlay"),
    cashMonths: fifths("countryCashMonths"),
    cashSpentPerMonth: p("countryCashSpentPerMonth"),
    heldBackPerPoint: p("countryHeldBackPerPoint"),
    joblessInsuredShare: p("countryJoblessInsuredShare"),
    retirementYear: fifths("countryRetirementYear"),
    otherTransferYear: fifths("countryOtherTransferYear"),
    salesTaxedShare: p("countrySalesTaxedShare"),
    payoutShare: p("countryPayoutShare"),
    ownership: fifths("countryOwnership"),
    firmSpread: p("countryFirmSpread"),
    staffAdjustPerMonth: p("countryStaffAdjustPerMonth"),
    openingsPerSeeker: p("countryOpeningsPerSeeker"),
    postingsLapsePerMonth: p("countryOpeningsLapsePerMonth"),
    matchSeekerWeight: p("countryMatchSeekerWeight"),
    payPerLogTightness: p("countryPayPerLogTightness"),
    usualTightnessMonths: p("countryUsualTightnessMonths"),
    pricePassPerMonth: p("countryPricePassPerMonth"),
    priceBusyPerYear: p("countryPriceBusyPerYear"),
    inflationViewMonths: p("countryInflationViewMonths"),
    salesViewMonths: p("countrySalesViewMonths"),
    salesLevelViewMonths: p("countrySalesLevelViewMonths"),
    tradeElasticity: p("countryTradeElasticity"),
    outsideShareOfOtherBuyers: p("countryOutsideShareOfOtherBuyers"),
    outsideGrowthYear: p("countryOutsideGrowthYear"),
    outsideInflationYear: p("countryOutsideInflationYear"),
    outsideElasticity: p("countryOutsideElasticity"),
    overtime: p("countryOvertime"),
    productivityGrowthYear: p("countryProductivityGrowthYear"),
    moveIncomeElasticity: p("countryMoveIncomeElasticity"),
    movePushElasticity: p("countryMovePushElasticity"),
    moveJobsPullPerPoint: p("countryMoveJobsPullPerPoint"),
    birthsPerAdultYear: bands("countryBirthsPerAdultYear"),
    deathsPerYear: bands("countryDeathsPerYear"),
    yearsAsChild: p("countryYearsAsChild"),
    yearsInBand: bands("countryYearsInBand"),
    // Whoever arrives from abroad and is not an adult is a child, so the shares are everyone.
    abroadChildShare:
      1 - bands("countryAbroadShare").reduce((sum, share) => sum + share, 0),
    abroadShare: bands("countryAbroadShare"),
    lowPayOverFloor: p("countryLowPayOverFloor"),
    placeFitPasses: p("countryPlaceFitPasses"),
    placeFitStep: p("countryPlaceFitStep"),
    unemploymentViewMonths: p("countryUnemploymentViewMonths"),
  };
}

/** One income fifth of one age band in one state. */
export interface HouseholdCell {
  fifth: number;
  band: number;
  people: number;
  workers: number;
  seekers: number;
  cash: number;
}

/** One sector's employers in one state. */
export interface SectorCell {
  sector: CountrySector;
  jobs: number;
  /** A full-time worker's pay, dollars a year. */
  pay: number;
  price: number;
  cash: number;
  sales: number;
  /** The month's sales its firms have come to expect, and the monthly growth they expect of them. */
  expectedSales: number;
  expectedGrowth: number;
  /** What one worker's month of work sells for at a price of one. */
  productivity: number;
  /** Buyers the cells do not hold (other firms, the rest of the world), dollars a month at the opening. */
  otherBuyers: number;
  /** Of what the state's buyers want from this sector, the share they buy from outside the country. */
  boughtElsewhereShare: number;
}

/** A state's governments, state and local together. */
export interface StateLedger {
  cash: number;
  /** The budget adopted for the year, dollars a year. */
  budgetYear: number;
  /** Lines the cells do not hold (aid passed on, purchases abroad), dollars a month. */
  passedOn: number;
  /** Revenue the rules do not model (fees, federal aid), dollars a month. */
  otherRevenue: number;
  /** The modeled revenue of each of the last twelve months. */
  revenueMonths: number[];
  pricesAtBudget: number;
}

export interface CountryState {
  id: string;
  /** The jurisdiction key the law is read by, as `US-UT`. */
  key: string;
  fips: string;
  usps: string;
  children: number;
  cells: HouseholdCell[];
  sectors: SectorCell[];
  ledger: StateLedger;
  /** Its prices against the nation's at the opening (1 is the nation), and its own prices since. */
  priceLevel: number;
  prices: number;
  /** Unfilled openings, and how tight its job market is and has usually been. */
  openings: number;
  tightness: number;
  usualTightness: number | null;
  /** Fitted in the first month, then fixed: openings posted for each job added, and how well people and openings find each other. */
  openingsPerJobAdded: number | null;
  matchEfficiency: number | null;
  /** The share looking for work in each of the last few months, oldest first. */
  unemploymentMonths: number[];
  expectedInflation: number;
  /** Fitted once at the opening, then fixed: what draws people here beyond pay and work, and what holds its own people. */
  draw: number;
  homeTie: number;
  /** The share of each age band that leaves for another state in a year, at the opening. */
  leaveYear: number[];
  arrivalsYear: number;
  /** People arriving from abroad in a year, for each resident (the survey's rate, at the opening). */
  abroadYear: number;
  /** What firms paid out last month that this state's owners receive this month. */
  ownersIncome: number;
  /**
   * The federal budget's lines paid to households here at the opening, dollars a year: the
   * cells' benefits follow those lines from then on, as the budget in force changes them.
   */
  federalHouseholdsAtOpening: number;
  /** What each step of the month moved here, for the last twelve months, oldest first (dev mode's Trace reads it). */
  whatMoved: CountryStateMoved[];
}

/** A tax withheld from pay under one law row, dollars. */
export interface CountryWithheldLine {
  lawId: string;
  level: "state" | "federal";
  dollars: number;
}

/**
 * What each step of one state's month moved: the taxes withheld under each law row, what
 * households spent, the jobs added and cut by sector, who arrived and left, and the ledger's
 * revenue and budget. Kept so a trace can open why one month or one world differs from another.
 */
export interface CountryStateMoved {
  /** The tier's month this row is of, counted from the opening. */
  month: number;
  /** Withheld from this month's pay, under each law row read. */
  withheld: CountryWithheldLine[];
  /** What households spent this month, dollars. */
  spent: number;
  /** By sector, in `COUNTRY_SECTORS` order: jobs filled, jobs ended at firms, and jobs left by people who moved away, aged out of work or died. */
  jobsAdded: number[];
  jobsCut: number[];
  jobsVacated: number[];
  /** People who came from another state, left for one, and came from abroad. */
  arrived: number;
  left: number;
  fromAbroad: number;
  /** The federal budget's dollars that reached this state this month, by line, from the budget in force. */
  federal: CountryFederalMonth;
  /** The ledger's revenue this month, dollars, by source. */
  incomeTaxRevenue: number;
  salesTaxRevenue: number;
  profitTaxRevenue: number;
  otherRevenue: number;
  /** The budget in force for the year, dollars a year. */
  budgetYear: number;
}

export interface CountryTier {
  id: string;
  /** Months stepped since the opening. */
  month: number;
  states: CountryState[];
  federalCash: number;
  /** Everything the cells do not hold: the rest of the world, firms' purchases from each other, the financial system. */
  elsewhereCash: number;
  outsideDemand: number;
  outsidePrices: number;
  priceIndex: number;
  /** Real sales against the opening's. */
  salesIndex: number;
  openingRealSales: number;
  /** The central bank's rate, a share a year. */
  policyRate: number;
}

/** Where a federal budget line's dollars go in a state: to its households, to one of its sectors, or out of the cells. */
export type CountryFederalDestination =
  "households" | CountrySector | "elsewhere";

/** One line of the federal budget in force as it reaches one state, dollars a year. */
export interface CountryFederalLine {
  /** The line's key in the budget row (`socialSecurity`). */
  line: string;
  /** The budget row the line is read from. */
  budgetId: string;
  to: CountryFederalDestination;
  dollarsYear: number;
}

/** The federal dollars one state received in a month, dollars. */
export interface CountryFederalMonth {
  /** The budget row read, or null where no federal budget is in force. */
  budgetId: string | null;
  /** Paid to its households as benefits, through the cells. */
  transfers: number;
  /** Bought from its sectors. */
  purchases: number;
  /** Lines whose dollars leave the cells (interest, aid abroad). */
  elsewhere: number;
  /** Each line's dollars this month. */
  lines: { line: string; dollars: number }[];
}

/** The law in force, as the month needs it. The module reads the game's law rows; a test passes its own. */
export interface CountryLaw {
  /** The federal budget in force, line by line, as it reaches this state, dollars a year. */
  federalSpendingYear(state: CountryState): readonly CountryFederalLine[];
  /** What is withheld from one worker's year of pay, dollars a year: for the state, and for the nation (income and payroll taxes). */
  withheld(
    state: CountryState,
    payYear: number,
  ): {
    state: number;
    federal: number;
    /** The same dollars a year by the law row each was withheld under; a row in force that withholds nothing is listed at zero. */
    lines: readonly CountryWithheldLine[];
  };
  /** The general sales tax, a share of the price. */
  salesTaxRate(state: CountryState): number;
  /** The tax on a firm's profit, a share: the state's and the nation's. */
  profitTaxRate(state: CountryState): number;
  federalProfitTaxRate(state: CountryState): number;
  /** The least a full-time worker may be paid, dollars a year. */
  wageFloorYear(state: CountryState): number;
  /** What an insured person out of work is paid, dollars a year, by what they earned. */
  joblessBenefitYear(state: CountryState, payYear: number): number;
  /** How many more people come from abroad than the opening's rate under the law in force (a federal law to admit more immigrants); one when none applies. */
  abroadFactor?(state: CountryState): number;
}

export interface CountryStateOpening {
  key: string;
  fips: string;
  usps: string;
  population: number;
  unemploymentPct: number;
  hourlyPay: number;
  /** Prices against the nation's (1 is the nation). */
  priceLevel: number;
  /** Each sector's share of jobs; empty takes the nation's. */
  mix: Readonly<Partial<Record<CountrySector, number>>>;
  /** State and local spending, dollars a year. */
  budgetYear: number;
  leaveYear: readonly number[];
  arrivalsYear: number;
  /** People arriving from abroad in a year, for each resident. */
  abroadYear: number;
}

export interface CountryOpening {
  states: readonly CountryStateOpening[];
  /** Shares a year. */
  policyRate: number;
  expectedInflation: number;
}

/** What a month came to, for the nation. */
export interface CountryMonth {
  month: number;
  unemploymentPct: number;
  workers: number;
  seekers: number;
  jobs: number;
  population: number;
  sales: number;
  realOutput: number;
  priceIndex: number;
  hourlyPay: number;
  /** Sales wanted against what the staff makes at normal hours, less one. */
  busy: number;
  moved: number;
  births: number;
  deaths: number;
  /** People who arrived from abroad this month. */
  arrived: number;
  /** The month's price change at a yearly rate, a share. */
  inflationYear: number;
}

const sum = (values: readonly number[]) => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};
const zeroBySector = () =>
  Object.fromEntries(COUNTRY_SECTORS.map((sector) => [sector, 0])) as BySector;

// The normal curve (Abramowitz and Stegun 7.1.26), for the spread of firms around their sector's pace.
const ERF = [
  0.3275911, 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429,
] as const;
function erf(x: number): number {
  const t = 1 / (1 + ERF[0] * Math.abs(x));
  const poly =
    ((((ERF[5] * t + ERF[4]) * t + ERF[3]) * t + ERF[2]) * t + ERF[1]) * t;
  const y = 1 - poly * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const density = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
const below = (z: number) => (1 + erf(z / Math.SQRT2)) / 2;

/**
 * A sector's firms do not all move at the sector's pace: around it they are spread, so some
 * shrink while others grow. Of a sector moving at `pace` a month with that spread: the share of
 * jobs ended at shrinking firms and the share opened at growing ones.
 */
export function spreadFlows(
  pace: number,
  spread: number,
): { ended: number; opened: number } {
  const z = pace / spread;
  return {
    ended: spread * density(z) - pace * below(-z),
    opened: spread * density(z) + pace * below(z),
  };
}

export function countryUnemployment(state: CountryState): number {
  let workers = 0,
    seekers = 0;
  for (const cell of state.cells) {
    workers += cell.workers;
    seekers += cell.seekers;
  }
  return workers + seekers > 0 ? seekers / (workers + seekers) : 0;
}

export function countryPeople(state: CountryState): number {
  return sum(state.cells.map((cell) => cell.people)) + state.children;
}

const sectorOf = (state: CountryState, sector: CountrySector) =>
  state.sectors.find((row) => row.sector === sector)!;
const ownersOf = (state: CountryState, rules: CountryRules) =>
  sum(state.cells.map((cell) => cell.people * rules.ownership[cell.fifth]!));

interface Incomes {
  wageBill: number;
  /** Each cell's income after taxes and benefits, in the cells' order. */
  disposable: number[];
  stateTaxes: number;
  federalTaxes: number;
  /** The month's withholding by law row, in the order the rows were first read. */
  withheld: Map<string, CountryWithheldLine>;
  jobless: number;
  transfers: number;
}

/** The federal budget's dollars a year that reach one state by one destination. */
function federalTo(
  law: CountryLaw,
  state: CountryState,
  to: CountryFederalDestination,
): number {
  let dollars = 0;
  for (const line of law.federalSpendingYear(state))
    if (line.to === to) dollars += line.dollarsYear;
  return dollars;
}

/** The federal dollars that reach one state this month, by line, with the cells' benefits as paid. */
function federalMonth(
  law: CountryLaw,
  state: CountryState,
  transfers: number,
  months: number,
): CountryFederalMonth {
  const lines = law.federalSpendingYear(state);
  let purchases = 0,
    elsewhere = 0;
  for (const line of lines)
    if (line.to === "elsewhere") elsewhere += line.dollarsYear / months;
    else if (line.to !== "households") purchases += line.dollarsYear / months;
  return {
    budgetId: lines[0]?.budgetId ?? null,
    transfers,
    purchases,
    elsewhere,
    lines: lines.map((line) => ({
      line: line.line,
      dollars: line.dollarsYear / months,
    })),
  };
}

/** Pay, the taxes the law withholds, and benefits for one state's cells this month. */
function incomes(
  state: CountryState,
  law: CountryLaw,
  prices: number,
  rules: CountryRules,
): Incomes {
  const months = rules.monthsPerYear;
  const wageBill = sum(
    state.sectors.map((row) => (row.jobs * row.pay) / months),
  );
  const relative = sum(
    state.cells.map((cell) => cell.workers * rules.fifthPay[cell.fifth]!),
  );
  const scale = relative > 0 ? (wageBill * months) / relative : 0;
  const owners = ownersOf(state, rules) || 1;
  // Benefits follow the federal budget's household lines against the opening's.
  const toHouseholds = federalTo(law, state, "households");
  const benefits =
    state.federalHouseholdsAtOpening > TINY
      ? toHouseholds / state.federalHouseholdsAtOpening
      : 1;
  const out: Incomes = {
    wageBill,
    disposable: [],
    stateTaxes: 0,
    federalTaxes: 0,
    withheld: new Map(),
    jobless: 0,
    transfers: 0,
  };
  for (const cell of state.cells) {
    const pay = scale * rules.fifthPay[cell.fifth]!;
    const wages = (cell.workers * pay) / months;
    const held = law.withheld(state, pay);
    const toState = (cell.workers * held.state) / months;
    const toNation = (cell.workers * held.federal) / months;
    for (const line of held.lines) {
      let kept = out.withheld.get(line.lawId);
      if (!kept)
        out.withheld.set(
          line.lawId,
          (kept = { lawId: line.lawId, level: line.level, dollars: 0 }),
        );
      kept.dollars += (cell.workers * line.dollars) / months;
    }
    const benefit =
      (cell.seekers *
        rules.joblessInsuredShare *
        law.joblessBenefitYear(state, pay)) /
      months;
    // Retirement income and other aid keep up with prices, as their law has them do.
    const idle = Math.max(0, cell.people - cell.workers - cell.seekers);
    const yearly =
      cell.band === OLDEST
        ? rules.retirementYear[cell.fifth]!
        : rules.otherTransferYear[cell.fifth]!;
    const transfer = (benefits * idle * prices * yearly) / months;
    const paidOut =
      (state.ownersIncome * cell.people * rules.ownership[cell.fifth]!) /
      owners;
    out.stateTaxes += toState;
    out.federalTaxes += toNation;
    out.jobless += benefit;
    out.transfers += transfer;
    out.disposable.push(
      wages - toState - toNation + benefit + transfer + paidOut,
    );
  }
  return out;
}

interface Demands {
  incomes: Incomes;
  /** What households spent, sales tax included. */
  spent: number;
  /** Each cell's cash after the month, in the cells' order. */
  cash: number[];
  salesTax: number;
  /** Set aside out of income, and what was not spent on homes: both leave the cells. */
  setAside: number;
  invested: number;
  publicBudget: number;
  bySector: BySector;
  /** The federal dollars that reached the state this month. */
  federal: CountryFederalMonth;
}

/** What one state's households, governments and firms want to buy from each sector this month. */
function demands(
  tier: CountryTier,
  state: CountryState,
  law: CountryLaw,
  policyRate: number,
  rules: CountryRules,
  opening: boolean,
): Demands {
  const got = incomes(state, law, tier.priceIndex, rules);
  // Households hold back when the share out of work has been rising around them.
  const rising =
    Math.max(0, countryUnemployment(state) - state.unemploymentMonths[0]!) *
    100;
  let spent = 0,
    setAside = 0;
  const cash = state.cells.map((cell, index) => {
    const income = got.disposable[index]!;
    const usual = income * rules.cashMonths[cell.fifth]!;
    if (opening) cell.cash = usual;
    const share = rules.outlayShare[cell.fifth]!;
    // Spend the fifth's share of income, and run cash down or up toward the months of income it keeps on hand.
    const wanted =
      (share * income + rules.cashSpentPerMonth * (cell.cash - usual)) *
      (1 - rules.heldBackPerPoint * rising);
    // A household spends no more than it holds, and never less than nothing.
    const onHand = cell.cash + income;
    const buys = wanted > onHand ? onHand : wanted > 0 ? wanted : 0;
    // What is not spent out of income is saved into assets, which the cells do not hold.
    const saved = Math.min((1 - share) * income, cell.cash + income - buys);
    spent += buys;
    setAside += saved;
    return cell.cash + income - buys - saved;
  });
  const rate = law.salesTaxRate(state);
  const salesTax =
    (spent * rules.salesTaxedShare * rate) / (1 + rules.salesTaxedShare * rate);
  const net = spent - salesTax;
  // Firms and home buyers answer what borrowing costs them after the price rises they expect.
  const realRatePoints = (policyRate - state.expectedInflation) * 100;
  let invested = 0;
  for (const row of state.sectors) {
    if (row.sector === PUBLIC) continue;
    const realGrowthYear =
      row.expectedGrowth * rules.monthsPerYear - state.expectedInflation;
    invested +=
      row.expectedSales *
      rules.investPerSales *
      Math.max(
        0,
        1 +
          rules.investPerGrowth * realGrowthYear -
          rules.investPerRealRatePoint * realRatePoints,
      );
  }
  // The public sector's budget for its own work: what the ledger adopted, less benefits and what it passes on.
  const publicBudget = Math.max(
    0,
    state.ledger.budgetYear / rules.monthsPerYear -
      got.jobless -
      state.ledger.passedOn,
  );
  const bySector = zeroBySector();
  let onSectors = 0;
  for (const sector of COUNTRY_SECTORS) {
    const homes =
      sector === HOMES
        ? Math.max(0, 1 - rules.homesPerRealRatePoint * realRatePoints)
        : 1;
    const households = rules.basket[sector] * net * homes;
    onSectors += households;
    bySector[sector] =
      sector === PUBLIC
        ? publicBudget
        : households + rules.investGoods[sector] * invested;
  }
  // The federal budget's purchases from this state's sectors, line by line.
  // A sector with no jobs left in the state (a played part has taken them all)
  // sells nothing to the budget: its dollars would pile up as sales no one is
  // there to make, and come back inflated with the part's books.
  for (const line of law.federalSpendingYear(state))
    if (
      line.to !== "households" &&
      line.to !== "elsewhere" &&
      state.sectors.some((row) => row.sector === line.to && row.jobs > TINY)
    )
      bySector[line.to] += line.dollarsYear / rules.monthsPerYear;
  return {
    incomes: got,
    spent,
    cash,
    salesTax,
    setAside: setAside + (net - onSectors),
    invested,
    publicBudget,
    bySector,
    federal: federalMonth(law, state, got.transfers, rules.monthsPerYear),
  };
}

/** What a sector's books say of a month's sales: pay, purchases, the taxes on profit and what it pays out. */
function books(
  row: SectorCell,
  sales: number,
  state: CountryState,
  law: CountryLaw,
  rules: CountryRules,
) {
  const wageBill = (row.jobs * row.pay) / rules.monthsPerYear;
  const inputs = Math.max(0, sales - wageBill) * rules.inputShare;
  const profit = sales - wageBill - inputs;
  const taxState = Math.max(0, profit) * law.profitTaxRate(state);
  const taxFederal = Math.max(0, profit) * law.federalProfitTaxRate(state);
  const paidOut =
    Math.max(0, profit - taxState - taxFederal) * rules.payoutShare;
  return { wageBill, inputs, profit, taxState, taxFederal, paidOut };
}

interface Offer {
  net: number;
  unemployment: number;
  share: number;
}

/** What each state offers someone weighing a move: pay after tax against its prices, the chance of work, its size. */
function offersOf(tier: CountryTier, law: CountryLaw): Offer[] {
  const adults = tier.states.map((state) =>
    sum(state.cells.map((cell) => cell.people)),
  );
  const total = sum(adults) || 1;
  return tier.states.map((state, index) => {
    const jobs = sum(state.sectors.map((row) => row.jobs)) || 1;
    const pay = sum(state.sectors.map((row) => row.jobs * row.pay)) / jobs;
    const held = law.withheld(state, pay);
    const prices = (state.priceLevel * state.prices) / tier.priceIndex;
    return {
      net: Math.max(1, pay - held.state - held.federal) / prices,
      unemployment: countryUnemployment(state),
      share: adults[index]! / total,
    };
  });
}

interface Flows {
  arrivals: number[];
  parts: { weights: number[]; total: number; leaving: number[] }[];
}

/**
 * Who leaves each state this month and where they go. A destination's weight is its size, its
 * draw, and how its pay after tax and prices and its chance of work compare with home. More
 * leave a state the better everywhere else looks from it.
 */
function flowsOf(
  tier: CountryTier,
  offers: readonly Offer[],
  rules: CountryRules,
  fitting: boolean,
): Flows {
  const arrivals = tier.states.map(() => 0);
  const parts = tier.states.map((home, h) => {
    const better = tier.states.map((_, d) =>
      d === h
        ? 0
        : rules.moveIncomeElasticity *
            Math.log(offers[d]!.net / offers[h]!.net) +
          rules.moveJobsPullPerPoint *
            (offers[h]!.unemployment - offers[d]!.unemployment) *
            100,
    );
    const sizes = tier.states.map((dest, d) =>
      d === h ? 0 : offers[d]!.share * dest.draw,
    );
    const weights = sizes.map((size, d) => size * Math.exp(better[d]!));
    const total = sum(weights);
    const even = sum(sizes);
    const advantage =
      even > 0 ? sum(sizes.map((size, d) => size * better[d]!)) / even : 0;
    // While the place constants are being fitted, a state's own people leave at the survey's rate.
    if (fitting) home.homeTie = Math.exp(-rules.movePushElasticity * advantage);
    const push = Math.exp(rules.movePushElasticity * advantage) * home.homeTie;
    const leaving = home.cells.map((cell) => {
      const monthly = (home.leaveYear[cell.band]! / rules.monthsPerYear) * push;
      return monthly / (1 + monthly);
    });
    if (total > 0)
      home.cells.forEach((cell, index) => {
        const leavers = cell.people * leaving[index]!;
        for (let d = 0; d < weights.length; d++)
          if (weights[d]) arrivals[d]! += (leavers * weights[d]!) / total;
      });
    return { weights, total, leaving };
  });
  return { arrivals, parts };
}

/** One state's movers this month by the tier's own rule: the share of each age band that leaves for another state, and where they go. */
export interface CountryFlow {
  /** The month's share of each adult age band (`COUNTRY_AGE_BANDS` order) leaving for another state. */
  leavingByBand: number[];
  /** The share of its leavers each state takes, in the tier's state order (none for itself). */
  toShare: number[];
}

/**
 * Who leaves each state this month and where they go, read without moving
 * anyone: the same weights `moves` applies (counted-moves reads them for the
 * played town's own leavers and arrivals, so the tier is the one holder of
 * every state's people).
 */
export function countryFlows(
  tier: CountryTier,
  law: CountryLaw,
  rules: CountryRules,
): CountryFlow[] {
  const { parts } = flowsOf(tier, offersOf(tier, law), rules, false);
  return tier.states.map((home, h) => {
    const { weights, total, leaving } = parts[h]!;
    const leavingByBand = COUNTRY_AGE_BANDS.map(() => 0);
    home.cells.forEach((cell, index) => {
      leavingByBand[cell.band] = leaving[index]!;
    });
    return {
      leavingByBand,
      toShare: weights.map((w) => (total > 0 ? w / total : 0)),
    };
  });
}

/** Every state's people and this month's movers, as the economy engine reads them (`macro.ts` registers it). */
export type CountryFlowsReader = (api: CoreAPI) => {
  readonly states: readonly CountryState[];
  readonly flows: readonly CountryFlow[];
};
let flowsReader: CountryFlowsReader | null = null;
/** The economy engine names its reader of the tier's flows (it reads modules the movers' engine cannot import). */
export function registerCountryFlowsReader(reader: CountryFlowsReader): void {
  flowsReader = reader;
}
/** The tier's states and flows now; empty before the economy opens or where it does not run. */
export function countryFlowsIn(api: CoreAPI): ReturnType<CountryFlowsReader> {
  return flowsReader?.(api) ?? { states: [], flows: [] };
}

const CELL_COUNTS = ["people", "workers", "seekers", "cash"] as const;

/** People move between states, with their cash; a mover who worked arrives looking for work. */
function moves(
  tier: CountryTier,
  law: CountryLaw,
  rules: CountryRules,
): { moved: number; left: number[]; arrived: number[] } {
  const { parts } = flowsOf(tier, offersOf(tier, law), rules, false);
  const arriving = tier.states.map((state) =>
    state.cells.map(() => ({ people: 0, seekers: 0, cash: 0 })),
  );
  const left = tier.states.map(() => 0);
  const arrived = tier.states.map(() => 0);
  let moved = 0;
  tier.states.forEach((home, h) => {
    const { weights, total, leaving } = parts[h]!;
    if (total <= 0) return;
    const workers = sum(home.cells.map((cell) => cell.workers));
    let workersOut = 0;
    home.cells.forEach((cell, index) => {
      const share = leaving[index]!;
      if (!share) return;
      for (let d = 0; d < weights.length; d++) {
        if (!weights[d]) continue;
        const part = (share * weights[d]!) / total;
        const into = arriving[d]![index]!;
        into.people += cell.people * part;
        into.seekers += (cell.workers + cell.seekers) * part;
        into.cash += cell.cash * part;
        arrived[d]! += cell.people * part;
      }
      left[h]! += cell.people * share;
      moved += cell.people * share;
      workersOut += cell.workers * share;
      for (const key of CELL_COUNTS) cell[key] -= cell[key] * share;
    });
    // The jobs they held are empty: their employers have openings next month.
    if (workers > 0)
      for (const row of home.sectors) row.jobs *= 1 - workersOut / workers;
  });
  tier.states.forEach((state, d) =>
    state.cells.forEach((cell, index) => {
      const into = arriving[d]![index]!;
      cell.people += into.people;
      cell.seekers += into.seekers;
      cell.cash += into.cash;
    }),
  );
  return { moved, left, arrived };
}

/** Births, coming of age, aging into the next band, and deaths, at each band's yearly rate. */
function people(
  tier: CountryTier,
  rules: CountryRules,
  law?: CountryLaw,
): { births: number; deaths: number; arrived: number; fromAbroad: number[] } {
  const months = rules.monthsPerYear;
  let births = 0,
    deaths = 0,
    arrived = 0;
  const fromAbroad: number[] = [];
  for (const state of tier.states) {
    const before = sum(state.cells.map((cell) => cell.workers));
    const older = state.cells.map(() => ({
      people: 0,
      workers: 0,
      seekers: 0,
      cash: 0,
    }));
    let born = 0,
      workersGone = 0;
    state.cells.forEach((cell, index) => {
      born += (cell.people * rules.birthsPerAdultYear[cell.band]!) / months;
      const dying = rules.deathsPerYear[cell.band]! / months;
      const years = rules.yearsInBand[cell.band]!;
      const aging = cell.band < OLDEST && years > 0 ? 1 / years / months : 0;
      const next =
        cell.band < OLDEST ? older[index + COUNTRY_FIFTHS]! : undefined;
      // Those who age into the next band work at that band's rate; the rest leave the labor force.
      const stay = next
        ? Math.min(
            1,
            rules.participation[cell.band + 1]! /
              rules.participation[cell.band]!,
          )
        : 0;
      for (const key of CELL_COUNTS) {
        const up = cell[key] * aging;
        const dead = key === "cash" ? 0 : cell[key] * dying;
        const atWork = key === "workers" || key === "seekers";
        if (next) next[key] += atWork ? up * stay : up;
        if (key === "workers") workersGone += up * (1 - stay) + dead;
        if (key === "people") deaths += dead;
        cell[key] -= up + dead;
      }
    });
    const grown = state.children / rules.yearsAsChild / months;
    // People from abroad come from no state's leavers: the state grows by them. The adults
    // arrive looking for work at their age's rate, in every income fifth alike.
    const abroad =
      (countryPeople(state) *
        state.abroadYear *
        (law?.abroadFactor?.(state) ?? 1)) /
      months;
    state.children += born - grown + abroad * rules.abroadChildShare;
    births += born;
    arrived += abroad;
    fromAbroad.push(abroad);
    state.cells.forEach((cell, index) => {
      for (const key of CELL_COUNTS) cell[key] += older[index]![key];
      if (cell.band === 0) {
        cell.people += grown / COUNTRY_FIFTHS;
        cell.seekers += (grown / COUNTRY_FIFTHS) * rules.participation[0]!;
      }
      const came = (abroad * rules.abroadShare[cell.band]!) / COUNTRY_FIFTHS;
      cell.people += came;
      cell.seekers += came * rules.participation[cell.band]!;
    });
    if (before > 0)
      for (const row of state.sectors) row.jobs *= 1 - workersGone / before;
  }
  return { births, deaths, arrived, fromAbroad };
}

/** Every state at the opening, from the figures passed in, with its books made to add up. */
export function openCountry(
  opening: CountryOpening,
  law: CountryLaw,
  rules: CountryRules,
): CountryTier {
  const months = rules.monthsPerYear;
  const nationalMix = zeroBySector();
  let mixed = 0;
  for (const row of opening.states) {
    const total = sum(Object.values(row.mix));
    if (total <= 0) continue;
    mixed += row.population;
    for (const sector of COUNTRY_SECTORS)
      nationalMix[sector] += ((row.mix[sector] ?? 0) / total) * row.population;
  }
  for (const sector of COUNTRY_SECTORS) nationalMix[sector] /= mixed || 1;
  const startGrowth =
    (opening.expectedInflation + rules.outsideGrowthYear) / months;
  const states = opening.states.map((row): CountryState => {
    const own = sum(Object.values(row.mix)) > 0;
    const mix = Object.fromEntries(
      COUNTRY_SECTORS.map((sector) => [
        sector,
        own ? (row.mix[sector] ?? 0) : nationalMix[sector],
      ]),
    ) as BySector;
    const mixTotal = sum(Object.values(mix)) || 1;
    const unemployment = row.unemploymentPct / 100;
    const cells: HouseholdCell[] = [];
    COUNTRY_AGE_BANDS.forEach((_, band) => {
      const adults = row.population * rules.adultShare[band]!;
      for (let fifth = 0; fifth < COUNTRY_FIFTHS; fifth++) {
        const count = adults / COUNTRY_FIFTHS;
        const inWork = count * rules.participation[band]!;
        cells.push({
          fifth,
          band,
          people: count,
          workers: inWork * (1 - unemployment),
          seekers: inWork * unemployment,
          cash: 0,
        });
      }
    });
    const workers = sum(cells.map((cell) => cell.workers));
    const meanPay = sum(
      COUNTRY_SECTORS.map(
        (sector) => (mix[sector] / mixTotal) * rules.sectorPay[sector],
      ),
    );
    const sectors = COUNTRY_SECTORS.map((sector): SectorCell => {
      const jobs = (workers * mix[sector]) / mixTotal;
      const pay =
        (row.hourlyPay * rules.hoursPerYear * rules.sectorPay[sector]) /
        meanPay;
      const sales = (jobs * pay) / months / rules.laborShare[sector];
      return {
        sector,
        jobs,
        pay,
        price: 1,
        cash: sales * rules.firmCashMonths,
        sales,
        expectedSales: sales,
        expectedGrowth: startGrowth,
        productivity: jobs > 0 ? sales / jobs : 0,
        otherBuyers: 0,
        boughtElsewhereShare: 0,
      };
    });
    return {
      id: `country-state:${row.key}`,
      key: row.key,
      fips: row.fips,
      usps: row.usps,
      children: row.population * (1 - sum(rules.adultShare)),
      cells,
      sectors,
      ledger: {
        cash: 0,
        budgetYear: row.budgetYear,
        passedOn: 0,
        otherRevenue: 0,
        revenueMonths: [],
        pricesAtBudget: 1,
      },
      priceLevel: row.priceLevel,
      prices: 1,
      openings: 0,
      tightness: 0,
      usualTightness: null,
      openingsPerJobAdded: null,
      matchEfficiency: null,
      unemploymentMonths: Array.from(
        { length: rules.unemploymentViewMonths },
        () => unemployment,
      ),
      expectedInflation: opening.expectedInflation,
      draw: 1,
      homeTie: 1,
      leaveYear: [...row.leaveYear],
      arrivalsYear: row.arrivalsYear,
      abroadYear: row.abroadYear,
      ownersIncome: 0,
      federalHouseholdsAtOpening: 0,
      whatMoved: [],
    };
  });
  // The benefits the opening's federal budget pays each state's households: the cells' own
  // benefits are what those lines pay, and follow them from then on.
  for (const state of states)
    state.federalHouseholdsAtOpening = federalTo(law, state, "households");
  const tier: CountryTier = {
    id: "country",
    month: 0,
    states,
    federalCash: 0,
    elsewhereCash: 0,
    outsideDemand: 1,
    outsidePrices: 1,
    priceIndex: 1,
    salesIndex: 1,
    openingRealSales: 0,
    policyRate: opening.policyRate,
  };
  balanceOpening(tier, law, rules);
  return tier;
}

/**
 * The opening's books. Each sector's sales and pay fix what its firms pay out; households spend
 * their fifth's share of income and hold its usual cash; what each sector sold beyond what the
 * cells want from it is its other buyers, and what they want beyond what it sold is bought
 * elsewhere from then on; each ledger's unmodeled lines are what balance its budget. Then each
 * state's place constants are fitted once, so that its arrivals at the opening are the survey's.
 */
function balanceOpening(
  tier: CountryTier,
  law: CountryLaw,
  rules: CountryRules,
): void {
  const months = rules.monthsPerYear;
  let paidOut = 0,
    owners = 0;
  for (const state of tier.states) {
    for (const row of state.sectors)
      if (row.sector !== PUBLIC)
        paidOut += books(row, row.sales, state, law, rules).paidOut;
    owners += ownersOf(state, rules);
  }
  for (const state of tier.states)
    state.ownersIncome = (paidOut * ownersOf(state, rules)) / (owners || 1);
  const traded = zeroBySector();
  const made = tier.states.map((state) => {
    const publicSales = sectorOf(state, PUBLIC).sales;
    const first = demands(tier, state, law, tier.policyRate, rules, true);
    // The budget beyond the public sector's own work and benefits is passed on: fixed here.
    state.ledger.passedOn = Math.max(
      0,
      state.ledger.budgetYear / months - first.incomes.jobless - publicSales,
    );
    state.ledger.budgetYear =
      (publicSales + first.incomes.jobless + state.ledger.passedOn) * months;
    const wanted = demands(tier, state, law, tier.policyRate, rules, true);
    for (const sector of COUNTRY_SECTORS)
      traded[sector] += rules.tradedShare[sector] * wanted.bySector[sector];
    return wanted;
  });
  const supply = zeroBySector();
  for (const state of tier.states)
    for (const row of state.sectors) supply[row.sector] += row.sales;
  tier.states.forEach((state, index) => {
    const wanted = made[index]!;
    let profitTax = 0;
    for (const row of state.sectors) {
      const sector = row.sector;
      const fromNation =
        supply[sector] > 0 ? (traded[sector] * row.sales) / supply[sector] : 0;
      const modeled =
        (1 - rules.tradedShare[sector]) * wanted.bySector[sector] + fromNation;
      row.boughtElsewhereShare =
        modeled > row.sales && modeled > 0 ? 1 - row.sales / modeled : 0;
      row.otherBuyers = Math.max(0, row.sales - modeled);
      if (sector !== PUBLIC) {
        profitTax += books(row, row.sales, state, law, rules).taxState;
      }
    }
    state.ledger.otherRevenue =
      state.ledger.budgetYear / months -
      wanted.incomes.stateTaxes -
      wanted.salesTax -
      profitTax;
  });
  tier.openingRealSales = sum(
    tier.states.map((state) => sum(state.sectors.map((row) => row.sales))),
  );
  const offers = offersOf(tier, law);
  for (let pass = 0; pass < rules.placeFitPasses; pass++) {
    const { arrivals } = flowsOf(tier, offers, rules, true);
    tier.states.forEach((state, index) => {
      if (arrivals[index]! > 0)
        state.draw *=
          (state.arrivalsYear / months / arrivals[index]!) **
          rules.placeFitStep;
    });
    // Only the constants' sizes against each other matter: their mean is kept at one.
    const mean =
      sum(tier.states.map((state) => state.draw)) / tier.states.length;
    for (const state of tier.states) state.draw /= mean;
  }
  flowsOf(tier, offers, rules, true);
}

export interface CountryStep {
  law: CountryLaw;
  /** The central bank's rate this month, a share a year. */
  policyRate: number;
  /** The share of a state's jobs a recorded disaster ended this month. */
  jobsLost?: (state: CountryState) => number;
  /**
   * The places a state holds in full (the played town and its county): the part its cells
   * held for them last month, taken out before the state steps, and the part their own
   * records count today, put in after it. Only the rest of the state steps.
   */
  parts?: (
    state: CountryState,
  ) => { out: CountryPart; in: CountryPart } | undefined;
}

/**
 * A part of a state its cells do not step: places simulated in full, counted from their own
 * records. Adults by age band (in `COUNTRY_AGE_BANDS` order), at work and looking; children;
 * the jobs they hold by sector; and their households' cash, whole dollars.
 */
export interface CountryPart {
  people: number[];
  workers: number[];
  seekers: number[];
  children: number;
  jobs: BySector;
  cash: number;
}

/** What a part's records count: the jobs whose employer has no sector of its own (work outside a recorded employer) are not yet given one. */
export interface CountryPartCounts extends Omit<CountryPart, "jobs"> {
  jobs: Partial<BySector>;
  unsortedJobs: number;
}

/** A part's people, at work, looking and jobs: what it adds to its state's figures. */
export function countryPartFigures(part: CountryPart) {
  return {
    population: sum(part.people) + part.children,
    workers: sum(part.workers),
    seekers: sum(part.seekers),
    jobs: sum(COUNTRY_SECTORS.map((sector) => part.jobs[sector])),
  };
}

/**
 * The part as its state holds it: jobs with no sector of their own take the sectors the
 * state's jobs are in, in the same shares; a band never holds more at work and looking than
 * people.
 */
export function resolveCountryPart(
  state: CountryState,
  counts: CountryPartCounts,
): CountryPart {
  const total = sum(state.sectors.map((row) => row.jobs));
  const jobs = zeroBySector();
  for (const row of state.sectors)
    jobs[row.sector] =
      (counts.jobs[row.sector] ?? 0) +
      (total > 0 ? (counts.unsortedJobs * row.jobs) / total : 0);
  const workers = counts.workers.map((n, band) =>
    Math.min(n, counts.people[band]!),
  );
  // A band that counted more workers than it has people is capped; the part's jobs go down by the
  // same share, so a part never carries more jobs than workers whatever its counts.
  const counted = sum(counts.workers);
  const kept = sum(workers);
  if (counted > kept && counted > 0)
    for (const sector of COUNTRY_SECTORS) jobs[sector] *= kept / counted;
  return {
    people: [...counts.people],
    workers,
    seekers: counts.seekers.map((n, band) =>
      Math.min(n, counts.people[band]! - workers[band]!),
    ),
    children: counts.children,
    jobs,
    cash: counts.cash,
  };
}

/** Takes `amounts` out of `values` (one per band, each band's values listed in `bands`), each band's share by what each value holds; what a band cannot give comes from the others. Never below nothing, and a band that gives all it holds is left with exactly nothing, not a floating-point leftover. */
function takeFrom(
  values: number[],
  bands: readonly (readonly number[])[],
  amounts: readonly number[],
): void {
  let spill = 0;
  bands.forEach((band, b) => {
    const held = sum(band.map((at) => values[at]!));
    const taken = Math.min(amounts[b]!, held);
    spill += amounts[b]! - taken;
    if (held > 0)
      for (const at of band)
        values[at] =
          taken === held ? 0 : values[at]! - (taken * values[at]!) / held;
  });
  const left = sum(values);
  const taken = Math.min(spill, left);
  if (left > 0)
    values.forEach(
      (value, at) =>
        (values[at] = taken === left ? 0 : value - (taken * value) / left),
    );
}

/** Adds `amounts` to `values` (one per band), each band's share by what each value holds, evenly where the band holds nothing. */
function addTo(
  values: number[],
  bands: readonly (readonly number[])[],
  amounts: readonly number[],
): void {
  bands.forEach((band, b) => {
    const held = sum(band.map((at) => values[at]!));
    for (const at of band)
      values[at]! +=
        held > 0
          ? (amounts[b]! * values[at]!) / held
          : amounts[b]! / band.length;
  });
}

/**
 * What a state holds that grows with its people beyond its cells: its governments' books and
 * what its owners are paid. Stopgap SG-NATION-town-part-scaled-books: a part's share of these
 * (and of each sector's books, `scaleWithJobs`) goes with its people and jobs, not its own books.
 */
function scaleWithPeople(state: CountryState, factor: number): void {
  const ledger = state.ledger;
  ledger.cash *= factor;
  ledger.budgetYear *= factor;
  ledger.passedOn *= factor;
  ledger.otherRevenue *= factor;
  ledger.revenueMonths = ledger.revenueMonths.map((month) => month * factor);
  state.ownersIncome *= factor;
}

/** What a sector holds that grows with its jobs: its cash, its sales and what its buyers ask. Pay, prices and what a worker makes stay. */
function scaleWithJobs(row: SectorCell, factor: number): void {
  row.cash *= factor;
  row.sales *= factor;
  row.expectedSales *= factor;
  row.otherBuyers *= factor;
}

const bandsOf = (state: CountryState) =>
  COUNTRY_AGE_BANDS.map((_, band) =>
    state.cells.flatMap((cell, at) => (cell.band === band ? [at] : [])),
  );

/** Each cell's count of a kind, and its people neither at work nor looking. */
const cellValues = (state: CountryState) => ({
  workers: state.cells.map((cell) => cell.workers),
  seekers: state.cells.map((cell) => cell.seekers),
  idle: state.cells.map((cell) =>
    Math.max(0, cell.people - cell.workers - cell.seekers),
  ),
  cash: state.cells.map((cell) => cell.cash),
});
const idleOf = (part: CountryPart) =>
  part.people.map((n, band) =>
    Math.max(0, n - part.workers[band]! - part.seekers[band]!),
  );
const setCells = (state: CountryState, values: ReturnType<typeof cellValues>) =>
  state.cells.forEach((cell, at) => {
    cell.workers = values.workers[at]!;
    cell.seekers = values.seekers[at]!;
    cell.people = cell.workers + cell.seekers + values.idle[at]!;
    cell.cash = values.cash[at]!;
  });

/**
 * Takes a part out of its state before the state steps: its people by band (at work, looking,
 * neither), its children, its jobs by sector and its cash, and with them each sector's and
 * the governments' share of what grows with jobs and people. What a band or a sector cannot
 * give comes from the others, so the totals leave whole.
 */
/** A sector's books for one job: what grows with its jobs, divided by them. */
interface BooksPerJob {
  cash: number;
  sales: number;
  expectedSales: number;
  otherBuyers: number;
}

/**
 * The money a part's take-out moved out of its state's books, given back whole when the
 * part is put in (scaled by how the part's people and jobs changed), so the tier's dollars
 * are the same before and after a month (`countryMoney`).
 */
interface HeldMoney {
  ledgerCash: number;
  ownersIncome: number;
  sectorCash: Map<CountrySector, number>;
}

function takeOutPart(
  state: CountryState,
  part: CountryPart,
): { emptied: Map<CountrySector, BooksPerJob>; held: HeldMoney } {
  const people = countryPeople(state);
  const ledgerCash = state.ledger.cash;
  const ownersIncome = state.ownersIncome;
  const bands = bandsOf(state);
  const values = cellValues(state);
  takeFrom(values.workers, bands, part.workers);
  takeFrom(values.seekers, bands, part.seekers);
  takeFrom(values.idle, bands, idleOf(part));
  takeFrom(values.cash, [state.cells.map((_, at) => at)], [part.cash]);
  setCells(state, values);
  state.children -= Math.min(part.children, state.children);
  if (people > 0) scaleWithPeople(state, countryPeople(state) / people);
  const held: HeldMoney = {
    ledgerCash: ledgerCash - state.ledger.cash,
    ownersIncome: ownersIncome - state.ownersIncome,
    sectorCash: new Map(),
  };
  const jobs = state.sectors.map((row) => row.jobs);
  const before = sum(jobs);
  takeFrom(
    jobs,
    state.sectors.map((_, at) => [at]),
    state.sectors.map((row) => part.jobs[row.sector]),
  );
  // A sector the part takes in full keeps its books for one job, to give back with the part's
  // jobs when it is put in: an emptied sector's books are never a leftover that a whole
  // sector's jobs are later scaled from.
  const emptied = new Map<CountrySector, BooksPerJob>();
  state.sectors.forEach((row, at) => {
    if (row.jobs > 0 && jobs[at] === 0)
      emptied.set(row.sector, {
        cash: row.cash / row.jobs,
        sales: row.sales / row.jobs,
        expectedSales: row.expectedSales / row.jobs,
        otherBuyers: row.otherBuyers / row.jobs,
      });
    if (row.jobs > 0) {
      const cash = row.cash;
      scaleWithJobs(row, jobs[at]! / row.jobs);
      if (!emptied.has(row.sector))
        held.sectorCash.set(row.sector, cash - row.cash);
    }
    row.jobs = jobs[at]!;
  });
  if (before > 0) state.openings *= sum(jobs) / before;
  return { emptied, held };
}

/** How the part put in compares with the part taken out: one when they count the same. */
const partRatio = (now: number, then: number) => (then > 0 ? now / then : 1);

/** Puts a part into its state after the state steps: the state's figures are the rest and the part. Returns the sales it added, at their price and in real terms. */
function putInPart(
  state: CountryState,
  part: CountryPart,
  out: CountryPart,
  { emptied, held }: ReturnType<typeof takeOutPart>,
): { sales: number; real: number } {
  const people = countryPeople(state);
  const ledgerCash = state.ledger.cash;
  const ownersIncome = state.ownersIncome;
  const bands = bandsOf(state);
  const values = cellValues(state);
  addTo(values.workers, bands, part.workers);
  addTo(values.seekers, bands, part.seekers);
  addTo(values.idle, bands, idleOf(part));
  addTo(values.cash, [state.cells.map((_, at) => at)], [part.cash]);
  setCells(state, values);
  state.children += part.children;
  if (people > 0) scaleWithPeople(state, countryPeople(state) / people);
  // The books' money comes back as it went out, by the part's people now against then; the
  // rest's own month stays its own (scaling by the stepped rest made or lost dollars each
  // month: 0.005% over twenty years in Hagatna, Guam, seed 407cf5672cb2f1da).
  const byPeople = partRatio(
    sum(part.people) + part.children,
    sum(out.people) + out.children,
  );
  state.ledger.cash = ledgerCash + held.ledgerCash * byPeople;
  state.ownersIncome = ownersIncome + held.ownersIncome * byPeople;
  const before = sum(state.sectors.map((row) => row.jobs));
  const added = { sales: 0, real: 0 };
  for (const row of state.sectors) {
    const jobs = row.jobs + part.jobs[row.sector];
    const perJob = emptied.get(row.sector);
    if (perJob) {
      // The part's jobs come back with the books they took out; the rest keeps what it built
      // from nothing in the month.
      const sales = row.sales;
      const back = part.jobs[row.sector];
      row.cash += perJob.cash * back;
      row.sales += perJob.sales * back;
      row.expectedSales += perJob.expectedSales * back;
      row.otherBuyers += perJob.otherBuyers * back;
      added.sales += row.sales - sales;
      added.real += row.price > 0 ? (row.sales - sales) / row.price : 0;
    } else if (row.jobs > 0) {
      const sales = row.sales;
      const cash = row.cash;
      scaleWithJobs(row, jobs / row.jobs);
      const gave = held.sectorCash.get(row.sector);
      if (gave !== undefined)
        row.cash =
          cash + gave * partRatio(part.jobs[row.sector], out.jobs[row.sector]);
      added.sales += row.sales - sales;
      added.real += row.price > 0 ? (row.sales - sales) / row.price : 0;
    }
    row.jobs = jobs;
  }
  const after = sum(state.sectors.map((row) => row.jobs));
  if (before > 0) state.openings *= after / before;
  return added;
}

/** One month for the whole country. Changes the tier in place and returns what the month came to. */
export function stepCountry(
  tier: CountryTier,
  input: CountryStep,
  rules: CountryRules,
): CountryMonth {
  const { law, policyRate } = input;
  const months = rules.monthsPerYear;
  const first = tier.month === 0;
  const parts = new Map(
    tier.states.flatMap((state) => {
      const part = input.parts?.(state);
      return part ? [[state, part] as const] : [];
    }),
  );
  const takenBy = new Map(
    [...parts].map(([state, part]) => [state, takeOutPart(state, part.out)]),
  );
  // The jobs each state's sectors held as the month opened (the rest, once the parts held in
  // full are out), for what the month moved.
  const jobsAtStart = tier.states.map((state) =>
    state.sectors.map((row) => row.jobs),
  );
  // The month opens with who moved, was born, aged and died; then the economy's month.
  const moved = moves(tier, law, rules);
  const lives = people(tier, rules, law);
  const outsideDemand =
    tier.outsideDemand * (1 + rules.outsideGrowthYear / months);
  const outsidePrices =
    tier.outsidePrices * (1 + rules.outsideInflationYear / months);
  const traded = zeroBySector();
  const made = tier.states.map((state) => {
    const wanted = demands(tier, state, law, policyRate, rules, false);
    for (const sector of COUNTRY_SECTORS)
      traded[sector] += rules.tradedShare[sector] * wanted.bySector[sector];
    return wanted;
  });
  // A traded good is bought across the country from whoever makes it, more from where it is cheaper.
  const supplyOf = (row: SectorCell) =>
    row.jobs * row.productivity * row.price ** -rules.tradeElasticity;
  const supply = zeroBySector();
  for (const state of tier.states)
    for (const row of state.sectors) supply[row.sector] += supplyOf(row);
  // Other buyers: part is the outside world (its own growth, at its prices, answering ours against
  // theirs), part is firms here buying from each other, which follows what the country sells.
  const otherBuyersOf = (row: SectorCell) =>
    row.sector === PUBLIC
      ? row.otherBuyers * tier.priceIndex
      : row.otherBuyers *
        (rules.outsideShareOfOtherBuyers *
          outsideDemand *
          outsidePrices *
          (row.price / outsidePrices) ** -rules.outsideElasticity +
          (1 - rules.outsideShareOfOtherBuyers) *
            tier.salesIndex *
            tier.priceIndex);
  let federal = 0,
    elsewhere = 0,
    paidOut = 0,
    salesTotal = 0,
    pricedTotal = 0,
    realTotal = 0,
    wantedReal = 0,
    normalReal = 0;
  for (const sector of COUNTRY_SECTORS)
    if (supply[sector] <= 0) elsewhere += traded[sector];
  tier.states.forEach((state, index) => {
    const wanted = made[index]!;
    const lostShare = input.jobsLost?.(state) ?? 0;
    let ended = 0,
      posted = 0,
      profitTax = 0;
    const plans = state.sectors.map((row) => {
      const sector = row.sector;
      const fromNation =
        supply[sector] > 0
          ? (traded[sector] * supplyOf(row)) / supply[sector]
          : 0;
      const modeled =
        (1 - rules.tradedShare[sector]) * wanted.bySector[sector] + fromNation;
      const others = otherBuyersOf(row);
      const asked = modeled * (1 - row.boughtElsewhereShare) + others;
      // What its staff makes at normal hours and a little more; buyers take the rest of what they wanted from outside.
      const capacity = row.jobs * row.productivity * (1 + rules.overtime);
      const sold =
        sector !== PUBLIC && capacity > 0
          ? Math.min(asked, capacity * row.price)
          : asked;
      elsewhere += modeled * row.boughtElsewhereShare + (asked - sold) - others;
      // Firms staff for what buyers asked of them, a share of the way each month.
      const perWorker = row.productivity * row.price;
      const staffNeeded = perWorker > 0 ? asked / perWorker : 0;
      const pace =
        row.jobs > 0
          ? rules.staffAdjustPerMonth * (staffNeeded / row.jobs - 1)
          : 0;
      const flows =
        sector === PUBLIC
          ? { ended: Math.max(0, -pace), opened: Math.max(0, pace) }
          : spreadFlows(pace, rules.firmSpread);
      const endedHere = row.jobs * Math.min(1, flows.ended + lostShare);
      const postedHere =
        row.jobs > 0
          ? row.jobs * flows.opened
          : staffNeeded * rules.staffAdjustPerMonth;
      ended += endedHere;
      posted += postedHere;
      wantedReal += row.price > 0 ? asked / row.price : 0;
      normalReal += row.jobs * row.productivity;
      return { row, sold, staffNeeded, ended: endedHere, posted: postedHere };
    });
    // People and openings find each other with friction. Openings are a stock: new ones join,
    // filled and withdrawn ones leave.
    const seekersBefore = sum(state.cells.map((cell) => cell.seekers));
    const workersBefore = sum(state.cells.map((cell) => cell.workers));
    const seekers = seekersBefore + ended;
    if (first) state.openings = seekersBefore * rules.openingsPerSeeker;
    // Fitted in the first month and fixed from then on: as many find work as came to look for it
    // (those let go, moved in, come of age), so the share looking starts where the state has it.
    const steadyHires = Math.max(
      0,
      seekers -
        state.unemploymentMonths.at(-1)! * (workersBefore - ended + seekers),
    );
    state.openingsPerJobAdded ??=
      posted > 0
        ? (steadyHires + rules.postingsLapsePerMonth * state.openings) / posted
        : 1;
    state.openings =
      state.openings * (1 - rules.postingsLapsePerMonth) +
      state.openingsPerJobAdded * posted;
    // The share of those looking who find work in a month rises with the openings there are
    // for each of them and never reaches everyone: however many openings, some people are
    // between jobs. Nothing flips when openings outnumber seekers.
    const reach =
      seekers > 0 && state.openings > 0
        ? (state.openings / seekers) ** (1 - rules.matchSeekerWeight)
        : 0;
    const steadyShare = seekers > 0 ? steadyHires / seekers : 0;
    state.matchEfficiency ??=
      reach > 0 && steadyShare > 0 && steadyShare < 1
        ? -Math.log(1 - steadyShare) / reach
        : 0;
    const hires = Math.min(
      state.openings,
      seekers * (1 - Math.exp(-state.matchEfficiency * reach)),
    );
    state.openings -= hires;
    const tightness = seekers > 0 ? state.openings / seekers : state.tightness;
    state.usualTightness ??= tightness;
    // Pay rises with the price rises people expect and with what a worker makes, faster where
    // workers are harder to find than employers there have been used to.
    const payGrowthYear =
      state.expectedInflation +
      rules.productivityGrowthYear +
      rules.payPerLogTightness *
        Math.log(
          Math.max(tightness, TINY) / Math.max(state.usualTightness, TINY),
        );
    state.cells.forEach((cell, at) => {
      const lost =
        workersBefore > 0 ? (ended * cell.workers) / workersBefore : 0;
      const looking = cell.seekers + lost;
      const hired = seekers > 0 ? (hires * looking) / seekers : 0;
      cell.workers += hired - lost;
      cell.seekers = looking - hired;
      cell.cash = wanted.cash[at]!;
    });
    const floor = law.wageFloorYear(state) * rules.lowPayOverFloor;
    let statePriced = 0,
      stateSales = 0;
    const jobsAdded: number[] = [];
    for (const plan of plans) {
      const { row } = plan;
      const b = books(row, plan.sold, state, law, rules);
      if (row.sector === PUBLIC) {
        // What the public sector buys beyond its payroll.
        const bought = Math.max(0, plan.sold - b.wageBill);
        elsewhere += bought;
        row.cash += plan.sold - b.wageBill - bought;
      } else {
        profitTax += b.taxState;
        federal += b.taxFederal;
        paidOut += b.paidOut;
        elsewhere += b.inputs;
        row.cash += b.profit - b.taxState - b.taxFederal - b.paidOut;
        // Prices follow what a unit costs to make and how busy the staff is, on top of the rises firms expect.
        const unitCost =
          row.productivity > 0
            ? row.pay / months / row.productivity / rules.laborShare[row.sector]
            : row.price;
        const busy = row.jobs > 0 ? plan.staffNeeded / row.jobs : 1;
        row.price *= Math.exp(
          state.expectedInflation / months +
            rules.pricePassPerMonth * Math.log(unitCost / row.price) +
            (rules.priceBusyPerYear / months) * Math.log(Math.max(busy, TINY)),
        );
      }
      if (row.expectedSales > 0) {
        const grew = plan.sold / row.expectedSales - 1;
        // perception: what a sector's firms expect of their sales follows the sales they have had
        row.expectedGrowth +=
          (grew - row.expectedGrowth) / rules.salesViewMonths;
      }
      // perception: the month's sales firms plan around follow the sales they have had
      row.expectedSales +=
        (plan.sold - row.expectedSales) / rules.salesLevelViewMonths;
      row.sales = plan.sold;
      const filled =
        posted > 0
          ? (hires * plan.posted) / posted
          : hires / state.sectors.length;
      jobsAdded.push(filled);
      row.jobs = Math.max(0, row.jobs - plan.ended + filled);
      const grown = row.pay * (1 + payGrowthYear / months);
      row.pay = rules.lowPay[row.sector] > 0 ? Math.max(grown, floor) : grown;
      row.productivity *= 1 + rules.productivityGrowthYear / months;
      stateSales += plan.sold;
      statePriced += row.price * plan.sold;
      realTotal += row.price > 0 ? plan.sold / row.price : 0;
    }
    salesTotal += stateSales;
    pricedTotal += statePriced;
    if (stateSales > 0) state.prices = statePriced / stateSales;
    // The ledger: what it took in, and what it paid for its own work, benefits and the lines passed on.
    const modeledRevenue =
      wanted.incomes.stateTaxes + wanted.salesTax + profitTax;
    state.ledger.cash +=
      modeledRevenue +
      state.ledger.otherRevenue -
      wanted.publicBudget -
      wanted.incomes.jobless -
      state.ledger.passedOn;
    state.ledger.revenueMonths.push(modeledRevenue);
    if (state.ledger.revenueMonths.length > months)
      state.ledger.revenueMonths.shift();
    const opened = jobsAtStart[index]!;
    state.whatMoved.push({
      month: tier.month + 1,
      withheld: [...wanted.incomes.withheld.values()],
      federal: wanted.federal,
      spent: wanted.spent,
      jobsAdded,
      jobsCut: plans.map((plan) => plan.ended),
      jobsVacated: state.sectors.map(
        (row, at) => opened[at]! + jobsAdded[at]! - plans[at]!.ended - row.jobs,
      ),
      arrived: moved.arrived[index]!,
      left: moved.left[index]!,
      fromAbroad: lives.fromAbroad[index]!,
      incomeTaxRevenue: wanted.incomes.stateTaxes,
      salesTaxRevenue: wanted.salesTax,
      profitTaxRevenue: profitTax,
      otherRevenue: state.ledger.otherRevenue,
      budgetYear: state.ledger.budgetYear,
    });
    // Twelve months are kept; older ones are dropped, as the ledger's revenue months are.
    if (state.whatMoved.length > months) state.whatMoved.shift();
    elsewhere +=
      state.ledger.passedOn -
      state.ledger.otherRevenue +
      wanted.setAside -
      wanted.invested;
    // The nation's books: its taxes in, the benefits and purchases its budget pays here out.
    federal +=
      wanted.incomes.federalTaxes -
      wanted.federal.transfers -
      wanted.federal.purchases -
      wanted.federal.elsewhere;
    elsewhere += wanted.federal.elsewhere;
    state.unemploymentMonths.push(countryUnemployment(state));
    state.unemploymentMonths.shift();
    state.tightness = tightness;
    // perception: what employers and workers treat as a normal job market follows the market they have lived in
    state.usualTightness +=
      (tightness - state.usualTightness) / rules.usualTightnessMonths;
  });
  // What firms paid out reaches their owners across the country next month.
  const owners = sum(tier.states.map((state) => ownersOf(state, rules))) || 1;
  for (const state of tier.states)
    state.ownersIncome = (paidOut * ownersOf(state, rules)) / owners;
  // The prices households and firms paid, and the price rises they come to expect.
  const prices = salesTotal > 0 ? pricedTotal / salesTotal : tier.priceIndex;
  // The places held in full go back in: the nation's sales and output are the rest's and theirs.
  for (const [state, part] of parts) {
    const added = putInPart(state, part.in, part.out, takenBy.get(state)!);
    salesTotal += added.sales;
    realTotal += added.real;
  }
  const inflationYear = (prices / tier.priceIndex) ** months - 1;
  for (const state of tier.states)
    // perception: the price rises people expect follow the rises they have lived through
    state.expectedInflation +=
      (inflationYear - state.expectedInflation) / rules.inflationViewMonths;
  tier.month += 1;
  // Each year a state adopts its next budget from the revenue it took in; its unmodeled lines keep up with prices.
  if (tier.month % months === 0)
    for (const state of tier.states) {
      const ledger = state.ledger;
      const risen = prices / ledger.pricesAtBudget;
      ledger.pricesAtBudget = prices;
      ledger.otherRevenue *= risen;
      ledger.passedOn *= risen;
      ledger.budgetYear =
        sum(ledger.revenueMonths) + ledger.otherRevenue * months;
    }
  tier.federalCash += federal;
  tier.elsewhereCash += elsewhere;
  tier.outsideDemand = outsideDemand;
  tier.outsidePrices = outsidePrices;
  tier.salesIndex =
    tier.openingRealSales > 0 ? salesTotal / prices / tier.openingRealSales : 1;
  tier.priceIndex = prices;
  tier.policyRate = policyRate;
  return {
    ...countryTotals(tier, rules),
    realOutput: realTotal,
    busy: normalReal > 0 ? wantedReal / normalReal - 1 : 0,
    moved: moved.moved,
    births: lives.births,
    deaths: lives.deaths,
    arrived: lives.arrived,
    inflationYear,
  };
}

/** The nation as the sum of its states. */
export function countryTotals(
  tier: CountryTier,
  rules: CountryRules,
): Pick<
  CountryMonth,
  | "month"
  | "unemploymentPct"
  | "workers"
  | "seekers"
  | "jobs"
  | "population"
  | "sales"
  | "priceIndex"
  | "hourlyPay"
> {
  let workers = 0,
    seekers = 0,
    population = 0,
    sales = 0,
    paid = 0,
    jobs = 0;
  for (const state of tier.states) {
    for (const cell of state.cells) {
      workers += cell.workers;
      seekers += cell.seekers;
      population += cell.people;
    }
    population += state.children;
    for (const row of state.sectors) {
      sales += row.sales;
      paid += row.jobs * row.pay;
      jobs += row.jobs;
    }
  }
  return {
    month: tier.month,
    unemploymentPct:
      workers + seekers > 0 ? (100 * seekers) / (workers + seekers) : 0,
    workers,
    seekers,
    jobs,
    population,
    sales,
    priceIndex: tier.priceIndex,
    hourlyPay: jobs > 0 ? paid / jobs / rules.hoursPerYear : 0,
  };
}

/** One state's figures, as its screens and the regional rows read them. */
export function countryStateFigures(state: CountryState, rules: CountryRules) {
  let paid = 0,
    jobs = 0,
    sales = 0;
  for (const row of state.sectors) {
    paid += row.jobs * row.pay;
    jobs += row.jobs;
    sales += row.sales;
  }
  return {
    unemploymentPct: 100 * countryUnemployment(state),
    jobs,
    hourlyPay: jobs > 0 ? paid / jobs / rules.hoursPerYear : 0,
    population: countryPeople(state),
    sales,
    prices: state.prices,
  };
}

/** Every dollar the tier holds or owes, with what left the cells: the same before and after a month. */
export function countryMoney(tier: CountryTier): number {
  let total = tier.federalCash + tier.elsewhereCash;
  for (const state of tier.states) {
    total += state.ledger.cash + state.ownersIncome;
    for (const cell of state.cells) total += cell.cash;
    for (const row of state.sectors) total += row.cash;
  }
  return total;
}

/** Counts that cannot be: more at work than people, a negative count, jobs that no worker holds. Empty when the tier is sound. */
export function countryProblems(tier: CountryTier): string[] {
  const problems: string[] = [];
  const slack = 1e-6;
  for (const state of tier.states) {
    let workers = 0,
      jobs = 0;
    for (const cell of state.cells) {
      workers += cell.workers;
      const where = `${state.key} fifth ${cell.fifth + 1} ${COUNTRY_AGE_BANDS[cell.band]}`;
      for (const key of ["people", "workers", "seekers"] as const)
        if (!(cell[key] >= -slack))
          problems.push(`${where}: ${key} is ${cell[key]}`);
      if (cell.workers + cell.seekers > cell.people * (1 + slack) + slack)
        problems.push(
          `${where}: ${cell.workers + cell.seekers} working or looking among ${cell.people} people`,
        );
      if (!Number.isFinite(cell.cash))
        problems.push(`${where}: cash is ${cell.cash}`);
    }
    for (const row of state.sectors) {
      jobs += row.jobs;
      for (const key of ["jobs", "pay", "price", "sales"] as const)
        if (!(row[key] >= 0) || !Number.isFinite(row[key]))
          problems.push(`${state.key} ${row.sector}: ${key} is ${row[key]}`);
    }
    if (!(state.children >= -slack))
      problems.push(`${state.key}: children is ${state.children}`);
    if (Math.abs(jobs - workers) > slack * (1 + workers))
      problems.push(`${state.key}: ${jobs} jobs for ${workers} workers`);
  }
  return problems;
}
