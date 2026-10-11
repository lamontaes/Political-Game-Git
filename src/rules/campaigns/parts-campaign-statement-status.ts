// STOPGAP RULES3-CAM-010: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-compliance.ts :: campaignStatementStatus.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 765: !rule */
export function campaignStatementStatusRule1(facts: {
  readonly rule: unknown;
}) {
  return !facts.rule;
}

/** Legacy line 768: record.campaignId === campaign.id &&       record.kind === rule.documentKind &&       record.status === "filed" */
export function campaignStatementStatusRule2(facts: {
  readonly recordCampaignId: string;
  readonly campaignId: string;
  readonly recordKind: string;
  readonly ruleDocumentKind: string;
  readonly recordStatus: string;
}) {
  return (
    facts.recordCampaignId === facts.campaignId &&
    facts.recordKind === facts.ruleDocumentKind &&
    facts.recordStatus === "filed"
  );
}

/** Legacy line 775: world.currentDate > dueOn ? "missed" : "due" */
export function campaignStatementStatusRule3(facts: {
  readonly currentDate: string;
  readonly dueOn: string;
}) {
  return facts.currentDate > facts.dueOn ? "missed" : "due";
}
