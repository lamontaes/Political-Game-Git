import { afterEach, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import {
  createWorkRelationship,
  createWorkRelationships,
  recordWorkStatus,
} from "./life";
import {
  organizationProfileAt,
  workRelationshipHistoryForOrganization,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { TOWN_EMPLOYMENT_VERSION } from "./living-world/town-employment";
import {
  MINIMUM_WAGE_PAY_ROWS,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./law-consequences/pay-rows";
import {
  applyPayConsequence,
  PAY_REGISTRATION,
  resolvePayConsequences,
} from "./law-consequences/pay";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/automatic-legislation";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import { settleTownCompensations } from "./living-world/town-pay";
import * as lawEffects from "./enacted-law-effects";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "./law-consequence-registry";
import { personName } from "./people";
import {
  determineWorkPayCoverage,
  workPayCoverageAt,
  assertWorkPayCoverageIntegrity,
  initializeWorkPayCoverage,
} from "./pay-coverage";
import {
  matchPayCoveragePredicates,
  payWorkplaceAt,
} from "./pay-coverage-predicates";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
} from "./resources";
import { serializeWorld, deserializeWorld } from "./serialization";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { assertWorldIntegrity, withWorldIntegrityDeferred } from "./world";
import type { World } from "./types";

const canonicalDispatch = lawEffects.applyLawConsequences;
afterEach(() => vi.restoreAllMocks());

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

function fixture(placeKey = sampled[0]!) {
  const world = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `pay-coverage:${placeKey}`,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!.world;
  const work = world.history.workRelationships.find(
    (entry) =>
      entry.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
      entry.compensation === "paid" &&
      entry.organizationId &&
      workStatusAt(world, entry.id)?.status === "active",
  )!;
  expect(work).toBeDefined();
  return { world, work, role: workRoleAt(world, work.id)! };
}

function hireInput(f: ReturnType<typeof fixture>, stableKey: string) {
  return {
    stableKey,
    personId: f.work.personId,
    organizationId: f.work.organizationId,
    startedAt: f.world.currentDate,
    kind: f.work.kind,
    compensation: f.work.compensation,
    authority: f.work.authority,
    dependency: f.work.dependency,
    economicRisk: f.work.economicRisk,
    initialRole: {
      title: f.role.title,
      occupationClassification: f.role.occupationClassification,
      locationJurisdictionId: f.role.locationJurisdictionId,
      timeDemand: f.role.timeDemand,
    },
    provenance: {
      kind: "authored" as const,
      note: "Explicit job-writer hook control using actual saved worker, employer and role facts; not an ordinary new-job decision.",
    },
  };
}

it("records singular and batch actual hire coverage after the committed work, role and status, with reload parity", () => {
  const f = fixture();
  const input = hireInput(f, "fixture:coverage:single-hire");
  const single = createWorkRelationship(f.world, input);
  const work = single.history.workRelationships.at(-1)!;
  const coverage = workPayCoverageAt(single, work.id)!;
  expect(coverage.reason).toBe("hire");
  expect(coverage.sequence).toBeGreaterThan(
    workRoleAt(single, work.id)!.sequence,
  );
  expect(coverage.factRecordIds).toContain(workStatusAt(single, work.id)!.id);
  expect(determineWorkPayCoverage(single, [work.id], "hire")).toBe(single);
  expect(
    serializeWorld(
      createWorkRelationship(deserializeWorld(serializeWorld(f.world)), input),
    ),
  ).toBe(serializeWorld(single));
  const inputs = [
    hireInput(f, "fixture:coverage:batch-a"),
    hireInput(f, "fixture:coverage:batch-b"),
  ];
  const batch = createWorkRelationships(single, inputs);
  for (const job of batch.history.workRelationships.slice(-2)) {
    const record = workPayCoverageAt(batch, job.id)!;
    expect(record.reason).toBe("hire");
    expect(record.sequence).toBeGreaterThan(
      workRoleAt(batch, job.id)!.sequence,
    );
  }
  expect(
    serializeWorld(
      createWorkRelationships(deserializeWorld(serializeWorld(single)), inputs),
    ),
  ).toBe(serializeWorld(batch));
});

it("records an expected job only when its actual saved status becomes active, at a controlled date", () => {
  const f = fixture();
  const activeAt = addDays(f.world.currentDate, 1);
  let world = createWorkRelationship(f.world, {
    ...hireInput(f, "fixture:coverage:expected"),
    startedAt: activeAt,
    initialStatus: "expected",
  });
  const work = world.history.workRelationships.at(-1)!;
  expect(workPayCoverageAt(world, work.id)).toBeUndefined();
  world = withWorldIntegrityDeferred(() => {
    let next = world;
    for (const due of world.history.futureDueItems) {
      const state = futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      });
      if (state?.status === "scheduled" && due.dueAt <= activeAt)
        next = cancelFutureDueItem(next, {
          stableKey: `fixture:coverage:activation-clock:${due.id}`,
          dueItemId: due.id,
          effectiveAt: world.currentDate,
          reasonKey: "fixture:focused-activation",
          context:
            "Controlled activation date; ordinary clock scheduling is not proved.",
        });
    }
    return {
      ...next,
      currentDate: activeAt,
      currentMoment: simulationMomentOnLocalDate(next.currentMoment, activeAt),
    };
  });
  const input = {
    stableKey: "fixture:coverage:activated",
    workRelationshipId: work.id,
    effectiveAt: activeAt,
    status: "active" as const,
    reason: null,
    provenance: hireInput(f, "unused").provenance,
    supersedesStatusId: workStatusAt(world, work.id)!.id,
  };
  const activated = recordWorkStatus(world, input);
  expect(workPayCoverageAt(activated, work.id)).toMatchObject({
    reason: "hire",
    determinedAt: activeAt,
  });
  expect(
    serializeWorld(
      recordWorkStatus(deserializeWorld(serializeWorld(world)), input),
    ),
  ).toBe(serializeWorld(activated));
});

