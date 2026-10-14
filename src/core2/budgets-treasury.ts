/**
 * A treasury pays its adopted budget (budgets engine): once a month each
 * government's revenue from outside the town's own flows arrives, and each
 * line of its budget pays a twelfth of the year. A line pays first what the
 * town's own engines already paid on it (public pay drawn on the line,
 * law-driven benefits), then aid to the lower treasuries in the game, then
 * the town's share of its purchases to the town's businesses that do that
 * work; the rest goes to the outside account as spending elsewhere, recorded
 * by line. The federal treasury borrows the month's gap from outside; a
 * state, county or city treasury pays what it holds and records the rest as
 * short. Social Security paid in town follows the federal line.
 */
import spendingData from "./data/budgets/treasury-spending.json" with { type: "json" };
import type { CoreAPI, CoreState, Source } from "./types";
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
import { residentsRuntime } from "./modules/residents";
import { retirementClaims } from "./modules/retirement-claims";
import { newsKey, storiesHeard } from "./modules/news";

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

interface PublicPayRow {
  readonly id: string;
  readonly governmentId: string;
  readonly line: string;
  readonly jobId: string;
  readonly personId: string;
  readonly date: string;
  readonly amountMinor: number;
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
  const gov = governments(api).find(
    (g) => g.organizationId === input.organizationId,
  );
  if (!gov) return;
  const line = lineForPost(gov.level, input.jobId);
  table(api, "publicPay").put({
    id: `line-pay:${input.id}`,
    governmentId: gov.id,
    line,
    jobId: input.jobId,
    personId: input.personId,
    date: api.state.date,
    amountMinor: input.paidMinor,
  } satisfies PublicPayRow as unknown as ModuleRow);
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

/**
 * The room left this year on the line a public post's pay draws on: the
 * town's share of the line less the yearly pay of everyone the treasury
 * already pays from it.
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
  return Math.round(
    (budget.spendingMinor[line] ?? 0) * townShareOf(api, gov) - committed,
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
  readonly aidReceivedMinor: number;
  readonly aidPaidMinor: number;
  readonly borrowedMinor: number;
  readonly lines: Readonly<Record<string, TreasuryLine>>;
  /** Every payment this close made, by transfer id. */
  readonly paymentIds: readonly string[];
}

