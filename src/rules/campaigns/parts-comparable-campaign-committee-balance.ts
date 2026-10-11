// STOPGAP RULES3-CAM-021: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-opponents.ts :: comparableCampaignCommitteeBalance.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 352: peer.officeKey === campaign.officeKey &&       peer.treasuryCurrency === campaign.treasuryCurrency */
export function comparableCampaignCommitteeBalanceRule1(facts: {
  readonly peerOfficeKey: string;
  readonly campaignOfficeKey: string;
  readonly peerTreasuryCurrency: string;
  readonly campaignTreasuryCurrency: string;
}) {
  return (
    facts.peerOfficeKey === facts.campaignOfficeKey &&
    facts.peerTreasuryCurrency === facts.campaignTreasuryCurrency
  );
}

/** Legacy line 359: contest?.office.officeKey === campaign.officeKey */
export function comparableCampaignCommitteeBalanceRule2(facts: {
  readonly contestOfficeOfficeKey: string | undefined;
  readonly campaignOfficeKey: string;
}) {
  return facts.contestOfficeOfficeKey! === facts.campaignOfficeKey;
}

/** Legacy line 368: account ? [account] : [] */
export function comparableCampaignCommitteeBalanceRule3(facts: {
  readonly account: unknown;
  readonly account2: unknown;
}) {
  return facts.account ? facts.account2 : [];
}

/** Legacy line 370: !accounts.length */
export function comparableCampaignCommitteeBalanceRule4(facts: {
  readonly accountsLength: number;
}) {
  return !facts.accountsLength;
}

/** Legacy line 375: Math.round(         accounts.reduce(           (total, account) => total + account.liquidBalance.minorUnits,           0,         ) / accounts.length,       ) */
export function comparableCampaignCommitteeBalanceRule5(facts: {
  readonly accountsReduceTotalAccountTotalAccountLiquidBalanceMinorUnits0: number;
  readonly accountsLength: number;
}) {
  return Math.round(
    facts.accountsReduceTotalAccountTotalAccountLiquidBalanceMinorUnits0 /
      facts.accountsLength,
  );
}

/** Legacy line 377: total + account.liquidBalance.minorUnits */
export function comparableCampaignCommitteeBalanceRule6(facts: {
  readonly total: number;
  readonly accountLiquidBalanceMinorUnits: number;
}) {
  return facts.total + facts.accountLiquidBalanceMinorUnits;
}
