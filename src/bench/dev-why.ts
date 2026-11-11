/**
 * Dev mode's "why" panels (owner, Oct 14, 2026, relayed): the trace says what
 * a record is linked to; these say why. Read-only, from records the engines
 * already keep, and where an engine keeps no reason the panel says so (the
 * `gap` line) so the gap can be filed against that engine.
 *
 *   - a legislative vote: each member's recorded reasons (the legislature's
 *     own decision row), and the sum;
 *   - a business closing: the books behind it (the finance engine's book, the
 *     owner's loss record, the choice's recorded reason);
 *   - a budget line change: the measure and the law behind it, and the line's
 *     history;
 *   - a person: the year's ledger (pay, hours, taxes, rent, spending), and
 *     their kept decisions (each act's offered options with every reason, the
 *     trait reason first, or the chosen option's reasons once condensed);
 *   - a credit line's repricing: the line's rate history, each change with
 *     the central bank meeting behind it;
 *   - a state of the country tier: its people and jobs, the part its played
 *     town and county hold in full and the rest, which add to the state's.
 */
import { coreAPI } from "../core2/state";
import { parameter } from "../core2/parameters";
import { isExplicitlyControlledPersonV1 } from "../core2/player-control-state-v1";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { BUSINESS_MODULE_ID } from "../core2/business-module-id";
import { BUDGETS_MODULE_ID } from "../core2/modules/budgets";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import {
  COUNTRY_SECTORS,
  MACRO_MODULE_ID,
  countryStateParts,
  type CountrySector,
  type CountryState,
} from "../core2/modules/macro";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import placeStates from "../core2/data/places/states.json" with { type: "json" };
import type {
  CoreState,
  DecisionReason,
  DecisionResult,
  LogRecord,
} from "../core2/types";

export interface WhyRow {
  readonly label: string;
  readonly value: string | number;
  /** A record the row names; the page opens it in the trace. */
  readonly id?: string;
}

export interface WhyPanel {
  readonly title: string;
  readonly rows: readonly WhyRow[];
  /** What this engine keeps no record of, in plain words. */
  readonly gap?: string;
}

const MAX_ROWS = 700;

type Row = Record<string, unknown>;
const table = (core: CoreState, moduleId: string, name: string): Row[] =>
  core.modules.get(moduleId)?.state
    ? (coreAPI(core)
        .moduleState(moduleId)
        .table(name)
        .rows() as unknown as Row[])
    : [];

