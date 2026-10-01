import { expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { addDays, daysBetween, simulationMomentOnLocalDate } from "./dates";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkRole,
} from "./life";
import { stateJurisdictionForKey } from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { initializeOfficeSalaryFlows } from "./office-salary";
import { paidOfficeOf, PAY_LAW_FIELD } from "./office-pay";
import {
  fileRuleChangeProvision,
  officePayLawOfficeKey,
  enactedRuleChangeAt,
  type RuleChangeApplicability,
} from "./enacted-rule-changes";
import {
  introduceMeasure,
  referMeasure,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  recordExecutiveAction,
  recordEnactment,
  measurePosition,
} from "./legislation";
import {
  legislativeBlueprint,
  seatBodyForPack,
  committeeMembers,
  dispositionsFromCounts,
  authoredScenarioSeatCount,
} from "./legislation-scenarios";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { withWorldIntegrityDeferred } from "./world";
import { createResourcePosition, money } from "./resources";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import {
  applyLawPayConsequence,
  settleTownCompensations,
} from "./living-world/town-pay";
import { serializeWorld, deserializeWorld } from "./serialization";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { personName } from "./people";
import { lawInForce } from "./governing/law-in-force";
import { applyLawConsequences } from "./enacted-law-effects";
import {
  MINIMUM_WAGE_PAY_ROWS,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./law-consequences/pay-rows";
import type { ResolvedAnnualOfficePayConsequence } from "./law-consequence-types";
import type { World, IsoDate, EntityId } from "./types";
const provenance = {
  method: "authored-fixture" as const,
  sourceEntityIds: [] as readonly EntityId[],
  note: "Explicit fixture ballots; not elected-person decisions.",
};

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  if ((places.get(key.slice(0, 2))?.[1] ?? -1) < Number(count))
    places.set(key.slice(0, 2), [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
expect(places.size).toBe(56);
const pool = [...places.values()].map(([key]) => key);
const rng = new SeededRng("pay-kind-five-places");
const sampled = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
);

function atControlledDate(world: World, date: IsoDate): World {
  return withWorldIntegrityDeferred(() => {
    let next = world;
    for (const due of world.history.futureDueItems) {
      const state = futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      });
      if (state?.status === "scheduled" && due.dueAt < date)
        next = cancelFutureDueItem(next, {
          stableKey: `fixture:annual-office-context:${due.id}`,
          dueItemId: due.id,
          effectiveAt: world.currentDate,
          reasonKey: "fixture:annual-office-context",
          context:
            "Controlled existing office period parity; not an ordinary clock or election proof.",
        });
    }
    return {
      ...next,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
    };
  });
}

function enact(
  start: World,
  ordinal: number,
  annualDollars: number,
  applicability: RuleChangeApplicability,
): World {
  const pack = legislativeBlueprint(
    "institution:us-oh-general-assembly-v1",
  ).pack;
  const state = stateJurisdictionForKey("US-OH")!;
  const prefix = `pay-term-fixture:${ordinal}`;
  let world = introduceMeasure(start, {
    stableKey: `${prefix}:measure`,
    jurisdictionId: state.id,
    rulePackId: pack.packId,
    designation: `HB ${900 + ordinal}`,
    shortTitle: "Controlled recorded office salary",
    summary:
      "Explicit canonical procedure and typed-term control, not a real enacted 2026 law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: start.personOrder[0]!,
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [],
    propositionAnswers: [],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: `${prefix}:office-salary-clause`,
    measureId,
    officeKey: officePayLawOfficeKey("OH"),
    field: "pay.governor.annualDollars",
    value: annualDollars,
    applicability,
  });
  for (const chamberKey of pack.chamberOrder) {
    const chamber = pack.chambers.find(
      (entry) => entry.chamberKey === chamberKey,
    )!;
    const body = seatBodyForPack(
      chamberKey,
      chamber.name,
      authoredScenarioSeatCount(pack, chamberKey),
      [],
      false,
    );
    const committee = chamber.committees[0]!;
    world = referMeasure(world, {
      stableKey: `${prefix}:${chamberKey}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: `${prefix}:${chamberKey}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers, nay: 0 },
      ),
      rationale: "Explicit authored fixture approval.",
      provenance,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${prefix}:${chamberKey}:calendar`,
      measureId,
    });
    for (const stage of chamber.floorStages) {
      const until = measurePosition(world, measureId).earliestNextFloorDate;
      if (until && until > world.currentDate)
        world = atControlledDate(world, until);
      world = takeFloorVote(world, {
        stableKey: `${prefix}:${chamberKey}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
          nay: 0,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance,
      });
    }
    if (chamberKey !== pack.chamberOrder.at(-1))
      world = transmitMeasure(world, {
        stableKey: `${prefix}:transmit`,
        measureId,
      });
  }
  world = enrollMeasure(world, { stableKey: `${prefix}:enroll`, measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: `${prefix}:present`,
    measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: `${prefix}:signed`,
    measureId,
    action: "signed",
    rationale: "Explicit authored fixture signature.",
  });
  return recordEnactment(world, {
    stableKey: `${prefix}:enacted`,
    measureId,
    actDesignation: `Controlled Act ${ordinal}`,
    effectiveAt: world.currentDate,
  });
}

