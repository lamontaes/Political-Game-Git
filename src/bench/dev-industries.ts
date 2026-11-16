/**
 * The town's industries as they stand, for dev mode: every business by its
 * kind (the one industry key, the business-books kind each business carries),
 * with its staff and its books. The one tally of industries: a twin check
 * (this world against the same world left alone) is two tallies compared by
 * kind and business, never a second count. Read-only: it spends no game time
 * and creates no facts.
 */
import type { CoreAPI, CoreState } from "../core2/types";
import { businessBooksView } from "../core2/business-books-view";
import { sectorOfKind } from "../core2/business-books";
import type { CountrySector } from "../core2/country-model";
import { countedHeadcountOf } from "../core2/residents-economy";
import { BUSINESS_MODULE_ID } from "../core2/business-module-id";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";

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
  readonly closedAt?: string;
}

export interface IndustryRow {
  readonly kindId: string;
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
  /** The sales-weighted price index of its businesses (a plain mean with no sales). */
  readonly priceIndex: number;
  readonly businesses: readonly IndustryBusiness[];
}

export interface IndustryTally {
  readonly asOf: string;
  readonly placeId?: string;
  readonly industries: readonly IndustryRow[];
}

function staffOf(c: CoreState, organizationId: string): number {
  return (
    [...(c.finance.jobsByOrganization.get(organizationId) ?? [])].filter(
      (jobId) => c.jobs.get(jobId)?.endsAt === undefined,
    ).length + countedHeadcountOf(c, organizationId)
  );
}

/** Every business in the world, or in one place, grouped by its kind. */
export function industryTally(api: CoreAPI, placeId?: string): IndustryTally {
  const c = api.state as CoreState;
  const byKind = new Map<string, IndustryBusiness[]>();
  for (const book of c.finance.businesses.values()) {
    const at = c.organizations.get(book.organizationId)?.placeId;
    if (!at || (placeId !== undefined && at !== placeId)) continue;
    const view = businessBooksView(api, book.organizationId);
    if (!view) continue;
    const row: IndustryBusiness = {
      organizationId: book.organizationId,
      name: c.organizations.get(book.organizationId)?.name ?? "",
      placeId: at,
      staff: book.closedAt ? 0 : staffOf(c, book.organizationId),
      salesMinor: view.salesMinor,
      wagesPaidMinor: view.wagesPaidMinor,
      operatingCostsMinor: view.operatingCostsMinor,
      outsideCostsMinor: view.outsideCostsMinor,
      profitMinor: view.profitMinor,
      cashMinor: view.cashMinor,
      priceIndex: book.anchorPrice > 0 ? book.price / book.anchorPrice : 1,
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
  readonly complianceMinor: number;
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
      complianceMinor: Number(row.complianceMinor),
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
    staff: book.closedAt ? 0 : staffOf(c, organizationId),
    ...(book.closedAt ? { closedAt: book.closedAt } : {}),
    months,
    recordIds,
  };
}
