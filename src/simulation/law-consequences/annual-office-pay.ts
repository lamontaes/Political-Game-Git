import {
  growingIndex,
  recordById,
  recordsWithFieldValue,
  type GrowingIndexKind,
} from "../history-index";
import { workRoleAt, workStatusAt } from "../life-queries";
import { paidOfficeOf, savedAnnualOfficePayRule } from "../office-pay";
import {
  officePayLawOfficeKey,
  ruleChangeProvisionHistoryRecords,
  type RuleChangeProvisionRecord,
} from "../enacted-rule-changes";
import { stateJurisdictionForKey } from "../life-places";
import { resourceFlowTermsAt } from "../resource-queries";
import { money, recordResourceFlowTerms } from "../resources";
import { lawEffectStamp } from "../law-effect-stamp";
import { ANNUAL_OFFICE_PAY_ACTION, PAY_SELECTOR } from "./pay-rows";
import type {
  LawConsequenceContext,
  ResolvedSavedRuleConsequence,
  ResolvedSavedLawConsequence,
  SavedAnnualOfficePayAuthority,
} from "../law-consequence-types";
import type { World } from "../types";

const ANNUAL_OFFICE_RULES: GrowingIndexKind<Set<string>> = {
  create: () => new Set(),
  add: (states, record) => {
    const provision = record as RuleChangeProvisionRecord;
    if (
      [
        "pay.governor.annualDollars",
        "pay.stateLegislator.annualDollars",
        "pay.trialJudge.annualDollars",
      ].includes(provision.field)
    )
      states.add(provision.stateUsps);
  },
};

