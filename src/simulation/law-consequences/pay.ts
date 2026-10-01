import { evaluateLawAmount } from "../law-consequence-amount";
import type {
  LawAmountExpression,
  LawAmountUnit,
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
  ResolvedAnyLawConsequence,
  ResolvedSavedRuleConsequence,
} from "../law-consequence-types";
import { readFinalEnactedLawTerm } from "../governing/automatic-legislation";
import { lawInForce } from "../governing/law-in-force";
import {
  growingIndex,
  recordById,
  type GrowingIndexKind,
} from "../history-index";
import { workRoleAt, workStatusAt } from "../life-queries";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { workPayCoverageAt } from "../pay-coverage";
import {
  matchPayCoveragePredicates,
  payWorkplaceAt,
  PAY_COVERAGE_PREDICATES,
} from "../pay-coverage-predicates";
import { applyLawPayConsequence } from "../living-world/town-pay";
import {
  PAY_SELECTOR,
  PAY_ACTION,
  NON_ELECTIVE_PAY_PREDICATE,
  ANNUAL_OFFICE_PAY_ACTION,
  MINIMUM_WAGE_PAY_ROWS,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  CITY_MINIMUM_WAGE_QUESTION_KEY,
} from "./pay-rows";
export { PAY_SELECTOR, PAY_ACTION, MINIMUM_WAGE_PAY_ROWS } from "./pay-rows";
import { paidOfficeOf, officePayInForce, PAY_LAW_FIELD } from "../office-pay";
import {
  enactedRuleChangeAt,
  officePayLawOfficeKey,
  laborLawOfficeKey,
  ruleChangeProvisionHistoryRecords,
} from "../enacted-rule-changes";
import {
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "../life-places";
import { stateMinimumSettingAt } from "../minimum-wage";
import { resourceFlowTermsAt } from "../resource-queries";
import type { EntityId, ResourceFlow, World } from "../types";

const WORK_FLOWS: GrowingIndexKind<Map<EntityId, ResourceFlow[]>> = {
  create: () => new Map(),
  add: (index, input) => {
    const flow = input as ResourceFlow;
    if (flow.basisReference.kind !== "work") return;
    const id = flow.basisReference.workRelationshipId;
    const rows = index.get(id) ?? [];
    rows.push(flow);
    index.set(id, rows);
  },
};

function activityFlows(
  world: World,
  activityId: EntityId,
): readonly ResourceFlow[] {
  const flow = recordById(world.history.resourceFlows, activityId);
  if (flow) return [flow];
  if (!recordById(world.history.workRelationships, activityId))
    throw new Error("Missing pay saved-flow/work activity capability");
  return (
    growingIndex(WORK_FLOWS, world.history.resourceFlows).get(activityId) ?? []
  );
}

function termUnits(
  expression: LawAmountExpression,
): ReadonlyMap<string, LawAmountUnit> {
  const units = new Map<string, LawAmountUnit>();
  const visit = (node: LawAmountExpression): void => {
    switch (node.op) {
      case "term":
        if (units.has(node.key) && units.get(node.key) !== node.unit)
          throw new Error(`Pay term '${node.key}' has conflicting units`);
        units.set(node.key, node.unit);
        return;
      case "sum":
      case "minimum":
      case "maximum":
        node.operands.forEach(visit);
        return;
      case "difference":
      case "product":
      case "ratio":
        visit(node.left);
        visit(node.right);
        return;
      default:
        return;
    }
  };
  visit(expression);
  return units;
}

/** Resolve only the actual recorded payroll activity and its governing final terms. */
export function resolvePayConsequences(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== "pay" ||
    row.who.selector !== PAY_SELECTOR ||
    row.what !== PAY_ACTION
  )
    throw new Error("Missing pay selector/action capability");
  if (!row.amount || row.decision)
    throw new Error("Pay floor requires a numeric amount");
  if (row.lag.days !== 0)
    throw new Error("Missing pay delayed-activity capability");
  if (context.onDate > world.currentDate)
    throw new Error("Pay activity cannot be in the future");
  if (row.when !== context.activity) return [];
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.consequences?.some((candidate) => candidate.id === row.id),
  );
  if (!proposition) throw new Error(`Missing canonical pay row '${row.id}'`);
  if (context.questionKey && context.questionKey !== proposition.stableKey)
    return [];
  if (
    JSON.stringify(
      proposition.consequences!.find((candidate) => candidate.id === row.id),
    ) !== JSON.stringify(row)
  )
    throw new Error("Pay row differs from its canonical catalog input");
  const resolved: ResolvedLawConsequence[] = [];
  for (const flow of activityFlows(world, context.activityId)) {
    if (
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person" ||
      flow.source.kind !== "organization"
    )
      throw new Error(
        "Pay requires a recorded worker/employer compensation flow",
      );
    const personId = flow.recipient.personId;
    if (!context.subjectIds.includes(personId)) continue;
    const work = recordById(
      world.history.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (
      !work ||
      work.personId !== personId ||
      work.organizationId !== flow.source.organizationId
    )
      throw new Error("Pay flow must bind its actual worker and employer");
    const cutoff = {
      asOfDate: context.onDate,
      historySequenceExclusive: world.history.nextSequence,
    };
    const role = workRoleAt(world, work.id, cutoff);
    if (!role) throw new Error("Missing pay recorded work role capability");
    const workplace = payWorkplaceAt(world, work.id, cutoff);
    const minimum =
      proposition.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY ||
      proposition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY ||
      proposition.stableKey === CITY_MINIMUM_WAGE_QUESTION_KEY;
    // Federal law applies without inventing a missing workplace. The national
    // chain contains no state/local authority; the coverage fact stays null.
    const jurisdictionId =
      workplace.jurisdictionId ??
      (proposition.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
        ? NATIONAL_ELECTION_JURISDICTION.id
        : null);
    if (!jurisdictionId && minimum) continue;
    if (!jurisdictionId)
      throw new Error("Missing pay recorded work jurisdiction capability");
    const allPredicates = [...row.who.predicates, ...row.conditions];
    const officePredicates = allPredicates.filter(
      (predicate) => predicate.capability === NON_ELECTIVE_PAY_PREDICATE,
    );
    if (
      officePredicates.length &&
      !matchPayCoveragePredicates(world, work.id, officePredicates, cutoff)
        .matches
    )
      continue;
    // This universal exclusion remains separate from employer-specific saved
    // exceptions, so an ordinary worker's standard coverage still admits the row.
    const predicates = allPredicates.filter(
      (predicate) => predicate.capability !== NON_ELECTIVE_PAY_PREDICATE,
    );
    const match = matchPayCoveragePredicates(
      world,
      work.id,
      predicates,
      cutoff,
    );
    const coverage = workPayCoverageAt(world, work.id, cutoff);
    if (minimum && coverage) {
      const exception = coverage.exceptions.find(
        (entry) => entry.questionKey === proposition.stableKey,
      );
      if (exception ? exception.rowId !== row.id : predicates.length > 0)
        continue;
    }
    if (!(minimum && coverage) && !match.matches) continue;
    const law = lawInForce(
      world,
      jurisdictionId,
      proposition.id,
      context.onDate,
    );
    if (!law || (law.origin === "enacted" && law.answer !== "yes")) continue;
    // A starting state "no" means no increase above the federal standard.
    // The separate federal row supplies that standard, not a state statute.
    if (
      proposition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY &&
      law.origin === "in-force-at-start" &&
      law.answer === "no"
    )
      continue;
    if (context.governingLawId && context.governingLawId !== law.measureId)
      continue;
    const terms = resourceFlowTermsAt(world, flow.id, cutoff);
    if (!terms || terms.status !== "active" || terms.amount.currency !== "USD")
      continue;
    const sourceRecordIds = [
      work.id,
      role.id,
      flow.id,
      terms.id,
      ...(minimum && coverage ? coverage.factRecordIds : match.factRecordIds),
      ...(coverage ? [coverage.id] : []),
      ...workplace.factRecordIds,
    ];
    const legalTerms: Record<string, { value: number; unit: LawAmountUnit }> =
      {};
    for (const [key, unit] of termUnits(row.amount)) {
      const term = readFinalEnactedLawTerm(world, law, {
        questionKey: proposition.stableKey,
        termKey: key,
        unit,
        onDate: context.onDate,
      });
      if (!term)
        throw new Error(`Missing pay final law term '${key}' (${unit})`);
      legalTerms[key] = { value: term.value, unit: term.unit };
      sourceRecordIds.push(...term.sourceRecordIds);
    }
    const amount = evaluateLawAmount(row.amount, {
      term: legalTerms,
      record: {},
      capacity: {},
      exposure: {},
    });
    if (
      amount.unit !== "minor/hour" ||
      !Number.isSafeInteger(amount.value) ||
      amount.value < 0
    )
      throw new Error(
        "Pay floor must resolve to nonnegative integer cents per hour",
      );
    resolved.push({
      row,
      law,
      questionKey: proposition.stableKey,
      jurisdictionId,
      subject: { kind: "person", id: personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds: [...new Set(sourceRecordIds)],
      value: {
        type: "amount",
        value: amount.value,
        unit: amount.unit,
        currency: "USD",
      },
    });
  }
  return resolved;
}

/** Bind annual salary only to the actual held office and adopted saved clause. */
export function resolveAnnualOfficePayConsequences(
  world: World,
  context: LawConsequenceContext,
): readonly ResolvedSavedRuleConsequence[] {
  if (
    context.activity !== "payroll" ||
    context.questionKey ||
    context.origin === "in-force-at-start"
  )
    return [];
  if (context.onDate > world.currentDate)
    throw new Error("Pay activity cannot be in the future");
  const cutoff = {
    asOfDate: context.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const results: ResolvedSavedRuleConsequence[] = [];
  for (const flow of activityFlows(world, context.activityId)) {
    if (
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person" ||
      flow.source.kind !== "organization"
    )
      continue;
    const personId = flow.recipient.personId;
    if (!context.subjectIds.includes(personId)) continue;
    const work = recordById(
      world.history.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (
      !work ||
      work.personId !== personId ||
      work.organizationId !== flow.source.organizationId
    )
      throw new Error("Office pay must bind its actual worker and employer");
    if (workStatusAt(world, work.id, cutoff)?.status !== "active") continue;
    const role = workRoleAt(world, work.id, cutoff);
    const terms = resourceFlowTermsAt(world, flow.id, cutoff);
    if (
      !role ||
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== "USD"
    )
      continue;
    const held = paidOfficeOf(world, work, cutoff);
    if (!held) continue;
    const field = PAY_LAW_FIELD[held.office];
    if (!field) continue;
    const officeKey = officePayLawOfficeKey(held.state);
    const legal = officePayInForce(world, work, context.onDate);
    if (!legal?.law) continue;
    const rule = enactedRuleChangeAt(world, {
      stateUsps: held.state,
      officeKey,
      field,
      onDate: context.onDate,
    });
    if (
      !rule ||
      rule.measureId !== legal.law.measureId ||
      rule.operativeAt !== legal.law.effectiveAt ||
      rule.value !== legal.annualDollars
    )
      throw new Error("Office pay rule does not match the operative salary");
    if (context.governingLawId && context.governingLawId !== rule.measureId)
      continue;
    const clauses = ruleChangeProvisionHistoryRecords(world).filter(
      (p) =>
        p.measureId === rule.measureId &&
        p.stateUsps === held.state &&
        p.officeKey === officeKey &&
        p.field === field &&
        p.filedAt <= context.onDate,
    );
    const enactments = (world.history.legislativeEnactments ?? []).filter(
      (e) =>
        e.measureId === rule.measureId &&
        e.outcome === "enacted" &&
        e.resolvedAt <= context.onDate,
    );
    if (clauses.length !== 1 || enactments.length !== 1)
      throw new Error("Missing or ambiguous adopted office salary authority");
    const clause = clauses[0]!,
      enactment = enactments[0]!;
    if (
      clause.sequence >= enactment.sequence ||
      clause.filedAt > enactment.resolvedAt ||
      clause.value !== rule.value
    )
      throw new Error("Office salary clause was not adopted by this enactment");
    const amount = legal.annualDollars * 100;
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error(
        "Office annual salary must be nonnegative integer USD cents",
      );
    const jurisdiction = stateJurisdictionForKey(`US-${held.state}`);
    if (!jurisdiction || !world.jurisdictions[jurisdiction.id])
      throw new Error("Missing actual office salary jurisdiction");
    const sourceRecordIds = [
      ...new Set([
        work.id,
        role.id,
        flow.id,
        terms.id,
        clause.id,
        enactment.id,
        rule.measureId,
      ]),
    ];
    const row: LawConsequenceRow = {
      id: `pay:office-rule:${clause.id}`,
      kind: "pay",
      when: "payroll",
      who: { selector: PAY_SELECTOR, predicates: [] },
      what: ANNUAL_OFFICE_PAY_ACTION,
      amount: { op: "term", key: field, unit: "minor" },
      conditions: [],
      lag: { days: 0, sourceIds: [clause.id] },
      onRepeal: "preserve-completed",
      evidence: {
        sourceIds: [clause.id, enactment.id],
        population: "The actual holder of the salary-bearing office",
        scope:
          "The adopted office salary clause and its recorded applicability",
        why: "The operative annual salary governs prospective compensation through the existing payroll cadence",
        uncertainty: "No unrecorded office or salary is inferred",
      },
    };
    results.push({
      row,
      authority: {
        kind: "enacted-office-rule",
        ruleChangeProvisionId: clause.id,
        enactmentId: enactment.id,
        measureId: rule.measureId,
        officeKey,
        stateUsps: held.state,
        field,
        operativeAt: rule.operativeAt,
        applicability: rule.applicability,
      },
      jurisdictionId: jurisdiction.id,
      subject: { kind: "person", id: personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds,
      value: { type: "amount", value: amount, unit: "minor", currency: "USD" },
    });
  }
  return results;
}

/** An adopted hourly clause uses the same pay kind, with actual saved authority. */
export function resolveSavedHourlyPayConsequences(
  world: World,
  context: LawConsequenceContext,
): readonly ResolvedSavedRuleConsequence[] {
  if (
    context.activity !== "payroll" ||
    context.questionKey ||
    context.origin === "in-force-at-start"
  )
    return [];
  if (context.onDate > world.currentDate)
    throw new Error("Pay activity cannot be in the future");
  const cutoff = {
    asOfDate: context.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const results: ResolvedSavedRuleConsequence[] = [];
  const template = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
  for (const flow of activityFlows(world, context.activityId)) {
    if (
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person" ||
      flow.source.kind !== "organization"
    )
      continue;
    const personId = flow.recipient.personId;
    if (!context.subjectIds.includes(personId)) continue;
    const work = recordById(
      world.history.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (
      !work ||
      work.personId !== personId ||
      work.organizationId !== flow.source.organizationId
    )
      throw new Error("Hourly rule must bind its actual worker and employer");
    if (workStatusAt(world, work.id, cutoff)?.status !== "active") continue;
    const role = workRoleAt(world, work.id, cutoff),
      terms = resourceFlowTermsAt(world, flow.id, cutoff);
    if (
      !role ||
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== "USD"
    )
      continue;
    const workplace = payWorkplaceAt(world, work.id, cutoff);
    const place = workplace.jurisdictionId
      ? world.jurisdictions[workplace.jurisdictionId]
      : null;
    const stateKey = place ? stateKeyForJurisdiction(place) : null;
    if (!stateKey) continue;
    const match = matchPayCoveragePredicates(
      world,
      work.id,
      template.who.predicates,
      cutoff,
    );
    if (!match.matches) continue;
    const coverage = workPayCoverageAt(world, work.id, cutoff);
    const exception = coverage?.exceptions.find(
      (e) => e.questionKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
    );
    if (exception && exception.rowId !== template.id) continue;
    const state = stateKey.slice(3),
      officeKey = laborLawOfficeKey(state);
    const field = "labor.minimumWage.hourlyCents" as const;
    const rule = enactedRuleChangeAt(world, {
      stateUsps: state,
      officeKey,
      field,
      onDate: context.onDate,
    });
    const legal = stateMinimumSettingAt(world, stateKey, context.onDate);
    if (!rule || !legal?.measureId) continue;
    if (
      rule.measureId !== legal.measureId ||
      rule.operativeAt !== legal.effectiveAt ||
      rule.value !== legal.hourlyMinor
    )
      throw new Error("Hourly rule differs from operative state floor");
    if (context.governingLawId && context.governingLawId !== rule.measureId)
      continue;
    const clauses = ruleChangeProvisionHistoryRecords(world).filter(
      (p) =>
        p.measureId === rule.measureId &&
        p.stateUsps === state &&
        p.officeKey === officeKey &&
        p.field === field &&
        p.filedAt <= context.onDate,
    );
    const enactments = (world.history.legislativeEnactments ?? []).filter(
      (e) =>
        e.measureId === rule.measureId &&
        e.outcome === "enacted" &&
        e.resolvedAt <= context.onDate,
    );
    if (clauses.length !== 1 || enactments.length !== 1)
      throw new Error("Missing or ambiguous adopted hourly authority");
    const clause = clauses[0]!,
      enactment = enactments[0]!;
    if (
      clause.sequence >= enactment.sequence ||
      clause.filedAt > enactment.resolvedAt ||
      clause.value !== rule.value
    )
      throw new Error("Hourly clause was not adopted by this enactment");
    if (!Number.isSafeInteger(legal.hourlyMinor) || legal.hourlyMinor < 0)
      throw new Error("Hourly rule requires nonnegative integer USD cents");
    const jurisdiction = stateJurisdictionForKey(stateKey);
    if (!jurisdiction || !world.jurisdictions[jurisdiction.id])
      throw new Error("Missing actual hourly rule jurisdiction");
    const sourceRecordIds = [
      ...new Set([
        work.id,
        role.id,
        flow.id,
        terms.id,
        clause.id,
        enactment.id,
        rule.measureId,
        ...workplace.factRecordIds,
        ...match.factRecordIds,
        ...(coverage ? [coverage.id, ...coverage.factRecordIds] : []),
      ]),
    ];
    results.push({
      row: {
        ...template,
        id: `pay:hourly-rule:${clause.id}`,
        amount: { op: "term", key: field, unit: "minor/hour" },
        evidence: {
          ...template.evidence,
          sourceIds: [clause.id, enactment.id],
        },
      },
      authority: {
        kind: "enacted-hourly-pay-rule",
        ruleChangeProvisionId: clause.id,
        enactmentId: enactment.id,
        measureId: rule.measureId,
        officeKey,
        stateUsps: state,
        field,
        operativeAt: rule.operativeAt,
        applicability: rule.applicability,
      },
      jurisdictionId: jurisdiction.id,
      subject: { kind: "person", id: personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds,
      value: {
        type: "amount",
        value: legal.hourlyMinor,
        unit: "minor/hour",
        currency: "USD",
      },
    });
  }
  return results;
}

/** The existing pay-term writer remains the sole writer behind this kind. */
export function applyPayConsequence(
  world: World,
  resolved: ResolvedAnyLawConsequence,
): World {
  if ("authority" in resolved) {
    if (resolved.authority.kind === "enacted-hourly-pay-rule") {
      const current = resolveSavedHourlyPayConsequences(world, {
        onDate: resolved.effectiveAt,
        activity: "payroll",
        activityId: resolved.activityId,
        subjectIds: [resolved.subject.id],
        governingLawId: resolved.authority.measureId,
      }).find(
        (input) =>
          input.row.id === resolved.row.id &&
          input.subject.id === resolved.subject.id,
      );
      if (
        !current ||
        JSON.stringify(current) !== JSON.stringify(resolved) ||
        current.authority.kind !== "enacted-hourly-pay-rule" ||
        current.value.type !== "amount" ||
        current.value.unit !== "minor/hour" ||
        current.value.currency !== "USD"
      )
        throw new Error("Hourly resolution differs from its saved authority");
      const flow = activityFlows(world, current.activityId).find(
        (f) =>
          f.recipient.kind === "person" &&
          f.recipient.personId === current.subject.id &&
          current.sourceRecordIds.includes(f.id),
      );
      if (!flow || flow.basisReference.kind !== "work")
        throw new Error("Missing actual hourly rule flow");
      return applyLawPayConsequence(world, {
        rowId: current.row.id,
        jurisdictionId: current.jurisdictionId,
        personId: current.subject.id,
        workId: flow.basisReference.workRelationshipId,
        payFlowId: flow.id,
        activityId: current.activityId,
        effectiveAt: current.effectiveAt,
        amount: {
          value: current.value.value,
          unit: "minor/hour",
          currency: "USD",
        },
        sourceRecordIds: current.sourceRecordIds,
        action: "raise-saved-rule-hourly-floor",
        authority: current.authority,
      });
    }
    if (resolved.authority.kind !== "enacted-office-rule")
      throw new Error("Pay cannot consume standing service authority");
    const current = resolveAnnualOfficePayConsequences(world, {
      onDate: resolved.effectiveAt,
      activity: "payroll",
      activityId: resolved.activityId,
      subjectIds: [resolved.subject.id],
      governingLawId: resolved.authority.measureId,
    }).find(
      (input) =>
        input.row.id === resolved.row.id &&
        input.subject.id === resolved.subject.id,
    );
    if (
      !current ||
      current.authority.kind !== "enacted-office-rule" ||
      JSON.stringify(current) !== JSON.stringify(resolved)
    )
      throw new Error(
        "Office salary resolution differs from its saved authority",
      );
    if (
      current.value.type !== "amount" ||
      current.value.unit !== "minor" ||
      current.value.currency !== "USD"
    )
      throw new Error("Office salary requires annual USD cents");
    const flow = activityFlows(world, current.activityId).find(
      (f) =>
        f.recipient.kind === "person" &&
        f.recipient.personId === current.subject.id &&
        current.sourceRecordIds.includes(f.id),
    );
    if (!flow || flow.basisReference.kind !== "work")
      throw new Error("Missing actual office salary flow");
    return applyLawPayConsequence(world, {
      rowId: current.row.id,
      jurisdictionId: current.jurisdictionId,
      personId: current.subject.id,
      workId: flow.basisReference.workRelationshipId,
      payFlowId: flow.id,
      activityId: current.activityId,
      effectiveAt: current.effectiveAt,
      amount: { value: current.value.value, unit: "minor", currency: "USD" },
      sourceRecordIds: current.sourceRecordIds,
      action: "set-annual-office-salary",
      authority: current.authority,
    });
  }
  if (
    resolved.subject.kind !== "person" ||
    resolved.value.type !== "amount" ||
    resolved.value.unit !== "minor/hour" ||
    resolved.value.currency !== "USD"
  )
    throw new Error("Pay requires a resolved worker and USD hourly floor");
  const flow = activityFlows(world, resolved.activityId).find(
    (candidate) =>
      candidate.recipient.kind === "person" &&
      candidate.recipient.personId === resolved.subject.id &&
      resolved.sourceRecordIds.includes(candidate.id),
  );
  if (!flow || flow.basisReference.kind !== "work")
    throw new Error("Missing resolved actual pay flow");
  return applyLawPayConsequence(world, {
    rowId: resolved.row.id,
    questionKey: resolved.questionKey,
    jurisdictionId: resolved.jurisdictionId,
    law: resolved.law,
    personId: resolved.subject.id,
    workId: flow.basisReference.workRelationshipId,
    payFlowId: flow.id,
    activityId: resolved.activityId,
    effectiveAt: resolved.effectiveAt,
    amount: {
      value: resolved.value.value,
      unit: "minor/hour",
      currency: "USD",
    },
    sourceRecordIds: resolved.sourceRecordIds,
    action: "raise-hourly-floor",
  });
}

export const PAY_REGISTRATION: LawConsequenceKindRegistration<ResolvedAnyLawConsequence> =
  {
    kind: "pay",
    owner: "Team3",
    selectors: [PAY_SELECTOR],
    actions: [PAY_ACTION, ANNUAL_OFFICE_PAY_ACTION],
    predicates: PAY_COVERAGE_PREDICATES,
    units: ["minor/hour", "minor"],
    resolve: resolvePayConsequences,
    resolveSavedRules: (world, context) => [
      ...resolveAnnualOfficePayConsequences(world, context),
      ...resolveSavedHourlyPayConsequences(world, context),
    ],
    apply: applyPayConsequence,
  };
