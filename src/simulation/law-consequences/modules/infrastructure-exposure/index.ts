import { lawInForce } from "../../../governing/law-in-force";
import { householdMembershipsAt } from "../../../life-queries";
import { recordLawExposure } from "../../../law-exposure";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type { EntityId, World } from "../../../types";

const SELECTOR = "infrastructure.recorded-residents";
const ACTIONS = [
  "record-road-charge-exposure",
  "record-public-broadband-exposure",
  "record-road-maintenance-exposure",
] as const;

function checkRow(row: LawConsequenceRow): void {
  if (
    row.kind !== "infrastructure-exposure" ||
    row.when !== "effective" ||
    row.who.selector !== SELECTOR ||
    !(ACTIONS as readonly string[]).includes(row.what) ||
    row.amount?.op !== "constant" ||
    row.amount.value !== 1 ||
    row.amount.unit !== "count" ||
    row.who.predicates.length !== 0 ||
    row.conditions.length !== 0 ||
    row.lag.days !== 0 ||
    row.onRepeal !== "preserve-completed"
  )
    throw new Error("Unsupported infrastructure exposure row.");
}

/** Local adapter: the effective-law caller has no subject list, so use recorded residents. */
function candidateResidents(
  world: World,
  context: LawConsequenceContext,
): readonly EntityId[] {
  return context.subjectIds.length > 0
    ? [...new Set(context.subjectIds)]
    : world.personOrder;
}

function residenceJurisdiction(
  world: World,
  personId: EntityId,
  context: LawConsequenceContext,
): { jurisdictionId: EntityId; sourceIds: EntityId[] } | null {
  if (!world.people[personId]) return null;
  const membership = householdMembershipsAt(world, personId, {
    asOfDate: context.onDate,
    historySequenceExclusive: world.history.nextSequence,
  })[0];
  const location = membership?.location;
  if (!membership || !location?.jurisdictionId) return null;
  return {
    jurisdictionId: location.jurisdictionId,
    sourceIds: [membership.membership.id, location.id],
  };
}

export function resolveInfrastructureExposure(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  checkRow(row);
  if (
    context.activity !== "effective" ||
    context.onDate > world.currentDate ||
    !context.questionKey
  )
    return [];
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === context.questionKey,
  );
  if (!proposition) return [];
  const results: ResolvedLawConsequence[] = [];
  for (const personId of candidateResidents(world, context)) {
    const residence = residenceJurisdiction(world, personId, context);
    if (!residence) continue;
    const law = lawInForce(
      world,
      residence.jurisdictionId,
      proposition.id,
      context.onDate,
    );
    if (
      !law ||
      law.answer !== "yes" ||
      (context.governingLawId && law.measureId !== context.governingLawId)
    )
      continue;
    results.push({
      row,
      law,
      questionKey: proposition.stableKey,
      jurisdictionId: residence.jurisdictionId,
      subject: { kind: "person", id: personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds: [context.activityId, ...residence.sourceIds],
      value: { type: "amount", value: 1, unit: "count" },
    });
  }
  return results;
}

export function applyInfrastructureExposure(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.subject.kind !== "person") return world;
  const current = resolveInfrastructureExposure(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: "effective",
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
    questionKey: resolved.questionKey,
  }).find((candidate) => candidate.subject.id === resolved.subject.id);
  if (!current || current.value.type !== "amount") return world;
  return recordLawExposure(world, {
    stableKey: `law-infrastructure:${current.law.measureId}:${current.row.id}:${current.subject.id}:${current.activityId}`,
    personId: current.subject.id,
    measureId: current.law.measureId,
    channel: "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId: current.sourceRecordIds[0]!,
  });
}

export const registrations: readonly LawConsequenceKindRegistration[] = [
  {
    kind: "infrastructure-exposure",
    owner: "LW-22",
    selectors: [SELECTOR],
    actions: ACTIONS,
    predicates: [],
    units: ["count"],
    resolve: resolveInfrastructureExposure,
    apply: applyInfrastructureExposure,
  },
];
