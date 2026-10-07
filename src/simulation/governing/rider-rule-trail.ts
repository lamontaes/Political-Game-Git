import type { LegislativeRulePack } from "../legislature-rules";
import type {
  LegislativeAmendmentRecord,
  LegislativeMeasureRecord,
  LegislativeProposedSection,
  World,
} from "../types";
import { billDomains, singleSubjectRule } from "./chamber-procedure";

/** Preserve a possible rule issue with the amendment that caused it. This
 * uses the same explicitly modeled domain proxy as amendment admissibility;
 * it neither rules on the law's validity nor starts a court case. */
export function potentialRiderRuleIssue(
  world: World,
  pack: LegislativeRulePack,
  measure: LegislativeMeasureRecord,
  sections: readonly LegislativeProposedSection[],
): LegislativeAmendmentRecord["potentialSingleSubjectIssue"] {
  const rule = singleSubjectRule(pack);
  if (
    !rule ||
    !(measure.subjectClass === "appropriation"
      ? rule.appropriationBills
      : rule.generalBills)
  )
    return undefined;
  const domains = billDomains(world, measure);
  if (domains.size === 0) return undefined;
  const added = new Set<string>();
  const propositions = new Set<string>();
  for (const section of sections) {
    const id = section.answers?.propositionId;
    if (!id) continue;
    const proposition = world.policyCatalog.propositions[id];
    const domain = proposition
      ? world.policyCatalog.issues[proposition.issueId]?.domainId
      : undefined;
    if (!domain || domains.has(domain)) continue;
    added.add(domain);
    propositions.add(id);
  }
  return added.size > 0
    ? {
        citation: rule.citation,
        assessmentBasis: "policy-domain-proxy",
        billDomainIds: [...domains],
        addedDomainIds: [...added],
        propositionIds: [...propositions],
      }
    : undefined;
}
