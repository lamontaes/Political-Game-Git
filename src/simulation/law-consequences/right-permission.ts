import { lawInForce } from "../governing/law-in-force";
import {
  householdLocationAt,
  householdMembershipsAt,
  organizationProfileAt,
} from "../life-queries";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import type { EntityId, World } from "../types";
import {
  appendLawPermission,
  permissionSourceDate,
} from "./permission-records";

const SELECTORS = [
  "recorded-person-permission",
  "recorded-organization-permission",
] as const;
const ACTIONS = ["permit-on-yes", "prohibit-on-yes"] as const;

function checkRow(row: LawConsequenceRow): void {
  if (
    row.kind !== "right-permission" ||
    !(SELECTORS as readonly string[]).includes(row.who.selector) ||
    !(ACTIONS as readonly string[]).includes(row.what)
  )
    throw new Error("Unsupported right-permission selector or action.");
  if (
    row.amount ||
    row.decision?.op !== "term" ||
    row.decision.key !== "law-answer" ||
    row.decision.type !== "boolean"
  )
    throw new Error("Permission requires the canonical boolean law answer.");
  if (
    row.who.predicates.length ||
    row.conditions.length ||
    row.lag.days !== 0 ||
    row.onward?.length ||
    row.onRepeal !== "recompute-prospective"
  )
    throw new Error(
      "Unimplemented permission scope, lag, onward or repeal capability.",
    );
}

/** Caller supplies actual saved activity subjects; broader actor selection is never inferred. */
export function resolveRightPermission(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  checkRow(row);
  if (
    row.when !== context.activity ||
    context.onDate > world.currentDate ||
    !context.questionKey
  )
    return [];
  const question = Object.values(world.policyCatalog?.propositions ?? {}).find(
    (q) => q.stableKey === context.questionKey,
  );
  if (!question) return [];
  const activity = Object.values(world.history)
    .flatMap((rows) => (Array.isArray(rows) ? rows : []))
    .find((record) => record.id === context.activityId);
  const activityDate = activity ? permissionSourceDate(activity) : null;
  if (
    !activity ||
    !activityDate ||
    activityDate > context.onDate ||
    (activity.dueAt && activity.dueAt > context.onDate)
  )
    return [];
  const cutoff = {
    asOfDate: context.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const result: ResolvedLawConsequence[] = [];
  for (const subjectId of new Set(context.subjectIds)) {
    if (
      Array.isArray(activity.entityIds) &&
      !activity.entityIds.includes(subjectId)
    )
      continue;
    let jurisdictionId: EntityId | undefined;
    let subject: ResolvedLawConsequence["subject"];
    const sourceRecordIds: EntityId[] = [context.activityId];
    if (row.who.selector === "recorded-person-permission") {
      if (!world.people[subjectId]) continue;
      const member = householdMembershipsAt(world, subjectId, cutoff)[0];
      if (!member) continue;
      const location = householdLocationAt(
        world,
        member.membership.householdId,
        cutoff,
      );
      if (!location?.jurisdictionId) continue;
      jurisdictionId = location.jurisdictionId;
      subject = { kind: "person", id: subjectId };
      sourceRecordIds.push(member.membership.id, location.id);
    } else {
      const organization = world.history.organizations.find(
        (org) => org.id === subjectId && org.formedAt <= context.onDate,
      );
      const profile = organizationProfileAt(world, subjectId, cutoff);
      if (!organization || !profile?.locationJurisdictionId || profile.closed)
        continue;
      jurisdictionId = profile.locationJurisdictionId;
      subject = { kind: "organization", id: subjectId };
      sourceRecordIds.push(organization.id, profile.id);
    }
    const law = lawInForce(world, jurisdictionId, question.id, context.onDate);
    if (
      !law ||
      (law.answer !== "yes" && law.answer !== "no") ||
      (context.governingLawId && law.measureId !== context.governingLawId)
    )
      continue;
    // The row owner explicitly chooses the legal direction. No missing law becomes permission.
    const permitted = (law.answer === "yes") === (row.what === "permit-on-yes");
    result.push({
      row,
      law,
      questionKey: question.stableKey,
      jurisdictionId,
      subject,
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds: [...new Set(sourceRecordIds)],
      value: { type: "boolean", value: permitted },
    });
  }
  return result;
}

export function applyRightPermission(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (
    (resolved.subject.kind !== "person" &&
      resolved.subject.kind !== "organization") ||
    resolved.value.type !== "boolean"
  )
    return world;
  const current = resolveRightPermission(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    questionKey: resolved.questionKey,
    governingLawId: resolved.law.measureId,
  })[0];
  if (
    !current ||
    current.value.type !== "boolean" ||
    current.value.value !== resolved.value.value ||
    current.law.origin !== resolved.law.origin ||
    current.law.operativeAt !== resolved.law.operativeAt
  )
    return world;
  return appendLawPermission(
    world,
    current.law,
    {
      effectKind: "right-permission",
      questionKey: current.questionKey,
      jurisdictionId: current.jurisdictionId,
      appliedAt: current.effectiveAt,
    },
    {
      subject: { kind: resolved.subject.kind, id: resolved.subject.id },
      permissionKey: current.questionKey,
      status: current.value.value ? "permitted" : "prohibited",
      effectiveAt: current.effectiveAt,
      sourceRecordIds: current.sourceRecordIds,
    },
  );
}

export const RIGHT_PERMISSION_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "right-permission",
  owner: "Team 8",
  selectors: SELECTORS,
  actions: ACTIONS,
  predicates: [],
  units: [],
  resolve: resolveRightPermission,
  apply: applyRightPermission,
};
