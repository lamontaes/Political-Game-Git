/**
 * An outlet's revenue (press): its readers' subscriptions and the advertising
 * the town's businesses buy from it, each paid by a named payer from its own
 * account.
 *
 * - A paper's subscription is part of what a reader's household pays for
 *   living on the 1st: a household with a reader of a paper pays that paper
 *   its subscription, per reader; the counted households pay by the same
 *   rule, times the readers they count (one model, two tiers).
 * - A business's advertising is part of what it buys outside the town for its
 *   costs: its share of costs spent on advertising, the local news outlets'
 *   share of that, split among the town's outlets by their audience. A
 *   business short of cash advertises less, on a sliding scale to its cash
 *   cushion.
 *
 * - An outlet serves a market wider than the town (a paper its county, a
 *   station its media market). The market's adults beyond the town are
 *   counted, not simulated people: each month they pay the outlet what the
 *   town's own readers and advertisers paid it last month per reader (a
 *   paper: the national revenue per reader), times the readers they stand for, from the town's outside customers' account
 *   (the one that pays the town's outside sales). That amount follows the
 *   market's size, its reading habits and the town's price per reader, and
 *   never the outlet's cost.
 *
 * Both follow the audience the day they are paid. Nobody tops up what they
 * leave short (owner ruling, Nov 12): an outlet whose readers and advertisers
 * pay less than its people cost shows operating losses, and its owner weighs
 * closing it as for any business.
 */
import { transfer } from "./accounts";
import { setLivingCostSplit, setOutsideCostSplit } from "./living-cost-split";
import { netCash } from "./modules/business";
import { payerLivingCostMinor, residentsRuntime } from "./modules/residents";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, CoreState, PlaceId, Source } from "./types";

/** What the press module tells the money side about its outlets. */
export interface OutletMoneyDeps {
  readonly moduleId: string;
  readonly townPlaceId: () => string;
  /** The town's own outlets (no national one). */
  readonly outlets: () => readonly {
    readonly id: string;
    readonly organizationId: string;
    readonly kind: string;
  }[];
  readonly followers: (outletId: string) => readonly string[];
  /** The adults beyond the town in the outlet's market whom it reaches: the market's adults less the town's, at the town's reading habits. Counted, not simulated. */
  readonly marketReaders: (outletId: string) => number;
  /** What a reader beyond the town pays the outlet each month, where the national accounts give it (a paper); undefined where the town's own revenue per reader stands for it. */
  readonly marketMonthlyPerReaderMinor: (
    outletId: string,
  ) => number | undefined;
  /** The counted adults who follow the outlet. */
  readonly countedFollowers: (outletId: string) => number;
  /** What a paper's subscription brings in per reader per year. */
  readonly subscriptionYearMinor: number;
  /** Share of a business's costs spent on advertising. */
  readonly adShareOfCosts: number;
  /** Share of advertising bought from local news outlets. */
  readonly localNewsShareOfAds: number;
  readonly source: Source;
}

/** One outlet's money in one month, by who paid it. */
export interface OutletRevenueMonthRow {
  readonly id: string;
  readonly outletId: string;
  readonly organizationId: string;
  readonly month: string;
  readonly subscriptionsFullMinor: number;
  readonly subscriptionsCountedMinor: number;
  readonly adsMinor: number;
  /** What the market's adults beyond the town paid, from the outside account. */
  readonly marketMinor: number;
  /** Full households' payments of its subscription this month. */
  readonly subscriberPayments: number;
  /** Its readers, full and counted, the day its subscriptions were last paid. */
  readonly readers: number;
  /** Businesses' cost payments that carried an ad this month. */
  readonly adPayments: number;
}

/** An ad a business bought from an outlet, with the payment it rode on. */
export interface AdBuyRow {
  readonly id: string;
  readonly outletId: string;
  readonly organizationId: string;
  readonly advertiserId: string;
  readonly date: string;
  readonly amountMinor: number;
  /** The business's outside-cost payment the ad was part of. */
  readonly transferId: string;
}

const MONTHS = 12;

