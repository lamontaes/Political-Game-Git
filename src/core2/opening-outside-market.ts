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
