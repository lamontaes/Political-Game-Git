/**
 * The town's industries as they stand, for dev mode: every business by its
 * kind (the one industry key, the business-books kind each business carries),
 * with its staff and its books. The one tally of industries: a twin check
 * (this world against the same world left alone) is two tallies compared by
 * kind and business, never a second count. Read-only: it spends no game time
 * and creates no facts.
 */
import type { CoreAPI, CoreState } from "../core2/types";
import {
  BUSINESS_MODULE_ID,
  DEFAULT_BUSINESS_BOOKS_DATA,
  businessBooksView,
  businessesIn,
  sectorOfKind,
  type BusinessMonthCharge,
} from "../core2/modules/business";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { residentsRuntime } from "../core2/modules/residents";

export interface IndustryBusiness {
  readonly organizationId: string;
  /** The business's own name, from its organization record. */
  readonly name: string;
  readonly placeId: string;
  /** Named jobs held now plus counted headcount, the rule businessesIn uses. */
  readonly staff: number;
  /** Since the opening, from the books. */
  readonly salesMinor: number;
  readonly wagesPaidMinor: number;
  readonly operatingCostsMinor: number;
  readonly outsideCostsMinor: number;
  readonly profitMinor: number;
  readonly cashMinor: number;
  /** Its price over its opening price; 1 at the opening. */
  readonly priceIndex: number;
  /** What its buyers beyond the town pay a year now, at the outside-sales flow's current amount. */
  readonly outsideSalesPerYearMinor: number;
  readonly closedAt?: string;
}

export interface IndustryRow {
  readonly kindId: string;
  /** The kind's industry, as the business books name it. */
  readonly name: string;
  readonly sector: CountrySector | null;
  readonly open: number;
  readonly closed: number;
  readonly staff: number;
  readonly salesMinor: number;
  readonly wagesPaidMinor: number;
  readonly operatingCostsMinor: number;
  readonly outsideCostsMinor: number;
  readonly profitMinor: number;
  readonly cashMinor: number;
  readonly outsideSalesPerYearMinor: number;
  /** The sales-weighted price index of its businesses (a plain mean with no sales). */
  readonly priceIndex: number;
  readonly businesses: readonly IndustryBusiness[];
}

export interface IndustryTally {
  readonly asOf: string;
  readonly placeId?: string;
  readonly industries: readonly IndustryRow[];
}

type CountrySector = NonNullable<ReturnType<typeof sectorOfKind>>;

/** Staff by business, from the business engine's own count (businessesIn), one place at a time. */
function staffReader(
  api: CoreAPI,
): (organizationId: string, placeId: string) => number {
  const byPlace = new Map<string, Map<string, number>>();
  return (organizationId, placeId) => {
    let staff = byPlace.get(placeId);
    if (!staff) {
      staff = new Map(businessesIn(api, placeId).map((b) => [b.id, b.staff]));
      byPlace.set(placeId, staff);
    }
    return staff.get(organizationId) ?? 0;
  };
}

/** What each seller's buyers beyond its town pay a year now, from the open outside-sales flows. */
function outsideSalesReader(c: CoreState): Map<string, number> {
  const out = new Map<string, number>();
  for (const flow of residentsRuntime(c)?.flows.values() ?? []) {
    if (flow.kind !== "outside-sales" || flow.endedAt) continue;
    const perYear =
      flow.cadence.kind === "days"
        ? (flow.amountMinor * 365) / flow.cadence.every
        : (flow.amountMinor * 12) / flow.cadence.every;
    out.set(flow.payeeId, (out.get(flow.payeeId) ?? 0) + Math.round(perYear));
  }
  return out;
}

/** Every business in the world, or in one place, grouped by its kind. */
export function industryTally(api: CoreAPI, placeId?: string): IndustryTally {
  const c = api.state as CoreState;
  const byKind = new Map<string, IndustryBusiness[]>();
  const staffOf = staffReader(api);
  const outsideOf = outsideSalesReader(c);
  for (const book of c.finance.businesses.values()) {
    const at = c.organizations.get(book.organizationId)?.placeId;
    if (!at || (placeId !== undefined && at !== placeId)) continue;
    const view = businessBooksView(api, book.organizationId);
    if (!view) continue;
    const row: IndustryBusiness = {
      organizationId: book.organizationId,
      name: c.organizations.get(book.organizationId)?.name ?? "",
      placeId: at,
      staff: book.closedAt ? 0 : staffOf(book.organizationId, at),
      salesMinor: view.salesMinor,
      wagesPaidMinor: view.wagesPaidMinor,
      operatingCostsMinor: view.operatingCostsMinor,
      outsideCostsMinor: view.outsideCostsMinor,
      profitMinor: view.profitMinor,
      cashMinor: view.cashMinor,
      priceIndex: book.anchorPrice > 0 ? book.price / book.anchorPrice : 1,
      outsideSalesPerYearMinor: outsideOf.get(book.organizationId) ?? 0,
      ...(book.closedAt ? { closedAt: book.closedAt } : {}),
    };
    const list = byKind.get(book.kindId) ?? [];
    list.push(row);
    byKind.set(book.kindId, list);
  }
  const sum = (
    rows: readonly IndustryBusiness[],
    key: keyof IndustryBusiness,
  ) => rows.reduce((n, row) => n + (row[key] as number), 0);
  const industries = [...byKind.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kindId, list]): IndustryRow => {
      const businesses = [...list].sort((a, b) =>
        a.organizationId.localeCompare(b.organizationId),
      );
      const sales = sum(businesses, "salesMinor");
      const priceIndex =
        sales > 0
          ? businesses.reduce((n, b) => n + b.priceIndex * b.salesMinor, 0) /
            sales
          : businesses.reduce((n, b) => n + b.priceIndex, 0) /
            businesses.length;
      return {
        kindId,
        name:
          DEFAULT_BUSINESS_BOOKS_DATA.kinds.find((kind) => kind.id === kindId)
            ?.industry ?? kindId,
        sector: sectorOfKind(kindId),
        open: businesses.filter((b) => !b.closedAt).length,
        closed: businesses.filter((b) => b.closedAt).length,
        staff: sum(businesses, "staff"),
        salesMinor: sales,
        wagesPaidMinor: sum(businesses, "wagesPaidMinor"),
        operatingCostsMinor: sum(businesses, "operatingCostsMinor"),
        outsideCostsMinor: sum(businesses, "outsideCostsMinor"),
        profitMinor: sum(businesses, "profitMinor"),
        cashMinor: sum(businesses, "cashMinor"),
        outsideSalesPerYearMinor: sum(businesses, "outsideSalesPerYearMinor"),
        priceIndex,
        businesses,
      };
    });
  return {
    asOf: c.date,
    ...(placeId !== undefined ? { placeId } : {}),
    industries,
  };
}

