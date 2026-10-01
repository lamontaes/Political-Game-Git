import { lawInForce } from "../governing/law-in-force";
import { recordById, recordsByStringField } from "../history-index";
import { canonicalJson } from "../canonical-json";
import { assessTaxBase, effectiveTaxPolicy, previewTax } from "../tax-policy";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import type { World } from "../types";

export const TAX_SELECTOR = "recorded-tax-base-payer";
export const TAX_ACTION = "assess-enacted-tax-base";
export const TAX_PREDICATE = "has-operative-typed-tax-policy";
export const TAX_AMOUNT = "enacted-tax-assessment";

function checkRow(row: LawConsequenceRow): void {
  if (
    row.kind !== "tax" ||
    row.when !== "assessment" ||
    row.who.selector !== TAX_SELECTOR ||
    row.what !== TAX_ACTION
  )
    throw new Error("Unsupported tax assessment selector, action or activity.");
  if (
    row.decision ||
    row.amount?.op !== "record" ||
    row.amount.key !== TAX_AMOUNT ||
    row.amount.unit !== "minor"
  )
    throw new Error(
      "Tax requires the canonical typed-policy assessment amount.",
    );
  for (const predicate of [...row.who.predicates, ...row.conditions]) {
    if (
      predicate.capability !== TAX_PREDICATE ||
      Object.keys(predicate.parameters).length
    )
      throw new Error(`Unsupported tax predicate: ${predicate.capability}`);
  }
  if (
    row.lag.days !== 0 ||
    row.onward?.length ||
    row.onRepeal !== "preserve-completed"
  )
    throw new Error(
      "Tax uses the saved policy's collection lag and preserves completed assessments.",
    );
}

/** The activity is a saved base, not a wage forecast, sale estimate or liability override.
 * A typed levy and the governing question must belong to the same actual law.
 * Questionless proposals and starting laws need a separate admitted binding.
 */
export function resolveTaxConsequences(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  checkRow(row);
  if (
    context.activity !== "assessment" ||
    context.onDate !== world.currentDate ||
    !context.questionKey
  )
    return [];
  const base = recordById(world.history.taxBases ?? [], context.activityId);
  if (
    !base ||
    base.occurredAt !== context.onDate ||
    base.recordedAt > context.onDate
  )
    return [];
  if (
    base.payer.kind !== "person" ||
    !world.people[base.payer.personId] ||
    !context.subjectIds.includes(base.payer.personId)
  )
    return [];
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === context.questionKey,
  );
  if (!proposition) return [];
  const law = lawInForce(
    world,
    base.jurisdictionId,
    proposition.id,
    base.occurredAt,
  );
  if (
    !law ||
    law.origin !== "enacted" ||
    (context.governingLawId && context.governingLawId !== law.measureId)
  )
    return [];
  const result: ResolvedLawConsequence[] = [];
  for (const proposal of recordsByStringField(
    world.history.taxProposals ?? [],
    "measureId",
    law.measureId,
  )) {
    if (
      proposal.jurisdictionId !== base.jurisdictionId ||
      !proposal.power ||
      proposal.recordedAt > context.onDate ||
      proposal.terms.baseKey !== base.baseKey
    )
      continue;
    const policy = effectiveTaxPolicy(
      world,
      base.jurisdictionId,
      proposal.terms.seriesKey,
      base.occurredAt,
    );
    if (!policy || policy.proposalId !== proposal.id) continue;
    // The common writer freezes a base/series once. Do not annotate or reprice it later.
    if (
      recordsByStringField(
        world.history.taxAssessments ?? [],
        "baseId",
        base.id,
      ).some((entry) => {
        const assessedPolicy = recordById(
          world.history.taxPolicies ?? [],
          entry.policyId,
        );
        const assessedProposal = assessedPolicy
          ? recordById(
              world.history.taxProposals ?? [],
              assessedPolicy.proposalId,
            )
          : undefined;
        return assessedProposal?.terms.seriesKey === proposal.terms.seriesKey;
      })
    )
      continue;
    const preview = previewTax(proposal.terms, base.baseKey, base.amount);
    if (preview.status !== "available") continue;
    result.push({
      row,
      law,
      questionKey: context.questionKey,
      jurisdictionId: base.jurisdictionId,
      subject: { kind: "person", id: base.payer.personId },
      activityId: base.id,
      effectiveAt: base.occurredAt,
      sourceRecordIds: [
        base.id,
        base.sourceEventId,
        proposal.id,
        proposal.levyProvisionId,
        policy.id,
        policy.enactmentId,
      ],
      value: {
        type: "amount",
        value: preview.taxAmount.minorUnits,
        unit: "minor",
        currency: preview.taxAmount.currency,
      },
    });
  }
  return result;
}

/** Resolve again so forged/stale values cannot become new liabilities. */
export function applyTaxConsequence(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.subject.kind !== "person" || resolved.value.type !== "amount")
    return world;
  const current = resolveTaxConsequences(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: "assessment",
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    questionKey: resolved.questionKey,
    governingLawId: resolved.law.measureId,
  }).find((entry) => canonicalJson(entry) === canonicalJson(resolved));
  if (!current) return world;
  const proposal = recordById(
    world.history.taxProposals ?? [],
    current.sourceRecordIds[2]!,
  );
  if (!proposal) return world;
  return assessTaxBase(world, current.activityId, proposal.terms.seriesKey, {
    law: current.law,
    questionKey: current.questionKey,
  });
}

/** Coordinator owns the shared registry; this export does not admit catalog rows. */
export const TAX_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "tax",
  owner: "team-6",
  selectors: [TAX_SELECTOR],
  actions: [TAX_ACTION],
  predicates: [TAX_PREDICATE],
  units: ["minor"],
  resolve: resolveTaxConsequences,
  apply: applyTaxConsequence,
};