function fixture(
  placeKey: string,
  applicability: RuleChangeApplicability = {
    appliesTo: null,
    countsPriorService: null,
  },
) {
  const seed = `office-annual:${placeKey}`;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  if (game.world.control.kind !== "person")
    throw new Error("Actual named person required");
  const personId = game.world.control.personId;
  const state = stateJurisdictionForKey("US-OH")!;
  let world = ensureJurisdiction(game.world, state);
  const authored = {
    kind: "authored" as const,
    note: "Explicit review work in an Ohio office, not an election or a residence proxy.",
  };
  world = createOrganization(world, {
    stableKey: `fixture:annual:office:${personId}`,
    formedAt: world.currentDate,
    provenance: authored,
    initialProfile: {
      name: "Review Ohio governor office",
      classification: "sector:government",
      locationJurisdictionId: state.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `fixture:annual:work:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Review Ohio governor",
      occupationClassification: "service:us-oh-governor",
      locationJurisdictionId: state.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 30 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: state.id,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  world = initializeOfficeSalaryFlows(world, personId);
  const flow = world.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === work.id,
  )!;
  const initial = resourceFlowTermsAt(world, flow.id)!;
  world = createResourcePosition(world, {
    stableKey: `fixture:annual:funding:${work.id}`,
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(10_000_000, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit funded payroll control; not ordinary government revenue.",
    },
  });
  // This authored law begins after the recorded office term began.
  world = atControlledDate(world, addDays(world.currentDate, 1));
  world = enact(world, 1, 52_000, applicability);
  const clause = world.history.ruleChangeProvisions!.at(-1)!;
  const enactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === clause.measureId,
  )!;
  const change = enactedRuleChangeAt(world, {
    stateUsps: clause.stateUsps,
    officeKey: clause.officeKey,
    field: clause.field,
    onDate: world.currentDate,
  })!;
  const startsAt = addDays(
    flow.startsAt,
    Math.ceil(daysBetween(flow.startsAt, world.currentDate) / 7) * 7,
  );
  world = atControlledDate(world, startsAt);
  const resolved: ResolvedAnnualOfficePayConsequence = {
    rowId: `office-pay:${clause.field}`,
    jurisdictionId: state.id,
    personId,
    workId: work.id,
    payFlowId: flow.id,
    activityId: flow.id,
    effectiveAt: startsAt,
    amount: { value: 5_200_000, unit: "minor", currency: "USD" },
    action: "set-annual-office-salary",
    sourceRecordIds: [clause.id, enactment.id],
    authority: {
      kind: "enacted-office-rule",
      ruleChangeProvisionId: clause.id,
      enactmentId: enactment.id,
      measureId: clause.measureId,
      officeKey: clause.officeKey,
      stateUsps: clause.stateUsps,
      field: clause.field,
      operativeAt: change.operativeAt,
      applicability: change.applicability,
    },
  };
  return {
    world,
    resolved,
    work,
    flow,
    initial,
    clause,
    enactment,
    personId,
    seed,
    placeKey,
  };
}

it.each(sampled)(
  "A38 converts actual office rule authority to a named person's annual salary in %s",
  (placeKey) => {
    const f = fixture(placeKey);
    expect(() =>
      applyLawPayConsequence(f.world, {
        ...f.resolved,
        amount: { ...f.resolved.amount, value: 5_300_000 },
      }),
    ).toThrow(/actual-operative-binding/);
    expect(() =>
      applyLawPayConsequence(f.world, {
        ...f.resolved,
        sourceRecordIds: [f.clause.id],
      }),
    ).toThrow(/actual-operative-binding/);
    const revised = applyLawPayConsequence(f.world, f.resolved);
    const terms = resourceFlowTermsAt(revised, f.flow.id)!;
    expect(terms.amount.minorUnits).toBe(100_000);
    expect(terms.amount.minorUnits).toBeLessThan(f.initial.amount.minorUnits);
    expect(terms.lawEffectStamps![0]).toMatchObject({
      effectKind: "pay",
      questionKey: null,
      governingLawKey: f.clause.measureId,
      ruleAuthority: {
        ruleChangeProvisionId: f.clause.id,
        enactmentId: f.enactment.id,
        field: f.clause.field,
      },
    });
    expect(terms.lawEffectStamps![0]!.sourceRecordIds).toEqual(
      expect.arrayContaining([
        f.work.id,
        f.flow.id,
        f.clause.id,
        f.enactment.id,
      ]),
    );
    expect(
      resourceFlowTermsAt(revised, f.flow.id, {
        asOfDate: f.flow.startsAt,
        historySequenceExclusive: revised.history.nextSequence,
      })!.id,
    ).toBe(f.initial.id);
    expect(applyLawPayConsequence(revised, f.resolved)).toBe(revised);
    expect(
      serializeWorld(
        applyLawPayConsequence(
          deserializeWorld(serializeWorld(f.world)),
          f.resolved,
        ),
      ),
    ).toBe(serializeWorld(revised));
    console.info("ANNUAL_OFFICE_TERMS", {
      seed: f.seed,
      placeKey,
      person: personName(revised.people[f.personId]!),
      workplace: f.clause.stateUsps,
      annualMinor: f.resolved.amount.value,
      weeklyMinor: terms.amount.minorUnits,
      clauseId: f.clause.id,
      enactmentId: f.enactment.id,
      questionKey: terms.lawEffectStamps![0]!.questionKey,
    });
    const payday = addDays(f.resolved.effectiveAt, 7);
    const before = atControlledDate(revised, payday);
    const period = {
      stableKey: `${f.flow.stableKey}:${f.resolved.effectiveAt}`,
      payFlowId: f.flow.id,
      activityId: f.flow.id,
      periodStartsAt: f.resolved.effectiveAt,
      periodEndsAt: addDays(payday, -1),
      onDate: payday,
      note: "Salary for the week.",
      provenance: f.flow.provenance,
    };
    const wageQuestion = Object.values(before.policyCatalog.propositions).find(
      (row) => row.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
    )!;
    const wageLaw = lawInForce(
      before,
      f.resolved.jurisdictionId,
      wageQuestion.id,
      period.periodStartsAt,
    );
    console.info("ANNUAL_PAYROLL_BOUNDARY", {
      seed: f.seed,
      placeKey,
      person: personName(before.people[f.personId]!),
      activity: "payroll",
      activityId: period.activityId,
      onDate: period.periodStartsAt,
      subjectIds: [f.personId],
      workId: f.work.id,
      rowId: MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!.id,
      questionKey: wageQuestion.stableKey,
      termKey: "target",
      unit: "minor/hour",
      wageLaw,
    });
    const paid = settleTownCompensations(before, [period]);
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.stableKey === period.stableKey,
    )!;
    expect(outcome.transferredAmount.minorUnits).toBe(100_000);
    expect(outcome.lawEffectStamps![0]!.effectKind).toBe("pay");
    expect(outcome.lawEffectStamps![0]!.ruleAuthority).toEqual(
      terms.lawEffectStamps![0]!.ruleAuthority,
    );
    expect(
      paid.history.statutoryTaxLiabilities!.some(
        (row) => row.sourceOutcomeId === outcome.id,
      ),
    ).toBe(true);
    expect(
      resourcePositionAt(
        paid,
        { kind: "organization", organizationId: f.work.organizationId! },
        terms.amount.currency,
      )!.liquidBalance.minorUnits,
    ).toBe(9_900_000);
    expect(settleTownCompensations(paid, [period])).toBe(paid);
    expect(
      serializeWorld(
        settleTownCompensations(deserializeWorld(serializeWorld(before)), [
          period,
        ]),
      ),
    ).toBe(serializeWorld(paid));
  },
);

it("A38 refuses a salary change limited to terms beginning after its date", () => {
  const f = fixture(sampled[0]!, {
    appliesTo: "terms-beginning-after",
    countsPriorService: null,
  });
  expect(() => applyLawPayConsequence(f.world, f.resolved)).toThrow(
    /actual-operative-binding/,
  );
});

it("A38 reads the actual office role at the earlier payroll date", () => {
  const f = fixture(sampled[0]!);
  const earlier = {
    asOfDate: f.resolved.effectiveAt,
    historySequenceExclusive: f.world.history.nextSequence,
  };
  const oldRole = f.world.history.workRoles.find(
    (row) => row.workRelationshipId === f.work.id,
  )!;
  const laterDate = addDays(f.world.currentDate, 7);
  const laterJurisdiction = stateJurisdictionForKey("US-NJ")!;
  let changed = ensureJurisdiction(
    atControlledDate(f.world, laterDate),
    laterJurisdiction,
  );
  changed = recordWorkRole(changed, {
    stableKey: `fixture:annual:later-role:${f.work.id}`,
    workRelationshipId: f.work.id,
    effectiveAt: laterDate,
    title: "Later review New Jersey office role",
    occupationClassification: "service:us-nj-governor",
    locationJurisdictionId: laterJurisdiction.id,
    timeDemand: {
      ...oldRole.timeDemand,
      locationJurisdictionId: laterJurisdiction.id,
    },
    provenance: {
      kind: "authored",
      note: "Explicit later role for historical-read regression; not an election.",
    },
    supersedesRoleId: oldRole.id,
  });
  expect(paidOfficeOf(changed, f.work)!.state).toBe("NJ");
  const dated = paidOfficeOf(changed, f.work, {
    ...earlier,
    historySequenceExclusive: changed.history.nextSequence,
  })!;
  expect(dated.state).toBe("OH");
  expect(PAY_LAW_FIELD[dated.office]).toBe(f.clause.field);
  const revised = applyLawPayConsequence(changed, f.resolved);
  expect(resourceFlowTermsAt(revised, f.flow.id)!.amount.minorUnits).toBe(
    100_000,
  );
});

it("A38 dispatches the actual office measure through the default pay registration", () => {
  const f = fixture(sampled[0]!);
  const context = {
    onDate: f.resolved.effectiveAt,
    activity: "payroll" as const,
    activityId: f.flow.id,
    subjectIds: [f.personId],
    governingLawId: f.clause.measureId,
  };
  // This real measure filter isolates registration proof. The separate five
  // paycheck cases still exercise all laws and retain the missing wage failure.
  const revised = applyLawConsequences(f.world, context);
  const terms = resourceFlowTermsAt(revised, f.flow.id)!;
  expect(terms.amount.minorUnits).toBe(100_000);
  expect(terms.lawEffectStamps![0]!.questionKey).toBeNull();
  expect(terms.lawEffectStamps![0]!.ruleAuthority!.ruleChangeProvisionId).toBe(
    f.clause.id,
  );
  expect(applyLawConsequences(revised, context)).toBe(revised);
  expect(
    serializeWorld(
      applyLawConsequences(deserializeWorld(serializeWorld(f.world)), context),
    ),
  ).toBe(serializeWorld(revised));
});
