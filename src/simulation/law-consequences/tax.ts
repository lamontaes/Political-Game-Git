import { appendStatutoryTaxLawAttribution } from "../statutory-tax-law-attribution";
import { lawInForce } from "../governing/law-in-force";
import { recordById, recordsByStringField } from "../history-index";
import { canonicalJson } from "../canonical-json";
import {
  assessTaxBase,
  taxBaseOccurrenceSource,
  effectiveTaxPolicy,
  previewTax,
  taxLevyText,
} from "../tax-policy";
import { bindTaxLawTerms } from "../tax-law-term-binding";
import { currentLifeCutoff } from "../life-queries";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
  ResolvedTypedTaxConsequence,
  ResolvedAnyLawConsequence,
} from "../law-consequence-types";
import type { World } from "../types";

export const TAX_SELECTOR = "recorded-tax-base-payer";
export const TAX_ACTION = "assess-enacted-tax-base";
export const STATUTORY_TAX_ACTION = "attribute-saved-statutory-tax";
export const TAX_PREDICATE = "has-operative-typed-tax-policy";
export const TAX_AMOUNT = "enacted-tax-assessment";

function checkRow(row: LawConsequenceRow): void {
  if (
    row.kind !== "tax" ||
    (row.when !== "assessment" && row.when !== "payment") ||
    row.who.selector !== TAX_SELECTOR ||
    (row.what !== TAX_ACTION && row.what !== STATUTORY_TAX_ACTION)
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
    (context.activity !== "assessment" && context.activity !== "payment") ||
    context.onDate > world.currentDate ||
    row.when !== context.activity ||
    !context.questionKey
  )
    return [];
  const statutory = taxBaseOccurrenceSource(world, context.activityId);
  if (statutory && statutory.kind !== "event") {
    return row.what === STATUTORY_TAX_ACTION
      ? resolveStatutoryTaxConsequences(world, row, context)
      : [];
  }
  if (context.activity !== "assessment" || context.onDate !== world.currentDate)
    return [];
  if (row.what === STATUTORY_TAX_ACTION) return [];
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
    // New catalog tax questions require their actual adopted term binding.
    // Missing canonical categories remain unavailable, never filed defaults.
    const binding = context.questionKey.startsWith("us-tax-terms:")
      ? bindTaxLawTerms(world, {
          law,
          questionKey: context.questionKey,
          proposalId: proposal.id,
          onDate: base.occurredAt,
          cutoff: currentLifeCutoff(world),
        })
      : null;
    if (binding?.kind === "unavailable") continue;
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
        ...(binding?.kind === "available" ? binding.sourceRecordIds : []),
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

/** Existing statutory rows are attributed, never reassessed or paid again. */
function resolveStatutoryTaxConsequences(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  const source = taxBaseOccurrenceSource(world, context.activityId);
  if (
    !source ||
    source.kind === "event" ||
    source.kind === "paid-sale" ||
    source.occurredAt !== context.onDate ||
    source.payer.kind !== "person" ||
    !context.subjectIds.includes(source.payer.personId) ||
    (context.activity === "assessment" &&
      source.kind !== "statutory-liability") ||
    (context.activity === "payment" && source.kind !== "statutory-payment")
  )
    return [];
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === context.questionKey,
  );
  if (!proposition) return [];
  const liabilities =
    source.kind === "statutory-liability"
      ? [source.liabilityRecord]
      : source.liabilityRecords;
  const result: ResolvedLawConsequence[] = [];
  for (const liability of liabilities) {
    const law = lawInForce(
      world,
      source.jurisdictionId,
      proposition.id,
      `${liability.taxYear}-01-01` as typeof context.onDate,
      "enacted-only",
    );
    if (
      !law ||
      (context.governingLawId && law.measureId !== context.governingLawId) ||
      !liability.lawMeasureIds?.includes(law.measureId)
    )
      continue;
    const liabilitySource = taxBaseOccurrenceSource(world, liability.id);
    if (!liabilitySource || liabilitySource.kind !== "statutory-liability")
      continue;
    const allocations =
      source.kind === "statutory-liability"
        ? [
            {
              amount: liability.liability,
              ids: liabilitySource.sourceRecordIds,
            },
          ]
        : source.paymentRecords
            .filter((payment) => payment.liabilityId === liability.id)
            .map((payment) => ({
              amount: payment.amount,
              ids: [
                ...liabilitySource.sourceRecordIds,
                payment.id,
                source.transferRecord.id,
                source.flowRecord.id,
                ...(source.flowRecord.recipient.kind === "organization"
                  ? [source.flowRecord.recipient.organizationId]
                  : []),
              ],
            }));
    for (const allocation of allocations) {
      if (!allocation.amount) continue;
      const resolved: ResolvedLawConsequence = {
        row,
        law,
        questionKey: proposition.stableKey,
        jurisdictionId: source.jurisdictionId,
        subject: { kind: "person", id: source.payer.personId },
        activityId: context.activityId,
        effectiveAt: source.occurredAt,
        sourceRecordIds: [...new Set(allocation.ids)],
        value: {
          type: "amount",
          value: allocation.amount.minorUnits,
          unit: "minor",
          currency: allocation.amount.currency,
        },
      };
      // The writer validates the exact law, levy, payer and allocation again.
      result.push(resolved);
    }
  }
  return result;
}

