import type { EntityId, IsoDate } from "./types";
export interface CongressionalPortfolio {
  readonly personId: EntityId;
  readonly openedOn: IsoDate;
  readonly estimatedWealthCents: number;
  readonly individualStockCents: number;
  readonly diversifiedFundCents: number;
  readonly basis: string;
  readonly conversionMeasureId?: EntityId;
}
export interface CongressionalInvestmentCharge {
  readonly key: string;
  readonly personId: EntityId;
  readonly measureId: EntityId;
  readonly on: IsoDate;
  readonly kind: "fund-fee" | "violation-fine";
  readonly assessedCents: number;
  readonly outcomeId: EntityId;
  readonly reason: string;
}
export interface CongressionalInvestmentStore {
  readonly version: "congress-investments-v1";
  readonly portfolios: Readonly<Record<EntityId, CongressionalPortfolio>>;
  readonly charges: readonly CongressionalInvestmentCharge[];
  readonly clearingOrganizationId: EntityId;
  readonly managerOrganizationId: EntityId;
  readonly penaltyOrganizationId: EntityId;
  readonly clearingStockCents: number;
}
