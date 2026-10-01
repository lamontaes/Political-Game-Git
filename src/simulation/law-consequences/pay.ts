import { evaluateLawAmount } from "../law-consequence-amount";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import { lawInForce } from "../governing/law-in-force";
import { recordsWithFieldValue } from "../history-index";
import { workRoleAt, workStatusAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  FEDERAL_MINIMUM_HOURLY_MINOR,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "../minimum-wage";
import { TOWN_MINIMUM_WAGES } from "../living-world/town-pay.generated";
import {
  laborLawOfficeKey,
  ruleValueInWorld,
  ruleChangeProvisionHistoryRecords,
} from "../enacted-rule-changes";
import {
  applyLawPayConsequence,
  payPeriodEndingOn,
  type TownPayPeriod,
} from "../living-world/town-pay";
import { resourceFlowTermsAt } from "../resource-queries";
import type { EntityId, World } from "../types";

const HOURLY_TERM = "labor.minimumWage.hourlyCents";
function missing(capability: string): never {
  throw new Error(`Law pay consequence requires capability: ${capability}`);
}
function assertRow(row: LawConsequenceRow): void {
  if (
    row.kind !== "pay" ||
    row.who.selector !== "active-work-payflows" ||
    row.what !== "raise-hourly-floor"
  )
    missing("pay.registered-selector-and-action");
  if (row.who.predicates.length || row.conditions.length)
    missing("pay.predicate");
  if (row.lag.days !== 0) missing("pay.delayed-activity");
  if (!row.amount || row.decision) missing("pay.numeric-legal-term");
}
function apply(world: World, resolved: ResolvedLawConsequence): World {
  assertRow(resolved.row);
  if (
    resolved.subject.kind !== "person" ||
    resolved.value.type !== "amount" ||
    resolved.value.unit !== "minor/hour" ||
    resolved.value.currency !== "USD"
  )
    missing("pay.resolved-person-and-USD-hourly-amount");
  const flows = recordsWithFieldValue(
    world.history.resourceFlows,
    "basisKind",
    "compensation:work",
  ).filter(
    (flow) =>
      resolved.sourceRecordIds.includes(flow.id) &&
      flow.recipient.kind === "person" &&
      flow.recipient.personId === resolved.subject.id &&
      flow.basisReference.kind === "work",
  );
  if (flows.length !== 1) missing("pay.resolved-single-job-flow");
  const flow = flows[0]!;
  if (flow.basisReference.kind !== "work" || resolved.value.type !== "amount")
    missing("pay.resolved-job");
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

/** One pay kind: actual job selectors and typed wage terms; no answer-to-rate fallback. */
export const TEAM_2_PAY_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "pay",
  owner: "Team 2",
  selectors: ["active-work-payflows"],
  actions: ["raise-hourly-floor"],
  predicates: [],
  units: ["minor/hour"],
  apply,
  resolve(world, row, context) {
    assertRow(row);
    const questionKey = context.questionKey;
    if (
      questionKey !== FEDERAL_MINIMUM_WAGE_QUESTION_KEY &&
      questionKey !== STATE_MINIMUM_WAGE_QUESTION_KEY
    )
      missing("pay.question.typed-hourly-term");
    const question = Object.values(world.policyCatalog.propositions).find(
      (q) => q.stableKey === questionKey,
    );
    if (!question) missing("pay.question.canonical");
    const selected = new Set(context.subjectIds);
    const resolved: ResolvedLawConsequence[] = [];
    for (const flow of recordsWithFieldValue(
      world.history.resourceFlows,
      "basisKind",
      "compensation:work",
    )) {
      if (
        flow.recipient.kind !== "person" ||
        flow.basisReference.kind !== "work" ||
        (selected.size && !selected.has(flow.recipient.personId))
      )
        continue;
      const workId = flow.basisReference.workRelationshipId;
      const cutoff = {
        asOfDate: context.onDate,
        historySequenceExclusive: world.history.nextSequence,
      };
      const role = workRoleAt(world, workId, cutoff);
      const terms = resourceFlowTermsAt(world, flow.id, cutoff);
      if (
        !role ||
        !role.locationJurisdictionId ||
        workStatusAt(world, workId, cutoff)?.status !== "active" ||
        !terms ||
        terms.status !== "active"
      )
        continue;
      const cadence =
        /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
          terms.cadenceKind,
        );
      if (!cadence) missing("pay.cadence.town-pay-period");
      const period =
        context.activity === "payroll"
          ? payPeriodEndingOn(
              cadence[1] as TownPayPeriod,
              context.onDate,
              Number(cadence[2] ?? 0),
            )
          : null;
      if (context.activity === "payroll" && !period) continue;
      const effectiveAt = period?.startsAt ?? context.onDate;
      if (effectiveAt < flow.startsAt || effectiveAt < terms.effectiveAt)
        continue;
      const law = lawInForce(
        world,
        role.locationJurisdictionId,
        question.id,
        effectiveAt,
      );
      if (
        !law ||
        (context.governingLawId && context.governingLawId !== law.measureId)
      )
        continue;
      const sourceRecordIds: EntityId[] = [
        context.activityId,
        flow.id,
        workId,
        role.id,
        terms.id,
      ];
      let hourlyMinor: number;
      if (questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY) {
        if (law.origin === "enacted")
          missing("pay.federal.enacted-hourly-term");
        hourlyMinor = FEDERAL_MINIMUM_HOURLY_MINOR;
      } else {
        const stateKey = lifePlaceByJurisdictionId(
          role.locationJurisdictionId,
        )?.stateJurisdictionKey;
        if (!stateKey) missing("pay.job.state-jurisdiction");
        const basic = TOWN_MINIMUM_WAGES[stateKey];
        if (basic === null || basic === undefined)
          missing("pay.state.starting-hourly-term");
        hourlyMinor = Math.round(basic * 100);
        if (law.origin === "enacted" && law.answer === "yes") {
          const state = stateKey.replace(/^US-/, "");
          const value = ruleValueInWorld(
            world,
            {
              jurisdiction: stateKey,
              officeKey: laborLawOfficeKey(state),
              field: HOURLY_TERM,
              onDate: effectiveAt,
            },
            hourlyMinor,
          );
          if (
            value.source !== "enacted" ||
            value.measureId !== law.measureId ||
            typeof value.value !== "number"
          )
            missing("pay.state.governing-filed-hourly-term");
          hourlyMinor = value.value;
          const clause = ruleChangeProvisionHistoryRecords(world).find(
            (record) =>
              record.measureId === law.measureId &&
              record.officeKey === laborLawOfficeKey(state) &&
              record.field === HOURLY_TERM &&
              record.value === hourlyMinor,
          );
          if (!clause) missing("pay.state.governing-term-source-record");
          sourceRecordIds.push(clause.id);
        }
      }
      const amount = evaluateLawAmount(row.amount!, {
        term: { [HOURLY_TERM]: { value: hourlyMinor, unit: "minor/hour" } },
        record: {},
        capacity: {},
        exposure: {},
      });
      if (amount.unit !== "minor/hour" || amount.value < 0)
        missing("pay.amount.nonnegative-hourly-term");
      resolved.push({
        row,
        law,
        questionKey,
        jurisdictionId: role.locationJurisdictionId,
        subject: { kind: "person", id: flow.recipient.personId },
        activityId: context.activityId,
        effectiveAt,
        sourceRecordIds,
        value: {
          type: "amount",
          value: amount.value,
          unit: "minor/hour",
          currency: terms.amount.currency,
        },
      });
    }
    return resolved;
  },
};
