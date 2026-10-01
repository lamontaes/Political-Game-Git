import {
  fileRuleChangeProvision,
  institutionRuleAmountUnit,
  ruleChangeProvisionHistoryRecords,
} from "../enacted-rule-changes";
import { readFinalEnactedLawTerm } from "../governing/automatic-legislation";
import { lawInForce } from "../governing/law-in-force";
import { lawEffectStamp } from "../law-effect-stamp";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import type { World } from "../types";

const SELECTOR = "recorded-rule-institution";
const ACTION = "apply-adopted-institution-rule";
const FIELD = "institution-rule-field";

/** The existing filed clause identifies the institution; no body is invented. */
export function resolveLawInstitutionRuleConsequences(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== "institution-rule" ||
    row.who.selector !== SELECTOR ||
    row.what !== ACTION
  )
    throw new Error("Missing institution-rule selector/action capability");
  if (row.when !== "effective" || row.when !== context.activity) return [];
  if (context.onDate !== world.currentDate)
    throw new Error("Institution-rule requires the actual application date");
  if (!row.amount || row.amount.op !== "term" || row.decision)
    throw new Error("Missing institution-rule final numeric term capability");
  if (row.lag.days !== 0 || row.onward?.length)
    throw new Error("Missing institution-rule delay/onward capability");
  const predicates = [...row.who.predicates, ...row.conditions];
  if (
    predicates.length !== 1 ||
    predicates[0]!.capability !== FIELD ||
    Object.keys(predicates[0]!.parameters).length !== 1 ||
    typeof predicates[0]!.parameters.field !== "string"
  )
    throw new Error(
      "Institution-rule requires one explicit recorded rule field",
    );
  const field = predicates[0]!.parameters.field;
  if (
    row.amount.key !== field ||
    institutionRuleAmountUnit(field) !== row.amount.unit
  )
    throw new Error("Institution-rule field and typed term unit disagree");
  const proposition = world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id]!)
    .find((candidate) =>
      candidate.consequences?.some((entry) => entry.id === row.id),
    );
  if (
    !proposition ||
    JSON.stringify(
      proposition.consequences!.find((entry) => entry.id === row.id),
    ) !== JSON.stringify(row)
  )
    throw new Error(
      "Institution-rule requires its exact canonical catalog row",
    );
  if (context.questionKey && context.questionKey !== proposition.stableKey)
    return [];
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (record) =>
      record.id === context.activityId && record.outcome === "enacted",
  );
  if (
    !enactment ||
    (context.governingLawId && enactment.measureId !== context.governingLawId)
  )
    throw new Error(
      "Institution-rule requires its recorded enactment activity",
    );
  const measure = world.history.legislativeMeasures?.find(
    (record) => record.id === enactment.measureId,
  )!;
  if (!measure || !world.jurisdictions[measure.jurisdictionId])
    throw new Error(
      "Institution-rule requires an actual government jurisdiction",
    );
  if (
    context.subjectIds.length &&
    !context.subjectIds.includes(measure.jurisdictionId)
  )
    return [];
  const law = lawInForce(
    world,
    measure.jurisdictionId,
    proposition.id,
    context.onDate,
  );
  if (!law || law.origin !== "enacted" || law.measureId !== enactment.measureId)
    return [];
  if (!enactment.effectiveAt || enactment.effectiveAt !== law.operativeAt)
    throw new Error(
      "Missing institution-rule explicit operative date capability",
    );
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: proposition.stableKey,
    termKey: field,
    unit: row.amount.unit,
  });
  if (!term)
    throw new Error("Missing institution-rule final adopted typed term");
  const clauses = ruleChangeProvisionHistoryRecords(world).filter(
    (record) => record.measureId === law.measureId && record.field === field,
  );
  if (clauses.length !== 1 || clauses[0]!.value !== term.value)
    throw new Error(
      "Missing institution-rule unambiguous recorded institution/term agreement",
    );
  return [
    {
      row,
      law,
      questionKey: proposition.stableKey,
      jurisdictionId: measure.jurisdictionId,
      subject: { kind: "place", id: measure.jurisdictionId },
      activityId: enactment.id,
      effectiveAt: context.onDate,
      sourceRecordIds: [
        ...term.sourceRecordIds,
        clauses[0]!.id,
        measure.jurisdictionId,
      ],
      value: { type: "amount", value: term.value, unit: term.unit },
    },
  ];
}

/** Binds and stamps the actual saved rule; retains its existing reader/value. */
export function applyLawInstitutionRuleConsequence(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  const current = resolveLawInstitutionRuleConsequences(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
    questionKey: resolved.questionKey,
  })[0];
  if (!current) return world;
  if (JSON.stringify(current) !== JSON.stringify(resolved))
    throw new Error("Institution-rule resolved input is stale or unverified");
  if (current.value.type !== "amount")
    throw new Error("Institution-rule numeric value required");
  const clause = ruleChangeProvisionHistoryRecords(world).find((record) =>
    current.sourceRecordIds.includes(record.id),
  )!;
  const source = (world.history.legislativeProvisions ?? []).find((record) =>
    current.sourceRecordIds.includes(record.id),
  )!;
  if (!clause || !source)
    throw new Error("Institution-rule source clause is missing");
  const stamp = lawEffectStamp(current.law, {
    effectKind: "institution-rule",
    questionKey: current.questionKey,
    jurisdictionId: current.jurisdictionId,
    appliedAt: current.effectiveAt,
    sourceRecordIds: current.sourceRecordIds,
  });
  if (!stamp)
    throw new Error("Institution-rule cannot stamp an unsupported law");
  return fileRuleChangeProvision(world, {
    stableKey: `${clause.stableKey}:consequence`,
    measureId: clause.measureId,
    officeKey: clause.officeKey,
    field: clause.field,
    value: current.value.value,
    ...(clause.applicability ? { applicability: clause.applicability } : {}),
    consequenceBinding: {
      rowId: current.row.id,
      questionKey: current.questionKey,
      placeJurisdictionId: current.subject.id,
      provisionId: source.id,
      provisionKey: source.provisionKey,
      enactmentId: current.activityId,
      unit: current.value.unit,
      sourceRecordIds: [...current.sourceRecordIds],
    },
    lawEffectStamps: [stamp],
  });
}

export const INSTITUTION_RULE_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "institution-rule",
  owner: "Team2",
  selectors: [SELECTOR],
  actions: [ACTION],
  predicates: [FIELD],
  units: ["count", "years"],
  resolve: resolveLawInstitutionRuleConsequences,
  apply: applyLawInstitutionRuleConsequence,
};
