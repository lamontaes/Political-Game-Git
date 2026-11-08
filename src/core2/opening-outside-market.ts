/**
 * Buyers from outside the town. A small town's firms sell much of their
 * output to people, businesses and governments elsewhere: a quarry's gravel,
 * a motel's guests, a care home's Medicaid residents. Each firm's sales to
 * them are its own projected receipts (its books) times its industry's
 * sourced share of receipts from outside the town, paid weekly from one
 * outside account per place, so every such dollar is reported outside money.
 */
import { makeIsoDate } from "./kernel/dates";
import outsideMarket from "./data/outside-market.json" with { type: "json" };
import type { ResidentFlowInput, ResidentsInput } from "./residents";
import type { CoreInput, OrganizationInput, Source } from "./types";

export interface OutsideMarketShare {
  value: number;
  low: number;
  high: number;
  tag: "SOURCED" | "ESTIMATED";
  citation: string;
  estimatedFrom?: string;
}

export interface OutsideMarketData {
  version: string;
  note?: string;
  weeksPerYear: number;
  cadenceDays: number;
  firstOffsetDays: number;
  shares: Readonly<Record<string, OutsideMarketShare>>;
}

export const OUTSIDE_MARKET_KIND = "outside-market";

/**
 * The outside account a place's engines settle with: its outside market, else
 * (a world built without one) the first other outside-flow account there. A
 * public employer's pay authority also has an outside account
 * (opening-public-pay.ts); it carries that government's wages only, so
 * engines that merely need "the outside" never take it while a market exists.
 */
export function townOutsideOf<
  T extends { kind?: string; placeId?: string; outsideFlow?: unknown },
>(orgs: Iterable<T>, placeId: string | undefined): T | undefined {
  let other: T | undefined;
  for (const org of orgs) {
    if (org.placeId !== placeId || org.outsideFlow === undefined) continue;
    if (org.kind === OUTSIDE_MARKET_KIND) return org;
    other ??= org;
  }
  return other;
}

/** The one outside account per place: buyers and sellers outside the town. */
export function outsideMarketAccount(
  placeId: string,
  start: string,
): OrganizationInput {
  return {
    id: `outside-market:${placeId}`,
    placeId,
    name: "Buyers and sellers outside the town",
    kind: OUTSIDE_MARKET_KIND,
    liquidMinor: 0,
    outsideFlow: {
      tag: "ESTIMATED",
      asOf: start,
      citation:
        "Customers and suppliers outside the town: nonresident consumers, outside businesses, landlords and lenders, and government programs.",
      estimatedFrom: "src/core2/data/outside-market.json",
    },
    // The account is a recorded owner of its place's outside pay: a worker whose
    // employer is the outside account is paid from it against an exact due record
    // (public-work-pay.ts reads this authority and refuses any employer without one).
    governmentFacts: {
      governmentKind: "jurisdiction",
      governmentJurisdictionId: placeId,
    },
    publicPayAuthority: {
      id: `outside-pay:${placeId}`,
      ownerId: `outside-market:${placeId}`,
      governmentKey: `jurisdiction:${placeId}`,
      jurisdictionId: placeId,
      workCommitmentIds: [],
      basisRecordIds: [`outside-market:${placeId}`],
      source: {
        tag: "ESTIMATED",
        asOf: start,
        citation:
          "The place's outside account pays wages of employers outside the town against dated due records; it holds no cash of its own.",
        estimatedFrom: "src/core2/data/outside-market.json",
      },
    },
    source: {
      tag: "ESTIMATED",
      asOf: start,
      citation:
        "Outside account: a recorded flow account with no opening cash.",
      estimatedFrom: "src/core2/data/outside-market.json",
    },
  };
}

