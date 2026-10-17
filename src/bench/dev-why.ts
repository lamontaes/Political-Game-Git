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
 *   - a person: the year's ledger (pay, hours, taxes, rent, spending);
 *   - a credit line's repricing: the line's rate history, each change with
 *     the central bank meeting behind it.
 */
import { coreAPI } from "../core2/state";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import {
  LEGISLATURE_MODULE_ID,
  votesOn,
  type MemberPosition,
} from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";

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
const BUSINESS_MODULE_ID = "business";
const BUDGETS_MODULE_ID = "budgets";
const MACRO_MODULE_ID = "macro";

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
const number = (value: number) => Math.round(value * 1000) / 1000;
const nameOf = (core: CoreState, id: string) => {
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : id;
};

// ---- A vote ----------------------------------------------------------------

/** The terms of a member's position, in the order the legislature sums them. */
const TERMS = [
  "views",
  "openingViews",
  "constituents",
  "sponsor",
  "deal",
  "lobby",
  "party",
  "wing",
  "ambition",
  "press",
  "trait",
  "consistency",
  "bribe",
] as const;

function positionRows(position: MemberPosition): WhyRow[] {
  const record = position as unknown as Record<string, unknown>;
  return [
    ...TERMS.flatMap((term) =>
      typeof record[term] === "number"
        ? [{ label: term, value: number(record[term] as number) }]
        : [],
    ),
    { label: "total (sum of the reasons)", value: number(position.total) },
  ];
}

function votePanels(core: CoreState, billId: string, voteId?: string) {
  const panels: WhyPanel[] = [];
  const votes = votesOn(coreAPI(core), billId);
  const rows = table(core, LEGISLATURE_MODULE_ID, "votes").filter(
    (row) => row.billId === billId,
  );
  if (voteId) {
    const row = rows.find((candidate) => candidate.id === voteId);
    const position = row?.position as MemberPosition | undefined;
    panels.push({
      title: `Why ${nameOf(core, String(row?.memberId ?? ""))} voted ${row?.vote ?? ""}`,
      rows: position ? positionRows(position) : [],
      ...(position
        ? {}
        : {
            gap: "The legislature kept no reasons for this vote (the row has no position).",
          }),
    });
  }
  panels.push({
    title: `Every member's recorded reasons on ${billId}`,
    rows: votes.slice(0, MAX_ROWS).map((vote) => {
      const position = vote.position as MemberPosition | undefined;
      const terms = position
        ? TERMS.flatMap((term) => {
            const value = (position as unknown as Record<string, unknown>)[
              term
            ];
            return typeof value === "number" && Math.abs(value) >= 0.005
              ? [`${term} ${value > 0 ? "+" : ""}${number(value)}`]
              : [];
          }).join(", ")
        : "no reasons kept";
      return {
        label: nameOf(core, vote.memberId),
        value: `${vote.vote} (total ${position ? number(position.total) : "?"}): ${terms}`,
        id: `vote:${billId}:${vote.memberId}`,
      };
    }),
    ...(votes.length
      ? {}
      : { gap: "No vote has been recorded on this bill yet." }),
  });
  return panels;
}

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
      value: `adopted by ${budget.adoptedBy}`,
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
  const followed = journal.detailedByOwner.get(personId);
  const totals = new Map<string, { in: number; out: number; count: number }>();
  const kinds = new Map<
    string,
    { group: string; net: number; count: number }
  >();
  for (const receiptId of followed ?? []) {
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
        value: `in ${money(row.in)}, out ${money(row.out)}, ${row.count} payments`,
      });
  }
  for (const [kind, row] of [...kinds].sort((a, b) => b[1].count - a[1].count))
    rows.push({
      label: `  ${row.group}: ${kind}`,
      value: `net ${money(row.net)}, ${row.count} payments`,
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
  const all = journal.totalsByOwner.get(personId);
  if (all)
    rows.push({
      label: "all time, the cash journal",
      value: `${all.count} postings, in ${money(all.grossCreditMinor)}, out ${money(all.grossDebitMinor)}`,
    });
  const person = core.people.get(personId);
  if (person)
    rows.push({ label: "cash now", value: money(person.liquidMinor) });
  return [
    {
      title: `${nameOf(core, personId)}: the year to ${core.date}`,
      rows,
      ...(followed && !totals.has("rent") && !totals.has("spending")
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

// ---- The entry point -------------------------------------------------------

export function whyPanels(
  core: CoreState,
  id: string,
  found: { engine: string; kind: string; record: unknown } | undefined,
): WhyPanel[] {
  if (!found) return [];
  const record = found.record as Row;
  const facts = (record.facts ?? {}) as Record<string, string>;
  if (found.engine === `${LEGISLATURE_MODULE_ID}.votes`)
    return votePanels(core, String(record.billId), id);
  if (found.engine === `${LEGISLATURE_MODULE_ID}.bills`)
    return votePanels(core, id);
  if (typeof facts.billId === "string") return votePanels(core, facts.billId);
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
  if (found.kind === "person") return ledgerPanels(core, id);
  if (found.engine === `${MACRO_MODULE_ID}.repricings`)
    return repricingPanels(core, String(record.facilityId));
  return [];
}
