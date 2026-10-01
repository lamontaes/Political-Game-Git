import { expect, it } from "vitest";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, daysBetween, simulationMomentOnLocalDate } from "../dates";
import { createScenarioWorld } from "../demo";
import { applyLawConsequences } from "../enacted-law-effects";
import { advanceWorld } from "../world";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { settleJobPay } from "../job-market";
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
} from "../enacted-rule-changes";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "../legislation";
import {
  authoredScenarioSeatCount,
  legislativeBlueprint,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type AuthoredVoteCounts,
} from "../legislation-scenarios";
import { recordFiledProvision } from "../legislative-politics";
import { createOrganization, createWorkRelationship } from "../life";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import { congressSeats } from "../living-world/congress-seats";
import {
  settleTownCompensations,
  ensurePaydaySchedule,
  TOWN_PAY_VERSION,
} from "../living-world/town-pay";
import {
  LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
  localMinimumSettingAt,
  stateMinimumSettingAt,
} from "../minimum-wage";
import {
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "../municipal-government";
import {
  ensureJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { createPolicyCatalog } from "../policy";
import { createProductionPolicyCatalog } from "../production-catalog";
import { personName } from "../people";
import { recordedPayStubs } from "../resource-income";
import { resourceFlowTermsAt, resourcePositionAt } from "../resource-queries";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import type { LegislativeRulePack } from "../legislature-rules";
import { resolvePayConsequences } from "./pay";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  MINIMUM_WAGE_PAY_ROWS,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./pay-rows";

const provenance = {
  kind: "authored" as const,
  note: "Explicit saved worker, contract and cash controls; not ordinary business wealth.",
};

function opened(placeKey: string) {
  const place = requireLifePlace(placeKey);
  const base = createScenarioWorld(`city-pay:${placeKey}`, place.context, {
    peopleCount: 8,
  });
  const production = createProductionPolicyCatalog();
  const catalog = createPolicyCatalog({
    catalogVersion: "fixture:city-pay-preserving-demo-identities",
    domains: Object.values({
      ...base.policyCatalog.domains,
      ...production.domains,
    }),
    issues: Object.values({
      ...base.policyCatalog.issues,
      ...production.issues,
    }),
    propositions: Object.values({
      ...base.policyCatalog.propositions,
      ...production.propositions,
    }),
    subjects: Object.values({
      ...base.policyCatalog.subjects,
      ...production.subjects,
    }),
    principles: Object.values({
      ...base.policyCatalog.principles,
      ...production.principles,
    }),
  });
  let world = ensureJurisdiction(
    { ...base, policyCatalog: catalog },
    NATIONAL_ELECTION_JURISDICTION,
  );
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
    kind: "employment:staff",
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
    amount: money(100, "USD"),
    cadenceKind: jobPayroll ? "schedule:weekly" : "schedule:town-weekly",
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

function payment(
  f: ReturnType<typeof worker>,
  expectedMinor: number,
  expectedLaw?: EntityId,
) {
  const since = f.world.currentDate;
  const payday = addDays(since, 6);
  const before = {
    ...f.world,
    currentDate: payday,
    currentMoment: simulationMomentOnLocalDate(f.world.currentMoment, payday),
  };
  const period = {
    payFlowId: f.flow.id,
    activityId: f.flow.id,
    stableKey: "fixture:city-pay:period",
    periodStartsAt: since,
    periodEndsAt: payday,
    onDate: payday,
  };
  const paid = settleTownCompensations(before, [period]);
  const outcome = paid.history.resourceTransferOutcomes.find(
    (row) => row.stableKey === period.stableKey,
  )!;
  expect(outcome.transferredAmount.minorUnits).toBe(expectedMinor);
  expect(outcome.lawEffectStamps!.at(-1)!.effectKind).toBe("pay");
  if (expectedLaw)
    expect(outcome.lawEffectStamps!.at(-1)!.governingLawKey).toBe(expectedLaw);
  expect(
    paid.history.statutoryTaxLiabilities!.some(
      (row) => row.sourceOutcomeId === outcome.id,
    ),
  ).toBe(true);
  expect(
    resourcePositionAt(
      paid,
      { kind: "organization", organizationId: f.organizationId },
      money(1, "USD").currency,
    )!.liquidBalance.minorUnits,
  ).toBe(1_000_000 - expectedMinor);
  expect(settleTownCompensations(paid, [period])).toBe(paid);
  expect(
    serializeWorld(
      settleTownCompensations(deserializeWorld(serializeWorld(before)), [
        period,
      ]),
    ),
  ).toBe(serializeWorld(paid));
  console.info("CITY_ACTUAL_PAY", {
    person: personName(paid.people[f.personId]!),
    grossMinor: outcome.transferredAmount.minorUnits,
    flowId: f.flow.id,
    law: outcome.lawEffectStamps!.at(-1)!.governingLawKey,
  });
  return paid;
}

it("A39 default city row pays the explicit ordinance amount and retains repeat/reload", () => {
  const o = opened("3137000");
  const law = enact(
    o.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    1875,
  );
  payment(
    worker(law.world, o.place.context.jurisdiction.id),
    75_000,
    law.measureId,
  );
});

it("A38 saved state wage rule reaches scheduled actual payroll", () => {
  const o = opened("3137000");
  const stateId = stateJurisdictionForKey("US-NE")!.id;
  const law = enact(
    o.world,
    legislativeBlueprint("nebraska").pack,
    stateId,
    STATE_MINIMUM_WAGE_QUESTION_KEY,
    1800,
    "yes",
    "NE",
  );
  expect(
    stateMinimumSettingAt(law.world, "US-NE", law.world.currentDate)
      ?.hourlyMinor,
  ).toBe(1800);
  const f = worker(law.world, o.place.context.jurisdiction.id, true);
  const paid = advanceWorld(
    ensurePaydaySchedule(f.world),
    14,
    createCampaignElectionTransitionRegistry(),
  );
  const stubs = recordedPayStubs(paid, f.personId).filter(
    (row) => row.paycheck.resourceFlowId === f.flow.id,
  );
  expect(stubs.length).toBe(1);
  const clause = paid.history.ruleChangeProvisions!.find(
    (row) => row.measureId === law.measureId,
  )!;
  console.info("SAVED_RULE_SCHEDULED_PAY", {
    person: personName(paid.people[f.personId]!),
    measureId: law.measureId,
    provisionId: clause.id,
    field: clause.field,
    statutoryHourlyMinor: 1800,
    actualGrossMinor: stubs[0]!.paidGross.minorUnits,
    termsKind:
      resourceFlowTermsAt(paid, f.flow.id)!.lawEffectStamps?.[0]?.effectKind ??
      null,
  });
  expect(stubs[0]!.paidGross.minorUnits).toBe(72_000);
  expect(stubs[0]!.paycheck.lawEffectStamps?.at(-1)?.effectKind).toBe("pay");
  expect(stubs[0]!.paycheck.lawEffectStamps?.at(-1)?.governingLawKey).toBe(
    law.measureId,
  );
  const outcome = stubs[0]!.paycheck;
  const stamp = outcome.lawEffectStamps!.at(-1)!;
  const enactment = paid.history.legislativeEnactments!.find(
    (row) => row.measureId === law.measureId && row.outcome === "enacted",
  )!;
  expect(stamp.questionKey).toBeNull();
  expect(stamp.ruleAuthority).toEqual({
    ruleChangeProvisionId: clause.id,
    enactmentId: enactment.id,
    field: clause.field,
  });
  expect(stamp.sourceRecordIds).toEqual(
    expect.arrayContaining([
      clause.id,
      enactment.id,
      f.flow.basisReference.kind === "work"
        ? f.flow.basisReference.workRelationshipId
        : null,
      f.flow.id,
      outcome.id,
    ]),
  );
  expect(
    resourcePositionAt(
      paid,
      { kind: "organization", organizationId: f.organizationId },
      money(1, "USD").currency,
    )!.liquidBalance.minorUnits,
  ).toBe(928_000);
  const period = {
    payFlowId: f.flow.id,
    activityId: f.flow.id,
    stableKey: outcome.stableKey,
    periodStartsAt: outcome.periodStartsAt,
    periodEndsAt: outcome.periodEndsAt,
    onDate: outcome.occurredAt,
  };
  expect(settleTownCompensations(paid, [period])).toBe(paid);
  const reopened = advanceWorld(
    deserializeWorld(serializeWorld(ensurePaydaySchedule(f.world))),
    14,
    createCampaignElectionTransitionRegistry(),
  );
  expect(serializeWorld(reopened)).toBe(serializeWorld(paid));
});

it("A38 actual job-market week retains the governing city law on terms and pay", () => {
  const o = opened("3137000");
  const law = enact(
    o.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    1875,
  );
  const f = worker(law.world, o.place.context.jurisdiction.id, false, true);
  const before = advanceWorld(
    f.world,
    7,
    createCampaignElectionTransitionRegistry(),
  );
  const paid = settleJobPay(before, f.personId);
  const terms = resourceFlowTermsAt(paid, f.flow.id)!;
  const stubs = recordedPayStubs(paid, f.personId).filter(
    (row) => row.paycheck.resourceFlowId === f.flow.id,
  );
  expect(stubs.length).toBe(1);
  expect(terms.amount.minorUnits).toBe(75_000);
  expect(stubs[0]!.paidGross.minorUnits).toBe(75_000);
  expect(stubs[0]!.withheld.minorUnits).toBe(12_606);
  expect(stubs[0]!.netPaid.minorUnits).toBe(62_394);
  expect(stubs[0]!.assessmentStatus).toBe("recorded");
  expect(stubs[0]!.netPaid.minorUnits).toBe(
    75_000 - stubs[0]!.withheld.minorUnits,
  );
  const cashMinor = resourcePositionAt(
    paid,
    { kind: "organization", organizationId: f.organizationId },
    money(1, "USD").currency,
  )!.liquidBalance.minorUnits;
  expect(cashMinor).toBe(925_000);
  expect(settleJobPay(paid, f.personId)).toBe(paid);
  expect(
    serializeWorld(
      settleJobPay(deserializeWorld(serializeWorld(before)), f.personId),
    ),
  ).toBe(serializeWorld(paid));
  console.info("JOB_WEEK_CITY_PAY", {
    person: personName(paid.people[f.personId]!),
    flowId: f.flow.id,
    grossMinor: stubs[0]!.paidGross.minorUnits,
    withheldMinor: stubs[0]!.withheld.minorUnits,
    netMinor: stubs[0]!.netPaid.minorUnits,
    employerCashMinor: cashMinor,
    termsKind: terms.lawEffectStamps?.[0]?.effectKind ?? null,
  });
  expect(terms.lawEffectStamps?.[0]?.effectKind).toBe("pay");
  expect(terms.lawEffectStamps?.[0]?.governingLawKey).toBe(law.measureId);
  expect(stubs[0]!.paycheck.lawEffectStamps?.at(-1)?.effectKind).toBe("pay");
  expect(stubs[0]!.paycheck.lawEffectStamps?.at(-1)?.governingLawKey).toBe(
    law.measureId,
  );
});

it("A39 absent city ordinance preserves the stronger actual state floor", () => {
  const o = opened("3137000");
  const f = worker(o.world, o.place.context.jurisdiction.id);
  const context = {
    onDate: f.world.currentDate,
    activity: "payroll" as const,
    activityId: f.flow.id,
    subjectIds: [f.personId],
  };
  expect(
    resolvePayConsequences(
      f.world,
      MINIMUM_WAGE_PAY_ROWS[CITY_MINIMUM_WAGE_QUESTION_KEY]!,
      context,
    ),
  ).toEqual([]);
  payment(f, 60_000);
});

it("A39 preempted city ordinance cannot set a worker's paycheck", () => {
  const o = opened("3137000");
  const law = enact(
    o.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    1875,
  );
  // Actual executable municipal procedure, then an explicit authored state
  // preemption. No unsupported Kentucky council procedure is supplied.
  const barred = enact(
    law.world,
    legislativeBlueprint("nebraska").pack,
    stateJurisdictionForKey("US-NE")!.id,
    LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
    null,
    "no",
  );
  expect(
    localMinimumSettingAt(
      barred.world,
      o.place.context.jurisdiction.id,
      1500,
      barred.world.currentDate,
    ),
  ).toBeNull();
  const f = worker(barred.world, o.place.context.jurisdiction.id);
  const context = {
    onDate: f.world.currentDate,
    activity: "payroll" as const,
    activityId: f.flow.id,
    subjectIds: [f.personId],
  };
  expect(
    resolvePayConsequences(
      f.world,
      MINIMUM_WAGE_PAY_ROWS[CITY_MINIMUM_WAGE_QUESTION_KEY]!,
      context,
    ),
  ).toEqual([]);
  payment(f, 60_000);
});

it("A39 amountless city ordinance refuses a fabricated numeric wage", () => {
  const o = opened("3137000");
  const law = enact(
    o.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    null,
  );
  const f = worker(law.world, o.place.context.jurisdiction.id);
  const before = serializeWorld(f.world);
  expect(() =>
    applyLawConsequences(f.world, {
      onDate: f.world.currentDate,
      activity: "payroll",
      activityId: f.flow.id,
      subjectIds: [f.personId],
    }),
  ).toThrow(/Missing pay final law term 'target'/);
  expect(serializeWorld(f.world)).toBe(before);
  expect(resourceFlowTermsAt(f.world, f.flow.id)!.amount.minorUnits).toBe(100);
});

it("A39 lower city amount cannot reduce the stronger state paycheck floor", () => {
  const o = opened("3137000");
  const law = enact(
    o.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    1000,
  );
  payment(worker(law.world, o.place.context.jurisdiction.id), 60_000);
});

it("A39 lower city amount cannot reduce an actual stronger federal floor", () => {
  const o = opened("3137000");
  const federal = enact(
    o.world,
    legislativeBlueprint("institution:us-congress-v1").pack,
    NATIONAL_ELECTION_JURISDICTION.id,
    FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    2500,
  );
  const city = enact(
    federal.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    1875,
  );
  payment(
    worker(city.world, o.place.context.jurisdiction.id),
    100_000,
    federal.measureId,
  );
});

it("A38 scheduled town payday preserves the city law's canonical pay terms", () => {
  const o = opened("3137000");
  const law = enact(
    o.world,
    o.pack,
    o.place.context.jurisdiction.id,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
    1875,
  );
  const f = worker(law.world, o.place.context.jurisdiction.id, true);
  const scheduled = ensurePaydaySchedule(f.world);
  expect(ensurePaydaySchedule(scheduled)).toBe(scheduled);
  const registry = createCampaignElectionTransitionRegistry();
  const paid = advanceWorld(scheduled, 14, registry);
  const terms = resourceFlowTermsAt(paid, f.flow.id)!;
  expect(terms.amount.minorUnits).toBe(75_000);
  const outcomes = paid.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === f.flow.id,
  );
  expect(outcomes.length).toBeGreaterThan(0);
  expect(
    outcomes.every((row) => row.transferredAmount.minorUnits === 75_000),
  ).toBe(true);
  expect(
    paid.history.statutoryTaxLiabilities!.some((row) =>
      outcomes.some((outcome) => outcome.id === row.sourceOutcomeId),
    ),
  ).toBe(true);
  expect(
    serializeWorld(
      advanceWorld(deserializeWorld(serializeWorld(scheduled)), 14, registry),
    ),
  ).toBe(serializeWorld(paid));
  const stubs = recordedPayStubs(paid, f.personId).filter(
    (row) => row.paycheck.resourceFlowId === f.flow.id,
  );
  expect(stubs.length).toBe(outcomes.length);
  expect(stubs.map((row) => row.withheld.minorUnits)).toEqual([12_606]);
  expect(stubs.map((row) => row.netPaid.minorUnits)).toEqual([62_394]);
  expect(stubs.every((row) => row.assessmentStatus === "recorded")).toBe(true);
  expect(
    stubs.every(
      (row) =>
        row.netPaid.minorUnits ===
        row.paidGross.minorUnits - row.withheld.minorUnits,
    ),
  ).toBe(true);
  const cashMinor = resourcePositionAt(
    paid,
    { kind: "organization", organizationId: f.organizationId },
    money(1, "USD").currency,
  )!.liquidBalance.minorUnits;
  expect(cashMinor).toBe(1_000_000 - outcomes.length * 75_000);
  console.info("TOWN_SCHEDULED_CITY_PAY", {
    person: personName(paid.people[f.personId]!),
    flowId: f.flow.id,
    grossMinor: stubs.map((row) => row.paidGross.minorUnits),
    withheldMinor: stubs.map((row) => row.withheld.minorUnits),
    netMinor: stubs.map((row) => row.netPaid.minorUnits),
    employerCashMinor: cashMinor,
    termsKind: terms.lawEffectStamps?.[0]?.effectKind ?? null,
  });
  expect(terms.lawEffectStamps?.[0]?.effectKind).toBe("pay");
  expect(terms.lawEffectStamps![0]!.governingLawKey).toBe(law.measureId);
  for (const outcome of outcomes) {
    expect(outcome.lawEffectStamps?.at(-1)?.effectKind).toBe("pay");
    expect(outcome.lawEffectStamps?.at(-1)?.governingLawKey).toBe(
      law.measureId,
    );
  }
  const exposure = paid.history.lawExposures?.find(
    (row) => row.personId === f.personId && row.sourceRecordId === terms.id,
  );
  expect(exposure?.measureId).toBe(law.measureId);
  expect(exposure?.recordedAt).toBe(outcomes[0]!.occurredAt);
  expect(
    settleTownCompensations(
      paid,
      outcomes.map((row) => ({
        payFlowId: row.resourceFlowId,
        activityId: row.resourceFlowId,
        stableKey: row.stableKey,
        periodStartsAt: row.periodStartsAt,
        periodEndsAt: row.periodEndsAt,
        onDate: row.occurredAt,
      })),
    ),
  ).toBe(paid);
});
