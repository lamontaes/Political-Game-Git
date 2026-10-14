/**
 * Credit, first cut: the town's community bank and the lines it lends to
 * businesses. A business short of cash for a few months of payroll applies;
 * the bank sizes the line from its own capital and the borrower's record on
 * a sliding scale and prices it at prime plus a spread, so rate decisions
 * reprice it. Draws, interest and repayment move through the existing
 * conserving credit writer. Bank books are recorded monthly.
 */
import countyRows from "../../../data/tables/local-business-counts.json" with { type: "json" };
import depositRows from "../../../data/tables/town-deposits.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import { countyPopulationSharesForPlace } from "../../simulation/government-units";
import { lifePlaceByKey } from "../../simulation/life-places";
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import creditData from "../data/credit/credit.json" with { type: "json" };
import territoryData from "../data/credit/territories.json" with { type: "json" };
import creditParameters from "../data/credit/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import type {
  CoreAPI,
  CoreInput,
  CoreModule,
  CoreState,
  Source,
} from "../types";
import { linkCreditLineToPrime, quotedLineRate } from "./macro";
import { chooseAct } from "../choice";
import { transferCash } from "../world-transfer";
import { strongestPulls } from "./jobs";
import type { ActOffer } from "../types";

const CREDIT_PULL = "credit:pull";

export const CREDIT_MODULE_ID = "credit";
export const CREDIT_PARAMETERS = creditParameters as unknown as Readonly<
  Record<string, Parameter>
>;
const p0 = (key: string) => CREDIT_PARAMETERS[key]!.value;

function table(text: string): Map<string, string> {
  return new Map(
    text.split(";").map((row) => {
      const at = row.indexOf(":");
      return [row.slice(0, at), row.slice(at + 1)];
    }),
  );
}
const COUNTY_POPULATION = table(countyRows.COUNTY_BUSINESS_ROWS);
const COUNTY_DEPOSITS = table(depositRows.FDIC_COUNTY_DEPOSITS);
const TERRITORY_FIPS: ReadonlyMap<string, string> = new Map(
  territoryData.territories.map((row) => [
    row.stateJurisdictionKey,
    row.stateFips,
  ]),
);
const TERRITORY_PEOPLE = new Map(
  (regions.regions as { stateFips: string; kind: string; population: number }[])
    .filter((row) => row.kind === "territory")
    .map((row) => [row.stateFips, row.population]),
);
/** Deposits a place's people hold where no county table covers it: its territory's FDIC deposits per resident, else the nation's. */
function fallbackDeposits(usps: string | undefined): number | undefined {
  const fips = usps ? TERRITORY_FIPS.get(usps) : undefined;
  const sum = (filter: (county: string) => boolean) => {
    let total = 0;
    for (const [county, value] of COUNTY_DEPOSITS)
      if (filter(county)) total += Number(value) || 0;
    return total;
  };
  const people = fips ? TERRITORY_PEOPLE.get(fips) : undefined;
  const own = fips ? sum((county) => county.startsWith(fips)) : 0;
  if (own > 0 && people) return own / people;
  let nationPeople = 0;
  for (const [county, row] of COUNTY_POPULATION)
    if (COUNTY_DEPOSITS.has(county))
      nationPeople += Number(row.split(",")[0]) || 0;
  return nationPeople > 0 ? sum(() => true) / nationPeople : undefined;
}

export interface TownBank {
  organizationId: string;
  placeId: string;
  county: string;
  depositsMinor: number;
  openingEquityMinor: number;
}

/** The town's community bank: the town's population share of its county's FDIC deposits, holding its own equity as cash. */
export function townBankFor(input: CoreInput): TownBank | undefined {
  const key = input.placeMetadata?.placeKey;
  const place = key ? lifePlaceByKey(key) : null;
  const geoid = place?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  let deposits = county ? Number(COUNTY_DEPOSITS.get(county)) : NaN;
  let countyPeople = county
    ? Number(COUNTY_POPULATION.get(county)?.split(",")[0])
    : NaN;
  // The town's recorded population, else the people the opening generated for it.
  const recorded = Number(input.placeMetadata?.referencePopulation);
  const townPeople =
    recorded > 0
      ? recorded
      : input.people.length +
        (input.residents?.households ?? []).reduce(
          (n, row) => n + row.people.length,
          0,
        );
  if (!(townPeople > 0)) return undefined;
  if (!(deposits > 0) || !(countyPeople > 0)) {
    // No county deposit table for this place (most island areas): deposits per resident, estimated.
    stopgap("SG-WORLD-credit-island-deposits");
    const perPerson = fallbackDeposits(
      place?.stateJurisdictionKey ?? undefined,
    );
    if (!perPerson) return undefined;
    deposits = perPerson * townPeople;
    countyPeople = townPeople;
  }
  const counts = new Map<string, number>();
  for (const row of input.organizations)
    counts.set(row.placeId, (counts.get(row.placeId) ?? 0) + 1);
  const placeId = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!placeId) return undefined;
  const depositsMinor = Math.round(
    deposits *
      p0("creditDepositsInThousands") *
      p0("creditMinorPerDollar") *
      (Math.min(townPeople, countyPeople) / countyPeople),
  );
  return {
    organizationId: `organization:bank:${placeId}`,
    placeId,
    county: county ?? place?.stateJurisdictionKey ?? "",
    depositsMinor,
    openingEquityMinor: Math.round(
      depositsMinor * p0("creditBankEquityShareOfDeposits"),
    ),
  };
}

