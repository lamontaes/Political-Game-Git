import { payWorkplaceAt } from "./pay-coverage-predicates";
import { recordEarnedPayObservations } from "./earned-pay-observations";
import { expect, it } from "vitest";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { addDays, daysBetween, simulationMinutesBetween } from "./dates";
import { createScenarioWorld } from "./demo";
import { applyLawConsequences } from "./enacted-law-effects";
import { advanceWorld } from "./world";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  changeLifePathStatus,
  scheduleLifePathSession,
  performLifePathSession,
  lifePaths2Handlers,
} from "./life-paths2";
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
} from "./enacted-rule-changes";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "./legislation";
import {
  authoredScenarioSeatCount,
  legislativeBlueprint,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type AuthoredVoteCounts,
} from "./legislation-scenarios";
import { recordFiledProvision } from "./legislative-politics";
import { createOrganization, createWorkRelationship } from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { congressSeats } from "./living-world/congress-seats";
import {
  settleTownCompensations,
  TOWN_PAY_VERSION,
} from "./living-world/town-pay";
import {
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "./municipal-government";
import {
  ensureJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { createPolicyCatalog, createSyntheticPolicyCatalog } from "./policy";
import { createProductionPolicyCatalog } from "./production-catalog";
import { personName } from "./people";
import { recordedPayStubs } from "./resource-income";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";
import type { LegislativeRulePack } from "./legislature-rules";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./law-consequences/pay-rows";

const provenance = {
  kind: "authored" as const,
  note: "Explicit saved worker, contract and cash controls; not ordinary business wealth.",
};

function opened(placeKey: string) {
  const place = requireLifePlace(placeKey);
  const initialCatalog = createSyntheticPolicyCatalog();
  const production = createProductionPolicyCatalog();
  const catalog = createPolicyCatalog({
    catalogVersion: "fixture:city-pay-preserving-demo-identities",
    domains: Object.values({
      ...initialCatalog.domains,
      ...production.domains,
    }),
    issues: Object.values({
      ...initialCatalog.issues,
      ...production.issues,
    }),
    propositions: Object.values({
      ...initialCatalog.propositions,
      ...production.propositions,
    }),
    subjects: Object.values({
      ...initialCatalog.subjects,
      ...production.subjects,
    }),
    principles: Object.values({
      ...initialCatalog.principles,
      ...production.principles,
    }),
  });
  const base = createScenarioWorld(`city-pay:${placeKey}`, place.context, {
    peopleCount: 8,
    policyCatalog: catalog,
  });
  let world = ensureJurisdiction(base, NATIONAL_ELECTION_JURISDICTION);
  world = ensureJurisdiction(
    world,
    stateJurisdictionForKey(place.stateJurisdictionKey!)!,
  );
  const government = municipalGovernmentForLifePlace(place)!;
  expect(government).not.toBeNull();
  const result = municipalRulePackFor(government);
  if (!result.ok)
    throw new Error("Missing actual municipal procedure for fixture");
  return { world, place, pack: result.pack };
}

/** Canonical legislative records; every favorable ballot and signature is authored. */
function enact(
  start: World,
  pack: LegislativeRulePack,
  jurisdictionId: EntityId,
  questionKey: string,
  amount: number | null,
  answer: "yes" | "no" = "yes",
  savedStateRule?: string,
) {
  const proposition = Object.values(start.policyCatalog.propositions).find(
    (p) => p.stableKey === questionKey,
  )!;
  const key = `fixture:city-pay-law:${questionKey}:${amount}${savedStateRule ? ":saved-rule" : ""}`;
  let world = introduceMeasure(start, {
    stableKey: key,
    jurisdictionId,
    rulePackId: pack.packId,
    designation: "Controlled wage act",
    shortTitle: "Explicit fictional wage terms",
    summary:
      "Authored ballots and signature for a legal-reader/payroll control.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: start.personOrder[0]!,
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: savedStateRule ? [] : [proposition.id],
    propositionAnswers: savedStateRule
      ? []
      : [{ propositionId: proposition.id, answer }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  if (savedStateRule && amount !== null)
    world = fileRuleChangeProvision(world, {
      stableKey: `${key}:term`,
      measureId,
      officeKey: laborLawOfficeKey(savedStateRule),
      field: "labor.minimumWage.hourlyCents",
      value: amount,
    });
  else if (amount !== null)
    world = recordFiledProvision(world, {
      stableKey: `${key}:term`,
      measureId,
      provisionKey: "hourly-floor",
      sectionNumber: 1,
      heading: "Fictional hourly amount",
      text: "The controlled law carries its explicit numeric amount.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Covered workers",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawTerms: [
        {
          questionKey,
          key:
            questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
              ? "floor"
              : "target",
          value: amount,
          unit: "minor/hour",
        },
      ],
    });
  const seats = (chamberKey: string) =>
    pack.packId === "us-congress-v1"
      ? congressSeats().filter((seat) => seat.chamberKey === `us-${chamberKey}`)
          .length
      : authoredScenarioSeatCount(pack, chamberKey);
  const bodies = pack.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats(chamber.chamberKey),
      [],
      false,
    ),
  );
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats(chamber.chamberKey),
      };
  }
  const context = {
    pack,
    bodies,
    measureId,
    votePlan,
    committeeMemberCount:
      pack.chambers[0]!.committees[0]?.appointedMembers ?? null,
    governorAction: "signed" as const,
    governorRationale: "Explicit authored fixture signature.",
  };
  for (let guard = 0; guard < 60; guard++) {
    const position = measurePosition(world, measureId);
    if (position.phase === "awaiting-enactment")
      return {
        world: recordEnactment(world, {
          stableKey: `${key}:enacted`,
          measureId,
          effectiveAt: world.currentDate,
        }),
        measureId,
      };
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step)
      throw new Error(`Fixture has no canonical next step: ${position.phase}`);
    // Keep the date writer canonical while authoring the procedure decision.
    if (
      step === "await-next-legislative-day" &&
      position.earliestNextFloorDate
    ) {
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, position.earliestNextFloorDate),
        createFutureTransitionHandlerRegistry([]),
      );
    } else
      world =
        step === "await-executive-decision"
          ? recordExecutiveAction(world, {
              stableKey: `${key}:signed`,
              measureId,
              action: "signed",
              rationale:
                "Explicit authored fixture signature; no natural executive choice claimed.",
            })
          : applyLegislativeStep(context, world, step).world;
  }
  throw new Error("Controlled city law did not reach enactment");
}