export function addOutsideMarket(
  input: CoreInput,
  data: OutsideMarketData = outsideMarket as OutsideMarketData,
): CoreInput {
  const start = makeIsoDate(input.startedAt);
  const organizations = new Map(input.organizations.map((o) => [o.id, o]));
  const accounts = new Map<string, OrganizationInput>();
  const flows: ResidentFlowInput[] = [];
  for (const book of input.finance?.businesses ?? []) {
    // Real outside demand: the industry's sourced share of receipts paid by
    // buyers outside the town. No firm is topped up to its projection; what
    // local buyers don't buy, it doesn't sell.
    // Every firm buys what it doesn't buy locally from outside suppliers,
    // whatever share of its sales goes outside.
    const share = data.shares[book.kindId];
    const firm = organizations.get(book.organizationId);
    if (!firm)
      throw new Error(`Business without a record: ${book.organizationId}`);
    let account = accounts.get(firm.placeId);
    if (!account) {
      account = outsideMarketAccount(firm.placeId, start);
      accounts.set(firm.placeId, account);
    }
    const firstAt = new Date(`${start}T00:00:00.000Z`);
    firstAt.setUTCDate(firstAt.getUTCDate() + data.firstOffsetDays);
    flows.push({
      id: `outside-costs:${book.organizationId}`,
      kind: "outside-costs",
      financeKind: `outside.supplier.${book.kindId}`,
      payerId: book.organizationId,
      payeeId: account.id,
      residentsId: account.id,
      placeId: firm.placeId,
      // Set each week from the firm's booked operating costs less its local purchases.
      amountMinor: 0,
      firstAt: makeIsoDate(firstAt.toISOString().slice(0, 10)),
      cadence: { kind: "days", every: data.cadenceDays },
      salesReceipt: false,
      marketAdjusted: false,
      source: {
        tag: "ESTIMATED",
        asOf: start,
        citation:
          "Operating costs from the firm's books (IRS SOI industry cost shares) not bought from a recorded local supplier are bought outside the town.",
        estimatedFrom:
          "BusinessBooksState.annualOtherCostsMinor less operatingPaidMinor.",
      },
    });
    const weekly = share
      ? Math.round((book.annualDemandMinor * share.value) / data.weeksPerYear)
      : 0;
    if (!share || weekly <= 0) continue;
    const source: Source = {
      tag: share.tag,
      asOf: start,
      citation: share.citation,
      ...(share.estimatedFrom ? { estimatedFrom: share.estimatedFrom } : {}),
    };
    flows.push({
      id: `outside-sales:${book.organizationId}`,
      kind: "outside-sales",
      financeKind: `outside.customer.${book.kindId}`,
      payerId: account.id,
      payeeId: book.organizationId,
      residentsId: account.id,
      placeId: firm.placeId,
      amountMinor: weekly,
      firstAt: makeIsoDate(firstAt.toISOString().slice(0, 10)),
      cadence: { kind: "days", every: data.cadenceDays },
      salesReceipt: true,
      // Outside buyers don't follow the town's income; national demand arrives with WORLD.
      marketAdjusted: false,
      source,
    });
  }
  if (!flows.length) return input;
  const residents: ResidentsInput = input.residents ?? {
    version: "core2-residents-v1",
    accounts: [],
    households: [],
    flows: [],
    source: {
      tag: "ESTIMATED",
      asOf: start,
      citation: "Outside buyers only; no wider population collapsed.",
      estimatedFrom: "src/core2/opening-outside-market.ts",
    },
  };
  return {
    ...input,
    organizations: [...input.organizations, ...accounts.values()],
    residents: { ...residents, flows: [...residents.flows, ...flows] },
  };
}

/** A flow's payments a year at its cadence. */
function flowPerYear(flow: ResidentFlowInput): number {
  return flow.cadence.kind === "days"
    ? (flow.amountMinor * 365) / flow.cadence.every
    : (flow.amountMinor * 12) / flow.cadence.every;
}

/**
 * The firm's trade area (Jobs and economy, Nov 8, 2026). A small town's
 * establishments are in the Census counts because they sell: their receipts
 * equal the books' demand (an identity of the receipts data), and whatever
 * the town's own households and firms do not buy comes from customers beyond
 * the town, the trade area retail analysis calls the pull factor (Stone,
 * "Retail Trade Analysis", Iowa State University Extension, 1995: a town's
 * sales above its residents' spending are trade-area customers' spending).
 * The industry's sourced outside share (`addOutsideMarket`) is a floor.
 * Applied once, after the households are counted, so the town's own buyers
 * are the real ones: the outside flow is raised until the firm's receipts
 * from town households, town firms and outside buyers together meet its
 * books. Without it the firm's sales sit near half its demand at the opening
 * and its staff is laid off toward them (Algiers, Vermont, seed r7: one
 * seeker in the opening, twenty-three thirteen months on).
 */
export function addTradeArea(
  input: CoreInput,
  data: OutsideMarketData = outsideMarket as OutsideMarketData,
): CoreInput {
  const residents = input.residents;
  if (!residents) return input;
  const local = new Map<string, number>();
  const outsideFlow = new Map<string, ResidentFlowInput>();
  for (const flow of residents.flows) {
    if (flow.kind === "purchase")
      local.set(
        flow.payeeId,
        (local.get(flow.payeeId) ?? 0) + flowPerYear(flow),
      );
    else if (flow.kind === "outside-sales") outsideFlow.set(flow.payeeId, flow);
  }
  for (const contract of input.finance?.contracts ?? [])
    if (contract.salesReceipt)
      local.set(
        contract.payeeId,
        (local.get(contract.payeeId) ?? 0) +
          (contract.amountMinor * 12) / contract.periodMonths,
      );
  const raised = new Map<string, ResidentFlowInput>();
  for (const book of input.finance?.businesses ?? []) {
    const flow = outsideFlow.get(book.organizationId);
    if (!flow) continue;
    const gap =
      book.annualDemandMinor -
      (local.get(book.organizationId) ?? 0) -
      flowPerYear(flow);
    if (gap <= 0) continue;
    const weekly = Math.round(gap / data.weeksPerYear);
    raised.set(flow.id, {
      ...flow,
      amountMinor: flow.amountMinor + weekly,
      source: {
        tag: "ESTIMATED",
        asOf: flow.source.asOf,
        citation:
          "Trade-area customers: the firm's receipts (its books' demand) less what the town's households and firms buy and the industry's sourced outside share (retail pull factor, Stone 1995, Iowa State University Extension).",
        estimatedFrom:
          "BusinessBooksState.annualDemandMinor less the town's purchase flows and sales contracts to the firm and its outside-sales flow.",
      },
    });
  }
  if (!raised.size) return input;
  return {
    ...input,
    residents: {
      ...residents,
      flows: residents.flows.map((flow) => raised.get(flow.id) ?? flow),
    },
  };
}