const money = (minor: number) =>
  `${minor < 0 ? "−" : ""}$${(Math.abs(minor) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const payments = (n: number) => `${n} ${n === 1 ? "payment" : "payments"}`;
const number = (value: number) => Math.round(value * 1000) / 1000;
const nameOf = (core: CoreState, id: string) => {
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : id;
};

// ---- A business closing ----------------------------------------------------

function closingPanels(core: CoreState, organizationId: string): WhyPanel[] {
  const org = core.organizations.get(organizationId);
  const book = core.finance.businesses.get(organizationId);
  const rows: WhyRow[] = [
    {
      label: "business",
      value: org?.name ?? organizationId,
      id: organizationId,
    },
  ];
  if (!book)
    return [
      {
        title: `Books behind ${organizationId}`,
        rows,
        gap: "The finance engine keeps no business books for this organization.",
      },
    ];
  rows.push(
    {
      label: "annual payroll",
      value: money(book.annualPayrollMinor),
    },
    { label: "annual demand", value: money(book.annualDemandMinor) },
    { label: "annual other costs", value: money(book.annualOtherCostsMinor) },
    { label: "price", value: number(book.price) },
    { label: "sales received", value: money(book.salesReceivedMinor) },
    { label: "all money received", value: money(book.receivedMinor) },
    { label: "operating costs paid", value: money(book.operatingPaidMinor) },
    { label: "wages requested", value: money(book.wagesRequestedMinor) },
    { label: "wages paid", value: money(book.wagesPaidMinor) },
    { label: "wages unpaid", value: money(book.wagesUnpaidMinor) },
    { label: "cash on hand", value: money(org?.liquidMinor ?? 0) },
    { label: "last reviewed", value: book.lastReviewedAt },
    {
      label: "closed",
      value: book.closedAt
        ? `${book.closedAt}: ${book.closingReasonKey ?? "no reason kept"}`
        : "still open",
    },
  );
  const owner = table(core, BUSINESS_MODULE_ID, "owners").find(
    (row) => row.id === organizationId,
  );
  if (owner)
    rows.push(
      {
        label: "owner",
        value: nameOf(core, String(owner.ownerId)),
        id: String(owner.ownerId),
      },
      {
        label: "months of revenue lost (the loss record)",
        value: number(Number(owner.lossMonths ?? 0)),
      },
      {
        label: "profit earned, not yet drawn",
        value: money(Number(owner.retainedMinor ?? 0)),
      },
    );
  const choices = table(core, BUSINESS_MODULE_ID, "choices")
    .filter((row) => row.organizationId === organizationId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const last = choices.at(-1);
  if (last)
    rows.push(
      {
        label: `the owner's choice on ${last.date}`,
        value: `${last.reasonKey} (decided as ${last.decidedAs})`,
        id: String(last.id),
      },
      ...Object.entries((last.values ?? {}) as Record<string, number>).map(
        ([key, value]) => ({
          label: `  reason: ${key}`,
          value: number(Number(value)),
        }),
      ),
    );
  const closure = table(core, BUSINESS_MODULE_ID, "closures").find(
    (row) => row.organizationId === organizationId,
  );
  if (closure)
    rows.push({
      label: "closure record",
      value: `${closure.date}, ${closure.workersAffected} workers affected, cause ${closure.cause ?? "none kept"}`,
      id: String(closure.id),
    });
  return [
    {
      title: `Books behind ${org?.name ?? organizationId}`,
      rows,
      ...(book.closedAt && !last
        ? {
            gap: "The business engine kept no choice row for this closing (insolvency, retirement and no-successor closings write the book's reason only).",
          }
        : {}),
    },
  ];
}

// ---- A budget line change --------------------------------------------------

function budgetPanels(core: CoreState, facts: Record<string, string>) {
  const { governmentId = "", line = "", measureId = "" } = facts;
  const panels: WhyPanel[] = [];
  const rows: WhyRow[] = [
    { label: "government", value: governmentId, id: governmentId },
    { label: "level", value: facts.level ?? "" },
    { label: "line", value: line },
    { label: "change", value: money(Number(facts.deltaMinor ?? 0)) },
    { label: "measure", value: measureId },
  ];
  const bill = table(core, LEGISLATURE_MODULE_ID, "bills").find(
    (row) => row.number === measureId || row.id === measureId,
  );
  if (bill)
    rows.push({
      label: "the bill",
      value: String(bill.number ?? bill.id),
      id: String(bill.id),
    });
  for (const law of table(core, LAWS_MODULE_ID, "laws"))
    if (
      bill &&
      (law.terms as Record<string, unknown> | undefined)?.enactedBy ===
        bill.number
    )
      rows.push({
        label: "the law it enacted",
        value: `${(law.terms as Record<string, unknown>).series ?? law.id}`,
        id: String(law.id),
      });
  // A starting line can name the law that set it instead of a bill.
  const named = table(core, LAWS_MODULE_ID, "laws").find(
    (row) => row.id === measureId,
  );
  if (named)
    rows.push({
      label: "the law behind it",
      value: `${(named.terms as Record<string, unknown> | undefined)?.series ?? named.id}`,
      id: String(named.id),
    });
  const budget = table(core, BUDGETS_MODULE_ID, "budgets").find(
    (row) => row.id === measureId,
  );
  if (budget)
    rows.push({
      label: "the budget",
      value: `adopted by ${(budget.adoptedBy as { kind: string; bill?: { number: string } }).kind}${(budget.adoptedBy as { bill?: { number: string } }).bill ? ` ${(budget.adoptedBy as { bill: { number: string } }).bill.number}` : ""}`,
      id: String(budget.id),
    });
  panels.push({
    title: `Why ${line} changed`,
    rows,
    ...(bill || budget || named
      ? {}
      : {
          gap: `No bill or budget row matches the measure "${measureId}"; the change event names only the measure.`,
        }),
  });
  panels.push(linePanel(core, governmentId, line));
  return panels;
}

