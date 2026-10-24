/**
 * A treasury pays its adopted budget (budgets engine): once a month each
 * government's revenue from outside the town's own flows arrives, and each
 * line of its budget pays a twelfth of the year. A line pays first what the
 * town's own engines already paid on it (public pay drawn on the line,
 * law-driven benefits), then aid to the lower treasuries in the game, then
 * the town's share of its purchases to the town's business that the
 * government's body awarded the line's contract (the contracts module); the rest goes to the outside account as spending elsewhere, recorded
 * by line. The federal treasury borrows the month's gap from the groups that hold its debt and pays its net interest to them; a
 * state, county or city treasury pays what it holds and records the rest as
 * short. Social Security paid in town follows the federal line.
 */
import { publicPayTreasuries } from "./public-work-pay";
import spendingData from "./data/budgets/treasury-spending.json" with { type: "json" };
import payeeData from "./data/budgets/spending-payees.json" with { type: "json" };
import debtData from "./data/budgets/federal-debt.json" with { type: "json" };
import federalBudget from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import payerData from "./data/budgets/revenue-payers.json" with { type: "json" };
import type { CoreAPI, CoreState, OrganizationInput, Source } from "./types";
import type { ModuleRow } from "./module-data";
import {
  BUDGETS_MODULE_ID,
  baseBudget,
  budgetsOf,
  governments,
  type BudgetRow,
  type GovernmentRow,
} from "./modules/budgets";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { rerateCountedRetirement, residentsRuntime } from "./modules/residents";
import { setRecipientIncomeAmount } from "./finance-state";
import { retirementClaims } from "./modules/retirement-claims";
import { newsKey, storiesHeard, type Story } from "./modules/news";

type Tagged = { value: number; tag: string; source: string; spread?: number[] };
const DATA = spendingData as unknown as {
  parameters: Record<string, Tagged>;
  postLines: { lines: Record<string, string>; federal: string };
  aid: {
    flows: { payer: string; payee: string; revenueLine: string }[];
    fromLines: Record<string, string[]>;
  };
  providers: {
    lines: Record<
      string,
      { classifications: string[]; purchasedShare: Tagged }
    >;
  };
};

const PAYEES = payeeData as unknown as {
  payees: Record<string, { name: string; kind: string }>;
  lines: Record<string, Record<string, number>>;
  fallbackLine: string;
};
/** The id prefix of each kind of payment to a payee group (outside-flows.json rows). */
const PAYEE_PREFIX: Readonly<Record<string, string>> = {
  wages: "treasury-wages",
  purchases: "treasury-purchases",
  benefits: "treasury-benefits",
  bonds: "treasury-bonds",
  grants: "treasury-grants",
};

const DEBT = debtData as unknown as {
  interestLine: string;
  balanceAsOf: string;
  holders: { id: string; name: string; share: number }[];
};

/** What the federal treasury owes one group of lenders. */
export interface DebtRow {
  readonly id: string;
  readonly name: string;
  readonly balanceMinor: number;
  readonly borrowedMinor: number;
  /** Principal repaid. Maturing debt is rolled over, so none is repaid here. */
  readonly repaidMinor: number;
  readonly interestPaidMinor: number;
}

