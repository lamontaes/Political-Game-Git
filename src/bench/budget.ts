import { townGovernment } from "../core2/output-number-readers";
import { coreAPI } from "../core2/state";
import {
  budgetPriorities,
  budgetsOf,
  governments,
  lineBeforeBill,
  setBudgetPriorities,
  withholdingOf,
} from "../core2/modules/budgets";
import type { TermRow } from "../core2/modules/offices";
import { gameStartDate } from "../core2/game-start";
import { appointmentsIn } from "../core2/modules/executive";
import { lineForPost } from "../core2/budgets-treasury";
import { facePlace, holderFace } from "./government";
import type { CoreState } from "../core2/types";
import { properName } from "../director/words";
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };

const NAMES = lineNames.lines as Record<string, { name: string }>;

const OFFICES = "core2-offices-v1";
const EXECUTIVES = /^(mayor|governor|county-executive|president)$/;

/** The governments whose executive the person is, by jurisdiction. */
function executiveOf(core: CoreState, personId: string): Set<string> {
  const offices = coreAPI(core).moduleState(OFFICES);
  const out = new Set<string>();
  for (const term of offices
    .table("terms")
    .query("byPerson", [personId]) as unknown as TermRow[]) {
    if (term.status !== "serving") continue;
    const office = offices.table("offices").get(term.officeId) as
      { kind: string; jurisdiction: string } | undefined;
    if (office && EXECUTIVES.test(office.kind)) out.add(office.jurisdiction);
  }
  return out;
}

/** A budget line with the name its source table gives it; a line with no name is a defect the budget test lists. */
export const lineName = (line: string): string | undefined => NAMES[line]?.name;

const sorted = (lines: Readonly<Record<string, number>>) =>
  Object.entries(lines)
    .map(([line, minor]) => ({ line, name: lineName(line), minor }))
    .sort((a, b) => b.minor - a.minor);

/** How many fiscal years of a line's history the budget view hands the screens. */
const HISTORY_YEARS = 10;

/**
 * A yearly amount's trend for a timeline: its change against the year before
 * (in minor units and as a percent number, 5 for 5%, to one decimal), and the
 * amounts of the last years kept, oldest first. The change is null where the
 * government kept no earlier year; the percent also where the earlier year
 * was zero. The screens draw this and compute nothing.
 */
function trendOf(history: readonly { fiscalYear: number; minor: number }[]) {
  const latest = history[history.length - 1];
  const prior = history.length > 1 ? history[history.length - 2] : undefined;
  const changeMinor = latest && prior ? latest.minor - prior.minor : null;
  const changePct =
    changeMinor !== null && prior && prior.minor !== 0
      ? Math.round((changeMinor / Math.abs(prior.minor)) * 1000) / 10
      : null;
  return { changeMinor, changePct, history };
}

/**
 * A government's latest budget with each line's and each total's trend over
 * the years it kept (one budget row a year, so nothing is folded here).
 */
function withTrend(
  years: readonly ReturnType<typeof budgetsOf>[number][],
  latest: ReturnType<typeof totaled>,
) {
  // Oldest first, the last HISTORY_YEARS including the latest.
  const kept = [...years].reverse().slice(-HISTORY_YEARS);
  const sum = (lines: Readonly<Record<string, number>>) =>
    Object.values(lines).reduce((total, minor) => total + minor, 0);
  const line = (side: "revenueMinor" | "spendingMinor", name: string) =>
    kept.map((year) => ({
      fiscalYear: year.fiscalYear,
      minor: year[side][name] ?? 0,
    }));
  const total = (pick: (year: (typeof kept)[number]) => number) =>
    kept.map((year) => ({ fiscalYear: year.fiscalYear, minor: pick(year) }));
  const totals = (minor: number, history: ReturnType<typeof total>) => ({
    minor,
    ...trendOf(history),
  });
  return {
    ...latest,
    revenue: latest.revenue.map((row) => ({
      ...row,
      ...trendOf(line("revenueMinor", row.line)),
    })),
    spending: latest.spending.map((row) => ({
      ...row,
      ...trendOf(line("spendingMinor", row.line)),
    })),
    totals: {
      revenue: totals(
        latest.revenueMinor,
        total((year) => sum(year.revenueMinor)),
      ),
      spending: totals(
        latest.spendingMinor,
        total((year) => sum(year.spendingMinor)),
      ),
      balance: totals(
        latest.balanceMinor,
        total((year) => sum(year.revenueMinor) - sum(year.spendingMinor)),
      ),
    },
    historyYears: kept.length,
  };
}

/**
 * What a government's treasury has actually taken in and paid out, from the
 * cash journal's running totals for its accounts since the world opened, and
 * the cash those accounts hold now. Null where the journal holds nothing yet.
 * The totals are exact numbers until a long save's treasury passes 2^53 cents
 * (about $90 trillion), then the nearest number to the journal's exact sum.
 */
export function booksOf(core: CoreState, organizationId: string) {
  const journal = core.cashJournal;
  const totals = journal.totalsByOwner.get(organizationId);
  if (!totals?.count) return null;
  const accounts = coreAPI(core).accounts();
  let cashMinor = 0;
  for (const id of journal.accountsByOwner.get(organizationId) ?? [])
    cashMinor += accounts.balance(id);
  return {
    since: gameStartDate(),
    entries: totals.count,
    takenInMinor: Number(totals.grossCreditMinor),
    paidOutMinor: Number(totals.grossDebitMinor),
    cashMinor,
  };
}

