import { evaluateLawAmount } from "../law-consequence-amount";
import type {
  LawAmountExpression,
  LawAmountUnit,
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import { readFinalEnactedLawTerm } from "../governing/automatic-legislation";
import { lawInForce } from "../governing/law-in-force";
import {
  growingIndex,
  recordById,
  type GrowingIndexKind,
} from "../history-index";
import { organizationProfileAt, workRoleAt } from "../life-queries";
import { applyLawPayConsequence } from "../living-world/town-pay";
import { PAY_SELECTOR, PAY_ACTION } from "./pay-rows";
export { PAY_SELECTOR, PAY_ACTION, MINIMUM_WAGE_PAY_ROWS } from "./pay-rows";
import { resourceFlowTermsAt } from "../resource-queries";
import type { EntityId, ResourceFlow, World } from "../types";

const OCCUPATION = "pay-occupation";
const EMPLOYER = "pay-employer-classification";

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
    const jurisdictionId = role?.locationJurisdictionId;
    if (!jurisdictionId)
      throw new Error("Missing pay recorded work jurisdiction capability");
    let covered = true;
    for (const predicate of [...row.who.predicates, ...row.conditions]) {
      if (
        Object.keys(predicate.parameters).length !== 1 ||
        typeof predicate.parameters.value !== "string"
      )
        throw new Error("Pay coverage predicate requires one recorded value");
      switch (predicate.capability) {
        case OCCUPATION:
          covered &&=
            role.occupationClassification === predicate.parameters.value;
          break;
        case EMPLOYER:
          covered &&=
            organizationProfileAt(world, work.organizationId!)
              ?.classification === predicate.parameters.value;
          break;
        default:
          throw new Error(
            `Missing pay predicate capability '${predicate.capability}'`,
          );
      }
    }
    if (!covered) continue;
    const law = lawInForce(
      world,
      jurisdictionId,
      proposition.id,
      context.onDate,
    );
    if (!law || (law.origin === "enacted" && law.answer !== "yes")) continue;
    if (context.governingLawId && context.governingLawId !== law.measureId)
      continue;
    const terms = resourceFlowTermsAt(world, flow.id, cutoff);
    if (!terms || terms.status !== "active" || terms.amount.currency !== "USD")
      continue;
    const sourceRecordIds = [work.id, role.id, flow.id, terms.id];
    const legalTerms: Record<string, { value: number; unit: LawAmountUnit }> =
      {};
    for (const [key, unit] of termUnits(row.amount)) {
      const term = readFinalEnactedLawTerm(world, law, {
        questionKey: proposition.stableKey,
        termKey: key,
        unit,
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

/** The existing pay-term writer remains the sole writer behind this kind. */
export function applyPayConsequence(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
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

export const PAY_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "pay",
  owner: "Team3",
  selectors: [PAY_SELECTOR],
  actions: [PAY_ACTION],
  predicates: [OCCUPATION, EMPLOYER],
  units: ["minor/hour"],
  resolve: resolvePayConsequences,
  apply: applyPayConsequence,
};
