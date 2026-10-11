// STOPGAP RULES3-CAM-018: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-managers.ts :: campaignManagerOffer.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 99: !campaignManagerCandidates(world, campaignId).some(       (row) => row.personId === personId,     ) */
export function campaignManagerOfferRule1(facts: {
  readonly campaignManagerCandidatesResult: boolean;
}) {
  return !facts.campaignManagerCandidatesResult;
}

/** Legacy line 100: row.personId === personId */
export function campaignManagerOfferRule2(facts: {
  readonly rowPersonId: string;
  readonly personId: string;
}) {
  return facts.rowPersonId === facts.personId;
}

/** Legacy line 107: world.history.workRelationships.find((row) => row.id === id)           ?.personId === personId */
export function campaignManagerOfferRule3(facts: {
  readonly historyWorkRelationshipsFindRowRowIdIdPersonId: string | undefined;
  readonly personId: string;
}) {
  return (
    facts.historyWorkRelationshipsFindRowRowIdIdPersonId! === facts.personId
  );
}

/** Legacy line 107: row.id === id */
export function campaignManagerOfferRule4(facts: {
  readonly rowId: string;
  readonly id: string;
}) {
  return facts.rowId === facts.id;
}

/** Legacy line 113: Math.max(     0,     Math.floor(       (Date.parse(`${contest.electionDate}T00:00:00Z`) -         Date.parse(`${world.currentDate}T00:00:00Z`)) /         86_400_000,     ),   ) */
export function campaignManagerOfferRule5(facts: {
  readonly contestElectionDate: string;
  readonly currentDate: string;
}) {
  return Math.max(
    0,
    Math.floor(
      (Date.parse(`${facts.contestElectionDate}T00:00:00Z`) -
        Date.parse(`${facts.currentDate}T00:00:00Z`)) /
        86400000,
    ),
  );
}

/** Legacy line 121: Math.max(1, Math.ceil(days / 30)) */
export function campaignManagerOfferRule6(facts: { readonly days: number }) {
  return Math.max(1, Math.ceil(facts.days / 30));
}

/** Legacy line 126: salary.minorUnits * months */
export function campaignManagerOfferRule7(facts: {
  readonly salaryMinorUnits: number;
  readonly months: number;
}) {
  return facts.salaryMinorUnits * facts.months;
}

/** Legacy line 132: position?.liquidBalance.minorUnits ?? 0 */
export function campaignManagerOfferRule8(facts: {
  readonly positionLiquidBalanceMinorUnits: number | undefined;
}) {
  return facts.positionLiquidBalanceMinorUnits! ?? 0;
}

/** Legacy line 138: balance >= totalCost.minorUnits */
export function campaignManagerOfferRule9(facts: {
  readonly balance: number;
  readonly totalCostMinorUnits: number;
}) {
  return facts.balance >= facts.totalCostMinorUnits;
}