/**
 * A budget as the screens show it: its lines largest first and the sums the
 * screen reads (revenue, spending and the balance between them), so no screen
 * adds the lines up itself.
 */
function totaled(
  budget: ReturnType<typeof budgetsOf>[number],
  heads: ReadonlyMap<string, string>,
  askedMinor?: (line: string) => number,
) {
  const revenue = sorted(budget.revenueMinor);
  // What each line stood at before this year's budget bill changed it: what the departments
  // asked for, beside what was adopted; and who heads the department.
  const spending = sorted(budget.spendingMinor).map((row) => ({
    ...row,
    ...(heads.has(row.line) ? { head: heads.get(row.line) } : {}),
    ...(askedMinor ? { askedMinor: askedMinor(row.line) } : {}),
  }));
  const sum = (lines: readonly { minor: number }[]) =>
    lines.reduce((total, row) => total + row.minor, 0);
  return {
    fiscalYear: budget.fiscalYear,
    adoptedOn: budget.adoptedOn,
    adoptedBy: budget.adoptedBy,
    revenue,
    spending,
    revenueMinor: sum(revenue),
    spendingMinor: sum(spending),
    balanceMinor: sum(revenue) - sum(spending),
  };
}

/**
 * Who heads each department, by budget line: the appointments record's holders, placed on
 * the line their post's pay draws on. A line the post table only gives to general
 * administration names no head: it would put every head on one department.
 */
function headsOf(core: CoreState, governmentId: string, level: string) {
  const api = coreAPI(core);
  const heads = new Map<string, string>();
  for (const row of appointmentsIn(api, governmentId)) {
    const line = lineForPost(
      level,
      `${level === "state" ? "state" : "town"}:${row.post}`,
    );
    if (line === "administration" || heads.has(line)) continue;
    const person = core.people.get(row.holderId);
    const name = person
      ? `${person.givenName} ${person.familyName}`
      : row.identity && `${row.identity.givenName} ${row.identity.familyName}`;
    if (name) heads.set(line, name);
  }
  return heads;
}

/**
 * The government's chief executive (mayor, county executive, governor, President) as the
 * offices record holds them: a name, the card to open and the bust. Null where the seat is
 * vacant or the government has none.
 */
function chiefOf(core: CoreState, governmentId: string, viewerId: string) {
  const offices = coreAPI(core).moduleState(OFFICES);
  for (const row of offices.table("terms").rows() as unknown as TermRow[]) {
    if (row.status !== "serving") continue;
    const office = offices.table("offices").get(row.officeId) as
      { kind: string; jurisdiction: string; title?: string } | undefined;
    if (
      !office ||
      !EXECUTIVES.test(office.kind) ||
      governmentId !== office.jurisdiction
    )
      continue;
    const { cardId, face } = holderFace(
      core,
      { id: row.id, personId: row.personId },
      facePlace(core, viewerId),
    );
    return {
      name: `${row.identity.givenName} ${row.identity.familyName}`,
      title: office.title ?? null,
      party: row.party,
      cardId,
      face,
    };
  }
  return null;
}

/** Every government over the town, its latest budget, and the player's taxes. */
export function budgetView(core: CoreState, personId: string) {
  if (!core.modules.has("core2-budgets-v1"))
    return { townGovernmentId: undefined, governments: [], withholding: null };
  const api = coreAPI(core);
  const executive = executiveOf(core, personId);
  const withheld = withholdingOf(api, personId);
  const byLine: Record<string, number> = {};
  for (const row of withheld)
    for (const line of row.lines) {
      const key = `${line.level} ${line.tax}`;
      byLine[key] = (byLine[key] ?? 0) + line.minor;
    }
  const home = core.people.get(personId as never)?.placeId;
  return {
    // The town's own books: the government whose jurisdiction is the place the person lives in
    // (its city, or the county that runs a town with no city government), never another town's.
    townGovernmentId: home ? townGovernment(api, home)?.id : undefined,
    governments: governments(api).map((gov) => {
      const years = [...budgetsOf(api, gov.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      );
      const latest = years[0];
      // The year before, when the government kept one: "Last year" beside each line.
      const prior = years[1];
      const heads = headsOf(core, gov.jurisdictionId, gov.level);
      return {
        ...gov,
        executive: chiefOf(core, gov.id, personId),
        // Some federal files hold names in capitals only.
        name: properName(gov.name),
        youAreExecutive: [...executive].some((j) => gov.id.includes(j)),
        priorities: budgetPriorities(api, gov.id),
        books: booksOf(core, gov.organizationId),
        latest:
          latest &&
          withTrend(
            years,
            totaled(latest, heads, (line) =>
              lineBeforeBill(api, gov, latest.fiscalYear, line),
            ),
          ),
        prior: prior && totaled(prior, heads),
      };
    }),
    withholding: {
      paychecks: withheld.length,
      byLine,
    },
  };
}

/** The executive's priority for the next budget: a change to one line. */
export function setPriority(
  core: CoreState,
  personId: string,
  governmentId: string,
  line: string,
  changeMinor: number,
) {
  const view = budgetView(core, personId);
  const gov = view.governments.find((row) => row.id === governmentId);
  if (!gov?.youAreExecutive)
    throw new Error("Only the executive sets budget priorities.");
  const api = coreAPI(core);
  const changes = {
    ...(budgetPriorities(api, governmentId)?.changes ?? {}),
    [line]: changeMinor,
  };
  setBudgetPriorities(api, { governmentId, setBy: personId, changes });
  return budgetPriorities(api, governmentId);
}