function worker(
  start: World,
  jurisdictionId: EntityId,
  townPayroll = false,
  jobPayroll = false,
  shiftPayroll = false,
) {
  const personId = start.personOrder[0]!;
  let world = createOrganization(start, {
    stableKey: "fixture:city-pay:employer",
    formedAt: start.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled city employer",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
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
  world = createWorkCompensation(world, {
    stableKey: townPayroll
      ? `${TOWN_PAY_VERSION}:job-pay:${work.id}`
      : jobPayroll
        ? `job-pay:${work.id}`
        : "fixture:city-pay:flow",
    workRelationshipId: work.id,
    startsAt: world.currentDate,
    amount: money(shiftPayroll ? 7200 : 100, "USD"),
    cadenceKind: shiftPayroll
      ? "work:completed-shift"
      : jobPayroll
        ? "schedule:weekly"
        : "schedule:town-weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  world = createResourcePosition(world, {
    stableKey: "fixture:city-pay:cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(1_000_000, "USD"),
    provenance,
  });
  return { world, personId, organizationId, flow };
}

function completedEarnedLawFixture() {
  const o = opened("3137000");
  const law = enact(
    o.world,
    legislativeBlueprint("nebraska").pack,
    stateJurisdictionForKey("US-NE")!.id,
    STATE_MINIMUM_WAGE_QUESTION_KEY,
    2000,
    "yes",
    "NE",
  );
  const f = worker(
    law.world,
    o.place.context.jurisdiction.id,
    false,
    false,
    true,
  );
  if (f.flow.basisReference.kind !== "work")
    throw new Error("Missing controlled shift work binding");
  const workId = f.flow.basisReference.workRelationshipId;
  const scheduled = scheduleLifePathSession(
    { ...f.world, control: { kind: "person", personId: f.personId } },
    workId,
  );
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  const worked = performLifePathSession(scheduled.world, activity.id);
  expect(worked.ok, worked.message).toBe(true);
  const completion = worked.world.history.events.find(
    (row) =>
      row.type === "life-paths2.work-session" &&
      row.involvedEntityIds.includes(activity.id),
  )!;
  expect(completion).toBeDefined();
  const state = worked.world.history.scheduledActivityStates
    .filter(
      (row) =>
        row.activityId === activity.id && row.sequence <= completion.sequence,
    )
    .at(-1)!;
  const minutes = simulationMinutesBetween(state.start, state.end);
  expect(minutes).toBe(240);
  const earned = resourceFlowTermsAt(worked.world, f.flow.id, {
    asOfDate: completion.occurredAt,
    historySequenceExclusive: completion.sequence + 1,
  })!;
  expect(earned.amount.minorUnits).toBe(7200);
  const period = {
    stableKey: `fixture:earned-law:${completion.id}`,
    payFlowId: f.flow.id,
    activityId: workId,
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    onDate: worked.world.currentDate,
    completedShift: {
      eventId: completion.id,
      termsId: earned.id,
      amount: earned.amount,
    },
  };
  return {
    law,
    f,
    workId,
    worked,
    completion,
    activity,
    state,
    minutes,
    earned,
    period,
  };
}

it("A38 assessment producer saves the actual earned obligation without posting money", () => {
  const { law, f, workId, worked, completion, activity, state, earned } =
    completedEarnedLawFixture();
  const context = {
    onDate: completion.occurredAt,
    activity: "payroll" as const,
    activityId: workId,
    subjectIds: [f.personId],
    completedShift: { eventId: completion.id, termsId: earned.id },
  };
  const assessed = applyLawConsequences(worked.world, context);
  const records = assessed.history.earnedLawPayAssessments!.filter(
    (row) => row.completionEventId === completion.id,
  );
  expect(records).toHaveLength(1);
  const record = records[0]!;
  expect(record).toMatchObject({
    personId: f.personId,
    organizationId: f.organizationId,
    workRelationshipId: workId,
    resourceFlowId: f.flow.id,
    earnedTermsId: earned.id,
    completionEventId: completion.id,
    scheduledActivityId: activity.id,
    scheduledActivityStateId: state.id,
    recordedAt: worked.world.currentDate,
    sequence: worked.world.history.nextSequence,
    workedMinutes: 240,
    contractualGross: money(7200, "USD"),
    assessedGross: money(8000, "USD"),
  });
  expect(record.lawEffectStamps[0]!).toMatchObject({
    effectKind: "pay",
    governingLawKey: law.measureId,
  });
  expect(assessed.history.resourceFlowTerms).toBe(
    worked.world.history.resourceFlowTerms,
  );
  expect(assessed.history.resourceTransferOutcomes).toBe(
    worked.world.history.resourceTransferOutcomes,
  );
  expect(applyLawConsequences(assessed, context)).toBe(assessed);
  console.info("EARNED_LAW_ASSESSMENT", {
    person: personName(assessed.people[f.personId]!),
    assessmentId: record.id,
    contractualGrossMinor: 7200,
    assessedGrossMinor: 8000,
    actualMinutes: 240,
    paymentsAdded: 0,
  });
});

it("A38 earned law raises only the actual completed interval without changing its contract", () => {
  const {
    law,
    f,
    workId,
    worked,
    completion,
    activity,
    state,
    minutes,
    earned,
    period,
  } = completedEarnedLawFixture();
  expect(() =>
    settleTownCompensations(worked.world, [
      {
        ...period,
        completedShift: {
          ...period.completedShift,
          amount: money(8000, "USD"),
        },
      },
    ]),
  ).toThrow("Completed shift pay must bind its saved work and earned terms");
  const paid = settleTownCompensations(worked.world, [period]);
  const outcome = paid.history.resourceTransferOutcomes.find(
    (row) => row.stableKey === period.stableKey,
  )!;
  expect(outcome.attemptedAmount.minorUnits).toBe(8000);
  expect(outcome.transferredAmount.minorUnits).toBe(8000);
  expect(outcome.status).toBe("completed");
  const observedPay = paid.history.metricObservations.filter(
    (row) => row.sourceSeriesKey === "payroll.completed-gross",
  );
  expect(observedPay).toHaveLength(1);
  expect(observedPay[0]!.value).toEqual({
    kind: "money",
    money: money(8000, "USD"),
  });
  expect(observedPay[0]!.sourceReference?.locator).toContain(outcome.id);
  const assessment = paid.history.earnedLawPayAssessments!.find(
    (row) => row.id === outcome.earnedLawPayAssessmentId,
  )!;
  expect(assessment).toMatchObject({
    personId: f.personId,
    organizationId: f.organizationId,
    workRelationshipId: workId,
    resourceFlowId: f.flow.id,
    earnedTermsId: earned.id,
    completionEventId: completion.id,
    scheduledActivityId: activity.id,
    scheduledActivityStateId: state.id,
    recordedAt: worked.world.currentDate,
    earnedCutoff: {
      asOfDate: completion.occurredAt,
      historySequenceExclusive: completion.sequence + 1,
    },
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    workedMinutes: 240,
    contractualGross: money(7200, "USD"),
    assessedGross: money(8000, "USD"),
  });
  expect(observedPay[0]!.scope.jurisdictionId).toBe(
    payWorkplaceAt(paid, assessment.workRelationshipId, assessment.earnedCutoff)
      .jurisdictionId,
  );
  expect(recordEarnedPayObservations(paid, [outcome.id])).toBe(paid);
  expect(recordEarnedPayObservations(paid, [])).toBe(paid);
  expect(observedPay[0]!.scope.segmentKey).toBe("payroll.earned.usd");
  expect(observedPay[0]!.underlyingStateId).toBeNull();
  expect(observedPay[0]!.referencePeriod).toEqual({
    kind: "interval",
    startsAt: period.periodStartsAt,
    endsAt: period.periodEndsAt,
  });
  expect(assessment.lawEffectStamps[0]!.sourceRecordIds).toEqual(
    expect.arrayContaining([
      assessment.id,
      workId,
      f.flow.id,
      earned.id,
      completion.id,
      activity.id,
      state.id,
    ]),
  );
  // Withholding legitimately opens its own tax-flow terms. Every earlier term
  // and every term of the completed work's contract must remain unchanged.
  expect(
    paid.history.resourceFlowTerms.slice(
      0,
      worked.world.history.resourceFlowTerms.length,
    ),
  ).toEqual(worked.world.history.resourceFlowTerms);
  expect(
    paid.history.resourceFlowTerms.filter(
      (record) => record.resourceFlowId === f.flow.id,
    ),
  ).toEqual(
    worked.world.history.resourceFlowTerms.filter(
      (record) => record.resourceFlowId === f.flow.id,
    ),
  );
  const stub = recordedPayStubs(paid, f.personId).find(
    (record) => record.paycheck.id === outcome.id,
  )!;
  expect(stub).toBeDefined();
  expect(stub.paidGross).toEqual(money(8000, "USD"));
  expect(stub.assessmentStatus).toBe("recorded");
  expect(stub.withheld.minorUnits).toBeGreaterThan(0);
  expect(stub.netPaid.minorUnits).toBe(8000 - stub.withheld.minorUnits);
  const liabilities = paid.history.statutoryTaxLiabilities!.filter(
    (record) => record.sourceOutcomeId === outcome.id,
  );
  expect(liabilities.some((record) => record.authorityKey === "US")).toBe(true);
  expect(liabilities.some((record) => record.authorityKey === "US-NE")).toBe(
    true,
  );
  expect(liabilities.every((record) => record.wages.minorUnits === 8000)).toBe(
    true,
  );
  const taxPayments = paid.history.statutoryTaxPayments!.filter((record) =>
    liabilities.some((liability) => liability.id === record.liabilityId),
  );
  expect(
    taxPayments.reduce((total, record) => total + record.amount.minorUnits, 0),
  ).toBe(stub.withheld.minorUnits);
  const withholdingFlows = new Set(
    taxPayments.map(
      (record) =>
        paid.history.resourceTransferOutcomes.find(
          (transfer) => transfer.id === record.resourceOutcomeId,
        )!.resourceFlowId,
    ),
  );
  const newTerms = paid.history.resourceFlowTerms.slice(
    worked.world.history.resourceFlowTerms.length,
  );
  expect(newTerms.length).toBeGreaterThan(0);
  for (const term of newTerms) {
    const flow = paid.history.resourceFlows.find(
      (record) => record.id === term.resourceFlowId,
    )!;
    expect(withholdingFlows.has(flow.id)).toBe(true);
    expect(flow.source).toEqual({ kind: "person", personId: f.personId });
    expect(flow.recipient.kind).toBe("organization");
    expect(term.cadenceKind).toBe("custom:tax-withholding");
    expect(term.provenance).toEqual({
      kind: "generated",
      generatorKey: "statutory-tax:payroll-withholding",
    });
  }
  expect(
    resourcePositionAt(
      paid,
      { kind: "organization", organizationId: f.organizationId },
      money(1, "USD").currency,
    )!.liquidBalance,
  ).toEqual(money(992_000, "USD"));
  expect(outcome.lawEffectStamps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        effectKind: "pay",
        governingLawKey: law.measureId,
      }),
    ]),
  );
  expect(settleTownCompensations(paid, [period])).toBe(paid);
  const reopenedPaid = deserializeWorld(serializeWorld(paid));
  expect(serializeWorld(reopenedPaid)).toBe(serializeWorld(paid));
  expect(settleTownCompensations(reopenedPaid, [period])).toBe(reopenedPaid);
  console.info("EARNED_LAW_SHIFT_PAY", {
    person: personName(paid.people[f.personId]!),
    workId,
    flowId: f.flow.id,
    completionId: completion.id,
    assessmentId: assessment.id,
    workedMinutes: minutes,
    contractualGrossMinor: earned.amount.minorUnits,
    assessedGrossMinor: assessment.assessedGross.minorUnits,
    transferredMinor: outcome.transferredAmount.minorUnits,
  });
  expect(
    serializeWorld(
      settleTownCompensations(deserializeWorld(serializeWorld(worked.world)), [
        period,
      ]),
    ),
  ).toBe(serializeWorld(paid));
});

