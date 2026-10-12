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
import { countyPopulationSharesForPlace } from "../../simulation/government-units";
import { lifePlaceByKey } from "../../simulation/life-places";
import { addDays, makeIsoDate } from "../../simulation/dates";
import creditData from "../data/credit/credit.json" with { type: "json" };
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
import { linkCreditLineToPrime } from "./macro";
import { chooseAct } from "../choice";
import { transferCash } from "../world-transfer";
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
  const deposits = county ? Number(COUNTY_DEPOSITS.get(county)) : NaN;
  const countyPeople = county
    ? Number(COUNTY_POPULATION.get(county)?.split(",")[0])
    : NaN;
  const townPeople = Number(input.placeMetadata?.referencePopulation);
  if (!county || !(deposits > 0) || !(countyPeople > 0) || !(townPeople > 0))
    return undefined;
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
    county,
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
  return store(api).table("banks").get("credit:bank") as
    { organizationId: string; openingEquityMinor: number } | undefined;
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
  const cash = c.organizations.get(bankId)!.liquidMinor;
  return { cash, principal, limits, lost, equity: cash + principal };
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
    book.equity * p("creditMaxLimitsPerEquity") - book.limits,
  );
  // Owners decide to borrow once businesses have them (M1-08); until then the books decide.
  stopgap("SG-WORLD-credit-business-applies");
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
    const salesToWages =
      books.wagesPaidMinor > 0
        ? books.salesReceivedMinor / books.wagesPaidMinor
        : p("one");
    const record = Math.tanh(salesToWages);
    const limitMinor = Math.floor(
      Math.min(requested * appetite * record, room),
    );
    const spreadPct =
      p("creditPrimeSpreadPct") +
      p("creditRiskSpreadPct") * (p("one") - record);
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
    Math.min(room, c.organizations.get(bank.organizationId)!.liquidMinor),
  );
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
    },
  },
  reasonProviders: {
    [CREDIT_PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  onCalendarWork(api, work) {
    if (work.kind !== "credit-review") return;
    review(api);
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
    if (bank) {
      review(api);
      scheduleReview(api);
    }
  },
};

interface LoanRow {
  id: string;
  isLoan: true;
  open: boolean;
  householdId: string;
  borrowerId: string;
  lenderId: string;
  kind: "personal";
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

function monthlyIncome(api: CoreAPI, memberIds: readonly string[]): number {
  const c = core(api),
    members = new Set(memberIds);
  let daily = 0;
  for (const job of c.jobs.values())
    if (job.endsAt === undefined && members.has(job.personId))
      daily += job.wageDailyMinor;
  return (
    (daily * api.parameter("jobsDaysPerYear")) /
    api.parameter("macroMonthsPerYear")
  );
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
      Math.min(loan.balanceMinor + interest, loan.paymentMinor) +
      loan.pastDueMinor;
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
    const income = monthlyIncome(api, household.memberIds);
    const amount = costs * p("creditPersonalMonthsOfCosts");
    const payment = amortizedPayment(
      amount,
      rate,
      p("creditPersonalTermMonths"),
      p,
    );
    const need = 1 / (1 + cash / costs);
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
    const yes = Number.isFinite(dti)
      ? appetite /
        (1 + Math.exp(p("creditDtiSlope") * (dti - p("creditDtiReferencePct"))))
      : 0;
    const principal = Math.floor(Math.min(amount * yes, room));
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
