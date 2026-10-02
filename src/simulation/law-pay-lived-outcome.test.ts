import { describe, expect, it } from "vitest";
import { currentGovernorOf } from "./crisis/offices";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { addDays, daysBetween } from "./dates";
import { createStableId, stableHash } from "./ids";
import { lifePlaceStateIdentities } from "./life-places";
import { legislatureForState } from "./legislature-game-profile";
import { requireFormalSeatCount } from "./legislature-rules";
import { introduceMeasure } from "./legislation";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "./legislation-scenarios";
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
  enactedRuleChangeAt,
} from "./enacted-rule-changes";
import { playerRequiredWorkIds, releasePlayerRequiredWork } from "./time-work";
import { scheduleLifePathSession, performLifePathSession } from "./life-paths2";
import type { LawEffectStamp } from "./law-effect-stamp";
import { createOrganization, createWorkRelationship } from "./life";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  resolveWorkCompensationPeriod,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import {
  advanceWorld,
  assertWorldIntegrityFully,
  recordWorldEvent,
} from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { raiseTownPayToMinimum } from "./living-world/town-pay";
import {
  noticeLawPayChanges,
  recordedLawPayChanges,
} from "./law-effects-noticed";
import { livedOutcomesOf } from "./living-world/lived-outcomes";
import { officialsBehind } from "./living-world/official-views";
import { officialViewReflectionKey, recordLawExposure } from "./law-exposure";
import { viewOfOfficial } from "./official-view-reads";
import { recordRelationshipInteraction } from "./records";
import { serializeWorld, deserializeWorld } from "./serialization";
import type {
  World,
  EntityId,
  EarnedLawPayAssessmentRecord,
  ResourceTransferOutcome,
} from "./types";

const SEED = "overflow3:paid-law-voters:1";
const states = lifePlaceStateIdentities();
const state =
  states[parseInt(stableHash(SEED).slice(0, 8), 16) % states.length]!;
const provenance = {
  kind: "authored",
  note: "Small-world played-law compensation fixture.",
} as const;

function move(world: World, days: number): World {
  return advanceWorld(world, days, createCampaignElectionTransitionRegistry());
}