/** Adds the town bank to the opening input. It holds only its own equity as cash until accounts hold deposits. */
export function withTownBank(input: CoreInput): CoreInput {
  const bank = townBankFor(input);
  if (!bank) return input;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: input.startedAt,
    citation: creditData.source.citation,
    estimatedFrom: `The town's population share of county ${bank.county}'s deposits, times the median small bank's equity share.`,
  };
  return {
    ...input,
    organizations: [
      ...input.organizations,
      {
        id: bank.organizationId,
        placeId: bank.placeId,
        name: creditData.bankNamePattern.replace(
          "{place}",
          input.placeMetadata?.placeName?.split(",")[0] ?? bank.placeId,
        ),
        kind: creditData.bankKind,
        liquidMinor: bank.openingEquityMinor,
        source,
      },
    ],
  };
}

function store(api: CoreAPI) {
  return api.moduleState(CREDIT_MODULE_ID);
}
const core = (api: CoreAPI) => api.state as CoreState;

function bankOf(api: CoreAPI) {
  const row = store(api).table("banks").get("credit:bank") as
    { organizationId: string; openingEquityMinor: number } | undefined;
  return row?.organizationId ? row : undefined;
}

/** A bank's capital in a one-ledger world: its cash plus what open borrowers still owe it. */
function equity(api: CoreAPI, bankId: string) {
  const c = core(api);
  let principal = 0,
    limits = 0,
    lost = 0;
  for (const row of c.finance.facilities.values()) {
    if (row.lenderId !== bankId) continue;
    const closed = c.finance.businesses.get(row.borrowerId)?.closedAt;
    if (closed) lost += row.principalMinor;
    else {
      principal += row.principalMinor;
      if (row.active) limits += row.limitMinor;
    }
  }
  // Loans it made from its cash (household loans, startup loans, mortgages) are owed back to it.
  let loans = 0;
  for (const row of store(api)
    .table("loans")
    .query("open", [true]) as unknown as LoanRow[])
    if (row.lenderId === bankId) loans += row.balanceMinor;
  // The opening's mortgages it holds were funded by deposits the core doesn't model yet: only the
  // change in what they owe since the opening counts, so a repayment moves cash, not capital.
  const held = heldMortgages(api, bankId);
  const cash = c.organizations.get(bankId)!.liquidMinor;
  return {
    cash,
    principal,
    loans,
    limits,
    lost,
    equity: cash + principal + loans + held.now - held.opening,
  };
}

const openingHeld = new WeakMap<CoreState, number>();

/** What the opening's mortgages held by the bank owe now, and owed at the opening. */
function heldMortgages(api: CoreAPI, bankId: string) {
  const c = core(api);
  if (!c.modules.has("housing")) return { now: 0, opening: 0 };
  let opening = openingHeld.get(c);
  if (opening === undefined) {
    opening = 0;
    const raw = c.placeMetadata?.housingMortgages;
    for (const row of raw
      ? (JSON.parse(raw) as { holderId: string; balanceMinor: number }[])
      : [])
      if (row.holderId === bankId) opening += row.balanceMinor;
    openingHeld.set(c, opening);
  }
  let now = 0;
  const rows = api
    .moduleState("housing")
    .table("mortgages")
    .rows() as unknown as {
    holderId: string;
    balanceMinor: number;
  }[];
  // Before housing opens its table, the opening balances stand.
  if (!rows.length) return { now: opening, opening };
  for (const row of rows) if (row.holderId === bankId) now += row.balanceMinor;
  return { now, opening };
}

/** How willing the town bank is to lend today: falls smoothly as its capital falls below where it opened. */
export function bankAppetite(api: CoreAPI): number {
  const bank = bankOf(api);
  if (!bank) return 0;
  const p = (key: string) => api.parameter(key);
  const capitalRoom =
    equity(api, bank.organizationId).equity / bank.openingEquityMinor;
  return (
    p("one") /
    (p("one") +
      Math.exp(
        -p("creditCapitalAppetiteSlope") * (capitalRoom - p("macroHalf")),
      ))
  );
}

