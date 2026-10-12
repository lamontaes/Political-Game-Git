/**
 * Buyers from outside the town. A small town's firms sell much of their
 * output to people, businesses and governments elsewhere: a quarry's gravel,
 * a motel's guests, a care home's Medicaid residents. Each firm's sales to
 * them are its own projected receipts (its books) times its industry's
 * sourced share of receipts from outside the town, paid weekly from one
 * outside account per place, so every such dollar is reported outside money.
 */
import { makeIsoDate } from "../simulation/dates";
import { stopgap } from "./stopgaps";
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
  stopgapId: string;
  note?: string;
  weeksPerYear: number;
  cadenceDays: number;
  firstOffsetDays: number;
  shares: Readonly<Record<string, OutsideMarketShare>>;
}

export const OUTSIDE_MARKET_KIND = "outside-market";

export function addOutsideMarket(
  input: CoreInput,
  data: OutsideMarketData = outsideMarket as OutsideMarketData,
): CoreInput {
  stopgap(data.stopgapId);
  const start = makeIsoDate(input.startedAt);
  const organizations = new Map(input.organizations.map((o) => [o.id, o]));
  const accounts = new Map<string, OrganizationInput>();
  const flows: ResidentFlowInput[] = [];
  for (const book of input.finance?.businesses ?? []) {
    const share = data.shares[book.kindId];
    if (!share || share.value <= 0) continue;
    const firm = organizations.get(book.organizationId);
    if (!firm)
      throw new Error(`Business without a record: ${book.organizationId}`);
    const source: Source = {
      tag: share.tag,
      asOf: start,
      citation: share.citation,
      ...(share.estimatedFrom ? { estimatedFrom: share.estimatedFrom } : {}),
    };
    let account = accounts.get(firm.placeId);
    if (!account) {
      account = {
        id: `outside-market:${firm.placeId}`,
        placeId: firm.placeId,
        name: "Buyers from outside the town",
        kind: OUTSIDE_MARKET_KIND,
        liquidMinor: 0,
        outsideFlow: {
          tag: "ESTIMATED",
          asOf: start,
          citation:
            "Customers outside the town: nonresident consumers, outside businesses and government programs, by industry share of receipts.",
          estimatedFrom: "src/core2/data/outside-market.json",
        },
        source: {
          tag: "ESTIMATED",
          asOf: start,
          citation:
            "Outside buyers' account: a recorded flow account with no opening cash.",
          estimatedFrom: "src/core2/data/outside-market.json",
        },
      };
      accounts.set(firm.placeId, account);
    }
    const weekly = Math.round(
      (book.annualDemandMinor * share.value) / data.weeksPerYear,
    );
    if (weekly <= 0) continue;
    const firstAt = new Date(`${start}T00:00:00.000Z`);
    firstAt.setUTCDate(firstAt.getUTCDate() + data.firstOffsetDays);
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
      marketAdjusted: true,
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