/** The typed proposal's saved enacted policy is authority even when filing had no catalog question. */
export function resolveSavedTaxConsequences(
  world: World,
  context: LawConsequenceContext,
): readonly ResolvedTypedTaxConsequence[] {
  if (
    context.activity !== "assessment" ||
    context.onDate !== world.currentDate ||
    context.questionKey ||
    context.origin === "in-force-at-start" ||
    context.standingAppropriationId
  )
    return [];
  const base = recordById(world.history.taxBases ?? [], context.activityId);
  if (
    !base ||
    base.occurredAt !== context.onDate ||
    base.recordedAt > context.onDate ||
    base.payer.kind !== "person" ||
    !world.people[base.payer.personId] ||
    !context.subjectIds.includes(base.payer.personId)
  )
    return [];
  const results: ResolvedTypedTaxConsequence[] = [];
  for (const proposal of world.history.taxProposals ?? []) {
    if (
      proposal.jurisdictionId !== base.jurisdictionId ||
      proposal.recordedAt > context.onDate ||
      proposal.terms.baseKey !== base.baseKey ||
      (context.governingLawId && proposal.measureId !== context.governingLawId)
    )
      continue;
    const measure = recordById(
      world.history.legislativeMeasures ?? [],
      proposal.measureId,
    );
    // Catalog-bound levies must retain their term binding and catalog handler; this is not a fallback for a failed binding.
    if (!measure || (measure.propositionIds?.length ?? 0) > 0) continue;
    const policy = effectiveTaxPolicy(
      world,
      base.jurisdictionId,
      proposal.terms.seriesKey,
      base.occurredAt,
    );
    if (!policy || policy.proposalId !== proposal.id) continue;
    const enactment = recordById(
      world.history.legislativeEnactments ?? [],
      policy.enactmentId,
    );
    const provision = recordById(
      world.history.legislativeProvisions ?? [],
      proposal.levyProvisionId,
    );
    if (
      !enactment ||
      enactment.outcome !== "enacted" ||
      enactment.measureId !== proposal.measureId ||
      enactment.resolvedAt > context.onDate ||
      !provision ||
      provision.measureId !== proposal.measureId ||
      provision.recordedAt > context.onDate ||
      provision.text !== taxLevyText(proposal.terms)
    )
      continue;
    if (
      (world.history.taxAssessments ?? []).some((assessment) => {
        if (assessment.baseId !== base.id) return false;
        const priorPolicy = recordById(
          world.history.taxPolicies ?? [],
          assessment.policyId,
        );
        const priorProposal = priorPolicy
          ? recordById(world.history.taxProposals ?? [], priorPolicy.proposalId)
          : undefined;
        return priorProposal?.terms.seriesKey === proposal.terms.seriesKey;
      })
    )
      continue;
    const amount = previewTax(proposal.terms, base.baseKey, base.amount);
    if (amount.status !== "available") continue;
    const sourceRecordIds = [
      base.id,
      base.sourceEventId,
      proposal.id,
      proposal.levyProvisionId,
      policy.id,
      policy.enactmentId,
    ];
    results.push({
      row: {
        id: `typed-tax:${proposal.levyProvisionId}`,
        kind: "tax",
        when: "assessment",
        who: { selector: TAX_SELECTOR, predicates: [] },
        what: TAX_ACTION,
        amount: { op: "record", key: TAX_AMOUNT, unit: "minor" },
        conditions: [],
        lag: { days: 0, sourceIds: [policy.id] },
        onRepeal: "preserve-completed",
        evidence: {
          sourceIds: sourceRecordIds,
          population: "The saved taxable occurrence's payer",
          scope: "The actual adopted typed levy",
          why: "Adopted terms apply to the recorded taxable base; the common writer retains the filed collection lag.",
          uncertainty:
            "No catalog question or starting-law mapping is inferred.",
        },
      },
      authority: {
        kind: "enacted-typed-tax-policy",
        measureId: proposal.measureId,
        proposalId: proposal.id,
        policyId: policy.id,
        enactmentId: policy.enactmentId,
        levyProvisionId: proposal.levyProvisionId,
      },
      jurisdictionId: base.jurisdictionId,
      subject: { kind: "person", id: base.payer.personId },
      activityId: base.id,
      effectiveAt: base.occurredAt,
      sourceRecordIds,
      value: {
        type: "amount",
        value: amount.taxAmount.minorUnits,
        unit: "minor",
        currency: amount.taxAmount.currency,
      },
    });
  }
  return results;
}

/** Resolve again so forged/stale values cannot become new liabilities. */
export function applyTaxConsequence(
  world: World,
  resolved: ResolvedAnyLawConsequence,
): World {
  if (resolved.subject.kind !== "person" || resolved.value.type !== "amount")
    return world;
  if ("authority" in resolved) {
    if (resolved.authority.kind !== "enacted-typed-tax-policy") return world;
    const current = resolveSavedTaxConsequences(world, {
      onDate: resolved.effectiveAt,
      activity: "assessment",
      activityId: resolved.activityId,
      subjectIds: [resolved.subject.id],
      governingLawId: resolved.authority.measureId,
    }).find((entry) => canonicalJson(entry) === canonicalJson(resolved));
    if (!current) return world;
    const proposal = recordById(
      world.history.taxProposals ?? [],
      current.authority.proposalId,
    );
    return proposal
      ? assessTaxBase(world, current.activityId, proposal.terms.seriesKey)
      : world;
  }
  const source = taxBaseOccurrenceSource(world, resolved.activityId);
  if (source && source.kind !== "event") {
    return resolved.row.what === STATUTORY_TAX_ACTION
      ? appendStatutoryTaxLawAttribution(world, resolved)
      : world;
  }
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
export const TAX_REGISTRATION: LawConsequenceKindRegistration<ResolvedAnyLawConsequence> =
  {
    kind: "tax",
    owner: "team-6",
    selectors: [TAX_SELECTOR],
    actions: [TAX_ACTION, STATUTORY_TAX_ACTION],
    predicates: [TAX_PREDICATE],
    units: ["minor"],
    resolve: resolveTaxConsequences,
    resolveSavedRules: resolveSavedTaxConsequences,
    apply: applyTaxConsequence,
  };