/** The bank's yes to a payment against income: falls smoothly past the federal 43 percent reference. */
export function bankYes(
  api: CoreAPI,
  paymentMinor: number,
  incomeMinor: number,
): number {
  const p = (key: string) => api.parameter(key);
  if (!(incomeMinor > 0)) return 0;
  const dti = (p("macroHundred") * paymentMinor) / incomeMinor;
  return (
    bankAppetite(api) /
    (1 + Math.exp(p("creditDtiSlope") * (dti - p("creditDtiReferencePct"))))
  );
}

/**
 * A home loan from the town bank: the bank pays the seller the principal and
 * the household repays monthly like any loan. Zero when the bank has no room.
 */
export function lendMortgage(
  api: CoreAPI,
  input: {
    householdId: string;
    borrowerId: string;
    sellerId: string;
    principalMinor: number;
    annualRate: number;
    termMonths: number;
  },
): number {
  const bank = bankOf(api);
  if (!bank) return 0;
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const book = equity(api, bank.organizationId);
  const room = Math.max(
    0,
    book.equity * p("creditMaxLimitsPerEquity") - book.limits - book.loans,
  );
  const amount = Math.min(input.principalMinor, room);
  if (amount <= 0) return 0;
  const id = `mortgage-loan:${input.householdId}:${c.date}`;
  const lent = transferCash(
    api,
    id,
    bank.organizationId,
    input.sellerId,
    amount,
    {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: creditData.source.citation,
      estimatedFrom: `A ${input.termMonths}-month home loan at ${(input.annualRate * 100).toFixed(2)}%, paid to the seller.`,
    },
  );
  if (lent <= 0) return 0;
  store(api)
    .table("loans")
    .put({
      id,
      isLoan: true,
      open: true,
      householdId: input.householdId,
      borrowerId: input.borrowerId,
      lenderId: bank.organizationId,
      kind: "mortgage",
      principalMinor: lent,
      balanceMinor: lent,
      annualRate: input.annualRate,
      paymentMinor: Math.round(
        amortizedPayment(lent, input.annualRate, input.termMonths, p),
      ),
      openedAt: c.date,
      pastDueMinor: 0,
      standing: "current",
    });
  return lent;
}

/**
 * What the bank reads of a borrower's record: sales against wages paid so far.
 * Before any wages are paid, the books' own plan stands in: expected yearly
 * demand against planned payroll. The record sets the line's risk spread.
 */
function lineTerms(
  api: CoreAPI,
  books: {
    wagesPaidMinor: number;
    salesReceivedMinor: number;
    annualDemandMinor: number;
    annualPayrollMinor: number;
  },
): { salesToWages: number; record: number; spreadPct: number } {
  const p = (key: string) => api.parameter(key);
  const salesToWages =
    books.wagesPaidMinor > 0
      ? books.salesReceivedMinor / books.wagesPaidMinor
      : books.annualPayrollMinor > 0
        ? books.annualDemandMinor / books.annualPayrollMinor
        : p("zero");
  const record = Math.tanh(salesToWages);
  return {
    salesToWages,
    record,
    spreadPct:
      p("creditPrimeSpreadPct") +
      p("creditRiskSpreadPct") * (p("one") - record),
  };
}