it("uses saved work-time or dated employer locations, and applies only the canonical federal floor to an absent press workplace", () => {
  const f = fixture();
  const employerPlace = organizationProfileAt(
    f.world,
    f.work.organizationId!,
  )!.locationJurisdictionId;
  expect(employerPlace).not.toBeNull();
  for (const withWorkTimePlace of [true, false]) {
    const input = hireInput(
      f,
      `fixture:coverage:workplace:${withWorkTimePlace}`,
    );
    const world = createWorkRelationship(f.world, {
      ...input,
      initialRole: {
        ...input.initialRole,
        locationJurisdictionId: null,
        timeDemand: {
          ...input.initialRole.timeDemand,
          locationJurisdictionId: withWorkTimePlace
            ? f.role.locationJurisdictionId
            : null,
        },
      },
    });
    const job = world.history.workRelationships.at(-1)!;
    expect(workPayCoverageAt(world, job.id)!.jurisdictionId).toBe(
      withWorkTimePlace ? f.role.locationJurisdictionId : employerPlace,
    );
  }
  let world = initializeWorkPayCoverage(f.world);
  const job = world.history.workRelationships.find((work) => {
    const record = workPayCoverageAt(world, work.id);
    return record?.jurisdictionId === null;
  })!;
  expect(job).toBeDefined();
  const coverage = workPayCoverageAt(world, job.id)!;
  expect(coverage.governingLaws).toContainEqual({
    questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    governingLawKey: `starting-law:US:${FEDERAL_MINIMUM_WAGE_QUESTION_KEY}`,
    origin: "in-force-at-start",
  });
  expect(coverage.factRecordIds).toContain(workRoleAt(world, job.id)!.id);
  expect(coverage.factRecordIds).toContain(
    organizationProfileAt(world, job.organizationId!)!.id,
  );
  world = createWorkCompensation(world, {
    stableKey: "fixture:coverage:unlocated-pay",
    workRelationshipId: job.id,
    startsAt: world.currentDate,
    amount: money(100, "USD"),
    cadenceKind: "schedule:town-weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: hireInput(f, "unused").provenance,
  });
  const question = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = MINIMUM_WAGE_PAY_ROWS[FEDERAL_MINIMUM_WAGE_QUESTION_KEY]!;
  world = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [question.id]: { ...question, consequences: [row] },
      },
    },
  };
  const flow = world.history.resourceFlows.at(-1)!;
  const stateQuestion = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const stateRow = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
  world = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [stateQuestion.id]: { ...stateQuestion, consequences: [stateRow] },
      },
    },
  };
  const context = {
    onDate: world.currentDate,
    activity: "payroll" as const,
    activityId: flow.id,
    subjectIds: [job.personId],
  };
  expect(resolvePayConsequences(world, stateRow, context)).toEqual([]);
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    question.id,
  )!;
  expect(law.level).toBe("federal-statute");
  expect(law.answer).toBe("no");
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    termKey: "floor",
    unit: "minor/hour",
  })!;
  expect(term).not.toBeNull();
  const resolved = resolvePayConsequences(world, row, context);
  expect(resolved).toHaveLength(1);
  expect(resolved[0]!.jurisdictionId).toBe(NATIONAL_ELECTION_JURISDICTION.id);
  expect(resolved[0]!.law).toEqual(law);
  expect(resolved[0]!.value).toMatchObject({ value: term.value });
  expect(resolved[0]!.sourceRecordIds).toContain(coverage.id);
  const raised = applyPayConsequence(world, resolved[0]!);
  const terms = resourceFlowTermsAt(raised, flow.id)!;
  expect(terms.amount.minorUnits).toBeGreaterThan(100);
  expect(terms.lawEffectStamps![0]!.governingLawKey).toBe(law.measureId);
  expect(workPayCoverageAt(raised, job.id)!.jurisdictionId).toBeNull();
  expect(applyPayConsequence(raised, resolved[0]!)).toBe(raised);
  expect(
    serializeWorld(
      applyPayConsequence(
        deserializeWorld(serializeWorld(world)),
        resolved[0]!,
      ),
    ),
  ).toBe(serializeWorld(raised));
  const employer = {
    kind: "organization" as const,
    organizationId: job.organizationId!,
  };
  let before = raised;
  if (!resourcePositionAt(before, employer, terms.amount.currency))
    before = createResourcePosition(before, {
      stableKey: `fixture:coverage:press-cash:${job.organizationId}`,
      owner: employer,
      openedAt: context.onDate,
      openingBalance: money(10_000_000, "USD"),
      provenance: hireInput(f, "unused").provenance,
    });
  const payday = addDays(context.onDate, 6);
  before = withWorldIntegrityDeferred(() => {
    let next = before;
    for (const due of before.history.futureDueItems) {
      const state = futureDueItemStateAt(before, due.id, {
        asOfDate: before.currentDate,
        historySequenceExclusive: before.history.nextSequence,
      });
      if (state?.status === "scheduled" && due.dueAt < payday)
        next = cancelFutureDueItem(next, {
          stableKey: `fixture:coverage:pay-context:${due.id}`,
          dueItemId: due.id,
          effectiveAt: context.onDate,
          reasonKey: "fixture:focused-payroll",
          context:
            "Controlled period context, not terminal opening or clock proof.",
        });
    }
    return {
      ...next,
      currentDate: payday,
      currentMoment: simulationMomentOnLocalDate(next.currentMoment, payday),
    };
  });
  const period = {
    payFlowId: flow.id,
    activityId: flow.id,
    stableKey: `fixture:coverage:press-period:${flow.id}`,
    periodStartsAt: context.onDate,
    periodEndsAt: payday,
    onDate: payday,
  };
  const registrations = [...LAW_CONSEQUENCE_REGISTRATIONS, PAY_REGISTRATION];
  vi.spyOn(lawEffects, "applyLawConsequences").mockImplementation(
    (next, activity) => canonicalDispatch(next, activity, registrations),
  );
  const paid = settleTownCompensations(before, [period]);
  const played = settleTownCompensations(
    { ...before, control: { kind: "person", personId: job.personId } },
    [period],
  );
  expect(played.history).toEqual(paid.history);
  const payment = paid.history.resourceTransferOutcomes.find(
    (entry) => entry.resourceFlowId === flow.id,
  )!;
  expect(payment.transferredAmount).toEqual(terms.amount);
  expect(payment.lawEffectStamps![0]!.governingLawKey).toBe(law.measureId);
  expect(payment.lawEffectStamps![0]!.sourceRecordIds).toContain(coverage.id);
  expect(settleTownCompensations(paid, [period])).toBe(paid);
  expect(
    serializeWorld(
      settleTownCompensations(deserializeWorld(serializeWorld(before)), [
        period,
      ]),
    ),
  ).toBe(serializeWorld(paid));
  console.info("PAY_NULL_WORKPLACE_FEDERAL", {
    person: personName(paid.people[job.personId]!),
    workId: job.id,
    workplace: workPayCoverageAt(paid, job.id)!.jurisdictionId,
    governingLawKey: law.measureId,
    hourlyMinor: term.value,
    grossMinor: payment.transferredAmount.minorUnits,
    controlledPayroll: true,
  });
});