/** Resolve the actual annual office rule without converting its authority to hourly pay. */
export function resolveSavedAnnualOfficePayConsequences(
  world: World,
  context: LawConsequenceContext,
): readonly ResolvedSavedRuleConsequence[] {
  if (
    context.activity !== "payroll" ||
    context.completedShift ||
    context.questionKey ||
    context.origin === "in-force-at-start"
  )
    return [];
  const annualRuleStates = growingIndex(
    ANNUAL_OFFICE_RULES,
    world.history.ruleChangeProvisions ?? [],
  );
  if (annualRuleStates.size === 0) return [];
  if (context.onDate > world.currentDate)
    throw new Error("Annual pay cannot be resolved in the future");
  const flow = recordById(world.history.resourceFlows, context.activityId);
  if (
    !flow ||
    flow.basisReference.kind !== "work" ||
    flow.recipient.kind !== "person"
  )
    return [];
  const work = recordById(
    world.history.workRelationships,
    flow.basisReference.workRelationshipId,
  );
  if (
    !work ||
    work.personId !== flow.recipient.personId ||
    !context.subjectIds.includes(work.personId)
  )
    return [];
  const cutoff = {
    asOfDate: context.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const role = workRoleAt(world, work.id, cutoff);
  const terms = resourceFlowTermsAt(world, flow.id, cutoff);
  if (
    !role ||
    workStatusAt(world, work.id, cutoff)?.status !== "active" ||
    !terms ||
    terms.status !== "active" ||
    terms.amount.currency !== "USD" ||
    terms.cadenceKind !== "schedule:weekly"
  )
    return [];
  // A state's recorded clause cannot change another state's office pay.
  // Keep the full authority reader when constitutional measures exist: its
  // hierarchy and missing-authority checks must still see those measures.
  const held = paidOfficeOf(world, work);
  if (
    !held ||
    ((world.history.constitutionalMeasures?.length ?? 0) === 0 &&
      !annualRuleStates.has(held.state))
  )
    return [];
  const saved = savedAnnualOfficePayRule(world, work, context.onDate);
  if (
    !saved ||
    (context.governingLawId && context.governingLawId !== saved.rule.measureId)
  )
    return [];
  const { rule, legal, state, field } = saved;
  const officeKey = officePayLawOfficeKey(state);
  const clauses = recordsWithFieldValue(
    ruleChangeProvisionHistoryRecords(world),
    "measureId",
    rule.measureId,
  ).filter(
    (p) =>
      p.measureId === rule.measureId &&
      p.stateUsps === state &&
      p.officeKey === officeKey &&
      p.field === field &&
      p.filedAt <= context.onDate,
  );
  const enactments = recordsWithFieldValue(
    world.history.legislativeEnactments ?? [],
    "measureId",
    rule.measureId,
  ).filter(
    (e) =>
      e.measureId === rule.measureId &&
      e.outcome === "enacted" &&
      e.resolvedAt <= context.onDate,
  );
  if (clauses.length !== 1 || enactments.length !== 1)
    throw new Error("Missing or ambiguous adopted annual office authority");
  const clause = clauses[0]!,
    enactment = enactments[0]!;
  if (
    clause.sequence >= enactment.sequence ||
    clause.value !== rule.value ||
    clause.filedAt > enactment.resolvedAt
  )
    throw new Error("Annual office clause was not adopted by its enactment");
  if (
    !Number.isFinite(legal.annualDollars) ||
    legal.annualDollars < 0 ||
    !Number.isSafeInteger(Math.round(legal.annualDollars * 100))
  )
    throw new Error("Annual office salary requires nonnegative USD pay");
  const jurisdiction = stateJurisdictionForKey(`US-${state}`);
  if (!jurisdiction || !world.jurisdictions[jurisdiction.id])
    throw new Error("Missing actual annual office jurisdiction");
  const authority: SavedAnnualOfficePayAuthority = {
    kind: "enacted-annual-office-pay-rule",
    ruleChangeProvisionId: clause.id,
    enactmentId: enactment.id,
    measureId: rule.measureId,
    officeKey,
    stateUsps: state,
    field: field as SavedAnnualOfficePayAuthority["field"],
    operativeAt: rule.operativeAt,
    applicability: rule.applicability,
  };
  return [
    {
      row: {
        id: `pay:annual-office-rule:${clause.id}`,
        kind: "pay",
        when: "payroll",
        who: { selector: PAY_SELECTOR, predicates: [] },
        what: ANNUAL_OFFICE_PAY_ACTION,
        amount: { op: "term", key: field, unit: "dollars/year" },
        conditions: [],
        lag: { days: 0, sourceIds: [clause.id] },
        onRepeal: "preserve-completed",
        evidence: {
          sourceIds: [clause.id, enactment.id],
          population:
            "Actual paid office holder and saved office salary agreement.",
          scope: "Operative office-pay rule and recorded term applicability.",
          why: "The adopted annual salary sets prospective weekly contract terms, including decreases.",
          uncertainty: "Existing weekly salary conversion is preserved.",
        },
      },
      authority,
      jurisdictionId: jurisdiction.id,
      subject: { kind: "person", id: work.personId },
      activityId: flow.id,
      effectiveAt: context.onDate,
      sourceRecordIds: [
        work.id,
        role.id,
        flow.id,
        terms.id,
        clause.id,
        enactment.id,
        rule.measureId,
      ],
      value: {
        type: "amount",
        value: legal.annualDollars,
        unit: "dollars/year",
        currency: "USD",
      },
    },
  ];
}

/** Sole annual term writer; payment remains in the existing common settlement. */
export function applyAnnualOfficePayConsequence(
  world: World,
  resolved: ResolvedSavedLawConsequence,
): World {
  if (resolved.authority.kind !== "enacted-annual-office-pay-rule")
    throw new Error("Annual office pay requires annual authority");
  const current = resolveSavedAnnualOfficePayConsequences(world, {
    onDate: resolved.effectiveAt,
    activity: "payroll",
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.authority.measureId,
  })[0];
  if (
    !current ||
    JSON.stringify(current) !== JSON.stringify(resolved) ||
    current.value.type !== "amount" ||
    current.value.unit !== "dollars/year"
  )
    throw new Error(
      "Annual office resolution differs from its saved authority",
    );
  const flow = recordById(world.history.resourceFlows, current.activityId)!;
  const terms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: current.effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  })!;
  const a = resolved.authority;
  const weekly = Math.round((current.value.value * 100) / 52);
  if (
    terms.amount.minorUnits === weekly &&
    terms.lawEffectStamps?.some(
      (stamp) =>
        stamp.governingLawKey === a.measureId &&
        stamp.ruleAuthority?.ruleChangeProvisionId === a.ruleChangeProvisionId,
    )
  )
    return world;
  const stamp = lawEffectStamp(
    { measureId: a.measureId, origin: "enacted", operativeAt: a.operativeAt },
    {
      effectKind: "pay",
      questionKey: null,
      ruleAuthority: {
        ruleChangeProvisionId: a.ruleChangeProvisionId,
        enactmentId: a.enactmentId,
        field: a.field,
      },
      jurisdictionId: current.jurisdictionId,
      appliedAt: current.effectiveAt,
      sourceRecordIds: current.sourceRecordIds,
    },
  );
  if (!stamp)
    throw new Error("Annual office pay requires canonical attribution");
  const enactment = recordById(
    world.history.legislativeEnactments!,
    a.enactmentId,
  )!;
  if (flow.basisReference.kind !== "work")
    throw new Error("Annual office requires actual work binding");
  const work = recordById(
    world.history.workRelationships,
    flow.basisReference.workRelationshipId,
  )!;
  const legal = savedAnnualOfficePayRule(
    world,
    work,
    current.effectiveAt,
  )!.legal;
  return recordResourceFlowTerms(world, {
    stableKey: `${flow.stableKey}:pay-law:${a.measureId}:${current.effectiveAt}`,
    resourceFlowId: flow.id,
    effectiveAt: current.effectiveAt,
    status: "active",
    amount: money(weekly, terms.amount.currency),
    cadenceKind: terms.cadenceKind,
    reason: `${legal.law!.designation} set this office's salary to $${legal.annualDollars.toLocaleString("en-US")} a year.`,
    provenance: { kind: "simulated-event", eventId: enactment.outcomeEventId },
    supersedesTermsId: terms.id,
    lawEffectStamps: [stamp],
  });
}