function review(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const bank = bankOf(api);
  if (!bank) return;
  const book = equity(api, bank.organizationId);
  const capitalRoom = book.equity / bank.openingEquityMinor;
  store(api)
    .table("books")
    .put({
      id: `book:${api.state.date}`,
      date: api.state.date,
      ...book,
      capitalRoom,
    });
  // Appetite falls smoothly as capital falls below where the bank opened.
  const appetite =
    p("one") /
    (p("one") +
      Math.exp(
        -p("creditCapitalAppetiteSlope") * (capitalRoom - p("macroHalf")),
      ));
  serviceLoans(api, bank.organizationId);
  let room = Math.max(
    0,
    book.equity * p("creditMaxLimitsPerEquity") - book.limits - book.loans,
  );
  // The owner decides whether to borrow; a business with no recorded owner applies when its cash runs short.
  const owners = c.modules.has("business")
    ? api.moduleState("business").table("owners")
    : undefined;
  const wanted: { id: string; requested: number }[] = [];
  const counted: { id: string; requested: number; score: number }[] = [];
  for (const [id, books] of [...c.finance.businesses].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (books.closedAt || books.creditFacilityId) continue;
    const cover =
      (books.annualPayrollMinor / p("macroMonthsPerYear")) *
      p("creditLineMonthsOfPayroll");
    const cash = c.organizations.get(id)!.liquidMinor;
    const requested = Math.max(0, cover - cash);
    if (!requested) continue;
    const ownerId = (owners?.get(id) as { ownerId?: string } | undefined)
      ?.ownerId;
    if (!ownerId) {
      stopgap("SG-WORLD-credit-business-applies");
      wanted.push({ id, requested });
      continue;
    }
    const monthlySales = books.annualDemandMinor / p("macroMonthsPerYear");
    // The owner weighs the rate the bank will charge this borrower, risk spread and all.
    const rate = quotedLineRate(api, lineTerms(api, books).spreadPct);
    const reasons = {
      baseline: p("creditBorrowBaseline"),
      need: p("creditBorrowNeedWeight") * Math.min(p("one"), requested / cover),
      cost:
        -p("creditBorrowCostWeight") *
        Math.min(
          p("two"),
          (requested * rate) /
            p("macroMonthsPerYear") /
            Math.max(p("one"), monthlySales),
        ),
    };
    if (c.people.has(ownerId)) {
      const choice = chooseAct(c, ownerId, [
        creditOffer("wait", id, {}),
        creditOffer("borrow", id, reasons),
      ]).selected!;
      if (choice.definition.id === creditData.actions.borrow.id)
        wanted.push({ id, requested });
    } else
      counted.push({
        id,
        requested,
        score: reasons.baseline + reasons.need + reasons.cost,
      });
  }
  if (counted.length)
    for (const row of strongestPulls(api, "business-borrow", counted))
      wanted.push({ id: row.id, requested: row.requested });
  for (const { id, requested } of wanted.sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const books = c.finance.businesses.get(id)!;
    const cash = c.organizations.get(id)!.liquidMinor;
    const { salesToWages, record, spreadPct } = lineTerms(api, books);
    const limitMinor = Math.floor(
      Math.min(requested * appetite * record, room),
    );
    store(api)
      .table("applications")
      .put({
        id: `application:${api.state.date}:${id}`,
        organizationId: id,
        date: api.state.date,
        reasonKey: creditData.reasons.applied,
        requestedMinor: Math.round(requested),
        cashMinor: cash,
        salesToWages,
        record,
        capitalRoom,
        appetite,
        limitMinor,
        spreadPct,
        approved: limitMinor > 0,
      });
    if (limitMinor <= 0) continue;
    const facilityId = `facility:${bank.organizationId}:${id}`;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: creditData.source.citation,
      estimatedFrom: `Approved from the bank's capital (${capitalRoom.toFixed(3)} of opening) and the borrower's sales against wages (${salesToWages.toFixed(3)}).`,
    };
    api.addCreditFacility({
      id: facilityId,
      borrowerId: id,
      lenderId: bank.organizationId,
      limitMinor,
      active: true,
      annualInterestParameter: "zero",
      source,
    });
    linkCreditLineToPrime(api, facilityId, spreadPct, source);
    api.attachBusinessCredit(id, facilityId);
    room -= limitMinor;
  }
  householdApplications(
    api,
    bank.organizationId,
    appetite,
    Math.min(
      room,
      c.organizations.get(bank.organizationId)!.liquidMinor *
        p("creditHouseholdMonthlyLendingShare"),
    ),
  );
}

/** A household's month, as its money shows it: cash, its home, everyday living. */
interface HouseholdMonthRow {
  id: string;
  householdId: string;
  date: string;
  cashMinor: number;
  /** The lease or mortgage and any loan payments due this month. */
  housingMinor: number;
  /** Everyday living (cost-of-living.ts) the household meant to spend. */
  everydayMinor: number;
  billsMinor: number;
  paidMinor: number;
  /** What the household's cash didn't cover: everyday living it went without, rent or loan payments it owes. */
  unpaidMinor: number;
  unemploymentMemberIds: string[];
  application?: { id: string; approved: boolean; limitMinor: number };
}