it.each(sampled)(
  "records the standard default from actual dated job facts once in %s, preserving old saves and repeat",
  (placeKey) => {
    const f = fixture(placeKey);
    const recorded = determineWorkPayCoverage(
      f.world,
      [f.work.id, f.work.id],
      "opening",
    );
    const record = workPayCoverageAt(recorded, f.work.id)!;
    const prior = workPayCoverageAt(f.world, f.work.id);
    expect(recorded.history.workPayCoverageDeterminations).toHaveLength(
      (f.world.history.workPayCoverageDeterminations?.length ?? 0) +
        (prior ? 0 : 1),
    );
    expect(record).toMatchObject({
      workRelationshipId: f.work.id,
      personId: f.work.personId,
      employerOrganizationId: f.work.organizationId,
      workRoleId: f.role.id,
      jurisdictionId: f.role.locationJurisdictionId,
      determinedAt: f.world.currentDate,
      reason: prior?.reason ?? "opening",
      defaultCategory: "standard",
      exceptions: [],
    });
    expect(record.factRecordIds).toContain(f.work.id);
    expect(record.factRecordIds).toContain(f.role.id);
    expect(record.sources).toContain(
      "https://www.dol.gov/agencies/whd/fact-sheets/14-flsa-coverage",
    );
    expect("amount" in record).toBe(false);
    expect(determineWorkPayCoverage(recorded, [f.work.id], "hire")).toBe(
      recorded,
    );
    expect(
      serializeWorld(
        determineWorkPayCoverage(
          deserializeWorld(serializeWorld(f.world)),
          [f.work.id],
          "opening",
        ),
      ),
    ).toBe(serializeWorld(recorded));
    expect(
      workPayCoverageAt(recorded, f.work.id, {
        asOfDate: addDays(record.determinedAt, -1),
        historySequenceExclusive: recorded.history.nextSequence,
      }),
    ).toBeUndefined();
    const forged: World = {
      ...recorded,
      history: {
        ...recorded.history,
        workPayCoverageDeterminations: [
          {
            ...record,
            personId: f.world.personOrder.find((id) => id !== f.work.personId)!,
          },
        ],
      },
    };
    expect(() => assertWorkPayCoverageIntegrity(forged)).toThrow(
      "actual dated work facts",
    );
    for (const malformed of [
      { ...record, id: f.work.id },
      { ...record, stableKey: `${record.stableKey}:forged` },
    ]) {
      expect(() =>
        assertWorkPayCoverageIntegrity({
          ...recorded,
          history: {
            ...recorded.history,
            workPayCoverageDeterminations: [malformed],
          },
        }),
      ).toThrow("canonical stable key");
    }
    const ids = new Set([f.work.id]);
    assertWorkPayCoverageIntegrity(recorded, ids);
    expect(ids.has(record.id)).toBe(true);
    // The producer has already validated/cached these records. Identity must
    // still reject an ID registered by a different history family.
    expect(() =>
      assertWorkPayCoverageIntegrity(recorded, new Set([record.id])),
    ).toThrow("Duplicate world entity ID");
    expect(() =>
      assertWorkPayCoverageIntegrity({
        ...recorded,
        history: {
          ...recorded.history,
          workPayCoverageDeterminations: [record, record],
        },
      }),
    ).toThrow("Duplicate world entity ID");
    const event = recorded.history.events[0]!;
    expect(event).toBeDefined();
    expect(() =>
      assertWorldIntegrity({
        ...recorded,
        history: {
          ...recorded.history,
          nextSequence: recorded.history.nextSequence + 1,
          events: [
            ...recorded.history.events,
            {
              ...event,
              id: record.id,
              stableKey: `${event.stableKey}:forged-coverage-collision`,
              sequence: recorded.history.nextSequence,
            },
          ],
        },
      }),
    ).toThrow(/Duplicate.*ID/);
  },
);