it("A38 actual completed-shift payday delegates immutable earnings through the clock caller", () => {
  const { law, f, worked, completion, earned } = completedEarnedLawFixture();
  const due = worked.world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === "life-paths2:pay" &&
      item.entityIds.includes(completion.id),
  )!;
  expect(due).toBeDefined();
  const paid = advanceWorld(worked.world, 1, lifePaths2Handlers());
  const outcome = paid.history.resourceTransferOutcomes.find(
    (row) => row.stableKey === `${due.stableKey}:paid`,
  )!;
  expect(outcome).toBeDefined();
  expect(outcome.attemptedAmount).toEqual(money(8000, "USD"));
  expect(outcome.transferredAmount).toEqual(money(8000, "USD"));
  expect(outcome.earnedLawPayAssessmentId).toBeDefined();
  expect(outcome.lawEffectStamps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        effectKind: "pay",
        governingLawKey: law.measureId,
      }),
    ]),
  );
  expect(
    paid.history.resourceFlowTerms.filter(
      (row) => row.resourceFlowId === f.flow.id,
    ),
  ).toEqual(
    worked.world.history.resourceFlowTerms.filter(
      (row) => row.resourceFlowId === f.flow.id,
    ),
  );
  expect(resourceFlowTermsAt(paid, f.flow.id)!.amount).toEqual(earned.amount);
  expect(
    resourcePositionAt(
      paid,
      { kind: "organization", organizationId: f.organizationId },
      money(1, "USD").currency,
    )!.liquidBalance,
  ).toEqual(money(992000, "USD"));
  const reopened = deserializeWorld(serializeWorld(paid));
  expect(serializeWorld(reopened)).toBe(serializeWorld(paid));
  expect(
    reopened.history.resourceTransferOutcomes.filter(
      (row) => row.stableKey === outcome.stableKey,
    ),
  ).toHaveLength(1);
});