/** Each month, every full household's money: what it holds, what its home and everyday living cost, and what it couldn't pay. */
function householdMonths(api: CoreAPI): HouseholdMonthRow[] {
  const c = core(api);
  // Since the last monthly review: the first of last month.
  const since =
    addDays(makeIsoDate(`${c.date.slice(0, "YYYY-MM".length)}-01`), -1).slice(
      0,
      "YYYY-MM".length,
    ) + "-01";
  const months = new Map<string, HouseholdMonthRow>();
  const rowOf = (householdId: string) => {
    let row = months.get(householdId);
    if (!row) {
      const members = (c.households.get(householdId)?.memberIds ?? [])
        .map((id) => c.people.get(id))
        .filter((person) => person?.alive);
      months.set(
        householdId,
        (row = {
          id: `household-month:${householdId}:${c.date}`,
          householdId,
          date: c.date,
          cashMinor: members.reduce((n, person) => n + person!.liquidMinor, 0),
          housingMinor: 0,
          everydayMinor: 0,
          billsMinor: 0,
          paidMinor: 0,
          unpaidMinor: 0,
          unemploymentMemberIds: [],
        }),
      );
    }
    return row;
  };
  for (const [householdId, ids] of c.finance.obligationsByHousehold)
    for (const id of ids) {
      const receipt = c.finance.latestReceiptsByContract.get(id);
      if (!receipt || receipt.date < since) continue;
      const row = rowOf(householdId);
      row.housingMinor += receipt.requestedMinor;
      row.billsMinor += receipt.requestedMinor;
      row.paidMinor += receipt.paidMinor;
      row.unpaidMinor += receipt.requestedMinor - receipt.paidMinor;
    }
  for (const plan of c.finance.livingPlans.values()) {
    if (!plan.lastAt || plan.lastAt < since) continue;
    const row = rowOf(plan.householdId);
    row.everydayMinor += plan.lastRequestedMinor;
    row.billsMinor += plan.lastRequestedMinor;
    row.paidMinor += plan.lastPaidMinor;
    row.unpaidMinor += plan.lastRequestedMinor - plan.lastPaidMinor;
  }
  const homeOf = new Map<string, string>();
  for (const person of c.people.values())
    if (person.alive) homeOf.set(person.id, person.householdId);
  const claims = c.modules.has("jobs")
    ? (api.moduleState("jobs").table("claims").rows() as unknown as {
        personId: string;
        endedAt?: string;
      }[])
    : [];
  for (const claim of claims) {
    const row = months.get(homeOf.get(claim.personId) ?? "");
    if (row && !claim.endedAt) row.unemploymentMemberIds.push(claim.personId);
  }
  return [...months.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function scheduleReview(api: CoreAPI): void {
  const next =
    addDays(
      makeIsoDate(`${api.state.date.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-01";
  api.moduleCalendar(CREDIT_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: "credit-review",
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: creditData.source.citation,
    },
    sourceRecordIds: ["credit:bank"],
  });
}

export const CREDIT_MODULE: CoreModule = {
  id: CREDIT_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      banks: {},
      books: {},
      applications: { indexes: { byBorrower: { fields: ["organizationId"] } } },
      loans: {
        indexes: {
          open: { fields: ["open"] },
          byHousehold: { fields: ["householdId"] },
        },
      },
      payments: { indexes: { byLoan: { fields: ["loanId"] } } },
      households: { indexes: { byHousehold: { fields: ["householdId"] } } },
    },
  },
  reasonProviders: {
    [CREDIT_PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  onCalendarWork(api, work) {
    if (work.kind !== "credit-review") return;
    const months = householdMonths(api);
    review(api);
    // What the month came to for each household, with any loan it asked for.
    for (const row of months) {
      const application = store(api)
        .table("applications")
        .get(`application:${api.state.date}:${row.householdId}`) as
        { id: string; approved: boolean; limitMinor: number } | undefined;
      store(api)
        .table("households")
        .put({
          ...row,
          ...(application
            ? {
                application: {
                  id: application.id,
                  approved: application.approved,
                  limitMinor: application.limitMinor,
                },
              }
            : {}),
        });
    }
    scheduleReview(api);
  },
  onDay(api) {
    if (store(api).table("banks").get("credit:bank")) return;
    const bank = [...core(api).organizations.values()].find(
      (row) => row.kind === creditData.bankKind,
    );
    // Deposits move into bank accounts when the core's accounts land; until then the bank lends its equity.
    stopgap("SG-WORLD-credit-bank-equity-only");
    store(api)
      .table("banks")
      .put({
        id: "credit:bank",
        organizationId: bank?.id ?? "",
        openingEquityMinor: bank?.liquidMinor ?? 0,
      });
    // Households' months are reviewed with or without a bank in town.
    if (bank) review(api);
    scheduleReview(api);
  },
};

interface LoanRow {
  id: string;
  isLoan: true;
  open: boolean;
  householdId: string;
  borrowerId: string;
  lenderId: string;
  kind: "personal" | "startup" | "mortgage";
  principalMinor: number;
  balanceMinor: number;
  annualRate: number;
  paymentMinor: number;
  openedAt: string;
  pastDueMinor: number;
  firstPastDueAt?: string;
  standing: "current" | "late" | "charged-off" | "paid";
}

/** Monthly payment on an amortized loan. */
export function amortizedPayment(
  principal: number,
  annualRate: number,
  months: number,
  p: (key: string) => number,
): number {
  const r = annualRate / p("macroMonthsPerYear");
  return r > 0
    ? (principal * r) / (1 - (1 + r) ** -months)
    : principal / months;
}

function paidShare(c: CoreState, personId: string, jobId: string): number {
  for (const id of c.work.commitmentsByPerson.get(personId) ?? []) {
    if (c.work.commitments.get(id)?.jobId !== jobId) continue;
    const ledger = c.work.payrollLedgerByCommitment.get(id);
    if (ledger && ledger.dueRecognizedMinor > 0)
      return Math.min(1, ledger.paidMinor / ledger.dueRecognizedMinor);
  }
  return 1;
}

/** A household's monthly pay as a lender counts it: wages times the share of due pay actually paid. */
export function monthlyIncome(
  api: CoreAPI,
  memberIds: readonly string[],
): number {
  const c = core(api),
    members = new Set(memberIds);
  let daily = 0;
  for (const job of c.jobs.values())
    if (job.endsAt === undefined && members.has(job.personId))
      // A lender counts pay that arrives: what the job actually earned from
      // the hours worked, times the share of its due pay actually paid.
      daily += earnedDaily(api, job) * paidShare(c, job.personId, job.id);
  return (
    (daily * api.parameter("jobsDaysPerYear")) /
    api.parameter("macroMonthsPerYear")
  );
}

/**
 * What a job earns a day from the hours actually worked (business audit
 * row 20): its work ledger's earnings over the days it has run in play. A
 * job with less than creditIncomeRecordDays of record reads its wage rate.
 */
function earnedDaily(
  api: CoreAPI,
  job: { id: string; personId: string; wageDailyMinor: number },
): number {
  const c = core(api);
  for (const id of c.work.commitmentsByPerson.get(job.personId) ?? []) {
    const commitment = c.work.commitments.get(id);
    if (!commitment || commitment.jobId !== job.id) continue;
    const ledger = c.work.payrollLedgerByCommitment.get(id);
    if (!ledger) break;
    const since =
      commitment.startsAt > c.startedAt ? commitment.startsAt : c.startedAt;
    const days = daysBetween(makeIsoDate(since), makeIsoDate(c.date));
    if (days < api.parameter("creditIncomeRecordDays")) break;
    return ledger.earnedMinor / days;
  }
  return job.wageDailyMinor;
}

/** Each open loan's payment: what the borrower can pay of it; late, then charged off at 120 days, from real circumstances. */
function serviceLoans(api: CoreAPI, bankId: string): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  for (const loan of store(api)
    .table("loans")
    .query("open", [true]) as unknown as LoanRow[]) {
    const interest =
      (loan.balanceMinor * loan.annualRate) / p("macroMonthsPerYear");
    const due =
      // Past-due amounts are still in the balance: never bill more than is owed.
      Math.min(
        loan.balanceMinor + interest,
        loan.paymentMinor + loan.pastDueMinor,
      );
    const paid = transferCash(
      api,
      `loan-payment:${loan.id}:${c.date}`,
      loan.borrowerId,
      bankId,
      due,
      {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: creditData.source.citation,
        estimatedFrom: `Payment on ${loan.id}: the borrower pays what their cash covers.`,
      },
    );
    const towardInterest = Math.min(paid, interest);
    const balance = Math.max(0, loan.balanceMinor + interest - paid);
    const pastDue = Math.max(0, due - paid);
    const lateDays = loan.firstPastDueAt
      ? (Date.parse(c.date) - Date.parse(loan.firstPastDueAt)) / 86_400_000
      : 0;
    const person = c.people.get(loan.borrowerId);
    let standing: LoanRow["standing"] = pastDue > 0 ? "late" : "current";
    if (balance <= 0) standing = "paid";
    else if (pastDue > 0 && lateDays >= p("creditChargeOffDays"))
      standing = "charged-off";
    store(api)
      .table("payments")
      .put({
        id: `payment:${loan.id}:${c.date}`,
        loanId: loan.id,
        date: c.date,
        dueMinor: Math.round(due),
        paidMinor: paid,
        interestMinor: Math.round(towardInterest),
        cashBeforeMinor: (person?.liquidMinor ?? 0) + paid,
        employed: Boolean(person?.jobId),
        standing,
      });
    const { firstPastDueAt: previousPastDueAt, ...rest } = loan;
    store(api)
      .table("loans")
      .put({
        ...rest,
        ...(pastDue > 0 ? { firstPastDueAt: previousPastDueAt ?? c.date } : {}),
        balanceMinor: Math.round(balance),
        pastDueMinor: Math.round(pastDue),
        standing,
        open: standing !== "paid" && standing !== "charged-off",
        ...(standing === "charged-off"
          ? {
              chargedOffAt: c.date,
              chargeOffCause: person?.jobId
                ? "payments-beyond-cash"
                : "income-lost",
            }
          : {}),
      });
  }
}

/** Households short of money choose whether to borrow; the bank answers from their income and payments, on a sliding scale. */
function householdApplications(
  api: CoreAPI,
  bankId: string,
  appetite: number,
  room: number,
): number {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const prime = (
    api.moduleState("macro").table("state").get("macro:state") as
      { policyRatePct: number } | undefined
  )?.policyRatePct;
  if (prime === undefined) return room;
  const rate =
    (prime + p("macroPrimeSpreadPct") + p("creditPersonalSpreadPct")) /
    p("macroHundred");
  const owing = new Set(
    (
      store(api).table("loans").query("open", [true]) as unknown as LoanRow[]
    ).map((row) => row.householdId),
  );
  // A charge-off stays on the household's credit report for seven years (15 U.S.C. 1681c(a)(4)).
  const reported = new Set(
    (
      store(api).table("loans").rows() as unknown as (LoanRow & {
        chargedOffAt?: string;
      })[]
    )
      .filter(
        (row) =>
          row.standing === "charged-off" &&
          (!row.chargedOffAt ||
            daysBetween(makeIsoDate(row.chargedOffAt), makeIsoDate(c.date)) <
              p("creditReportYears") * p("jobsDaysPerYear")),
      )
      .map((row) => row.householdId),
  );
  for (const household of [...c.households.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (owing.has(household.id) || room <= 0) continue;
    const members = household.memberIds
      .map((id) => c.people.get(id))
      .filter((row) => row?.alive);
    const head = [...members].sort(
      (a, b) =>
        a!.birthDate.localeCompare(b!.birthDate) || a!.id.localeCompare(b!.id),
    )[0];
    if (!head) continue;
    const cash = members.reduce((s, row) => s + row!.liquidMinor, 0);
    const costs =
      members.reduce((s, row) => s + row!.livingCostDailyMinor, 0) *
      p("businessDaysPerMonth");
    if (costs <= 0) continue;
    // Only a real shortfall pulls toward borrowing: cash below a month of costs, by how far below.
    if (cash >= costs) continue;
    const income = monthlyIncome(api, household.memberIds);
    const amount = costs * p("creditPersonalMonthsOfCosts");
    const payment = amortizedPayment(
      amount,
      rate,
      p("creditPersonalTermMonths"),
      p,
    );
    // Only a real shortfall pulls toward borrowing: cash below a month of costs, by how far below.
    const need = Math.max(0, 1 - cash / costs);
    if (need <= 0) continue;
    const burden = income > 0 ? payment / income : Number.POSITIVE_INFINITY;
    const choice = chooseAct(c, head.id, [
      creditOffer("wait", household.id, {}),
      creditOffer("borrow", household.id, {
        baseline: p("creditBorrowBaseline"),
        need: p("creditBorrowNeedWeight") * need,
        cost: -p("creditBorrowCostWeight") * Math.min(burden, p("two")),
      }),
    ]);
    if (choice.selected!.definition.id !== creditData.actions.borrow.id)
      continue;
    // The bank's yes falls smoothly as payments pass the federal 43 percent debt-to-income reference.
    const dti =
      income > 0
        ? (p("macroHundred") * payment) / income
        : Number.POSITIVE_INFINITY;
    // And as what is left after the household's costs and the payment falls below nothing (residual income).
    const residualPct =
      income > 0
        ? (p("macroHundred") * (income - costs - payment)) / income
        : -p("macroHundred");
    const history = reported.has(household.id)
      ? p("creditChargedOffYesShare")
      : 1;
    const yes = Number.isFinite(dti)
      ? (history * appetite) /
        (1 +
          Math.exp(p("creditDtiSlope") * (dti - p("creditDtiReferencePct")))) /
        (1 + Math.exp(-p("creditDtiSlope") * residualPct))
      : 0;
    // Below the smallest loan the bank writes, there is no loan.
    const offered = Math.floor(Math.min(amount * yes, room));
    const principal = offered >= p("creditMinimumLoanMinor") ? offered : 0;
    store(api)
      .table("applications")
      .put({
        id: `application:${c.date}:${household.id}`,
        householdId: household.id,
        organizationId: null,
        borrowerId: head.id,
        date: c.date,
        requestedMinor: Math.round(amount),
        monthlyIncomeMinor: Math.round(income),
        debtToIncomePct: Number.isFinite(dti) ? dti : null,
        residualIncomePct: residualPct,
        appetite,
        approvedShare: yes,
        limitMinor: principal,
        approved: principal > 0,
        kind: "personal",
      });
    if (principal <= 0) continue;
    const lent = transferCash(
      api,
      `loan:${household.id}:${c.date}`,
      bankId,
      head.id,
      principal,
      {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: creditData.source.citation,
        estimatedFrom: `A personal loan at prime plus ${p("creditPersonalSpreadPct")} points, sized from the household's costs and its debt-to-income.`,
      },
    );
    if (lent <= 0) continue;
    store(api)
      .table("loans")
      .put({
        id: `loan:${household.id}:${c.date}`,
        isLoan: true,
        open: true,
        householdId: household.id,
        borrowerId: head.id,
        lenderId: bankId,
        kind: "personal",
        principalMinor: lent,
        balanceMinor: lent,
        annualRate: rate,
        paymentMinor: Math.round(
          amortizedPayment(lent, rate, p("creditPersonalTermMonths"), p),
        ),
        openedAt: c.date,
        pastDueMinor: 0,
        standing: "current",
      });
    room -= lent;
  }
  return room;
}

function creditOffer(
  kind: "wait" | "borrow",
  targetId: string,
  reasons: Record<string, number>,
): ActOffer {
  const row = creditData.actions[kind];
  return {
    definition: {
      id: row.id,
      actKinds: row.actKinds,
      goalKinds: [],
      need: "money",
      effortParameter: "zero",
      effectParameter: "zero",
      targetKind: "credit-option",
      effect: "credit-choice",
    },
    targetId,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: CREDIT_PULL,
      weightParameter: "one",
      arguments: { value: String(value) },
    })),
  };
}