/** Every change to one government's line, oldest first, and the line's amount each year. */
function linePanel(
  core: CoreState,
  governmentId: string,
  line: string,
): WhyPanel {
  let running = 0;
  const changes = [...(core.logByKind.get("budget-line-changed") ?? [])]
    .map((id) => core.durableLog.get(id)!)
    .filter(
      (row) =>
        row.facts?.governmentId === governmentId && row.facts?.line === line,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const rows: WhyRow[] = changes.map((row) => {
    running += Number(row.facts?.deltaMinor ?? 0);
    return {
      label: `${row.date} ${row.facts?.measureId ?? ""}`,
      value: `${money(Number(row.facts?.deltaMinor ?? 0))} (running ${money(running)})`,
      id: row.id,
    };
  });
  for (const budget of table(core, BUDGETS_MODULE_ID, "budgets")
    .filter((row) => row.governmentId === governmentId)
    .sort((a, b) => String(a.id).localeCompare(String(b.id))))
    rows.push({
      label: `budget ${budget.id}`,
      value: money(
        Number((budget.spendingMinor as Record<string, number>)?.[line] ?? 0),
      ),
      id: String(budget.id),
    });
  return {
    title: `History of ${line} at ${governmentId}`,
    rows,
    ...(changes.length ? {} : { gap: "No change to this line is on record." }),
  };
}

// ---- A person's year -------------------------------------------------------

const GROUPS: readonly [string, RegExp][] = [
  ["pay", /payroll|wage|salary|pay\b|benefit|pension|award|unemployment/i],
  ["taxes", /withhold|tax/i],
  ["rent", /rent|housing|mortgage/i],
  ["spending", /purchase|sale|consum|grocer|shop|meal|buy|price/i],
];
const groupOf = (kind: string) =>
  GROUPS.find(([, pattern]) => pattern.test(kind))?.[0] ?? "other";

function ledgerPanels(core: CoreState, personId: string): WhyPanel[] {
  const from = new Date(`${core.date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 365);
  const since = from.toISOString().slice(0, 10);
  const journal = core.cashJournal;
  // The journal itemizes the payments of the player and everyone followed
  // (all, in observer mode). A followed person whose receipts all folded past
  // the year has no index left, yet is still followed.
  const itemized = journal.detailedByOwner.get(personId);
  const followed =
    itemized !== undefined ||
    core.observer ||
    personId === core.playerId ||
    core.focusPersonIds.has(personId);
  const totals = new Map<string, { in: number; out: number; count: number }>();
  const kinds = new Map<
    string,
    { group: string; net: number; count: number }
  >();
  for (const receiptId of itemized ?? []) {
    const receipt = journal.detailedReceipts.get(receiptId);
    const change = receipt?.owners.get(personId);
    if (!receipt || !change || receipt.date < since) continue;
    const delta = change.afterMinor - change.beforeMinor;
    const group = groupOf(receipt.sourceRef.kind);
    const row = totals.get(group) ?? { in: 0, out: 0, count: 0 };
    if (delta >= 0) row.in += delta;
    else row.out += -delta;
    row.count += 1;
    totals.set(group, row);
    const kind = kinds.get(receipt.sourceRef.kind) ?? {
      group,
      net: 0,
      count: 0,
    };
    kind.net += delta;
    kind.count += 1;
    kinds.set(receipt.sourceRef.kind, kind);
  }
  const rows: WhyRow[] = [];
  for (const name of ["pay", "taxes", "rent", "spending", "other"]) {
    const row = totals.get(name);
    if (row)
      rows.push({
        label: name,
        value: `in ${money(row.in)}, out ${money(row.out)}, ${payments(row.count)}`,
      });
  }
  for (const [kind, row] of [...kinds].sort((a, b) => b[1].count - a[1].count))
    rows.push({
      label: `  ${row.group}: ${kind}`,
      value: `net ${money(row.net)}, ${payments(row.count)}`,
    });
  // Hours: the work engine's weekly rollups for the person's jobs.
  let weeks = 0;
  let planned = 0;
  let attended = 0;
  let earned = 0;
  let paid = 0;
  for (const rollup of core.work.rollups.values()) {
    if (rollup.personId !== personId || rollup.weekStartedAt < since) continue;
    weeks += 1;
    planned += rollup.plannedMinutes;
    attended += rollup.attendedMinutes;
    earned += rollup.requestedMinor;
    paid += rollup.paidMinor;
  }
  rows.push(
    {
      label: "hours worked / planned",
      value: `${number(attended / 60)} / ${number(planned / 60)} (over the ${weeks} weekly rollups the work engine still keeps)`,
    },
    {
      label: "pay earned / paid",
      value: `${money(earned)} / ${money(paid)}`,
    },
  );
  // Older than the window: receipts folded past it, one row per year and
  // kind. A year's row holds only what has folded so far (the rest of that
  // year is still itemized above), and a receipt kept past the window (an
  // open obligation, one a kept record names, the household's prior year) is
  // in no row until it folds.
  const folded = [...(journal.foldedByOwner.get(personId)?.values() ?? [])];
  folded.sort((a, b) => b.year - a.year || b.count - a.count);
  for (const row of folded)
    rows.push({
      label: `  ${row.year}, older than a year: ${groupOf(row.kind)}: ${row.kind}`,
      value: `in ${money(row.inMinor)}, out ${money(row.outMinor)}, ${payments(row.count)}`,
    });
  const all = journal.totalsByOwner.get(personId);
  if (all)
    rows.push({
      label: "all time, the cash journal",
      value: `${all.count} postings, in ${money(Number(all.grossCreditMinor))}, out ${money(Number(all.grossDebitMinor))}`,
    });
  const person = core.people.get(personId);
  if (person)
    rows.push({ label: "cash now", value: money(person.liquidMinor) });
  return [
    {
      title: `${nameOf(core, personId)}: the year to ${core.date}`,
      rows,
      ...(followed && !totals.size
        ? { gap: "No itemized payments in the last year." }
        : followed && !totals.has("rent") && !totals.has("spending")
          ? {
              gap: "This person's cash journal holds no rent or spending payments this year, so rent and spending are not in the ledger. Engine gap: whichever engine charges rent and consumption writes no journal receipt for it.",
            }
          : {}),
      ...(followed
        ? {}
        : {
            gap: "The cash journal keeps receipt detail only for followed people; this person's payments are not itemized, so pay, taxes, rent and spending are not split out. Engine gap: the cash journal (core2/journal-state) and decision-detail's retention window.",
          }),
    },
  ];
}

// ---- A person's decisions --------------------------------------------------

/** Trait first: it is what two residents differ on; then the rest in the chooser's order. */
const REASONS = [
  "trait",
  "need",
  "goal",
  "drive",
  "emotion",
  "effort",
  "module",
] as const;

const signed = (value: number) => `${value > 0 ? "+" : ""}${number(value)}`;

const reasonsText = (reasons: Partial<DecisionReason> | undefined) =>
  reasons
    ? REASONS.flatMap((key) =>
        typeof reasons[key] === "number"
          ? [`${key} ${signed(reasons[key] as number)}`]
          : [],
      ).join(", ")
    : "no reasons kept";

/** " with <who>" for an option aimed at someone or something; nothing when it is aimed at the actor. */
const withText = (core: CoreState, actorId: string, id: string | undefined) => {
  if (!id || id === actorId) return "";
  const name = core.people.has(id)
    ? nameOf(core, id)
    : core.organizations.get(id)?.name;
  return ` with ${name || id}`;
};

/** Whether this person's acts save their reasons today (the rule `recordAct` applies). */
const savesActs = (core: CoreState, personId: string) =>
  core.observer ||
  core.focusPersonIds.has(personId) ||
  personId === core.playerId ||
  isExplicitlyControlledPersonV1(core, personId);

function actRow(
  core: CoreState,
  row: LogRecord,
  condensedDays: number,
): WhyRow {
  const decision = row.decision as DecisionResult | undefined;
  const lines: string[] = [];
  if (decision?.scores?.length) {
    const at = decision.scores.findIndex(
      (score) =>
        score.actionId === row.actionId && score.targetId === row.targetId,
    );
    lines.push(
      ...decision.scores.map(
        (score, index) =>
          `${index === at ? "picked " : "offered"} ${score.actionId}${withText(core, row.actorId!, score.targetId)}: score ${number(score.score)}; ${reasonsText(score.reasons)}`,
      ),
    );
    // The chosen option leads, so the row reads "what was picked, and why".
    if (at > 0) lines.unshift(...lines.splice(at, 1));
    else if (at < 0)
      lines.unshift(
        `picked ${row.actionId}${withText(core, row.actorId!, row.targetId)}: not among the scored options`,
      );
  } else
    lines.push(
      `picked ${row.actionId}${withText(core, row.actorId!, row.targetId)}; only the chosen option's reasons are kept after ${condensedDays} days: ${reasonsText(decision?.selectedReasons)}`,
    );
  return {
    label: `${row.date} picked ${row.actionId} (${row.id})`,
    value: lines.join("\n"),
    id: row.id,
  };
}

/**
 * A person's kept decisions, newest first: each `person.acted` record's date,
 * the option picked and every offered option's reasons. Records exist only for
 * people the player deals with and people in focus, so an unfollowed person
 * gets the gap line instead of rows.
 */
export function decisionPanels(core: CoreState, personId: string): WhyPanel[] {
  const condensedDays = parameter(
    "circleDecisionDetailDays",
    core.data.parameters,
  );
  const kept: { row: LogRecord; order: number }[] = [];
  let order = 0;
  for (const id of core.logByPerson.get(personId) ?? []) {
    const row = core.durableLog.get(id);
    if (row?.kind === "person.acted" && row.actorId === personId)
      kept.push({ row, order: order++ });
  }
  kept.sort(
    (a, b) => b.row.date.localeCompare(a.row.date) || b.order - a.order,
  );
  const saves = savesActs(core, personId);
  return [
    {
      title: `${nameOf(core, personId)}: decisions`,
      rows: kept
        .slice(0, MAX_ROWS)
        .map(({ row }) => actRow(core, row, condensedDays)),
      ...(saves
        ? kept.length
          ? {}
          : {
              gap: "No act of this person has been kept yet; their acts keep every option's reasons from the day they are followed, so time has to pass.",
            }
        : {
            gap: "This person's acts keep no reasons until followed (why-kept): follow them on this page, then let time pass.",
          }),
    },
  ];
}

// ---- A credit line's repricing ---------------------------------------------

/** Every time the line's rate moved with the prime rate, each with its meeting. */
function repricingPanels(core: CoreState, facilityId: string): WhyPanel[] {
  const meetings = new Map(
    table(core, MACRO_MODULE_ID, "meetings").map((row) => [
      String(row.id),
      row,
    ]),
  );
  const changes = table(core, MACRO_MODULE_ID, "repricings")
    .filter((row) => row.facilityId === facilityId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const borrowerId = String(changes[0]?.borrowerId ?? "");
  return [
    {
      title: `Rate history of the credit line of ${core.organizations.get(borrowerId)?.name ?? borrowerId}`,
      rows: changes.slice(0, MAX_ROWS).map((row) => {
        const meeting = meetings.get(String(row.meetingId));
        return {
          label: String(row.date),
          value: `${number(Number(row.fromRate) * 100)}% to ${number(Number(row.toRate) * 100)}%, after the central bank's meeting of ${String(meeting?.date ?? "")} (policy rate ${number(Number(meeting?.fromRatePct))}% to ${number(Number(meeting?.toRatePct))}%)`,
          id: String(row.meetingId),
        };
      }),
    },
  ];
}

// ---- A state's month in the country tier ----------------------------------

/** What the bill catalog calls each law amount ("Income tax rate"), by series. */
const LAW_NAMES: ReadonlyMap<string, string> = new Map(
  (
    billCatalog as unknown as {
      subjects: {
        topics: {
          policies: { kind: string; series?: string; name: string }[];
        }[];
      }[];
    }
  ).subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      topic.policies.flatMap((policy) =>
        policy.kind === "law-amount" && policy.series
          ? [[policy.series, policy.name] as const]
          : [],
      ),
    ),
  ),
);
const STATE_NAMES = placeStates.states as Readonly<Record<string, string>>;
const SECTOR_WORDS: Readonly<Record<CountrySector, string>> = {
  construction: "construction",
  "education-health": "education and health care",
  financial: "finance, insurance and real estate",
  government: "government",
  information: "information",
  "leisure-hospitality": "leisure and hospitality",
  manufacturing: "manufacturing",
  "mining-logging": "mining and logging",
  "other-services": "other services",
  "professional-business": "professional and business services",
  "trade-transport-utilities": "trade, transportation and utilities",
};
const dollars = (value: number) => money(Math.round(value * 100));
const whole = (value: number) =>
  `${value < 0 ? "−" : ""}${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
/** Largest figure first. */
const largestFirst = (rows: { size: number; row: WhyRow }[]): WhyRow[] =>
  rows.sort((a, b) => Math.abs(b.size) - Math.abs(a.size)).map((r) => r.row);

/**
 * What each step of a state's latest month moved (`whatMoved`, kept by the country tier's
 * month): the taxes withheld under each law row, which opens that law; what households spent
 * and the ledger took in; the jobs filled and ended in each sector; who arrived and left.
 */
function countryStatePanels(core: CoreState, state: CountryState): WhyPanel[] {
  const name = STATE_NAMES[state.usps] ?? state.usps;
  const latest = state.whatMoved?.at(-1);
  if (!latest)
    return [
      {
        title: `What moved ${name} this month`,
        rows: [],
        gap: "The country tier has not run a month here yet: let a month pass.",
      },
    ];
  const laws = core.modules.get(LAWS_MODULE_ID)?.state
    ? coreAPI(core).moduleState(LAWS_MODULE_ID).table("laws")
    : undefined;
  const lawName = (lawId: string, level: string) => {
    const row = laws?.get(lawId) as { series?: string } | undefined;
    const named = row?.series ? LAW_NAMES.get(row.series) : undefined;
    return `withheld under the ${level} law${named ? ` (${named})` : ""}`;
  };
  const month = `month ${latest.month} of the country's economy`;
  const withheld = largestFirst(
    latest.withheld.map((line) => ({
      size: line.dollars,
      row: {
        label: lawName(line.lawId, line.level),
        value: dollars(line.dollars),
        id: line.lawId,
      },
    })),
  );
  const ledger = largestFirst(
    [
      ["what households spent", latest.spent],
      ["state income tax the ledger took in", latest.incomeTaxRevenue],
      ["sales tax the ledger took in", latest.salesTaxRevenue],
      ["tax on profits the ledger took in", latest.profitTaxRevenue],
      ["other revenue the ledger took in", latest.otherRevenue],
      ["the year's budget in force", latest.budgetYear],
    ].map(([label, size]) => ({
      size: size as number,
      row: { label: label as string, value: dollars(size as number) },
    })),
  );
  const jobs = largestFirst(
    COUNTRY_SECTORS.map((sector, at) => {
      const added = latest.jobsAdded[at] ?? 0;
      const cut = latest.jobsCut[at] ?? 0;
      const vacated = latest.jobsVacated[at] ?? 0;
      const net = added - cut - vacated;
      return {
        size: net,
        row: {
          label: SECTOR_WORDS[sector],
          value: `${net >= 0 ? "+" : ""}${whole(net)} jobs: ${whole(added)} filled, ${whole(cut)} ended at firms, ${whole(vacated)} left by people who moved away, aged out of work or died`,
        },
      };
    }),
  );
  const people = largestFirst(
    [
      ["people who moved here from other states", latest.arrived],
      ["people who left for other states", latest.left],
      ["people who came from abroad", latest.fromAbroad],
    ].map(([label, size]) => ({
      size: size as number,
      row: { label: label as string, value: whole(size as number) },
    })),
  );
  return [
    { title: `Taxes withheld from pay in ${name}, ${month}`, rows: withheld },
    { title: `Spending and the ledger in ${name}, ${month}`, rows: ledger },
    { title: `Jobs in ${name} by sector, ${month}`, rows: jobs },
    { title: `People who arrived and left ${name}, ${month}`, rows: people },
  ];
}