interface Day {
  readonly date: string;
  readonly town: string;
  readonly outlets: readonly {
    id: string;
    organizationId: string;
    kind: string;
    audience: number;
  }[];
  readonly audienceTotal: number;
  /** For each adult who reads a paper, the papers' organizations. */
  readonly papersOf: ReadonlyMap<string, readonly string[]>;
  readonly countedReaders: ReadonlyMap<string, number>;
  countedLiving?: number;
}

const days = new WeakMap<object, Day>();
const depsOf = new WeakMap<object, OutletMoneyDeps>();

function today(core: CoreState, deps: OutletMoneyDeps): Day {
  const cached = days.get(core);
  if (cached?.date === core.date) return cached;
  const outlets = deps.outlets().map((o) => {
    const full = deps.followers(o.id).length;
    return { ...o, audience: full + deps.countedFollowers(o.id) };
  });
  const papersOf = new Map<string, string[]>();
  const countedReaders = new Map<string, number>();
  for (const o of outlets) {
    if (o.kind !== "newspaper") continue;
    for (const id of deps.followers(o.id))
      papersOf.set(id, [...(papersOf.get(id) ?? []), o.organizationId]);
    countedReaders.set(o.organizationId, deps.countedFollowers(o.id));
  }
  const day: Day = {
    date: core.date,
    town: deps.townPlaceId(),
    outlets,
    audienceTotal: outlets.reduce((n, o) => n + o.audience, 0),
    papersOf,
    countedReaders,
  };
  days.set(core, day);
  return day;
}

const month = (core: CoreState) => core.date.slice(0, 7);

function bump(
  api: CoreAPI,
  deps: OutletMoneyDeps,
  organizationId: string,
  change: Partial<Record<keyof OutletRevenueMonthRow, number>>,
  set: Partial<Record<keyof OutletRevenueMonthRow, number>> = {},
): void {
  const core = api.state as CoreState;
  const outlet = deps
    .outlets()
    .find((o) => o.organizationId === organizationId);
  if (!outlet) return;
  const table = api.moduleState(deps.moduleId).table("revenueMonths");
  const id = `${outlet.id}:${month(core)}`;
  const prior = (table.get(id) as unknown as
    OutletRevenueMonthRow | undefined) ?? {
    id,
    outletId: outlet.id,
    organizationId,
    month: month(core),
    subscriptionsFullMinor: 0,
    subscriptionsCountedMinor: 0,
    adsMinor: 0,
    marketMinor: 0,
    subscriberPayments: 0,
    readers: 0,
    adPayments: 0,
  };
  const next: Record<string, unknown> = { ...prior };
  for (const [key, value] of Object.entries(change))
    next[key] = (Number(next[key]) || 0) + (value ?? 0);
  Object.assign(next, set);
  table.put(next as unknown as ModuleRow);
  // The outlet's books take what it was paid as its sales, as for any seller.
  const book = core.finance.businesses.get(organizationId);
  const minor =
    (change.subscriptionsFullMinor ?? 0) +
    (change.subscriptionsCountedMinor ?? 0) +
    (change.adsMinor ?? 0) +
    (change.marketMinor ?? 0);
  if (book && minor > 0) {
    book.receivedMinor += minor;
    book.salesReceivedMinor += minor;
  }
}

/** A business's monthly advertising budget at the town's outlets, before the split. */
export function adBudgetMonthMinor(
  api: CoreAPI,
  businessId: string,
  deps: OutletMoneyDeps = depsOf.get(api.state)!,
): number {
  const core = api.state as CoreState;
  const book = core.finance.businesses.get(businessId);
  if (!deps || !book || book.closedAt) return 0;
  const costs =
    (book.annualPayrollMinor + (book.annualOtherCostsMinor ?? 0)) / MONTHS;
  if (!(costs > 0)) return 0;
  // A business with less cash than its cushion of costs advertises less, in
  // proportion: sliding, never a cutoff.
  const cushion = costs * api.parameter("businessCushionMonths");
  const willing = Math.max(
    0,
    Math.min(1, netCash(core, businessId) / Math.max(1, cushion)),
  );
  return costs * deps.adShareOfCosts * deps.localNewsShareOfAds * willing;
}