function savedWeeklyRuleFixture() {
  const o = opened("3137000");
  const law = enact(
    o.world,
    legislativeBlueprint("nebraska").pack,
    stateJurisdictionForKey("US-NE")!.id,
    STATE_MINIMUM_WAGE_QUESTION_KEY,
    1800,
    "yes",
    "NE",
  );
  const f = worker(law.world, o.place.context.jurisdiction.id, false, true);
  const clause = f.world.history.ruleChangeProvisions!.find(
    (row) => row.measureId === law.measureId,
  )!;
  const enactment = f.world.history.legislativeEnactments!.find(
    (row) => row.measureId === law.measureId && row.outcome === "enacted",
  )!;
  return { law, f, clause, enactment };
}

it("A38 default pay dispatch applies a saved hourly rule to ordinary weekly terms", () => {
  const { law, f, clause, enactment } = savedWeeklyRuleFixture();
  const before = serializeWorld(f.world);
  const context = {
    onDate: f.flow.startsAt,
    activity: "payroll" as const,
    activityId: f.flow.id,
    subjectIds: [f.personId],
  };
  const revised = applyLawConsequences(f.world, context);
  const terms = resourceFlowTermsAt(revised, f.flow.id)!;
  expect(terms.amount).toEqual(money(72000, "USD"));
  expect(terms.cadenceKind).toBe("schedule:weekly");
  expect(terms.effectiveAt).toBe(f.flow.startsAt);
  expect(terms.lawEffectStamps).toEqual([
    expect.objectContaining({
      effectKind: "pay",
      questionKey: null,
      governingLawKey: law.measureId,
      ruleAuthority: {
        ruleChangeProvisionId: clause.id,
        enactmentId: enactment.id,
        field: "labor.minimumWage.hourlyCents",
      },
      sourceRecordIds: expect.arrayContaining([
        clause.id,
        enactment.id,
        f.flow.id,
      ]),
    }),
  ]);
  expect(revised.history.resourceTransferOutcomes).toEqual(
    f.world.history.resourceTransferOutcomes,
  );
  expect(revised.history.resourcePositions).toEqual(
    f.world.history.resourcePositions,
  );
  expect(revised.history.earnedLawPayAssessments).toEqual(
    f.world.history.earnedLawPayAssessments,
  );
  expect(serializeWorld(f.world)).toBe(before);
  expect(serializeWorld(applyLawConsequences(revised, context))).toBe(
    serializeWorld(revised),
  );
  const reopened = deserializeWorld(serializeWorld(revised));
  expect(serializeWorld(applyLawConsequences(reopened, context))).toBe(
    serializeWorld(revised),
  );
});