it.each(sampled)(
  "initializes every actual active paid opening job once in %s",
  (placeKey) => {
    const f = fixture(placeKey);
    const actual = f.world.history.workRelationships.filter(
      (work) =>
        work.organizationId &&
        (work.compensation === "paid" || work.compensation === "mixed") &&
        workStatusAt(f.world, work.id)?.status === "active",
    );
    const initialized = initializeWorkPayCoverage(f.world);
    for (const work of actual) {
      const role = workRoleAt(f.world, work.id);
      if (!role?.locationJurisdictionId) {
        const record = workPayCoverageAt(initialized, work.id)!;
        expect(record.factRecordIds).toContain(role!.id);
        const workplace = payWorkplaceAt(f.world, work.id, {
          asOfDate: f.world.currentDate,
          historySequenceExclusive: f.world.history.nextSequence,
        });
        expect(record.jurisdictionId).toBe(workplace.jurisdictionId);
        if (!workplace.jurisdictionId)
          expect(record.governingLaws).toContainEqual({
            questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
            governingLawKey: `starting-law:US:${FEDERAL_MINIMUM_WAGE_QUESTION_KEY}`,
            origin: "in-force-at-start",
          });
      }
    }
    expect(initialized.history.workPayCoverageDeterminations).toHaveLength(
      actual.length,
    );
    expect(
      new Set(
        initialized.history.workPayCoverageDeterminations!.map(
          (record) => record.workRelationshipId,
        ),
      ),
    ).toEqual(new Set(actual.map((work) => work.id)));
    expect(initializeWorkPayCoverage(initialized)).toBe(initialized);
    expect(
      serializeWorld(
        initializeWorkPayCoverage(deserializeWorld(serializeWorld(f.world))),
      ),
    ).toBe(serializeWorld(initialized));
  },
);