/** A new firm's rate: prime plus the small-business spread and a new firm's risk premium. */
function startupRate(api: CoreAPI): number | undefined {
  const p = (key: string) => api.parameter(key);
  const prime = (
    api.moduleState("macro").table("state").get("macro:state") as
      { policyRatePct: number } | undefined
  )?.policyRatePct;
  if (prime === undefined) return undefined;
  return (
    (prime +
      p("macroPrimeSpreadPct") +
      p("creditPrimeSpreadPct") +
      p("creditRiskSpreadPct")) /
    p("macroHundred")
  );
}

/** What a new business brings to the bank: the owner's own money in it and the plan's monthly profit before the loan. */
export interface FoundingPlan {
  founderId: string;
  equityMinor: number;
  monthlyProfitMinor: number;
}

/**
 * The most the town bank will lend a new business, as SBA lenders
 * underwrite one: no more than its capital allows, the owner's equity at
 * least the required share of the project, and the plan's monthly profit
 * covering the payment with the required margin.
 */
export function foundingLoanLimit(
  api: CoreAPI,
  plan: Omit<FoundingPlan, "founderId">,
  termMonths: number,
): number {
  const bank = bankOf(api);
  const rate = startupRate(api);
  if (!bank || rate === undefined) return 0;
  const p = (key: string) => api.parameter(key);
  const book = equity(api, bank.organizationId);
  const room = Math.max(
    0,
    book.equity * p("creditMaxLimitsPerEquity") - book.limits - book.loans,
  );
  const share = p("creditStartupEquityShare");
  const byEquity = (Math.max(0, plan.equityMinor) * (1 - share)) / share;
  const payment =
    Math.max(0, plan.monthlyProfitMinor) /
    p("creditStartupDebtServiceCoverage");
  const byCashFlow = payment / amortizedPayment(1, rate, termMonths, p);
  return Math.max(0, Math.floor(Math.min(room, byEquity, byCashFlow)));
}