function fixture() {
  const small = smallWorld({
    place: state.usps,
    seed: SEED,
    offices: ["governor"],
  });
  let world = small.world;
  const worker = world.personOrder[1]!;
  const forId = world.personOrder[2]!;
  const againstId = world.personOrder[3]!;
  world = createOrganization(world, {
    stableKey: "pay-law:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Fixture shop",
      classification: "enterprise:shop",
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  const employer = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "pay-law:job",
    personId: worker,
    organizationId: employer,
    startedAt: world.currentDate,
    kind: "employment:fixture",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Shop worker",
      occupationClassification: "custom:fixture",
      locationJurisdictionId: small.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: small.jurisdictionId,
      },
    },
  });
  const job = world.history.workRelationships.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "pay-law:cash",
    owner: { kind: "person", personId: worker },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = createWorkCompensation(world, {
    stableKey: `town-pay-v2:job-pay:${job}`,
    workRelationshipId: job,
    startsAt: world.currentDate,
    amount: money(40_000, "USD"),
    cadenceKind: "schedule:town-weekly",
    restrictionKind: null,
    jurisdictionId: small.jurisdictionId,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!.id;
  const baselineStart = world.currentDate;
  world = move(world, 6);
  world = resolveWorkCompensationPeriod(world, {
    stableKey: "pay-law:before",
    workRelationshipId: job,
    periodStartsAt: baselineStart,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    reasonKind: null,
    note: "Actual baseline pay",
    provenance,
  });
  const beforeId = world.history.resourceTransferOutcomes.at(-1)!.id;
  for (const official of [forId, againstId])
    world = recordRelationshipInteraction(world, {
      stableKey: `pay-law:known:${official}`,
      personIds: [worker, official],
      occurredAt: world.currentDate,
      kind: "contact:conversation",
      change: "formed",
      significance: "meaningful",
      summary: "The worker knows this legislator.",
      tags: [],
      eventId: null,
    });
  const pack = legislatureForState(state.jurisdictionKey)!;
  expect(pack, state.name).not.toBeNull();
  world = introduceMeasure(world, {
    stableKey: "pay-law:measure",
    jurisdictionId: small.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "HB Pay",
    shortTitle: "Recorded wage raise",
    summary: "An authored numeric minimum-wage bill",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: forId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: "pay-law:floor",
    measureId: measure,
    officeKey: laborLawOfficeKey(state.usps),
    field: "labor.minimumWage.hourlyCents",
    value: 3000,
  });
  const votePlan: Record<string, { yea: number; nay: number }> = {};
  const bodies = pack.chambers.map((chamber) => {
    const seats = requireFormalSeatCount(chamber);
    const seated = seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats,
      [{ personId: forId, name: "Recorded supporter" }],
      false,
    );
    const members = seated.members.map((row, index) =>
      index === seats - 1 ? { ...row, personId: againstId } : row,
    );
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
        nay: 0,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats - 1,
        nay: 1,
      };
    return { ...seated, members };
  });
  const context: LegislativeProcedureContext = {
    pack,
    measureId: measure,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale:
      "The controlled fixture governor signs the enacted wage bill.",
  };
  world = {
    ...world,
    control: {
      kind: "person",
      personId: currentGovernorOf(world, state.usps)!.personId,
    },
  };
  world = enactThroughDesk(world, measure, {
    context,
    effectiveAt: addDays(world.currentDate, 1),
  });
  const enacted = world;
  world = move(world, 14);
  world = raiseTownPayToMinimum(world, null);
  const raised = resourceFlowTermsAt(world, flow)!;
  expect(raised.amount.minorUnits).toBe(120_000);
  const promised = world;
  expect(
    noticeLawPayChanges(promised, baselineStart).history.lawExposures ?? [],
  ).toHaveLength(0);
  const start = raised.effectiveAt;
  if (world.currentDate < addDays(start, 6))
    world = move(world, daysBetween(world.currentDate, addDays(start, 6)));
  world = resolveWorkCompensationPeriod(world, {
    stableKey: "pay-law:after",
    workRelationshipId: job,
    periodStartsAt: start,
    periodEndsAt: addDays(start, 6),
    occurredAt: world.currentDate,
    status: "completed",
    reasonKind: null,
    note: "Actual pay after enacted wage floor",
    provenance,
  });
  return {
    world,
    promised,
    enacted,
    worker,
    forId,
    againstId,
    measure,
    beforeId,
    since: baselineStart,
  };
}