/** One month of one business: its trading record and the jobs that changed in it. */
export interface IndustryBusinessMonth {
  /** The trading record's id, for the trace. */
  readonly id: string;
  readonly date: string;
  readonly salesMinor: number;
  readonly payrollMinor: number;
  readonly costsMinor: number;
  /**
   * What the month paid under laws and taxes, by kind, with the law rows behind each and whether the
   * staffing and closing decisions weighed it (the trading row's charges; wages, supplies and outside
   * costs are the other columns).
   */
  readonly charges: readonly BusinessMonthCharge[];
  /** Staff at the month's end, as the trading row keeps it. */
  readonly staff?: number;
  readonly lossMonths: number;
  /** People hired, and let go (layoffs, staff cuts, a closing), by the jobs engine's change records. */
  readonly hired: number;
  readonly letGo: number;
  readonly left: number;
  /** The change records counted, for the trace. */
  readonly changeIds: readonly string[];
}

export interface IndustryBusinessView {
  readonly organizationId: string;
  readonly name: string;
  readonly kindId: string;
  readonly placeId?: string;
  readonly staff: number;
  readonly closedAt?: string;
  readonly months: readonly IndustryBusinessMonth[];
  /** The business module's records about it (founding, succession, the owner's choices, closure), for the trace. */
  readonly recordIds: readonly string[];
}

type Row = Record<string, unknown>;
const rowsOf = (api: CoreAPI, moduleId: string, name: string): Row[] =>
  (api.state as CoreState).modules.get(moduleId)?.state
    ? (api.moduleState(moduleId).table(name).rows() as unknown as Row[])
    : [];

const LET_GO = new Set(["layoff", "staff-shed", "closure"]);
const LEFT = new Set(["quit", "left-work"]);
/** The month's costs that are not paid under a law or tax: their own columns. */
const NOT_LAW = new Set(["wages", "supplies", "outside-costs"]);

/** One business month by month, from the records the business and jobs engines keep. */
export function industryBusiness(
  api: CoreAPI,
  organizationId: string,
): IndustryBusinessView | undefined {
  const c = api.state as CoreState;
  const book = c.finance.businesses.get(organizationId);
  if (!book) return undefined;
  const trading = rowsOf(api, BUSINESS_MODULE_ID, "trading")
    .filter((row) => row.organizationId === organizationId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const changes = rowsOf(api, JOBS_MODULE_ID, "changes").filter(
    (row) => row.organizationId === organizationId,
  );
  const months = trading.map((row, i): IndustryBusinessMonth => {
    const from = i === 0 ? "" : String(trading[i - 1]!.date);
    const inMonth = changes.filter(
      (change) =>
        String(change.date) > from && String(change.date) <= String(row.date),
    );
    const heads = (kinds: (kind: string) => boolean) =>
      inMonth
        .filter((change) => kinds(String(change.kind)))
        .reduce((n, change) => n + Number(change.heads ?? 1), 0);
    return {
      id: String(row.id),
      date: String(row.date),
      salesMinor: Number(row.salesMinor),
      payrollMinor: Number(row.payrollMinor),
      costsMinor: Number(row.costsMinor),
      charges: ((row.charges ?? []) as BusinessMonthCharge[]).filter(
        (charge) => !NOT_LAW.has(charge.kind) && charge.minor !== 0,
      ),
      ...(row.staff === undefined ? {} : { staff: Number(row.staff) }),
      lossMonths: Number(row.lossMonths),
      hired: heads((kind) => kind === "hire"),
      letGo: heads((kind) => LET_GO.has(kind)),
      left: heads((kind) => LEFT.has(kind)),
      changeIds: inMonth.map((change) => String(change.id)),
    };
  });
  // Its owner and age rows are keyed by the business itself, which the trace opens; these are the rest.
  const recordIds = [
    ...new Set(
      ["foundings", "successions", "choices", "closures"].flatMap((name) =>
        rowsOf(api, BUSINESS_MODULE_ID, name)
          .filter(
            (row) =>
              row.organizationId === organizationId &&
              row.id !== organizationId,
          )
          .map((row) => String(row.id)),
      ),
    ),
  ];
  const placeId = c.organizations.get(organizationId)?.placeId;
  return {
    organizationId,
    name: c.organizations.get(organizationId)?.name ?? "",
    kindId: book.kindId,
    ...(placeId ? { placeId } : {}),
    staff:
      book.closedAt || !placeId ? 0 : staffReader(api)(organizationId, placeId),
    ...(book.closedAt ? { closedAt: book.closedAt } : {}),
    months,
    recordIds,
  };
}