/** A startup loan from the town bank to a newly founded business, underwritten on the owner's equity and the plan, paid back monthly like any loan. */
export function lendForFounding(
  api: CoreAPI,
  firmId: string,
  amountMinor: number,
  termMonths: number,
  plan: FoundingPlan,
): number {
  const bank = bankOf(api);
  const rate = startupRate(api);
  if (!bank || rate === undefined) return 0;
  const p = (key: string) => api.parameter(key);
  const c = core(api);
  const limit = foundingLoanLimit(api, plan, termMonths);
  const requested = Math.max(0, Math.round(amountMinor));
  store(api)
    .table("applications")
    .put({
      id: `application:${c.date}:${firmId}`,
      householdId: null,
      organizationId: firmId,
      borrowerId: plan.founderId,
      date: c.date,
      requestedMinor: requested,
      equityMinor: Math.round(plan.equityMinor),
      monthlyProfitMinor: Math.round(plan.monthlyProfitMinor),
      limitMinor: limit,
      approved: limit > 0 && requested > 0,
      kind: "startup",
    });
  const lent = transferCash(
    api,
    `startup-loan:${firmId}`,
    bank.organizationId,
    firmId,
    Math.min(requested, limit),
    {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: creditData.source.citation,
      estimatedFrom:
        "A startup loan at prime plus the small-business spread and a new firm's risk premium, no larger than the owner's equity and the plan's cash flow support.",
    },
  );
  if (lent <= 0) return 0;
  store(api)
    .table("loans")
    .put({
      id: `loan:startup:${firmId}`,
      isLoan: true,
      open: true,
      householdId: firmId,
      borrowerId: firmId,
      lenderId: bank.organizationId,
      kind: "startup",
      principalMinor: lent,
      balanceMinor: lent,
      annualRate: rate,
      paymentMinor: Math.round(amortizedPayment(lent, rate, termMonths, p)),
      openedAt: c.date,
      pastDueMinor: 0,
      standing: "current",
    });
  return lent;
}