/** Record the fixture's control change without rewriting pending work. */
function controlForFixture(
  world: World,
  personId: EntityId,
  stableKey: string,
): World {
  const previous =
    world.control.kind === "person" ? world.control.personId : null;
  if (previous === personId) return world;
  const handoff = recordWorldEvent(world, {
    stableKey,
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      personId,
      ...(previous
        ? [previous, ...playerRequiredWorkIds(world, previous)]
        : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "Controlled downstream fixture moves play to the actual actor for its next recorded action.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const released = previous
    ? releasePlayerRequiredWork(handoff, {
        personId: previous,
        stableKeyPrefix: `${stableKey}:released`,
        outcomeEventId: handoff.history.events.at(-1)!.id,
      })
    : handoff;
  return { ...released, control: { kind: "person", personId } };
}

/** Authored consumer contract control from #1575 aa548; not a producer pass. */
function assessmentContractFixture() {
  const f = fixture();
  let world = move(f.enacted, 2);
  const worker = f.worker;
  world = controlForFixture(world, worker, "pay-law:fixture-before-work");
  const employer =
    world.history.organizations.find(
      (row) => row.stableKey === "enterprise:shop",
    )?.id ?? world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "pay-law:shift-work",
    personId: worker,
    organizationId: employer,
    startedAt: world.currentDate,
    kind: "employment:life-paths2-shop-assistant",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Shop assistant",
      occupationClassification: "occupation:retail-salesperson",
      locationJurisdictionId: world.people[worker]!.homeJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: world.people[worker]!.homeJurisdictionId,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  world = createWorkCompensation(world, {
    stableKey: "pay-law:shift-flow",
    workRelationshipId: work.id,
    startsAt: world.currentDate,
    amount: money(7200, "USD"),
    cadenceKind: "work:completed-shift",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  const scheduled = scheduleLifePathSession(
    { ...world, control: { kind: "person", personId: worker } },
    work.id,
  );
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  const worked = performLifePathSession(scheduled.world, activity.id);
  expect(worked.ok, worked.message).toBe(true);
  world = worked.world;
  const completion = world.history.events.find(
    (row) =>
      row.type === "life-paths2.work-session" &&
      row.involvedEntityIds.includes(activity.id),
  )!;
  const cutoff = {
    asOfDate: completion.occurredAt,
    historySequenceExclusive: completion.sequence + 1,
  };
  const terms = resourceFlowTermsAt(world, flow.id, cutoff)!;
  const activityState = world.history.scheduledActivityStates
    .filter(
      (row) =>
        row.activityId === activity.id &&
        row.sequence < cutoff.historySequenceExclusive,
    )
    .at(-1)!;
  const change = enactedRuleChangeAt(world, {
    stateUsps: state.usps,
    officeKey: laborLawOfficeKey(state.usps),
    field: "labor.minimumWage.hourlyCents",
    onDate: cutoff.asOfDate,
  })!;
  const enactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === f.measure,
  )!;
  const provision = world.history.ruleChangeProvisions!.find(
    (row) => row.measureId === f.measure,
  )!;
  const assessmentId = createStableId(
    "earned-law-pay-assessment",
    "authored-consumer-assessment-control",
  );
  // #1575's saved-rule stamp has a null question and exact rule authority.
  const stamp: LawEffectStamp & {
    ruleAuthority: {
      ruleChangeProvisionId: typeof provision.id;
      enactmentId: typeof enactment.id;
      field: string;
    };
  } = {
    version: "law-effect-stamp/v1",
    governingLawKey: f.measure,
    source: "enacted",
    effectKind: "pay",
    questionKey: null,
    jurisdictionId: world.people[worker]!.homeJurisdictionId!,
    operativeAt: change.operativeAt,
    appliedAt: world.currentDate,
    ruleAuthority: {
      ruleChangeProvisionId: provision.id,
      enactmentId: enactment.id,
      field: "labor.minimumWage.hourlyCents",
    },
    sourceRecordIds: [
      assessmentId,
      work.id,
      flow.id,
      terms.id,
      completion.id,
      activity.id,
      activityState.id,
    ],
  };
  const assessment: EarnedLawPayAssessmentRecord = {
    id: assessmentId,
    stableKey: "authored-consumer-assessment-control",
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    personId: worker,
    organizationId: employer,
    workRelationshipId: work.id,
    resourceFlowId: flow.id,
    earnedTermsId: terms.id,
    completionEventId: completion.id,
    scheduledActivityId: activity.id,
    scheduledActivityStateId: activityState.id,
    earnedCutoff: cutoff,
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    workedMinutes: 240,
    contractualGross: terms.amount,
    assessedGross: money(12000, "USD"),
    lawEffectStamps: [stamp],
    resolvedConsequence: {
      rowId: "authored:saved-hourly-control",
      action: "raise-saved-rule-hourly-floor",
      jurisdictionId: stamp.jurisdictionId,
      personId: worker,
      workId: work.id,
      payFlowId: flow.id,
      activityId: work.id,
      effectiveAt: completion.occurredAt,
      amount: { value: 3000, unit: "minor/hour", currency: "USD" },
      sourceRecordIds: stamp.sourceRecordIds!.filter(
        (id) => id !== assessmentId,
      ),
      completedShift: { eventId: completion.id, termsId: terms.id },
      authority: {
        kind: "enacted-hourly-pay-rule",
        ruleChangeProvisionId: provision.id,
        enactmentId: enactment.id,
        measureId: f.measure,
        officeKey: change.officeKey,
        stateUsps: state.usps,
        field: "labor.minimumWage.hourlyCents",
        operativeAt: change.operativeAt,
        applicability: change.applicability,
      },
    },
  };
  const payment: ResourceTransferOutcome = {
    id: createStableId(
      "resource-transfer-outcome",
      "authored-consumer-full-gross-control",
    ),
    stableKey: "authored-consumer-full-gross-control",
    sequence: assessment.sequence + 1,
    resourceFlowId: flow.id,
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: assessment.assessedGross,
    transferredAmount: assessment.assessedGross,
    earnedLawPayAssessmentId: assessment.id,
    reasonKind: null,
    note: "Authored consumer control, not a producer payment receipt.",
    provenance,
    lawEffectStamps: [stamp],
  };
  world = controlForFixture(
    world,
    f.enacted.control.kind === "person"
      ? f.enacted.control.personId
      : f.world.personOrder[0]!,
    "pay-law:fixture-after-work",
  );
  world = {
    ...world,
    control: f.enacted.control,
    history: {
      ...world.history,
      earnedLawPayAssessments: [
        { ...assessment, sequence: world.history.nextSequence },
      ],
      resourceTransferOutcomes: [
        ...world.history.resourceTransferOutcomes,
        { ...payment, sequence: world.history.nextSequence + 1 },
      ],
      nextSequence: world.history.nextSequence + 2,
    },
  };
  return { world, assessment, payment, terms, worker, measure: f.measure };
}

describe(`law-paid change and recorded voters in ${state.name} (seed ${SEED})`, () => {
  it("the actual wage raise reaches the worker once, then forms views of the recorded voters", () => {
    expect(states).toHaveLength(56);
    const f = fixture();
    const changes = recordedLawPayChanges(f.world, f.since);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.amount.minorUnits).toBe(80_000);
    expect(changes[0]!.previousOutcomeId).toBe(f.beforeId);
    expect(
      recordedLawPayChanges(f.world, f.since, addDays(changes[0]!.at, -1)),
    ).toEqual([]);
    const reached = noticeLawPayChanges(f.world, f.since);
    const exposure = reached.history.lawExposures!.find(
      (row) => row.personId === f.worker && row.relation === "own",
    )!;
    expect(exposure.sourceRecordId).toBe(changes[0]!.sourceRecordId);
    expect(exposure.amount?.minorUnits).toBe(80_000);
    const outcome = livedOutcomesOf(reached, f.worker).find(
      (row) => row.kind === "pay-changed-by-law",
    )!;
    expect(outcome.sourceRecordId).toBe(exposure.sourceRecordId);
    expect(outcome.lawExposureId).toBe(exposure.id);
    expect(officialsBehind(reached, f.measure)).toEqual(
      expect.arrayContaining([
        { officialId: f.forId, act: "voted-for", executive: false },
        { officialId: f.againstId, act: "voted-against", executive: false },
      ]),
    );
    const after = move(reached, 4);
    for (const [official, side] of [
      [f.forId, "support"],
      [f.againstId, "opposition"],
    ] as const) {
      const belief = viewOfOfficial(after, f.worker, official).belief;
      expect(belief).not.toBeNull();
      const trace = after.history.decisionTraces.find(
        (row) => row.id === belief!.formation.decisionTraceIds[0],
      )!;
      expect(
        trace.context.considerations.some(
          (row) =>
            row.stableKey === `factor:law-exposure:${exposure.id}` &&
            row.optionKey === side,
        ),
      ).toBe(true);
    }
    expect(noticeLawPayChanges(after, f.since)).toBe(after);
    const saved = deserializeWorld(serializeWorld(after));
    expect(livedOutcomesOf(saved, f.worker)).toEqual(
      livedOutcomesOf(after, f.worker),
    );
    expect(noticeLawPayChanges(saved, f.since)).toBe(saved);
    assertWorldIntegrityFully(saved);
    const due = saved.history.futureDueItems.find(
      (row) => row.stableKey === officialViewReflectionKey(exposure),
    )!;
    expect(
      saved.history.futureDueItemStates
        .filter((row) => row.dueItemId === due.id)
        .at(-1)?.status,
    ).toBe("resolved");
    expect(move(saved, 1).history.privateBeliefs).toEqual(
      saved.history.privateBeliefs,
    );
  });
  it("requires a completed comparable baseline and an enacted attribution", () => {
    const f = fixture();
    const changes = recordedLawPayChanges(f.world, f.since);
    expect(changes).toHaveLength(1);
    const withoutBaseline = {
      ...f.world,
      history: {
        ...f.world.history,
        resourceTransferOutcomes:
          f.world.history.resourceTransferOutcomes.filter(
            (row) => row.id !== f.beforeId,
          ),
      },
    };
    expect(recordedLawPayChanges(withoutBaseline, f.since)).toEqual([]);
    const partial = {
      ...f.world,
      history: {
        ...f.world.history,
        resourceTransferOutcomes: f.world.history.resourceTransferOutcomes.map(
          (row) =>
            row.id === changes[0]!.sourceRecordId
              ? { ...row, transferredAmount: money(90_000, "USD") }
              : row,
        ),
      },
    };
    expect(recordedLawPayChanges(partial, f.since)).toEqual([]);
    const noEnactment = {
      ...f.world,
      history: { ...f.world.history, legislativeEnactments: [] },
    };
    expect(recordedLawPayChanges(noEnactment, f.since)).toEqual([]);
  });
  it("reads full assessment-linked gross without revising immutable earned terms", () => {
    const f = assessmentContractFixture();
    expect(f.payment.transferredAmount.minorUnits).not.toBe(
      f.terms.amount.minorUnits,
    );
    expect(recordedLawPayChanges(f.world, f.world.currentDate)).toEqual([
      expect.objectContaining({
        personId: f.worker,
        measureId: f.measure,
        earnedLawPayAssessmentId: f.assessment.id,
        termsId: f.terms.id,
        sourceRecordId: f.payment.id,
        amount: money(4800, "USD"),
        direction: "gain",
      }),
    ]);
  });
  it.todo(
    "the existing exposure/reflection writer accepts #1575's assessment-aware receiving graph and dedupes prior terms exposures",
    () => {
      const f = assessmentContractFixture();
      const reached = noticeLawPayChanges(f.world, f.world.currentDate);
      expect(reached.history.resourceFlowTerms).toBe(
        f.world.history.resourceFlowTerms,
      );
      const own = (reached.history.lawExposures ?? []).filter(
        (row) => row.personId === f.worker && row.relation === "own",
      );
      expect(own).toHaveLength(1);
      expect(own[0]).toMatchObject({
        measureId: f.measure,
        sourceRecordId: f.payment.id,
        amount: money(4800, "USD"),
      });
      expect(
        reached.history.futureDueItems.filter(
          (row) => row.stableKey === officialViewReflectionKey(own[0]!),
        ),
      ).toHaveLength(1);
      expect(noticeLawPayChanges(reached, f.world.currentDate)).toBe(reached);
      const legacy = recordLawExposure(f.world, {
        stableKey: `law-effects-noticed/v1:paid:${f.terms.id}`,
        personId: f.worker,
        measureId: f.measure,
        channel: "paycheck",
        direction: "gain",
        amount: money(4800, "USD"),
        cadence: "one-time",
        sourceRecordId: f.payment.id,
      });
      expect(noticeLawPayChanges(legacy, f.world.currentDate)).toBe(legacy);
    },
  );
  it("rejects unpaid, partial and mismatched assessment bindings", () => {
    const f = assessmentContractFixture();
    const checks: World[] = [
      {
        ...f.world,
        history: {
          ...f.world.history,
          resourceTransferOutcomes:
            f.world.history.resourceTransferOutcomes.filter(
              (row) => row.id !== f.payment.id,
            ),
        },
      },
      ...[
        {
          ...f.payment,
          status: "partial" as const,
          transferredAmount: money(10000, "USD"),
        },
        { ...f.payment, transferredAmount: money(10000, "USD") },
        { ...f.payment, resourceFlowId: f.world.history.resourceFlows[0]!.id },
      ].map((payment) => ({
        ...f.world,
        history: { ...f.world.history, resourceTransferOutcomes: [payment] },
      })),
      ...[
        { ...f.assessment, personId: f.world.personOrder[0]! },
        {
          ...f.assessment,
          earnedCutoff: {
            ...f.assessment.earnedCutoff,
            historySequenceExclusive:
              f.assessment.earnedCutoff.historySequenceExclusive + 1,
          },
        },
        {
          ...f.assessment,
          resolvedConsequence: {
            ...f.assessment.resolvedConsequence,
            personId: f.world.personOrder[0]!,
          },
        },
        {
          ...f.assessment,
          lawEffectStamps: [
            {
              ...f.assessment.lawEffectStamps[0]!,
              governingLawKey: createStableId(
                "legislative-measure",
                "unrelated-consumer-control",
              ),
            },
          ],
        },
      ].map((assessment) => ({
        ...f.world,
        history: { ...f.world.history, earnedLawPayAssessments: [assessment] },
      })),
    ];
    for (const world of checks)
      expect(recordedLawPayChanges(world, world.currentDate)).toEqual([]);
  });
  it.todo(
    "the exact #1575 published producer can initialize and supply its completed assessment-linked payment fixture; native and collection failure receipts remain open",
  );
  it.todo(
    "a statutory-tax raise or cut has an actual saved before/after amount and source attribution before it becomes a pay factor",
  );
});