const adsThisMonth = new WeakMap<
  object,
  { month: string; byBusiness: Map<string, number> }
>();

/** What a business has spent on ads at the town's outlets this month. */
function adsSpent(core: CoreState): Map<string, number> {
  const held = adsThisMonth.get(core);
  if (held?.month === month(core)) return held.byBusiness;
  const byBusiness = new Map<string, number>();
  adsThisMonth.set(core, { month: month(core), byBusiness });
  return byBusiness;
}

/**
 * The press's part of households' living costs and businesses' outside costs.
 * Called once the press has its outlets; again after a restore.
 */
export function installOutletMoney(api: CoreAPI, deps: OutletMoneyDeps): void {
  const core = api.state as CoreState;
  depsOf.set(core, deps);
  const subscription = deps.subscriptionYearMinor / MONTHS;
  setLivingCostSplit(
    core,
    {
      shares(placeId, payerId) {
        const day = today(core, deps);
        if (placeId !== day.town || !day.countedReaders.size) return [];
        const person = payerId ? core.people.get(payerId) : undefined;
        if (person) {
          // A full household pays for its own readers.
          const household = core.households.get(person.householdId ?? "");
          if (!household) return [];
          const readers = new Map<string, number>();
          for (const id of household.memberIds)
            for (const org of day.papersOf.get(id) ?? [])
              readers.set(org, (readers.get(org) ?? 0) + 1);
          if (!readers.size) return [];
          const living = payerLivingCostMinor(core, placeId as PlaceId, {
            householdId: household.id,
          });
          return living > 0
            ? [...readers].map(([organizationId, n]) => ({
                organizationId,
                share: (n * subscription) / living,
              }))
            : [];
        }
        // The counted households pay for the readers they count.
        day.countedLiving ??= payerLivingCostMinor(
          core,
          placeId as PlaceId,
          "counted",
        );
        if (!(day.countedLiving > 0)) return [];
        return [...day.countedReaders].map(([organizationId, n]) => ({
          organizationId,
          share: (n * subscription) / day.countedLiving!,
        }));
      },
      paid(_placeId, organizationId, minor, payerId) {
        const full = payerId ? core.people.has(payerId) : false;
        const day = today(core, deps);
        const outlet = day.outlets.find(
          (o) => o.organizationId === organizationId,
        );
        bump(
          api,
          deps,
          organizationId,
          full
            ? { subscriptionsFullMinor: minor, subscriberPayments: 1 }
            : { subscriptionsCountedMinor: minor },
          { readers: outlet?.audience ?? 0 },
        );
      },
    },
    "press",
  );
  setOutsideCostSplit(
    core,
    {
      shares(placeId, payerId, total) {
        const day = today(core, deps);
        if (
          placeId !== day.town ||
          !payerId ||
          !(total && total > 0) ||
          !(day.audienceTotal > 0) ||
          day.outlets.some((o) => o.organizationId === payerId)
        )
          return [];
        // A month's ads are bought out of the month's first cost payments,
        // up to its budget.
        const left =
          adBudgetMonthMinor(api, payerId, deps) -
          (adsSpent(core).get(payerId) ?? 0);
        if (!(left > 0)) return [];
        const part = Math.min(1, left / total);
        // Ads are bought where the audience is.
        return day.outlets
          .filter((o) => o.audience > 0)
          .map((o) => ({
            organizationId: o.organizationId,
            share: (part * o.audience) / day.audienceTotal,
          }));
      },
      paid(_placeId, organizationId, minor, payerId) {
        if (!payerId) return;
        const outlet = deps
          .outlets()
          .find((o) => o.organizationId === organizationId);
        if (!outlet) return;
        const spent = adsSpent(core);
        spent.set(payerId, (spent.get(payerId) ?? 0) + minor);
        const day = today(core, deps);
        bump(
          api,
          deps,
          organizationId,
          { adsMinor: minor, adPayments: 1 },
          {
            readers:
              day.outlets.find((o) => o.organizationId === organizationId)
                ?.audience ?? 0,
          },
        );
        api
          .moduleState(deps.moduleId)
          .table("adBuys")
          .put({
            id: `ad:${outlet.id}:${payerId}:${core.date}`,
            outletId: outlet.id,
            organizationId,
            advertiserId: payerId,
            date: core.date,
            amountMinor: minor,
            transferId: `outside-costs:${payerId}@${core.date}`,
          } as unknown as ModuleRow);
      },
    },
    "press",
  );
}