it("A38 ordinary weekly payment preserves actual saved-rule authority and withholding", () => {
  const { law, f, clause, enactment } = savedWeeklyRuleFixture();
  const due = advanceWorld(
    f.world,
    7,
    createFutureTransitionHandlerRegistry([]),
  );
  const period = {
    stableKey: `fixture:ordinary-saved-hourly:${f.flow.id}:${f.flow.startsAt}`,
    payFlowId: f.flow.id,
    activityId: f.flow.id,
    periodStartsAt: f.flow.startsAt,
    periodEndsAt: addDays(f.flow.startsAt, 6),
    onDate: addDays(f.flow.startsAt, 7),
  };
  const paid = settleTownCompensations(due, [period]);
  const stubs = recordedPayStubs(paid, f.personId).filter(
    (row) => row.paycheck.resourceFlowId === f.flow.id,
  );
  expect(stubs).toHaveLength(1);
  const stub = stubs[0]!;
  expect(stub.paidGross).toEqual(money(72000, "USD"));
  expect(stub.withheld.minorUnits).toBeGreaterThan(0);
  expect(stub.netPaid.minorUnits).toBe(72000 - stub.withheld.minorUnits);
  expect(stub.assessmentStatus).toBe("recorded");
  expect(stub.paycheck.lawEffectStamps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        effectKind: "pay",
        questionKey: null,
        governingLawKey: law.measureId,
        ruleAuthority: {
          ruleChangeProvisionId: clause.id,
          enactmentId: enactment.id,
          field: "labor.minimumWage.hourlyCents",
        },
        sourceRecordIds: expect.arrayContaining([
          clause.id,
          enactment.id,
          f.flow.id,
          stub.paycheck.id,
        ]),
      }),
    ]),
  );
  expect(
    resourcePositionAt(
      paid,
      { kind: "organization", organizationId: f.organizationId },
      money(1, "USD").currency,
    )!.liquidBalance,
  ).toEqual(money(928000, "USD"));
  expect(settleTownCompensations(paid, [period])).toBe(paid);
  const reopened = deserializeWorld(serializeWorld(paid));
  expect(serializeWorld(reopened)).toBe(serializeWorld(paid));
  expect(settleTownCompensations(reopened, [period])).toBe(reopened);
  console.info("ORDINARY_SAVED_RULE_PAY", {
    person: personName(paid.people[f.personId]!),
    personId: f.personId,
    flowId: f.flow.id,
    clauseId: clause.id,
    enactmentId: enactment.id,
    grossMinor: stub.paidGross.minorUnits,
    withheldMinor: stub.withheld.minorUnits,
    netMinor: stub.netPaid.minorUnits,
  });
});