/** Split a total by weights so the parts add up to it exactly (largest remainder). */
function splitBy(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  exact
    .map((x, i) => ({ i, rest: x - Math.floor(x) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
    .forEach(({ i }) => {
      if (left-- > 0) parts[i]! += 1;
    });
  return parts;
}

/**
 * The federal debt by holder. The first read opens each balance at the
 * Treasury's debt held by the public (Debt to the Penny) split by the
 * holders' shares.
 */
export function federalDebtOf(api: CoreAPI): DebtRow[] {
  const rows = table(api, "federalDebt");
  if (!rows.rows().length) {
    const held =
      (federalBudget as unknown as { debtHeldByPublic: Record<string, number> })
        .debtHeldByPublic[DEBT.balanceAsOf] ?? 0;
    const opening = splitBy(
      Math.round(held * 100),
      DEBT.holders.map((h) => h.share),
    );
    DEBT.holders.forEach((h, i) =>
      rows.put({
        id: h.id,
        name: h.name,
        balanceMinor: opening[i]!,
        borrowedMinor: 0,
        repaidMinor: 0,
        interestPaidMinor: 0,
      } as unknown as ModuleRow),
    );
  }
  return DEBT.holders.map((h) => rows.get(h.id) as unknown as DebtRow);
}

const PAYERS = payerData as unknown as {
  lines: Record<
    string,
    {
      payer: { id: string; name: string };
      dueMonths: number[];
      dueDay: number;
    }
  >;
};

export function treasuryParameter(key: string): number {
  const row = DATA.parameters[key];
  if (!row) throw new Error(`Unknown treasury parameter: ${key}`);
  return row.value;
}

const LEVEL_ORDER = { federal: 0, state: 1, county: 2, city: 3 } as const;

/** Revenue lines a flow in the town already pays (withholding, sales tax, property tax). */
const TOWN_PAID_LINES = new Set([
  "individualIncomeTax",
  "payrollTaxes",
  "generalSalesTax",
  "propertyTax",
]);

/** The revenue line of charges for services and fees. */
const FEES_LINE = "chargesAndFees";

/** The part of this government's charges the town's modeled households pay (0 if none). */
function feesPaidInTown(api: CoreAPI, governmentId: string): number {
  const row = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("serviceCharges")
    .get(governmentId) as unknown as
    { share: number; modeledShare: number } | undefined;
  return row && row.share > 0 ? row.modeledShare : 0;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(BUDGETS_MODULE_ID).table(name);

export function budgetInForce(
  api: CoreAPI,
  governmentId: string,
): BudgetRow | undefined {
  return budgetsOf(api, governmentId)
    .filter((b) => b.startsOn <= api.state.date)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .at(-1);
}

function townResidents(api: CoreAPI): number {
  return (
    Number(api.state.placeMetadata.referencePopulation) || api.state.people.size
  );
}

/** The town's residents as a share of the government's (1 for the town's own). */
export function townShareOf(api: CoreAPI, gov: GovernmentRow): number {
  if (gov.level === "city") return 1;
  const residents =
    gov.level === "federal"
      ? treasuryParameter("usResidents2024")
      : gov.residents;
  return residents > 0 ? Math.min(1, townResidents(api) / residents) : 0;
}

/** The outside account public money comes from and goes to: the town's, else any. */
export function outsideAccountOf(api: CoreAPI): string | undefined {
  const town = lawChain(api).townPlaceId;
  return [...api.state.organizations.values()]
    .filter((o) => o.outsideFlow !== undefined)
    .sort(
      (a, b) =>
        Number(b.placeId === town) - Number(a.placeId === town) ||
        a.id.localeCompare(b.id),
    )[0]?.id;
}

/** The line a public post's pay draws on: the longest matching prefix. */
export function lineForPost(level: string, jobId: string): string {
  if (level === "federal") return DATA.postLines.federal;
  const post = jobId.startsWith("job:public:")
    ? jobId.slice("job:public:".length)
    : jobId.startsWith("job:office:")
      ? jobId.slice("job:".length)
      : jobId;
  let best = "";
  for (const prefix of Object.keys(DATA.postLines.lines))
    if (post.startsWith(prefix) && prefix.length > best.length) best = prefix;
  return DATA.postLines.lines[best] ?? DATA.postLines.lines["town:"]!;
}

/** Lines in-town engines pay this month without a payday (law-reach benefits). */
type LinePayer = (api: CoreAPI, gov: GovernmentRow) => Record<string, number>;
const linePayers: LinePayer[] = [];
export function registerLinePayments(payer: LinePayer): void {
  if (!linePayers.includes(payer)) linePayers.push(payer);
}

/**
 * Called for each treasury after its revenue is in and before it pays its
 * lines, with what each line is due this month: an official who controls the
 * money may take some, and the payments then scale to what is left.
 */
type TreasuryBeforePaying = (
  api: CoreAPI,
  gov: GovernmentRow,
  due: Readonly<Record<string, number>>,
) => void;
const beforePayingHooks: TreasuryBeforePaying[] = [];
export function registerTreasuryBeforePaying(hook: TreasuryBeforePaying): void {
  if (!beforePayingHooks.includes(hook)) beforePayingHooks.push(hook);
}

/**
 * Whether an employer and a treasury belong to one government: the same
 * recorded government key, or, for a state's or the nation's office, the same
 * jurisdiction.
 */
export function sameGovernment(
  employer: Pick<OrganizationInput, "governmentFacts">,
  treasury: Pick<OrganizationInput, "governmentFacts">,
): boolean {
  const facts = employer.governmentFacts;
  if (facts?.governmentKey !== undefined)
    return facts.governmentKey === treasury.governmentFacts?.governmentKey;
  return (
    facts?.governmentKind === "jurisdiction" &&
    facts.governmentJurisdictionId !== undefined &&
    facts.governmentJurisdictionId ===
      treasury.governmentFacts?.governmentJurisdictionId
  );
}

/** A payday from a treasury: the pay is that line's money spent in town. */
export function notePublicPay(
  api: CoreAPI,
  input: {
    readonly id: string;
    readonly organizationId: string;
    readonly jobId: string;
    readonly personId: string;
    readonly paidMinor: number;
  },
): void {
  if (input.paidMinor <= 0) return;
  const employer = api.state.organizations.get(input.organizationId);
  // The treasury itself employs a post it hired; an opening employer of the
  // same government (the county's offices) is paid from that treasury.
  const gov = governments(api).find(
    (g) =>
      g.organizationId === input.organizationId ||
      (employer !== undefined &&
        sameGovernment(
          employer,
          api.state.organizations.get(g.organizationId)!,
        )),
  );
  if (!gov) return;
  const line = lineForPost(gov.level, input.jobId);
  const since = (table(api, "sinceClose").get(gov.id) as unknown as
    { lines: Record<string, number> } | undefined) ?? { lines: {} };
  table(api, "sinceClose").put({
    id: gov.id,
    lines: {
      ...since.lines,
      [line]: (since.lines[line] ?? 0) + input.paidMinor,
    },
  } as unknown as ModuleRow);
}

/** What a treasury keeps back at a close: wages for the coming month of the employees it pays, and what it still owes them. */
export function payrollReserve(api: CoreAPI, gov: GovernmentRow): number {
  const core = api.state as CoreState;
  const monthDays =
    treasuryParameter("daysPerYear") / treasuryParameter("monthsPerYear");
  let reserve = 0;
  // Its own post-holders, and the employers of the same government whose
  // payroll it funds (a town's departments): the close must leave their
  // wages in the account, or the lines paid out first leave nothing to pay.
  const funded = new Set<string>([gov.organizationId]);
  const links = publicPayTreasuries(core);
  for (const employer of core.organizations.values()) {
    const authorityId = employer.publicPayAuthority?.id;
    if (
      authorityId !== undefined &&
      links.get(authorityId)?.treasuryId === gov.organizationId
    )
      funded.add(employer.id);
  }
  for (const employerId of funded)
    for (const jobId of core.finance.jobsByOrganization.get(employerId) ?? []) {
      const job = core.jobs.get(jobId);
      if (!job) continue;
      reserve += core.work.totalsByJob.get(jobId)?.arrearsMinor ?? 0;
      if (job.endsAt === undefined) reserve += job.wageDailyMinor * monthDays;
    }
  return Math.round(reserve);
}

/**
 * A tax the town's own payers paid straight to a treasury (a corporation's
 * profit tax): kept against that line so the outside group that pays the
 * rest of the line owes that much less at its next installment, and no dollar
 * of the line is paid twice.
 */
export function noteTownRevenue(
  api: CoreAPI,
  input: {
    readonly governmentId: string;
    readonly line: string;
    readonly paidMinor: number;
  },
): void {
  if (input.paidMinor <= 0) return;
  const id = `${input.governmentId}:${input.line}`;
  const had =
    (
      table(api, "townRevenue").get(id) as unknown as
        { minor: number } | undefined
    )?.minor ?? 0;
  table(api, "townRevenue").put({
    id,
    minor: had + input.paidMinor,
  } as unknown as ModuleRow);
}

/**
 * The room left this year on the line a public post's pay draws on: the
 * government's whole line (its offices serve all its residents) less the
 * yearly pay of everyone the treasury already pays from it.
 */
export function publicPayRoom(
  api: CoreAPI,
  employerId: string,
  post: string,
): number {
  const gov = governments(api).find((g) => g.organizationId === employerId);
  if (!gov) return 0;
  const budget = budgetInForce(api, gov.id);
  if (!budget) return 0;
  const line = lineForPost(gov.level, post);
  const core = api.state as CoreState;
  let committed = 0;
  for (const job of core.jobs.values())
    if (
      job.organizationId === employerId &&
      job.endsAt === undefined &&
      lineForPost(gov.level, job.id) === line
    )
      committed += job.wageDailyMinor * treasuryParameter("daysPerYear");
  // Only the part of a line that is wages can pay a post: the rest buys
  // goods and services, makes benefit payments or pays interest.
  const wages = (PAYEES.lines[line] ?? PAYEES.lines[PAYEES.fallbackLine]!)
    .workers;
  return Math.round(
    (budget.spendingMinor[line] ?? 0) * (wages ?? 0) - committed,
  );
}

/**
 * The most a post may pay a day: the wage room its budget line has left,
 * shared evenly by the posts still to fill on that line. A small town's
 * department head is paid what the line carries, as the pay source says
 * ("small towns pay less"); undefined where no budget is in force, so the
 * post is paid its usual rate.
 */
export function postPayCapDaily(
  api: CoreAPI,
  employerId: string,
  post: string,
  postsToFill: number,
): number | undefined {
  const gov = governments(api).find((g) => g.organizationId === employerId);
  if (!gov || !budgetInForce(api, gov.id)) return undefined;
  const room = Math.max(0, publicPayRoom(api, employerId, post));
  return Math.floor(
    room / Math.max(1, postsToFill) / treasuryParameter("daysPerYear"),
  );
}

export interface TreasuryLine {
  readonly dueMinor: number;
  readonly inTownMinor: number;
  readonly aidMinor: number;
  readonly providersMinor: number;
  readonly outsideMinor: number;
  readonly shortMinor: number;
}

export interface TreasuryMonthRow {
  readonly id: string;
  readonly governmentId: string;
  readonly date: string;
  readonly budgetId: string;
  readonly revenueFromOutsideMinor: number;
  /** Wages of the government's opening employers the treasury couldn't cover, in all, at the close. */
  readonly publicPayShortfallMinor: number;
  readonly aidReceivedMinor: number;
  readonly aidPaidMinor: number;
  readonly borrowedMinor: number;
  /** The month's borrowing and interest, by group of lenders. */
  readonly borrowedByHolder: Readonly<Record<string, number>>;
  readonly interestByHolder: Readonly<Record<string, number>>;
  readonly lines: Readonly<Record<string, TreasuryLine>>;
  /** Every payment this close made, by transfer id. */
  readonly paymentIds: readonly string[];
}

/** A town business that bids for a kind of public work: how many it employs and what a worker costs it a day. */
export interface ProviderFirm {
  readonly organizationId: string;
  readonly staff: number;
  /** The mean daily wage across its jobs, the cost its bid rests on. */
  readonly wageDailyMinor: number;
}

/** The town's businesses that do each kind of work. */
function providersIndex(api: CoreAPI): Map<string, ProviderFirm[]> {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const kinds = new Set(
    Object.values(DATA.providers.lines).flatMap((l) => l.classifications),
  );
  const staff = new Map<string, { n: number; wages: number }>();
  const count = (orgId: string, wageDailyMinor: number) => {
    const org = core.organizations.get(orgId);
    if (
      !org ||
      org.placeId !== town ||
      org.outsideFlow !== undefined ||
      !kinds.has(org.classification ?? "")
    )
      return;
    const row = staff.get(orgId) ?? { n: 0, wages: 0 };
    row.n += 1;
    row.wages += wageDailyMinor;
    staff.set(orgId, row);
  };
  for (const job of core.jobs.values())
    if (job.endsAt === undefined) count(job.organizationId, job.wageDailyMinor);
  const rt = residentsRuntime(core);
  if (rt)
    for (const job of rt.jobs.values())
      if (!core.jobs.has(job.id)) count(job.organizationId, job.wageDailyMinor);
  const out = new Map<string, ProviderFirm[]>();
  for (const [orgId, row] of [...staff].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const kind = core.organizations.get(orgId)!.classification!;
    out.set(kind, [
      ...(out.get(kind) ?? []),
      {
        organizationId: orgId,
        staff: row.n,
        wageDailyMinor: row.wages / row.n,
      },
    ]);
  }
  return out;
}

/** The contract a government's body awarded for one spending line. */
export interface ContractAward {
  readonly id: string;
  readonly organizationId: string;
}

/** What the contracts module gives the treasury: who won a line's work, and a record of each payment. */
export interface ContractAwarder {
  award(
    api: CoreAPI,
    input: {
      readonly gov: GovernmentRow;
      readonly line: string;
      readonly monthlyMinor: number;
      readonly firms: readonly ProviderFirm[];
    },
  ): ContractAward | null;
  paid(
    api: CoreAPI,
    awardId: string,
    payment: { readonly id: string; readonly amountMinor: number },
  ): void;
}
let contractAwarder: ContractAwarder | null = null;
/** The contracts module registers how a government's body chooses among bids. */
export function registerContractAwarder(awarder: ContractAwarder): void {
  contractAwarder = awarder;
}

/** What this treasury couldn't cover of its opening employers' wages, by the core's own record. */
function publicPayShortfallOf(api: CoreAPI, gov: GovernmentRow): number {
  let total = 0;
  for (const [authorityId, link] of publicPayTreasuries(api.state))
    if (link.treasuryId === gov.organizationId)
      total += api.publicPayShortfallMinor(authorityId);
  return total;
}

/**
 * What a treasury receives from outside the town's flows in a month: each
 * revenue line, less the part the town's own flows pay (withholding, sales
 * tax, property tax) and the town's modeled households pay (charges and fees).
 * `townPaysFees` false gives the figure before the households paid any fees.
 */
export function outsideRevenueMonthly(
  api: CoreAPI,
  gov: GovernmentRow,
  budget: BudgetRow,
  aided: ReadonlySet<string>,
  townPaysFees = true,
): number {
  const away = 1 - townShareOf(api, gov);
  let annual = 0;
  for (const [line, amount] of Object.entries(budget.revenueMinor)) {
    if (aided.has(`${gov.level}|${line}`)) continue;
    // A tax with named payers is paid by them on its due dates, below.
    if (PAYERS.lines[line]) continue;
    // The town's modeled households pay their part of a government's
    // charges and fees out of their living costs (budgets-service-charges.ts).
    if (line === FEES_LINE) {
      annual += amount * (townPaysFees ? 1 - feesPaidInTown(api, gov.id) : 1);
      continue;
    }
    annual += TOWN_PAID_LINES.has(line) ? amount * away : amount;
  }
  return Math.round(annual / treasuryParameter("monthsPerYear"));
}

/** Revenue lines a treasury in the game pays as aid, by payee level. */
export function aidedLines(
  api: CoreAPI,
  govs: readonly GovernmentRow[] = governments(api),
): Set<string> {
  const levels = new Set(govs.map((g) => g.level));
  return new Set(
    DATA.aid.flows
      .filter((f) => levels.has(f.payer as GovernmentRow["level"]))
      .map((f) => `${f.payee}|${f.revenueLine}`),
  );
}

/** The month's close for every treasury: revenue in, then each budget line out, top down. */
export function closeTreasuries(api: CoreAPI, source: Source): void {
  const outside = outsideAccountOf(api);
  if (!outside) return;
  const accounts = api.accounts();
  const date = api.state.date;
  const months = treasuryParameter("monthsPerYear");
  const govs = [...governments(api)].sort(
    (a, b) =>
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.id.localeCompare(b.id),
  );
  const budgets = new Map(
    govs.map((g) => [g.id, budgetInForce(api, g.id)] as const),
  );
  const aided = aidedLines(api, govs);
  const fromOutside = new Map<string, number>();
  for (const gov of govs) {
    const budget = budgets.get(gov.id);
    if (!budget) continue;
    const monthly = outsideRevenueMonthly(api, gov, budget, aided);
    if (monthly <= 0) continue;
    const receipt = accounts.transfer({
      id: `outside-revenue:${gov.id}:${date}`,
      from: accounts.main(outside),
      to: accounts.main(gov.organizationId),
      amountMinor: monthly,
      reasonKey: "outside-revenue",
      source,
    });
    fromOutside.set(gov.id, receipt.paidMinor);
    table(api, "outsideRevenue").put({
      id: receipt.id,
      governmentId: gov.id,
      date,
      amountMinor: receipt.paidMinor,
    } as unknown as ModuleRow);
  }
  // The taxes with named payers: each installment due last month is paid by
  // its group of payers, the due date recorded.
  const lastMonth = new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 2, 1),
  )
    .toISOString()
    .slice(0, 7);
  const dueMonth = Number(lastMonth.slice(5, 7));
  for (const gov of govs) {
    const budget = budgets.get(gov.id);
    if (!budget) continue;
    for (const [line, rule] of Object.entries(PAYERS.lines)) {
      const annual = budget.revenueMinor[line] ?? 0;
      if (annual <= 0 || !rule.dueMonths.includes(dueMonth)) continue;
      // What the town's own payers already paid on this line comes off the
      // installment, the rest carrying to the next one.
      const installment = Math.round(annual / rule.dueMonths.length);
      const townId = `${gov.id}:${line}`;
      const townPaid =
        (
          table(api, "townRevenue").get(townId) as unknown as
            { minor: number } | undefined
        )?.minor ?? 0;
      const credited = Math.min(townPaid, installment);
      table(api, "townRevenue").put({
        id: townId,
        minor: townPaid - credited,
      } as unknown as ModuleRow);
      const receipt = accounts.transfer({
        id: `treasury-tax:${line}:${rule.payer.id}:${gov.id}:${date}`,
        from: accounts.main(outside),
        to: accounts.main(gov.organizationId),
        amountMinor: installment - credited,
        reasonKey: "treasury-tax",
        source,
      });
      table(api, "taxPayments").put({
        id: receipt.id,
        governmentId: gov.id,
        line,
        payerId: rule.payer.id,
        payerName: rule.payer.name,
        dueOn: `${lastMonth}-${String(rule.dueDay).padStart(2, "0")}`,
        date,
        amountMinor: receipt.paidMinor,
        installmentMinor: installment,
        townPaidMinor: credited,
      } as unknown as ModuleRow);
    }
  }
  const providers = providersIndex(api);
  const aidReceived = new Map<string, number>();
  const total = (lines: Readonly<Record<string, number>>) =>
    Object.values(lines).reduce((a, b) => a + b, 0);
  for (const gov of govs) {
    const budget = budgets.get(gov.id);
    if (!budget) continue;
    // Where the finances record a jurisdiction's whole government at a lower
    // level (one government doing both jobs), this treasury carries no lines
    // of its own: what it collects passes to the government below that
    // carries the budget.
    if (!total(budget.spendingMinor) && !total(budget.revenueMinor)) {
      const carrier = govs.find(
        (g) =>
          LEVEL_ORDER[g.level] > LEVEL_ORDER[gov.level] &&
          total(budgets.get(g.id)?.spendingMinor ?? {}) > 0,
      );
      const main = accounts.main(gov.organizationId);
      const held = Math.max(0, accounts.balance(main));
      const paymentIds: string[] = [];
      if (carrier && held > 0) {
        const id = `treasury-aid:${gov.id}:${carrier.id}:passThrough:${date}`;
        const paid = accounts.transfer({
          id,
          from: main,
          to: accounts.main(carrier.organizationId),
          amountMinor: held,
          reasonKey: "treasury-aid",
          source,
        }).paidMinor;
        aidReceived.set(carrier.id, (aidReceived.get(carrier.id) ?? 0) + paid);
        paymentIds.push(id);
      }
      table(api, "treasuryMonths").put({
        id: `treasury-month:${gov.id}:${date}`,
        governmentId: gov.id,
        date,
        budgetId: budget.id,
        revenueFromOutsideMinor: fromOutside.get(gov.id) ?? 0,
        publicPayShortfallMinor: publicPayShortfallOf(api, gov),
        aidReceivedMinor: aidReceived.get(gov.id) ?? 0,
        aidPaidMinor: carrier ? held : 0,
        borrowedMinor: 0,
        borrowedByHolder: {},
        interestByHolder: {},
        lines: {},
        paymentIds,
      } satisfies TreasuryMonthRow as unknown as ModuleRow);
      continue;
    }
    const since =
      (
        table(api, "sinceClose").get(gov.id) as unknown as
          { lines: Record<string, number> } | undefined
      )?.lines ?? {};
    table(api, "sinceClose").put({ id: gov.id, lines: {} } as ModuleRow);
    const inTown: Record<string, number> = { ...since };
    for (const payer of linePayers)
      for (const [line, minor] of Object.entries(payer(api, gov)))
        inTown[line] = (inTown[line] ?? 0) + minor;
    // A line pays its twelfth and whatever it fell short last month.
    const owed =
      (
        table(api, "arrears").get(gov.id) as unknown as
          { lines: Record<string, number> } | undefined
      )?.lines ?? {};
    const due: Record<string, number> = {};
    for (const [line, amount] of Object.entries(budget.spendingMinor))
      due[line] = Math.round(amount / months);
    for (const [line, minor] of Object.entries(owed))
      due[line] = (due[line] ?? 0) + minor;
    // Aid to each lower treasury, charged to the lines that carry it.
    const aid: { to: GovernmentRow; line: string; minor: number }[] = [];
    for (const flow of DATA.aid.flows) {
      if (flow.payer !== gov.level) continue;
      for (const to of govs.filter((g) => g.level === flow.payee)) {
        const minor = Math.round(
          (budgets.get(to.id)?.revenueMinor[flow.revenueLine] ?? 0) / months,
        );
        if (minor > 0) aid.push({ to, line: flow.revenueLine, minor });
      }
    }
    const aidTotal = aid.reduce((s, a) => s + a.minor, 0);
    const fromLines = (DATA.aid.fromLines[gov.level] ?? []).filter(
      (l) => (due[l] ?? 0) > 0,
    );
    const fromDue = fromLines.reduce((s, l) => s + due[l]!, 0);
    const aidCharged: Record<string, number> = {};
    let charged = 0;
    fromLines.forEach((line, i) => {
      const share =
        i === fromLines.length - 1
          ? Math.min(due[line]!, aidTotal - charged)
          : Math.min(due[line]!, Math.round((aidTotal * due[line]!) / fromDue));
      aidCharged[line] = Math.max(0, share);
      charged += aidCharged[line]!;
    });
    // The town's share of each line's purchases, to the town's businesses.
    const share = townShareOf(api, gov);
    const awarded: Record<string, ContractAward> = {};
    const plan: Record<string, { providers: number; outside: number }> = {};
    for (const [line, d] of Object.entries(due)) {
      const left = Math.max(
        0,
        d - (inTown[line] ?? 0) - (aidCharged[line] ?? 0),
      );
      const rule = DATA.providers.lines[line];
      const firms = rule
        ? rule.classifications.flatMap((k) => providers.get(k) ?? [])
        : [];
      const bought = rule
        ? Math.min(left, Math.round(d * share * rule.purchasedShare.value))
        : 0;
      // The body chooses among the town's firms; with no firm, or no
      // contracts engine, the purchase goes to the outside account.
      const award =
        bought > 0 && firms.length && contractAwarder
          ? contractAwarder.award(api, {
              gov,
              line,
              monthlyMinor: bought,
              firms,
            })
          : null;
      const providerMinor = award ? bought : 0;
      if (award) awarded[line] = award;
      plan[line] = { providers: providerMinor, outside: left - providerMinor };
    }
    const need =
      aidTotal +
      Object.values(plan).reduce((s, p) => s + p.providers + p.outside, 0);
    const main = accounts.main(gov.organizationId);
    for (const hook of beforePayingHooks) hook(api, gov, due);
    // The next month's wages, and any earned and unpaid, are kept back from
    // the lines so the payroll is paid first (a treasury that spent it all at
    // each close left its own employees unpaid).
    let have =
      accounts.balance(main) -
      (gov.level === "federal" ? 0 : payrollReserve(api, gov));
    let borrowed = 0;
    const borrowedByHolder: Record<string, number> = {};
    const interestByHolder: Record<string, number> = {};
    if (gov.level === "federal" && have < need) {
      // The U.S. Treasury borrows what the month's payments need beyond what
      // it holds, issued to the groups that hold its debt in their shares.
      const holders = federalDebtOf(api);
      const wanted = splitBy(
        need - Math.max(0, have),
        DEBT.holders.map((h) => h.share),
      );
      holders.forEach((holder, i) => {
        if (wanted[i]! <= 0) return;
        const paid = accounts.transfer({
          id: `federal-borrowing:${holder.id}:${gov.id}:${date}`,
          from: accounts.main(outside),
          to: main,
          amountMinor: wanted[i]!,
          reasonKey: "federal-borrowing",
          source: {
            tag: "SOURCED",
            citation:
              "U.S. Treasury, Monthly Treasury Statement fiscal 2025: outlays beyond receipts are financed by borrowing from the public; the holders and their shares are src/core2/data/budgets/federal-debt.json",
            asOf: date,
          },
        }).paidMinor;
        borrowedByHolder[holder.id] = paid;
        borrowed += paid;
        table(api, "federalDebt").put({
          ...holder,
          balanceMinor: holder.balanceMinor + paid,
          borrowedMinor: holder.borrowedMinor + paid,
        } as unknown as ModuleRow);
      });
      have += borrowed;
    }
    const scale = need > 0 ? Math.min(1, Math.max(0, have) / need) : 1;
    const paymentIds: string[] = [];
    const pay = (
      id: string,
      to: string,
      amount: number,
      reasonKey: string,
    ): number => {
      const amountMinor = Math.floor(amount * scale);
      if (amountMinor <= 0) return 0;
      const receipt = accounts.transfer({
        id,
        from: main,
        to,
        amountMinor,
        reasonKey,
        source,
        partial: true,
      });
      if (receipt.paidMinor > 0) paymentIds.push(id);
      return receipt.paidMinor;
    };
    let aidPaid = 0;
    for (const a of aid) {
      const paid = pay(
        `treasury-aid:${gov.id}:${a.to.id}:${a.line}:${date}`,
        accounts.main(a.to.organizationId),
        a.minor,
        "treasury-aid",
      );
      aidPaid += paid;
      aidReceived.set(a.to.id, (aidReceived.get(a.to.id) ?? 0) + paid);
    }
    const lines: Record<string, TreasuryLine> = {};
    for (const [line, d] of Object.entries(due)) {
      const p = plan[line]!;
      let providersPaid = 0;
      const winner = awarded[line];
      if (winner) {
        const id = `treasury:${gov.id}:${line}:${winner.organizationId}:${date}`;
        providersPaid = pay(
          id,
          accounts.main(winner.organizationId),
          p.providers,
          `treasury-spending:${line}`,
        );
        if (providersPaid > 0)
          contractAwarder?.paid(api, winner.id, {
            id,
            amountMinor: providersPaid,
          });
      }
      let outsidePaid = 0;
      if (gov.level === "federal" && line === DEBT.interestLine) {
        // Net interest is paid to the groups that hold the debt, by what each holds.
        const holders = federalDebtOf(api);
        const owed = splitBy(
          p.outside,
          holders.map((h) => h.balanceMinor),
        );
        holders.forEach((holder, i) => {
          const paid = pay(
            `treasury-interest:${holder.id}:${gov.id}:${date}`,
            accounts.main(outside),
            owed[i]!,
            "treasury-interest",
          );
          if (paid <= 0) return;
          outsidePaid += paid;
          interestByHolder[holder.id] = paid;
          const row = table(api, "federalDebt").get(
            holder.id,
          ) as unknown as DebtRow;
          table(api, "federalDebt").put({
            ...row,
            interestPaidMinor: row.interestPaidMinor + paid,
          } as unknown as ModuleRow);
        });
      } else {
        // The part of the line that leaves the town goes to the groups the
        // line pays, each by its share of the line.
        const shares = PAYEES.lines[line] ?? PAYEES.lines[PAYEES.fallbackLine]!;
        const groups = Object.entries(shares);
        const owed = splitBy(
          p.outside,
          groups.map(([, share]) => share),
        );
        groups.forEach(([payeeId], i) => {
          const payee = PAYEES.payees[payeeId]!;
          const id = `${PAYEE_PREFIX[payee.kind]}:${payeeId}:${gov.id}:${line}:${date}`;
          const paid = pay(
            id,
            accounts.main(outside),
            owed[i]!,
            `treasury-spending:${payee.kind}`,
          );
          if (paid <= 0) return;
          outsidePaid += paid;
          table(api, "spendingPayments").put({
            id,
            governmentId: gov.id,
            line,
            payeeId,
            payeeName: payee.name,
            kind: payee.kind,
            date,
            amountMinor: paid,
          } as unknown as ModuleRow);
        });
      }
      const aidLine = aidCharged[line] ?? 0;
      // Aid is paid in full before the lines when it can be; charge it at the paid rate.
      const aidPaidLine =
        aidTotal > 0 ? Math.round((aidLine * aidPaid) / aidTotal) : 0;
      lines[line] = {
        dueMinor: d,
        inTownMinor: inTown[line] ?? 0,
        aidMinor: aidPaidLine,
        providersMinor: providersPaid,
        outsideMinor: outsidePaid,
        shortMinor: Math.max(
          0,
          d - (inTown[line] ?? 0) - aidPaidLine - providersPaid - outsidePaid,
        ),
      };
    }
    // In-town pay on a line the budget doesn't carry is still spending from it.
    for (const [line, minor] of Object.entries(inTown))
      if (!lines[line] && minor > 0)
        lines[line] = {
          dueMinor: 0,
          inTownMinor: minor,
          aidMinor: 0,
          providersMinor: 0,
          outsideMinor: 0,
          shortMinor: 0,
        };
    const short: Record<string, number> = {};
    for (const [line, row] of Object.entries(lines))
      if (row.shortMinor > 0) short[line] = row.shortMinor;
    table(api, "arrears").put({ id: gov.id, lines: short } as ModuleRow);
    table(api, "treasuryMonths").put({
      id: `treasury-month:${gov.id}:${date}`,
      governmentId: gov.id,
      date,
      budgetId: budget.id,
      revenueFromOutsideMinor: fromOutside.get(gov.id) ?? 0,
      publicPayShortfallMinor: publicPayShortfallOf(api, gov),
      aidReceivedMinor: aidReceived.get(gov.id) ?? 0,
      aidPaidMinor: aidPaid,
      borrowedMinor: borrowed,
      borrowedByHolder,
      interestByHolder,
      lines,
      paymentIds,
    } satisfies TreasuryMonthRow as unknown as ModuleRow);
  }
  applySocialSecurityLevel(api);
  attributeLanded(api);
}

interface LandedRow {
  readonly id: string;
  readonly personId: string;
  readonly obligationId: string;
  readonly date: string;
  readonly measureId: string;
  readonly lawId: string;
  readonly series: string;
  readonly share: number;
  readonly learnedFrom?: string;
}

/**
 * A change to someone's award lands on them: their next payment is smaller
 * or larger, and they feel it, by the share of the award it moved. Nothing
 * here says why. Whether they tie it to the law that did it is what they
 * learn (`attributeLanded`).
 */
function landOn(
  api: CoreAPI,
  personId: string,
  obligationId: string,
  from: number,
  to: number,
  measureId: string | undefined,
): void {
  const person = api.state.people.get(personId);
  if (!person?.alive || from <= 0) return;
  const share = (to - from) / from;
  const scale = treasuryParameter("benefitChangeImpulseScale");
  const id = `event:law.effect-landed:${api.state.date}:${obligationId}`;
  api.emit({
    id,
    date: api.state.date,
    kind: "law.effect-landed",
    personIds: [personId],
    placeId: person.placeId,
    moodImpulse: scale * share,
    stressImpulse: scale * Math.max(0, -share),
    facts: {
      obligationId,
      fromMinor: String(from),
      toMinor: String(to),
    },
    publicRecord: false,
    source: {
      tag: "SOURCED",
      citation: "Social Security award changed with the federal line",
      asOf: api.state.date,
    },
  });
  const lawId = measureId?.split("#")[0] ?? "";
  const law = lawId
    ? (api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as unknown as
        { series?: string } | undefined)
    : undefined;
  const row: LandedRow = {
    id,
    personId,
    obligationId,
    date: api.state.date,
    measureId: measureId ?? "",
    lawId,
    series: law?.series ?? "",
    share,
  };
  table(api, "landed").put(row as unknown as ModuleRow);
  attribute(api, row);
}

/**
 * Someone ties a change to their award to the law that did it only when they
 * learned of it: a story they heard about the law, or about the Social
 * Security line it changed. Then they hold a view on that law, citing the
 * story; until then they only felt the change.
 */
function attribute(api: CoreAPI, row: LandedRow): void {
  if (row.learnedFrom || !row.series) return;
  const story = storiesHeard(api, row.personId).find(
    (s) =>
      (row.lawId && s.facts.lawId === row.lawId) ||
      (s.kind === "budget-line-changed" &&
        s.facts.line === "socialSecurity" &&
        s.facts.measureId === row.measureId),
  );
  if (!story) return;
  const person = api.state.people.get(row.personId);
  if (!person?.alive) return;
  const scale = treasuryParameter("benefitChangeImpulseScale");
  api.emit({
    id: `event:law.effect-learned:${api.state.date}:${row.obligationId}`,
    date: api.state.date,
    kind: "law.effect-learned",
    personIds: [row.personId],
    placeId: person.placeId,
    topic: row.series,
    desiredChange: row.share < 0 ? "repeal" : "enact",
    moodImpulse: scale * row.share,
    stressImpulse: scale * Math.max(0, -row.share),
    facts: {
      lawId: row.lawId,
      measureId: row.measureId,
      learnedFrom: newsKey(story.id),
      landedId: row.id,
    },
    publicRecord: false,
    source: {
      tag: "SOURCED",
      citation: `Learned from ${story.id} that ${row.lawId} changed their Social Security`,
      asOf: api.state.date,
    },
  });
  table(api, "landed").put({
    ...row,
    learnedFrom: story.id,
  } as unknown as ModuleRow);
}

/**
 * The story that taught a person why their award changed, for the learned
 * event with this id: its row on the landed table names the story it cites.
 */
export function learnedStoryOf(
  api: CoreAPI,
  personId: string,
  learnedEventId: string,
): Story | undefined {
  const row = (table(api, "landed").rows() as unknown as LandedRow[]).find(
    (r) =>
      r.personId === personId &&
      r.learnedFrom &&
      learnedEventId.endsWith(`:${r.obligationId}`),
  );
  return row?.learnedFrom
    ? storiesHeard(api, personId).find((s) => s.id === row.learnedFrom)
    : undefined;
}

/** Each close, recipients who since heard why their award changed tie it to the law. */
export function attributeLanded(api: CoreAPI): void {
  for (const row of table(api, "landed").rows() as unknown as LandedRow[])
    if (!row.learnedFrom) attribute(api, row);
}

export function treasuryMonthsOf(
  api: CoreAPI,
  governmentId: string,
): readonly TreasuryMonthRow[] {
  return table(api, "treasuryMonths").query("byGovernment", [
    governmentId,
  ]) as unknown as TreasuryMonthRow[];
}

/** The federal Social Security line in force against its base (1 = base). */
export function socialSecurityLevel(api: CoreAPI): number {
  const federal = governments(api).find((g) => g.level === "federal");
  const budget = federal && budgetInForce(api, federal.id);
  if (!federal || !budget) return 1;
  const base = baseBudget(api, federal, Number(budget.startsOn.slice(0, 4)))
    .spendingMinor.socialSecurity;
  const now = budget.spendingMinor.socialSecurity;
  return base && now !== undefined ? now / base : 1;
}

const CAUSE_ROW = "cause:socialSecurity";

/**
 * Social Security paid in town reads the federal line: each award claimed in
 * play is its base amount times the line against its base, from the next
 * payment on. Each recipient whose award a measure changed hears of it: the
 * change lands on them as an event their drives and views read, about the
 * law that did it.
 */
export function applySocialSecurityLevel(
  api: CoreAPI,
  cause?: { readonly measureId: string },
): void {
  const core = api.state as CoreState;
  const level = socialSecurityLevel(api);
  const bases = table(api, "awardBase");
  if (cause)
    bases.put({ id: CAUSE_ROW, measureId: cause.measureId } as ModuleRow);
  const measureId = (
    bases.get(CAUSE_ROW) as unknown as { measureId: string } | undefined
  )?.measureId;
  const baseOf = (id: string, amount: number) => {
    const row = bases.get(id) as unknown as { baseMinor: number } | undefined;
    if (row) return row.baseMinor;
    bases.put({ id, baseMinor: amount } as unknown as ModuleRow);
    return amount;
  };
  const target = (id: string, amount: number) =>
    Math.round(baseOf(id, amount) * level);
  const accounts = api.accounts();
  for (const [personId, claim] of retirementClaims(core)) {
    if (claim.counted) continue;
    const obligation = accounts.obligation(claim.obligationId);
    if (!obligation || obligation.endedAt) continue;
    const want = target(claim.obligationId, claim.monthlyMinor);
    if (want === obligation.amountMinor) continue;
    const from = obligation.amountMinor;
    accounts.setObligationAmount(claim.obligationId, want, {
      tag: "SOURCED",
      citation: "Federal Social Security line in force against its base",
      asOf: api.state.date,
    });
    landOn(api, personId, claim.obligationId, from, want, measureId);
  }
  // The awards the opening wrote for full people are recipient income
  // contracts: each takes its new amount from its next due date, and the
  // funding that pays its payer moves by the same dollars.
  for (const contract of [...core.finance.contracts.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      contract.kind !== "income.retirement" ||
      contract.endedAt !== undefined ||
      !contract.recipientIncome
    )
      continue;
    const want = target(`income:${contract.id}`, contract.amountMinor);
    if (want === contract.amountMinor) continue;
    const changed = setRecipientIncomeAmount(core, api, contract.id, want, {
      measureId: measureId ?? "budget:socialSecurity",
    });
    landOn(
      api,
      contract.recipientIncome.personId,
      contract.id,
      changed.fromMinor,
      changed.toMinor,
      measureId,
    );
  }
  // Counted recipients' awards, pooled in the residents' flows, follow the
  // same line (OPUS-CORE, one model, two tiers).
  rerateCountedRetirement(core, level);
}