it("selects only a canonical saved-classification scope and sends the actual determination into the pay binding", () => {
  const f = fixture();
  const profile = organizationProfileAt(f.world, f.work.organizationId!)!;
  const proposition = Object.values(f.world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const standard = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
  const exception = {
    ...standard,
    id: `${standard.id}:fixture-classification`,
    who: {
      ...standard.who,
      predicates: [
        {
          capability: "pay-employer-classification",
          parameters: { value: profile.classification },
        },
      ],
    },
    evidence: {
      ...standard.evidence,
      sourceIds: ["fixture:classification-scope-control"],
      scope:
        "Explicit authored scope control, not a real state exemption or a researched exception rate.",
    },
  };
  let world: World = {
    ...f.world,
    policyCatalog: {
      ...f.world.policyCatalog,
      propositions: {
        ...f.world.policyCatalog.propositions,
        [proposition.id]: {
          ...proposition,
          consequences: [standard, exception],
        },
      },
    },
  };
  world = createWorkCompensation(world, {
    stableKey: "fixture:coverage-pay",
    workRelationshipId: f.work.id,
    startsAt: world.currentDate,
    amount: money(100, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: "Explicit below-floor scope control, not population pay.",
    },
  });
  const flow = world.history.resourceFlows.at(-1)!;
  world = determineWorkPayCoverage(world, [f.work.id], "hire");
  const record = workPayCoverageAt(world, f.work.id)!;
  expect(record.exceptions).toHaveLength(1);
  expect(record.exceptions[0]!).toMatchObject({
    questionKey: proposition.stableKey,
    rowId: exception.id,
  });
  expect(record.exceptions[0]!.factRecordIds).toContain(profile.id);
  const context = {
    onDate: world.currentDate,
    activity: "payroll" as const,
    activityId: flow.id,
    subjectIds: [f.work.personId],
  };
  expect(resolvePayConsequences(world, standard, context)).toEqual([]);
  const resolved = resolvePayConsequences(world, exception, context);
  expect(resolved).toHaveLength(1);
  expect(resolved[0]!.sourceRecordIds).toContain(record.id);
  expect(resolved[0]!.sourceRecordIds).toContain(profile.id);
  expect(
    resolvePayConsequences(
      deserializeWorld(serializeWorld(world)),
      exception,
      context,
    ),
  ).toEqual(resolved);
  expect(() =>
    matchPayCoveragePredicates(
      world,
      f.work.id,
      [{ capability: "pay-job-title", parameters: { value: f.role.title } }],
      {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
    ),
  ).toThrow("Missing pay predicate capability");
});

it("counts actual paid people at the historical employer, without double-counting a second job or admitting future hires", () => {
  const f = fixture();
  const cutoff = {
    asOfDate: f.world.currentDate,
    historySequenceExclusive: f.world.history.nextSequence,
  };
  const active = workRelationshipHistoryForOrganization(
    f.world,
    f.work.organizationId!,
    cutoff,
  ).filter(
    (entry) =>
      (entry.compensation === "paid" || entry.compensation === "mixed") &&
      workStatusAt(f.world, entry.id, cutoff)?.status === "active",
  );
  const count = new Set(active.map((entry) => entry.personId)).size;
  const predicate = {
    capability: "pay-employer-workforce-at-most",
    parameters: { count },
  };
  expect(
    matchPayCoveragePredicates(f.world, f.work.id, [predicate], cutoff).matches,
  ).toBe(true);
  const hire = (world: World, personId = f.work.personId, key = "second-job") =>
    createWorkRelationship(world, {
      stableKey: `fixture:coverage:${key}`,
      personId,
      organizationId: f.work.organizationId!,
      startedAt: world.currentDate,
      kind: f.work.kind,
      compensation: "paid",
      authority: f.work.authority,
      dependency: f.work.dependency,
      economicRisk: f.work.economicRisk,
      initialRole: {
        title: f.role.title,
        occupationClassification: f.role.occupationClassification,
        locationJurisdictionId: f.role.locationJurisdictionId,
        timeDemand: f.role.timeDemand,
      },
      provenance: {
        kind: "authored",
        note: "Explicit saved hiring control, not an invented production employee count.",
      },
    });
  const second = hire(f.world);
  expect(
    matchPayCoveragePredicates(second, f.work.id, [predicate], {
      ...cutoff,
      historySequenceExclusive: second.history.nextSequence,
    }).matches,
  ).toBe(true);
  const other = f.world.personOrder.find(
    (id) => !active.some((entry) => entry.personId === id),
  )!;
  const hired = hire(second, other, "new-person");
  expect(
    matchPayCoveragePredicates(hired, f.work.id, [predicate], cutoff).matches,
  ).toBe(true);
  expect(
    matchPayCoveragePredicates(hired, f.work.id, [predicate], {
      ...cutoff,
      historySequenceExclusive: hired.history.nextSequence,
    }).matches,
  ).toBe(false);
  const work = hired.history.workRelationships.at(-1)!;
  const recorded = determineWorkPayCoverage(hired, [work.id], "hire");
  expect(workPayCoverageAt(recorded, work.id)!.reason).toBe("hire");
});