it("keeps completed earned pay from distinct work dates in separate observations", () => {
  const first = completedEarnedLawFixture();
  const paused = changeLifePathStatus(first.worked.world, first.workId, "pause");
  expect(paused.ok, paused.message).toBe(true);
  const paid = advanceWorld(paused.world, 1, lifePaths2Handlers());
  const resumed = changeLifePathStatus(paid, first.workId, "return");
  expect(resumed.ok, resumed.message).toBe(true);
  const nextDate = resumed.world;
  const scheduled = scheduleLifePathSession(nextDate, first.workId);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  const worked = performLifePathSession(scheduled.world, activity.id);
  expect(worked.ok, worked.message).toBe(true);
  const completion = worked.world.history.events.find(
    (row) =>
      row.type === "life-paths2.work-session" &&
      row.involvedEntityIds.includes(activity.id),
  )!;
  expect(completion).toBeDefined();
  const terms = resourceFlowTermsAt(worked.world, first.f.flow.id, {
    asOfDate: completion.occurredAt,
    historySequenceExclusive: completion.sequence + 1,
  })!;
  const period = {
    stableKey: `fixture:earned-law:${completion.id}`,
    payFlowId: first.f.flow.id,
    activityId: first.workId,
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    onDate: worked.world.currentDate,
    completedShift: {
      eventId: completion.id,
      termsId: terms.id,
      amount: terms.amount,
    },
  };
  expect(period.periodStartsAt).not.toBe(first.period.periodStartsAt);
  const secondPaid = settleTownCompensations(worked.world, [period]);
  const observations = secondPaid.history.metricObservations.filter(
    (row) => row.sourceSeriesKey === "payroll.completed-gross",
  );
  expect(observations).toHaveLength(2);
  expect(
    observations.every((row) => row.supersedesObservationId === null),
  ).toBe(true);
  for (const observation of observations) {
    expect(observation.referencePeriod.kind).toBe("interval");
    expect(observation.value).toEqual({
      kind: "money",
      money: money(8000, "USD"),
    });
  }
  const reopened = deserializeWorld(serializeWorld(secondPaid));
  expect(serializeWorld(reopened)).toBe(serializeWorld(secondPaid));
  expect(settleTownCompensations(reopened, [period])).toBe(reopened);
});