// ---- A state of the country tier: the part held in full --------------------

/** A state's people and jobs: the part its played town and county hold in full, and the rest its cells step. */
function countryStatePartPanels(
  core: CoreState,
  state: CountryState,
): WhyPanel[] {
  const parts = countryStateParts(coreAPI(core), state.key);
  const name = STATE_NAMES[state.usps] ?? state.usps;
  if (!parts) return [];
  const rows = (of: "people" | "jobs"): WhyRow[] => [
    { label: "the state", value: whole(parts.total[of]), id: parts.stateId },
    {
      label: "held in full (the played places)",
      value: whole(parts.part[of]),
      ...(parts.partId ? { id: parts.partId } : {}),
    },
    { label: "the rest of the state", value: whole(parts.rest[of]) },
  ];
  return [
    {
      title: `People in ${name}: the played places and the rest`,
      rows: rows("people"),
      ...(parts.partId
        ? {}
        : {
            gap: "No place in this state is held in full: its cells are all of it.",
          }),
    },
    {
      title: `Jobs in ${name}: the played places and the rest`,
      rows: rows("jobs"),
    },
  ];
}

// ---- The entry point -------------------------------------------------------

export function whyPanels(
  core: CoreState,
  id: string,
  found: { engine: string; kind: string; record: unknown } | undefined,
): WhyPanel[] {
  if (!found) return [];
  const record = found.record as Row;
  const facts = (record.facts ?? {}) as Record<string, string>;
  if (found.engine === `${BUSINESS_MODULE_ID}.closures`)
    return closingPanels(core, String(record.organizationId));
  if (found.kind === "business.closed")
    return closingPanels(
      core,
      String(record.topic ?? id.replace("event:business.closed:", "")),
    );
  if (found.engine === "core.organizations" && core.finance.businesses.has(id))
    return closingPanels(core, id);
  if (found.kind === "budget-line-changed") return budgetPanels(core, facts);
  if (found.engine === `${BUDGETS_MODULE_ID}.budgets`)
    return Object.keys((record.spendingMinor ?? {}) as object).map((line) =>
      linePanel(core, String(record.governmentId), line),
    );
  if (found.kind === "person")
    return [...ledgerPanels(core, id), ...decisionPanels(core, id)];
  if (found.engine === `${MACRO_MODULE_ID}.countryStates`)
    return [
      ...countryStatePartPanels(core, record as unknown as CountryState),
      ...countryStatePanels(core, record as unknown as CountryState),
    ];
  if (found.engine === `${MACRO_MODULE_ID}.repricings`)
    return repricingPanels(core, String(record.facilityId));
  return [];
}