/** The town's businesses that do each kind of work, with how many they employ. */
function providersIndex(api: CoreAPI): Map<string, [string, number][]> {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const kinds = new Set(
    Object.values(DATA.providers.lines).flatMap((l) => l.classifications),
  );
  const staff = new Map<string, number>();
  const count = (orgId: string) => {
    const org = core.organizations.get(orgId);
    if (
      !org ||
      org.placeId !== town ||
      org.outsideFlow !== undefined ||
      !kinds.has(org.classification ?? "")
    )
      return;
    staff.set(orgId, (staff.get(orgId) ?? 0) + 1);
  };
  for (const job of core.jobs.values())
    if (job.endsAt === undefined) count(job.organizationId);
  const rt = residentsRuntime(core);
  if (rt)
    for (const job of rt.jobs.values())
      if (!core.jobs.has(job.id)) count(job.organizationId);
  const out = new Map<string, [string, number][]>();
  for (const [orgId, n] of [...staff].sort(([a], [b]) => a.localeCompare(b))) {
    const kind = core.organizations.get(orgId)!.classification!;
    out.set(kind, [...(out.get(kind) ?? []), [orgId, n]]);
  }
  return out;
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
  const levels = new Set(govs.map((g) => g.level));
  const budgets = new Map(
    govs.map((g) => [g.id, budgetInForce(api, g.id)] as const),
  );
  // Revenue lines a treasury in the game pays as aid, by payee level.
  const aided = new Set(
    DATA.aid.flows
      .filter((f) => levels.has(f.payer as GovernmentRow["level"]))
      .map((f) => `${f.payee}|${f.revenueLine}`),
  );
  const fromOutside = new Map<string, number>();
  for (const gov of govs) {
    const budget = budgets.get(gov.id);
    if (!budget) continue;
    const away = 1 - townShareOf(api, gov);
    let annual = 0;
    for (const [line, amount] of Object.entries(budget.revenueMinor)) {
      if (aided.has(`${gov.level}|${line}`)) continue;
      annual += TOWN_PAID_LINES.has(line) ? amount * away : amount;
    }
    const monthly = Math.round(annual / months);
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
        aidReceivedMinor: aidReceived.get(gov.id) ?? 0,
        aidPaidMinor: carrier ? held : 0,
        borrowedMinor: 0,
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
    const toProviders: Record<string, [string, number][]> = {};
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
      const providerMinor = firms.length ? bought : 0;
      if (providerMinor > 0) toProviders[line] = firms;
      plan[line] = { providers: providerMinor, outside: left - providerMinor };
    }
    const need =
      aidTotal +
      Object.values(plan).reduce((s, p) => s + p.providers + p.outside, 0);
    const main = accounts.main(gov.organizationId);
    let have = accounts.balance(main);
    let borrowed = 0;
    if (gov.level === "federal" && have < need) {
      // The U.S. Treasury borrows what the month's payments need beyond what it holds.
      borrowed = accounts.transfer({
        id: `federal-borrowing:${gov.id}:${date}`,
        from: accounts.main(outside),
        to: main,
        amountMinor: need - Math.max(0, have),
        reasonKey: "federal-borrowing",
        source: {
          tag: "SOURCED",
          citation:
            "U.S. Treasury, Monthly Treasury Statement fiscal 2025: outlays beyond receipts are financed by borrowing from the public",
          asOf: date,
        },
      }).paidMinor;
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
      const firms = toProviders[line];
      if (firms) {
        const staff = firms.reduce((s, [, n]) => s + n, 0);
        let left = p.providers;
        firms.forEach(([orgId, n], i) => {
          const amount =
            i === firms.length - 1
              ? left
              : Math.floor((p.providers * n) / staff);
          left -= amount;
          providersPaid += pay(
            `treasury:${gov.id}:${line}:${orgId}:${date}`,
            accounts.main(orgId),
            amount,
            `treasury-spending:${line}`,
          );
        });
      }
      // stopgapId: SG-GOV-public-employers-outside
      if (p.outside > 0) api.stopgap("SG-GOV-public-employers-outside");
      const outsidePaid = pay(
        `treasury:${gov.id}:${line}:outside:${date}`,
        accounts.main(outside),
        p.outside,
        "treasury-spending:outside",
      );
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
      aidReceivedMinor: aidReceived.get(gov.id) ?? 0,
      aidPaidMinor: aidPaid,
      borrowedMinor: borrowed,
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
  // Awards the opening wrote are recipient income the finance engine won't
  // re-amount yet (finance-state.ts, needs OPUS-CORE); they keep their amount.
  let opening = false;
  if (level !== 1)
    for (const c of core.finance.contracts.values())
      if (c.kind === "income.retirement" && c.endedAt === undefined) {
        opening = true;
        break;
      }
  // stopgapId: SG-GOV-opening-award-level
  if (opening) api.stopgap("SG-GOV-opening-award-level");
  const accounts = api.accounts();
  let counted = false;
  for (const [personId, claim] of retirementClaims(core)) {
    if (claim.counted) {
      counted = true;
      continue;
    }
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
  if (level === 1) return;
  // Counted recipients' awards are pooled in the residents' flows, which
  // have no rerate yet (needs OPUS-CORE).
  if (!counted)
    for (const flow of residentsRuntime(core)?.flows.values() ?? [])
      if (flow.kind === "retirement" && flow.endedAt === undefined) {
        counted = true;
        break;
      }
  // stopgapId: SG-GOV-counted-social-security-level
  if (counted) api.stopgap("SG-GOV-counted-social-security-level");
}