const town = (row: OutletRevenueMonthRow | undefined) =>
  (row?.subscriptionsFullMinor ?? 0) +
  (row?.subscriptionsCountedMinor ?? 0) +
  (row?.adsMinor ?? 0);

/** The month before a date's month, as "YYYY-MM". */
function lastMonthOf(date: string): string {
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7));
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
}

/**
 * Each month the market's adults beyond the town pay each outlet what its
 * town readers and advertisers paid it per reader last month, times the
 * readers they stand for (they follow the market's size and reading habits,
 * never the outlet's cost), from the town's outside customers' account.
 */
export function payMarket(
  api: CoreAPI,
  deps: OutletMoneyDeps,
  payerId: string | undefined,
): void {
  const core = api.state as CoreState;
  if (!payerId) return;
  const from = core.cashJournal.residualAccountByOwner.get(payerId);
  if (!from) return;
  const table = api.moduleState(deps.moduleId).table("revenueMonths");
  const last = lastMonthOf(core.date);
  for (const outlet of deps.outlets()) {
    const row = table.get(`${outlet.id}:${last}`) as unknown as
      OutletRevenueMonthRow | undefined;
    const to = core.cashJournal.residualAccountByOwner.get(
      outlet.organizationId,
    );
    if (!row || !to) continue;
    // Beyond the town the businesses that advertise are not simulated, so a
    // paper's readers pay the national revenue per reader, advertising
    // included; a station's market pays what the town's revenue per reader is.
    const perReader =
      deps.marketMonthlyPerReaderMinor(outlet.id) ??
      (row.readers > 0 ? town(row) / row.readers : 0);
    const minor = Math.round(perReader * deps.marketReaders(outlet.id));
    if (!(minor > 0)) continue;
    const paid = transfer(core, api, {
      id: `outside-sales:press-market:${outlet.organizationId}:${core.date}`,
      from,
      to,
      amountMinor: minor,
      reasonKey: "press.market-readers",
      source: deps.source,
      partial: true,
    }).paidMinor;
    if (paid > 0) bump(api, deps, outlet.organizationId, { marketMinor: paid });
  }
}

/**
 * The town's outside customers: the payer of its largest outside sales.
 * Undefined where the town sells nothing outside.
 */
export function outsideCustomersOf(
  core: CoreState,
  placeId: string,
): string | undefined {
  const rt = residentsRuntime(core);
  if (!rt) return undefined;
  let best: { payerId: string; amountMinor: number; id: string } | undefined;
  for (const flow of rt.flows.values())
    if (
      flow.kind === "outside-sales" &&
      !flow.endedAt &&
      flow.placeId === placeId &&
      (!best ||
        flow.amountMinor > best.amountMinor ||
        (flow.amountMinor === best.amountMinor && flow.id < best.id))
    )
      best = flow;
  return best?.payerId;
}

/** Each outlet's yearly revenue at `month`'s rate, every payer's part, by its organization. */
export function outletYearlyRevenue(
  api: CoreAPI,
  deps: OutletMoneyDeps,
  month: string,
): Map<string, number> {
  const table = api.moduleState(deps.moduleId).table("revenueMonths");
  const yearly = new Map<string, number>();
  for (const outlet of deps.outlets()) {
    const row = table.get(`${outlet.id}:${month}`) as unknown as
      OutletRevenueMonthRow | undefined;
    if (row)
      yearly.set(outlet.organizationId, (town(row) + row.marketMinor) * MONTHS);
  }
  return yearly;
}
