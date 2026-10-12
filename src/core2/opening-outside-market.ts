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
import openingCapital from "./data/opening-capital.json" with { type: "json" };
import { parameter } from "./parameters";
import { stopgap as markStopgap } from "./stopgaps";
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
  stopgap(data.stopgapId);
  markStopgap("SG-CORE-owner-distributions");
  const start = makeIsoDate(input.startedAt);
  const organizations = new Map(input.organizations.map((o) => [o.id, o]));
  const accounts = new Map<string, OrganizationInput>();
  const flows: ResidentFlowInput[] = [];
  // Each firm's recorded local sales at the opening, a year's worth.
  const localAnnual = new Map<string, number>();
  for (const row of input.finance?.contracts ?? [])
    if (row.salesReceipt && !row.externalInflow && row.periodMonths > 0)
      localAnnual.set(
        row.payeeId,
        (localAnnual.get(row.payeeId) ?? 0) +
          (row.amountMinor * 12) / row.periodMonths,
      );
  for (const row of input.residents?.flows ?? [])
    if (row.kind === "purchase" && row.cadence.kind === "months")
      localAnnual.set(
        row.payeeId,
        (localAnnual.get(row.payeeId) ?? 0) +
          (row.amountMinor * 12) / row.cadence.every,
      );
  const classificationIndustry = new Map(
    Object.entries(
      (openingCapital as { industryByClassification?: Record<string, string> })
        .industryByClassification ?? {},
    ),
  );
  const bufferParameter = (classification: string | undefined) =>
    openingCapital.medianDaysParameterByIndustry[
      (classificationIndustry.get(classification ?? "") ??
        openingCapital.overallIndustry) as keyof typeof openingCapital.medianDaysParameterByIndustry
    ] ?? openingCapital.medianDaysParameterByIndustry["all-small-businesses"];
  for (const book of input.finance?.businesses ?? []) {
    const owner = organizations.get(book.organizationId);
    if (owner) {
      const outside =
        accounts.get(owner.placeId) ??
        outsideMarketAccount(owner.placeId, start);
      accounts.set(owner.placeId, outside);
      flows.push({
        id: `owner-distribution:${book.organizationId}`,
        kind: "owner-distribution",
        financeKind: "business.owner-distribution",
        payerId: book.organizationId,
        payeeId: outside.id,
        outsideId: outside.id,
        residentsId: outside.id,
        placeId: owner.placeId,
        amountMinor: 0,
        bufferDays: parameter(bufferParameter(owner.classification)),
        firstAt: makeIsoDate(`${start.slice(0, 8)}28`),
        cadence: { kind: "months", every: 1, day: 28 },
        salesReceipt: false,
        marketAdjusted: false,
        source: {
          tag: "ESTIMATED",
          asOf: start,
          citation:
            "Owner payouts: cash above ownerDistributionBufferMultiple times the industry's median buffer days (JPMorgan Chase Institute, Cash Is King, 2016), ownerDistributionLocalShare to the town's residents.",
          estimatedFrom:
            "src/core2/data/parameters.json; stopgap SG-CORE-owner-distributions.",
        },
      });
    }
    const industry = data.shares[book.kindId];
    // Economic base (location quotient) method: sales the firm's recorded
    // local buyers can't account for are sold outside the town; the
    // industry's sourced outside share is the floor.
    const unexplained =
      book.annualDemandMinor > 0
        ? Math.max(
            0,
            1 -
              (localAnnual.get(book.organizationId) ?? 0) /
                book.annualDemandMinor,
          )
        : 0;
    const value = Math.max(industry?.value ?? 0, unexplained);
    if (value <= 0) continue;
    const share: OutsideMarketShare = industry
      ? {
          ...industry,
          value,
          ...(value > industry.value
            ? {
                tag: "ESTIMATED" as const,
                estimatedFrom: `Economic base (location quotient) residual: recorded local buyers account for ${(100 * (1 - unexplained)).toFixed(1)}% of this firm's projected receipts; industry floor ${industry.value} (${industry.citation}).`,
              }
            : {}),
        }
      : {
          value,
          low: value,
          high: value,
          tag: "ESTIMATED",
          citation:
            "Economic base (location quotient) residual of the firm's projected receipts (IRS SOI payroll share) over its recorded local buyers.",
          estimatedFrom: `Recorded local buyers account for ${(100 * (1 - unexplained)).toFixed(1)}% of projected receipts; no industry outside-share row.`,
        };
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
      account = outsideMarketAccount(firm.placeId, start);
      accounts.set(firm.placeId, account);
    }
    const weekly = Math.round(
      (book.annualDemandMinor * share.value) / data.weeksPerYear,
    );
    if (weekly <= 0) continue;
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
