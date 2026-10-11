// STOPGAP RULES3-CAM-017: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-managers.ts :: campaignManagerCandidates.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 65: !chapter.organizerPersonId */
export function campaignManagerCandidatesRule1(facts: {
  readonly chapterOrganizerPersonId: string | null;
}) {
  return !facts.chapterOrganizerPersonId!;
}

/** Legacy line 70: personId !== campaign.candidatePersonId */
export function campaignManagerCandidatesRule2(facts: {
  readonly personId: string;
  readonly campaignCandidatePersonId: string;
}) {
  return facts.personId !== facts.campaignCandidatePersonId;
}

/** Legacy line 75: row.campaignWorkDays > 0 */
export function campaignManagerCandidatesRule3(facts: {
  readonly rowCampaignWorkDays: number;
}) {
  return facts.rowCampaignWorkDays > 0;
}

/** Legacy line 78: b.campaignWorkDays - a.campaignWorkDays ||         a.personId.localeCompare(b.personId) */
export function campaignManagerCandidatesRule4(facts: {
  readonly bCampaignWorkDays: number;
  readonly aCampaignWorkDays: number;
  readonly aPersonIdLocaleCompareBPersonId: number;
}) {
  return (
    facts.bCampaignWorkDays - facts.aCampaignWorkDays ||
    facts.aPersonIdLocaleCompareBPersonId
  );
}
