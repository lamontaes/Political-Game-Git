/** Canonical completed-session and Native public earned-pay producer; raw legal/life receipts. No handcrafted saved assessment append. */
import { expect } from "vitest";
import { smallWorld } from "../../../../tests/fixtures/small-world";
import {
  createOrganization,
  createWorkRelationship,
} from "../../../simulation/life";
import { TOWN_PAY_VERSION } from "../../../simulation/living-world/town-pay";
import {
  createResourcePosition,
  createResourceFlow,
  createWorkCompensation,
  money,
} from "../../../simulation/resources";
import type { CreateWorkCompensationInput } from "../../../simulation/resources";
import { publicOrganizationKey } from "../../../simulation/tax-policy";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../../simulation/national-election-geography";
import {
  scheduleLifePathSession,
  performLifePathSession,
} from "../../../simulation/life-paths2";
import { lawInForce } from "../../../simulation/governing/law-in-force";
import { readFinalEnactedLawTerm } from "../../../simulation/governing/final-law-term-query";
import {
  payWorkplaceAt,
  payPayerAt,
  matchPayCoveragePredicates,
} from "../../../simulation/pay-coverage-predicates";
import { workPayCoverageAt } from "../../../simulation/pay-coverage-query";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  NON_ELECTIVE_PAY_PREDICATE,
} from "../../../simulation/law-consequences/pay-rows";
import {
  recordById,
  recordsWithFieldValue,
} from "../../../simulation/history-index";
import { resourceFlowTermsAt } from "../../../simulation/resource-queries";
import { workRoleAt, workStatusAt } from "../../../simulation/life-queries";
import { evaluateLawAmount } from "../../../simulation/law-consequence-amount";
import { lawEffectStamp } from "../../../simulation/law-effect-stamp";
import { assessedCompletedHourlyGrossMinor } from "../../../simulation/completed-hourly-gross";
import { simulationMinutesBetween } from "../../../simulation/dates";
import { createStableId } from "../../../simulation/ids";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../../../simulation/life-places";
import {
  earnedPayReceiptKey,
  payPredicateReceiptKey,
  type EarnedPayFacts,
} from "../../laws/earned-pay-integrity";
import { legalTermReceiptKey } from "../../laws/minimum-authority";
import { lawFacts } from "../../laws/test-support/law-facts";
import type { ResolvedHourlyLawPayConsequence } from "../../../simulation/law-consequence-types";
import type {
  World,
  EntityId,
  EarnedLawPayAssessmentRecord,
} from "../../../simulation/types";
import { applyLawPayConsequence } from "../../../simulation/living-world/town-pay";
const provenance = {
  kind: "authored" as const,
  note: "Controlled saved work and compensation, not ordinary employer wealth.",
};
function worker(
  start: World,
  jurisdictionId: EntityId,
  townPayroll = false,
  jobPayroll = false,
  shiftPayroll = false,
  publicPayer = false,
) {
  const personId = start.personOrder[0]!;
  let world = createOrganization(start, {
    stableKey: "fixture:city-pay:employer",
    formedAt: start.currentDate,
    provenance: publicPayer
      ? {
          kind: "source-record",
          reference: "https://example.invalid/controlled-public-pay-employer",
          asOf: start.currentDate,
        }
      : provenance,
    initialProfile: {
      name: "Controlled city employer",
      classification: publicPayer ? "sector:government" : "sector:private",
      locationJurisdictionId: jurisdictionId,
      ...(publicPayer
        ? {
            publicGovernmentIdentity: {
              kind: "jurisdiction" as const,
              jurisdictionId,
            },
          }
        : {}),
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  let payerId = organizationId;
  if (publicPayer) {
    world = createOrganization(world, {
      stableKey: publicOrganizationKey(jurisdictionId),
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Controlled public paying account",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    payerId = world.history.organizations.at(-1)!.id;
  }
  world = createWorkRelationship(world, {
    stableKey: "fixture:city-pay:work",
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: shiftPayroll
      ? "employment:life-paths2-shop-assistant"
      : "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Controlled worker",
      occupationClassification: "occupation:retail-salesperson",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  const compensation = {
    stableKey: townPayroll
      ? `${TOWN_PAY_VERSION}:job-pay:${work.id}`
      : jobPayroll
        ? `job-pay:${work.id}`
        : "fixture:city-pay:flow",
    startsAt: world.currentDate,
    amount: money(shiftPayroll ? 100 : 100, "USD"),
    cadenceKind: shiftPayroll
      ? "work:completed-shift"
      : jobPayroll
        ? "schedule:weekly"
        : "schedule:town-weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  } satisfies Omit<CreateWorkCompensationInput, "workRelationshipId">;
  world = publicPayer
    ? createResourceFlow(world, {
        ...compensation,
        source: { kind: "organization", organizationId: payerId },
        recipient: { kind: "person", personId },
        basisKind: "compensation:work",
        basisReference: { kind: "work", workRelationshipId: work.id },
      })
    : createWorkCompensation(world, {
        ...compensation,
        workRelationshipId: work.id,
      });
  const flow = world.history.resourceFlows.at(-1)!;
  world = createResourcePosition(world, {
    stableKey: "fixture:city-pay:cash",
    owner: { kind: "organization", organizationId: payerId },
    openedAt: world.currentDate,
    openingBalance: money(1000000, "USD"),
    provenance,
  });
  return { world, personId, organizationId, payerId, flow };
}
export function completed(usps: string) {
  const g = smallWorld({
    place: "US-" + usps,
    date: "2026-01-05",
    seed: "rules2-law-earned:" + usps,
  });
  const f = worker(
    ensureNationalElectionJurisdiction(g.world),
    g.jurisdictionId,
    false,
    false,
    true,
    false,
  );
  const work = f.world.history.workRelationships.at(-1)!;
  const scheduled = scheduleLifePathSession(
    { ...f.world, control: { kind: "person", personId: f.personId } },
    work.id,
  );
  expect(scheduled.ok, scheduled.message).toBe(true);
  const worked = performLifePathSession(
    scheduled.world,
    scheduled.world.history.scheduledActivities.at(-1)!.id,
  );
  expect(worked.ok, worked.message).toBe(true);
  const base = worked.world;
  // Native schedules pay for a later due date; this public completion World remains canonical and unpaid.
  const completion = [...base.history.events]
    .reverse()
    .find((e) => e.type === "life-paths2.work-session")!;
  const flow = base.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === work.id,
  )!;
  const produced = base.history.earnedLawPayAssessments?.find(
    (row) =>
      row.resourceFlowId === flow.id &&
      row.completionEventId === completion.id &&
      row.resolvedConsequence.action === "raise-hourly-floor" &&
      row.resolvedConsequence.questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  );
  if (produced) return { world: base, assessment: produced };
  const cutoff = {
    asOfDate: completion.occurredAt,
    historySequenceExclusive: completion.sequence + 1,
  };
  const terms = resourceFlowTermsAt(base, flow.id, cutoff)!;
  const role = workRoleAt(base, work.id, cutoff)!;
  const activity = completion.involvedEntityIds.flatMap(
    (id) => recordById(base.history.scheduledActivities, id) ?? [],
  )[0]!;
  const state = recordsWithFieldValue(
    base.history.scheduledActivityStates,
    "activityId",
    activity.id,
  )
    .filter((s) => s.sequence < cutoff.historySequenceExclusive)
    .at(-1)!;
  const question = Object.values(base.policyCatalog.propositions).find(
    (p) => p.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = question.consequences!.find(
    (r) => r.id === `pay:${FEDERAL_MINIMUM_WAGE_QUESTION_KEY}`,
  )!;
  const workplace = payWorkplaceAt(base, work.id, cutoff);
  const jurisdictionId =
    workplace.jurisdictionId ?? NATIONAL_ELECTION_JURISDICTION.id;
  const law = lawInForce(
    base,
    jurisdictionId,
    question.id,
    cutoff.asOfDate,
    "all",
    cutoff,
  )!;
  expect(law).toBeDefined();
  const coverage = workPayCoverageAt(base, work.id, cutoff);
  const predicates = [...row.who.predicates, ...row.conditions];
  const office = matchPayCoveragePredicates(
    base,
    work.id,
    predicates.filter((p) => p.capability === NON_ELECTIVE_PAY_PREDICATE),
    cutoff,
  );
  const others = predicates.filter(
    (p) => p.capability !== NON_ELECTIVE_PAY_PREDICATE,
  );
  const match = matchPayCoveragePredicates(base, work.id, others, cutoff);
  const exception = coverage?.exceptions.find(
    (e) => e.questionKey === question.stableKey,
  );
  if (
    !office.matches ||
    (coverage
      ? exception
        ? exception.rowId !== row.id
        : others.length > 0
      : !match.matches)
  )
    throw new Error("Missing canonical federal worker coverage");
  if (row.amount?.op !== "term")
    throw new Error(
      "Federal hourly fixture requires the canonical numeric term row",
    );
  const term = readFinalEnactedLawTerm(base, law, {
    questionKey: question.stableKey,
    termKey: row.amount.key,
    unit: row.amount.unit,
    onDate: cutoff.asOfDate,
    cutoff,
  });
  if (!term || term.unit !== "minor/hour")
    throw new Error("Missing canonical federal hourly fixture term");
  const amount = evaluateLawAmount(row.amount, {
    term: { [row.amount.key]: { value: term.value, unit: term.unit } },
    record: {},
    capacity: {},
    exposure: {},
  });
  if (amount.unit !== "minor/hour")
    throw new Error("Missing canonical federal hourly fixture amount");
  const typed: ResolvedHourlyLawPayConsequence = {
    rowId: row.id,
    questionKey: question.stableKey,
    jurisdictionId,
    law,
    personId: work.personId,
    workId: work.id,
    payFlowId: flow.id,
    activityId: work.id,
    completedShift: { eventId: completion.id, termsId: terms.id },
    effectiveAt: completion.occurredAt,
    amount: { value: amount.value, unit: "minor/hour", currency: "USD" },
    sourceRecordIds: [
      ...new Set([
        work.id,
        role.id,
        flow.id,
        terms.id,
        ...(coverage ? coverage.factRecordIds : match.factRecordIds),
        ...(coverage ? [coverage.id] : []),
        ...workplace.factRecordIds,
        ...term.sourceRecordIds,
      ]),
    ],
    action: "raise-hourly-floor",
  };
  const stableKey = `earned-law-pay:${flow.id}:${completion.id}:${terms.id}:${typed.rowId}:${typed.law.measureId}`;
  const id = createStableId(
    "earned-law-pay-assessment",
    `${base.id}:${stableKey}`,
  );
  const workedMinutes = simulationMinutesBetween(state.start, state.end);
  const stamp = lawEffectStamp(typed.law, {
    effectKind: "pay",
    questionKey: typed.questionKey,
    jurisdictionId: typed.jurisdictionId,
    appliedAt: base.currentDate,
    sourceRecordIds: [
      ...new Set([
        ...typed.sourceRecordIds,
        id,
        typed.activityId,
        work.id,
        role.id,
        flow.id,
        terms.id,
        completion.id,
        activity.id,
        state.id,
      ]),
    ],
  })!;
  const assessment: EarnedLawPayAssessmentRecord = {
    id,
    stableKey,
    sequence: base.history.nextSequence,
    recordedAt: base.currentDate,
    personId: work.personId,
    organizationId: work.organizationId!,
    workRelationshipId: work.id,
    resourceFlowId: flow.id,
    earnedTermsId: terms.id,
    completionEventId: completion.id,
    scheduledActivityId: activity.id,
    scheduledActivityStateId: state.id,
    earnedCutoff: cutoff,
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    workedMinutes,
    contractualGross: { ...terms.amount },
    assessedGross: money(
      assessedCompletedHourlyGrossMinor(
        typed.amount.value,
        workedMinutes,
        terms.amount.minorUnits,
      ),
      "USD",
    ),
    resolvedConsequence: typed,
    lawEffectStamps: [stamp],
  };
  const world = applyLawPayConsequence(base, typed);
  const actual = world.history.earnedLawPayAssessments?.find(
    (row) => row.id === assessment.id,
  );
  expect(actual).toEqual(assessment);
  return { world, assessment: actual! };
}
export function factsFor(
  world: World,
  assessment: EarnedLawPayAssessmentRecord,
): EarnedPayFacts {
  const cutoff = assessment.earnedCutoff;
  const work = world.history.workRelationships.find(
    (r) => r.id === assessment.workRelationshipId,
  )!;
  const resolved = assessment.resolvedConsequence;
  if (resolved.action !== "raise-hourly-floor")
    throw Error("Expected actual federal hourly input.");
  const question = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === resolved.questionKey,
  )!;
  const row = question.consequences!.find((r) => r.id === resolved.rowId)!;
  const workplace = payWorkplaceAt(world, work.id, cutoff);
  const predicates = [...row.who.predicates, ...row.conditions];
  const office = predicates.filter(
    (p) => p.capability === NON_ELECTIVE_PAY_PREDICATE,
  );
  const others = predicates.filter(
    (p) => p.capability !== NON_ELECTIVE_PAY_PREDICATE,
  );
  const receipt = {
    terms: resourceFlowTermsAt(world, assessment.resourceFlowId, cutoff),
    role: workRoleAt(world, work.id, cutoff),
    status: workStatusAt(world, work.id, cutoff),
    payer: payPayerAt(world, work.id, cutoff),
    workplace,
    coverage: workPayCoverageAt(world, work.id, cutoff),
  };
  const finalTerms = new Map();
  if (row.amount?.op !== "term")
    throw Error("Expected unchanged canonical term expression.");
  const query = {
    questionKey: question.stableKey,
    termKey: row.amount.key,
    unit: row.amount.unit,
    onDate: cutoff.asOfDate,
    cutoff,
    workplaceKey: workplace.jurisdictionId
      ? lifePlaceByJurisdictionId(workplace.jurisdictionId)?.key
      : undefined,
  };
  finalTerms.set(
    legalTermReceiptKey(resolved.law, query),
    readFinalEnactedLawTerm(world, resolved.law, query),
  );
  return {
    ...lawFacts(world, [question.id], [cutoff.asOfDate], [cutoff]),
    bindings: world.history.ruleChangeConsequenceBindings ?? [],
    ruleProvisions: world.history.ruleChangeProvisions ?? [],
    startedAt: world.startedAt,
    finalTerms,
    worldId: world.id,
    people: world.people,
    jurisdictions: world.jurisdictions,
    history: world.history,
    places: new Map(
      world.jurisdictionOrder.flatMap((id) => {
        const p = lifePlaceByJurisdictionId(id);
        return p ? [[id, p] as const] : [];
      }),
    ),
    stateKeysByJurisdiction: new Map(
      world.jurisdictionOrder.map((id) => [
        id,
        stateKeyForJurisdiction(world.jurisdictions[id]!),
      ]),
    ),
    payReceipts: new Map(
      [work.id, assessment.resourceFlowId].map((id) => [
        earnedPayReceiptKey(id, cutoff),
        receipt,
      ]),
    ),
    predicateReceipts: new Map(
      [office, others].map((ps) => [
        payPredicateReceiptKey(work.id, ps, cutoff),
        matchPayCoveragePredicates(world, work.id, ps, cutoff),
      ]),
    ),
  };
}
