import {
  beginHistoricalPastMode,
  endHistoricalPastMode,
  distantHistoricalRoutine,
} from "./historical-past-mode";
import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkRole,
} from "./life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import {
  initializeOfficeSalaryFlows,
  initializeAllOfficeSalaryFlows,
  settleOfficeSalaries,
  settleAllOfficeSalaries,
} from "./office-salary";
import { settleTownCompensations } from "./living-world/town-pay";
import { workRoleAt } from "./life-queries";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcomes,
} from "./resources";
import { serializeWorld, deserializeWorld } from "./serialization";
import { assessPaycheckTaxes } from "./statutory-tax";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { personName, createLightweightPerson } from "./people";
import {
  withWorldIntegrityDeferred,
  createWorld,
  recordWorldEvent,
} from "./world";
import type { World, IsoDate } from "./types";

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

it("A37 preserves recorded employer cash over two office pay periods", () => {
  const f = officeFixture(sampled[0]!);
  const employer = {
    kind: "organization" as const,
    organizationId: f.work.organizationId!,
  };
  const currency = money(0, "USD").currency;
  expect(resourcePositionAt(f.world, employer, currency)).toBeUndefined();
  const funded = createResourcePosition(f.world, {
    stableKey: `fixture:a37:cash:${f.work.id}`,
    owner: employer,
    openedAt: f.world.currentDate,
    openingBalance: money(10_000_000, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit recorded government funding control; not an ordinary generated budget.",
    },
  });
  const before = atControlledDate(funded, addDays(f.flow.startsAt, 14));
  let shared = before;
  for (let week = 0; week < 2; week += 1) {
    const periodStartsAt = addDays(f.flow.startsAt, week * 7);
    const onDate = addDays(periodStartsAt, 7);
    shared = settleTownCompensations(shared, [
      {
        stableKey: `${f.flow.stableKey}:${periodStartsAt}`,
        payFlowId: f.flow.id,
        activityId: f.flow.id,
        periodStartsAt,
        periodEndsAt: addDays(onDate, -1),
        onDate,
        note: "Salary for the week.",
        provenance: f.flow.provenance,
      },
    ]);
  }
  const office = settleOfficeSalaries(before, f.personId);
  expect(serializeWorld(office)).toBe(serializeWorld(shared));
  const paid = office.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === f.flow.id,
  );
  expect(paid).toHaveLength(2);
  const grossMinor = paid.reduce(
    (total, row) => total + row.transferredAmount.minorUnits,
    0,
  );
  expect(
    resourcePositionAt(office, employer, currency)!.liquidBalance.minorUnits,
  ).toBe(10_000_000 - grossMinor);
  expect(settleOfficeSalaries(office, f.personId)).toBe(office);
  expect(
    serializeWorld(
      settleOfficeSalaries(
        deserializeWorld(serializeWorld(before)),
        f.personId,
      ),
    ),
  ).toBe(serializeWorld(office));
});
function officeFixture(placeKey: string, governor = false, date?: string) {
  const seed = `office-payroll:${placeKey}`;
  // These are authored office-period controls, not opening-population tests.
  const game = smallWorld({ place: placeKey, seed, date });
  const opened = game.world;
  if (opened.control.kind !== "person")
    throw new Error("Actual player required");
  const personId = opened.control.personId;
  let world = ensureNationalElectionJurisdiction(opened);
  // Explicit authored review work, through the canonical saved-work writers.
  // This is not an election or an ordinary appointment proof.
  const state = requireLifePlace(placeKey).stateJurisdictionKey!;
  const jurisdictionId = governor
    ? stateJurisdictionForKey(state)!.id
    : NATIONAL_ELECTION_JURISDICTION.id;
  const provenance = {
    kind: "authored" as const,
    note: "A37 fictional office-work payroll comparison.",
  };
  world = createOrganization(world, {
    stableKey: `fixture:a37:employer:${personId}`,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Review congressional office",
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `fixture:a37:office:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: governor
      ? "employment:executive-office"
      : "employment:congress-member",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Review member of Congress",
      occupationClassification: governor
        ? `service:${state.toLowerCase()}-governor`
        : "service:us-congress",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  const withoutPay = world;
  world = initializeOfficeSalaryFlows(world, personId);
  const flow = world.history.resourceFlows.find(
    (entry) =>
      entry.basisReference.kind === "work" &&
      entry.basisReference.workRelationshipId === work.id,
  )!;
  expect(flow).toBeDefined();
  expect(flow.startsAt).toBe(withoutPay.currentDate);
  expect(world.history.resourceTransferOutcomes).toEqual(
    withoutPay.history.resourceTransferOutcomes,
  );
  expect(initializeOfficeSalaryFlows(world, personId)).toBe(world);
  return { world, withoutPay, work, flow, personId, seed, placeKey };
}

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
          stableKey: `fixture:a37-context:${due.id}`,
          dueItemId: due.id,
          effectiveAt: world.currentDate,
          reasonKey: "fixture:office-payroll-context",
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

it.each(sampled)(
  "A37 preserves an actual saved review-office period through the one payroll in %s",
  (placeKey) => {
    const f = officeFixture(placeKey);
    const pay = resourceFlowTermsAt(f.world, f.flow.id)!.amount;
    // This is recorded fixture funding, not an inferred runtime government balance.
    f.world = createResourcePosition(f.world, {
      stableKey: `fixture:a37:sampled-cash:${f.flow.id}`,
      owner: f.flow.source,
      openedAt: f.world.currentDate,
      openingBalance: money(pay.minorUnits * 2, pay.currency),
      provenance: {
        kind: "authored",
        note: "Controlled saved government cash for the sampled office period and payroll costs; not an observed treasury balance.",
      },
    });
    const firstDue = addDays(f.flow.startsAt, 7);
    expect(
      settleOfficeSalaries(
        atControlledDate(f.world, addDays(firstDue, -1)),
        f.personId,
      ).history.resourceTransferOutcomes,
    ).toEqual(f.world.history.resourceTransferOutcomes);
    const before = atControlledDate(f.world, firstDue);
    const period = {
      stableKey: `${f.flow.stableKey}:${f.flow.startsAt}`,
      payFlowId: f.flow.id,
      activityId: f.flow.id,
      periodStartsAt: f.flow.startsAt,
      periodEndsAt: addDays(firstDue, -1),
      onDate: firstDue,
      note: "Salary for the week.",
      provenance: f.flow.provenance,
    };
    const office = settleOfficeSalaries(before, f.personId);
    const shared = settleTownCompensations(before, [period]);
    // Execute this on the old office writer before delegation, retaining the
    // same assertion afterwards. The entire canonical save must match.
    expect(serializeWorld(office)).toBe(serializeWorld(shared));
    const outcome = office.history.resourceTransferOutcomes.find(
      (entry) => entry.stableKey === period.stableKey,
    )!;
    expect(outcome.transferredAmount).toEqual(
      resourceFlowTermsAt(before, f.flow.id)!.amount,
    );
    expect(outcome.periodStartsAt).toBe(f.flow.startsAt);
    expect(outcome.periodEndsAt).toBe(addDays(firstDue, -1));
    expect(outcome.occurredAt).toBe(firstDue);
    expect(
      office.history.statutoryTaxLiabilities!.some(
        (entry) => entry.sourceOutcomeId === outcome.id,
      ),
    ).toBe(true);
    expect(settleOfficeSalaries(office, f.personId)).toBe(office);
    expect(settleTownCompensations(office, [period])).toBe(office);
    expect(
      serializeWorld(
        settleOfficeSalaries(
          deserializeWorld(serializeWorld(before)),
          f.personId,
        ),
      ),
    ).toBe(serializeWorld(office));
    const employer = {
      kind: "organization" as const,
      organizationId: f.work.organizationId!,
    };
    console.info("A37_OFFICE_PAYROLL", {
      seed: f.seed,
      placeKey,
      person: personName(office.people[f.personId]!),
      flowId: f.flow.id,
      grossMinor: outcome.transferredAmount.minorUnits,
      employeeBalanceMinor: resourcePositionAt(
        office,
        { kind: "person", personId: f.personId },
        outcome.transferredAmount.currency,
      )?.liquidBalance.minorUnits,
      employerBalanceMinor:
        resourcePositionAt(office, employer, outcome.transferredAmount.currency)
          ?.liquidBalance.minorUnits ?? null,
      fixture:
        "authored congressional work; existing published salary preserved, ordinary appointment not tested",
    });
  },
);

it("settles an overdue office period by its start role after a later nonoffice role and Save/Continue", () => {
  const f = officeFixture(sampled[0]!, true);
  const pay = resourceFlowTermsAt(f.world, f.flow.id)!.amount;
  let world = createResourcePosition(f.world, {
    stableKey: "overdue-office:funding",
    owner: f.flow.source,
    openedAt: f.world.currentDate,
    openingBalance: money(pay.minorUnits * 3, pay.currency),
    provenance: {
      kind: "authored",
      note: "Controlled funding from three saved weekly agreements.",
    },
  });
  const role = workRoleAt(world, f.work.id)!;
  world = atControlledDate(world, addDays(f.flow.startsAt, 7));
  world = recordWorkRole(world, {
    stableKey: "overdue-office:later-nonoffice",
    workRelationshipId: f.work.id,
    effectiveAt: world.currentDate,
    title: "Recorded nonoffice work",
    occupationClassification: null,
    locationJurisdictionId: role.locationJurisdictionId,
    timeDemand: role.timeDemand,
    supersedesRoleId: role.id,
    provenance: f.flow.provenance,
  });
  const before = atControlledDate(world, addDays(f.flow.startsAt, 14));
  const paid = settleAllOfficeSalaries(before);
  const outcomes = paid.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === f.flow.id,
  );
  expect(outcomes).toHaveLength(1);
  expect(outcomes[0]!.periodStartsAt).toBe(f.flow.startsAt);
  expect(outcomes[0]!.transferredAmount).toEqual(pay);
  expect(
    resourcePositionAt(paid, f.flow.source, pay.currency)!.liquidBalance
      .minorUnits,
  ).toBe(pay.minorUnits * 2);
  expect(settleAllOfficeSalaries(paid)).toBe(paid);
  const reloaded = deserializeWorld(serializeWorld(before));
  expect(serializeWorld(settleAllOfficeSalaries(reloaded))).toBe(
    serializeWorld(paid),
  );
});

it("resumes after out-of-order partial and blocked periods without changing held saves", () => {
  const f = officeFixture(sampled[0]!);
  // Both opening initializer paths prepare reads without creating payment facts.
  expect(serializeWorld(initializeAllOfficeSalaryFlows(f.withoutPay))).toBe(
    serializeWorld(f.world),
  );
  const pay = resourceFlowTermsAt(f.world, f.flow.id)!.amount;
  const funded = createResourcePosition(f.world, {
    stableKey: "office-period-index:funding",
    owner: f.flow.source,
    openedAt: f.world.currentDate,
    openingBalance: money(pay.minorUnits * 5, pay.currency),
    provenance: {
      kind: "authored",
      note: "Controlled cash for saved partial, blocked and subsequent office periods.",
    },
  });
  const held = initializeAllOfficeSalaryFlows(
    atControlledDate(funded, addDays(f.flow.startsAt, 21)),
  );
  const heldSave = serializeWorld(held);
  const withBlocked = recordResourceTransferOutcomes(held, [
    {
      stableKey: `${f.flow.stableKey}:${addDays(f.flow.startsAt, 7)}`,
      resourceFlowId: f.flow.id,
      periodStartsAt: addDays(f.flow.startsAt, 7),
      periodEndsAt: addDays(f.flow.startsAt, 13),
      occurredAt: addDays(f.flow.startsAt, 14),
      status: "blocked",
      attemptedAmount: pay,
      transferredAmount: money(0, pay.currency),
      reasonKind: "capacity:fixture-blocked",
      note: "Recorded blocked second week.",
      provenance: f.flow.provenance,
    },
  ]);
  // Prepare the appended prefix, then record an earlier period later in history.
  initializeAllOfficeSalaryFlows(withBlocked);
  const recorded = recordResourceTransferOutcomes(withBlocked, [
    {
      stableKey: `${f.flow.stableKey}:${f.flow.startsAt}`,
      resourceFlowId: f.flow.id,
      periodStartsAt: f.flow.startsAt,
      periodEndsAt: addDays(f.flow.startsAt, 6),
      occurredAt: addDays(f.flow.startsAt, 7),
      status: "partial",
      attemptedAmount: pay,
      transferredAmount: money(Math.floor(pay.minorUnits / 2), pay.currency),
      reasonKind: "capacity:fixture-partial",
      note: "Recorded partial first week, appended after the second week.",
      provenance: f.flow.provenance,
    },
  ]);
  const thirdStart = addDays(f.flow.startsAt, 14);
  const shared = settleTownCompensations(recorded, [
    {
      stableKey: `${f.flow.stableKey}:${thirdStart}`,
      payFlowId: f.flow.id,
      activityId: f.flow.id,
      periodStartsAt: thirdStart,
      periodEndsAt: addDays(f.flow.startsAt, 20),
      onDate: addDays(f.flow.startsAt, 21),
      note: "Salary for the week.",
      provenance: f.flow.provenance,
    },
  ]);
  const resumed = settleAllOfficeSalaries(recorded);
  expect(serializeWorld(resumed)).toBe(serializeWorld(shared));
  expect(
    resumed.history.resourceTransferOutcomes
      .filter((row) => row.resourceFlowId === f.flow.id)
      .map((row) => row.status),
  ).toEqual(["blocked", "partial", "completed"]);
  expect(settleAllOfficeSalaries(resumed)).toBe(resumed);
  expect(serializeWorld(settleAllOfficeSalaries(withBlocked))).toBe(
    serializeWorld(
      settleAllOfficeSalaries(deserializeWorld(serializeWorld(withBlocked))),
    ),
  );
  expect(
    serializeWorld(
      settleAllOfficeSalaries(deserializeWorld(serializeWorld(recorded))),
    ),
  ).toBe(serializeWorld(resumed));
  const heldSettled = settleAllOfficeSalaries(held);
  expect(
    heldSettled.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === f.flow.id,
    ),
  ).toHaveLength(3);
  expect(serializeWorld(held)).toBe(heldSave);
  expect(serializeWorld(heldSettled)).toBe(
    serializeWorld(settleAllOfficeSalaries(deserializeWorld(heldSave))),
  );
});

it("summarizes distant historical routine earnings and resumes ordinary payroll without duplicate pay", () => {
  const f = officeFixture(sampled[0]!, false, "2021-01-01");
  const farPlace = requireLifePlace(sampled.find((key) => key !== f.placeKey)!);
  const focus = createLightweightPerson({
    worldId: f.world.id,
    worldSeed: f.world.seed,
    index: f.world.personOrder.length,
    currentDate: f.world.currentDate,
    homeJurisdictionId: farPlace.context.jurisdiction.id,
  });
  // Admit a genuinely distant authored fixture resident through the same
  // person and World constructors; never rewrite a canonical residence fact.
  const admitted = createWorld({
    seed: f.world.seed,
    currentDate: f.world.currentDate,
    currentMoment: f.world.currentMoment,
    people: [...f.world.personOrder.map((id) => f.world.people[id]!), focus],
    jurisdictions: [
      ...f.world.jurisdictionOrder.map((id) => f.world.jurisdictions[id]!),
      farPlace.context.jurisdiction,
    ],
    policyCatalog: f.world.policyCatalog,
  });
  const focusId = focus.id;
  let initial: World = {
    ...f.world,
    control: { kind: "observer" },
    people: admitted.people,
    personOrder: admitted.personOrder,
    jurisdictions: admitted.jurisdictions,
    jurisdictionOrder: admitted.jurisdictionOrder,
  };
  initial = createResourcePosition(initial, {
    stableKey: "past-proof:employer-funds",
    owner: { kind: "organization", organizationId: f.work.organizationId! },
    openedAt: initial.currentDate,
    openingBalance: money(1_000_000_000, "USD"),
    provenance: {
      kind: "authored",
      note: "Controlled comparison account, not a population wage.",
    },
  });
  const through = addDays(initial.currentDate, 365);
  const past = beginHistoricalPastMode(initial, focusId, through);
  expect(distantHistoricalRoutine(past, f.personId)).toBe(true);
  expect(distantHistoricalRoutine(past, focusId)).toBe(false);
  const role = workRoleAt(past, f.work.id)!;
  const commutes = recordWorkRole(past, {
    stableKey: "past-proof:commutes-to-touched-town",
    workRelationshipId: f.work.id,
    effectiveAt: past.currentDate,
    title: role.title,
    occupationClassification: role.occupationClassification,
    locationJurisdictionId: focus.homeJurisdictionId,
    timeDemand: {
      ...role.timeDemand,
      locationJurisdictionId: focus.homeJurisdictionId,
    },
    provenance: {
      kind: "authored",
      note: "Controlled recorded commuting fixture.",
    },
    supersedesRoleId: role.id,
  });
  expect(distantHistoricalRoutine(commutes, f.personId)).toBe(false);
  const touched = recordWorldEvent(past, {
    stableKey: "past-proof:recorded-visit",
    type: "life.household-move",
    occurredAt: past.currentDate,
    recordedAt: past.currentDate,
    jurisdictionId: past.people[f.personId]!.homeJurisdictionId,
    involvedEntityIds: [focusId],
    participants: [
      { personId: focusId, role: "presence:participant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.household-move"],
    summary: "The authored fixture focus moved to the office holder's town.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  expect(distantHistoricalRoutine(touched, f.personId)).toBe(false);
  expect(
    distantHistoricalRoutine(
      deserializeWorld(serializeWorld(touched)),
      f.personId,
    ),
  ).toBe(false);
  const at = (world: World, days: number): World => {
    const date = addDays(initial.currentDate, days);
    return {
      ...world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
    };
  };
  const early = settleAllOfficeSalaries(at(past, 30));
  expect(early.history.resourceTransferOutcomes).toBe(
    initial.history.resourceTransferOutcomes,
  );
  const firstMonth = settleAllOfficeSalaries(at(past, 31));
  expect(
    firstMonth.history.resourceTransferOutcomes.filter((row) =>
      row.stableKey.startsWith(`past-office-summary:${f.flow.id}:`),
    ),
  ).toHaveLength(1);
  // Two actual controlled installments in the same distant month must retain
  // both money transfers without repeating the identical unknown authority.
  const installment = firstMonth.history.resourceTransferOutcomes.at(-1)!;
  const monthlyFlow = firstMonth.history.resourceFlows.find(
    (row) => row.id === installment.resourceFlowId,
  )!;
  const payAnotherInstallment = (historical: boolean) => {
    let next = createResourceFlow(firstMonth, {
      stableKey: historical
        ? "past-office-summary-flow:fixture:second-installment"
        : "fixture:ordinary-second-installment",
      source: monthlyFlow.source,
      recipient: monthlyFlow.recipient,
      startsAt: monthlyFlow.startsAt,
      amount: installment.transferredAmount,
      cadenceKind: "schedule:monthly",
      basisKind: historical
        ? "custom:historical-office-summary"
        : "custom:fixture-second-installment",
      basisReference: monthlyFlow.basisReference,
      restrictionKind: monthlyFlow.restrictionKind,
      jurisdictionId: monthlyFlow.jurisdictionId,
      provenance: monthlyFlow.provenance,
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcomes(next, [
      {
        stableKey: `${flow.stableKey}:payment`,
        resourceFlowId: flow.id,
        periodStartsAt: installment.periodStartsAt,
        periodEndsAt: installment.periodEndsAt,
        occurredAt: installment.occurredAt,
        status: installment.status,
        attemptedAmount: installment.transferredAmount,
        transferredAmount: installment.transferredAmount,
        reasonKind: "capacity:fixture-second-installment",
        note: "Controlled second salary installment for authority observation parity.",
        provenance: monthlyFlow.provenance,
      },
    ]);
    const paid = next.history.resourceTransferOutcomes.at(-1)!;
    return { world: assessPaycheckTaxes(next, paid.id), outcomeId: paid.id };
  };
  const compacted = payAnotherInstallment(true);
  expect(compacted.world.history.resourceTransferOutcomes.length).toBe(
    firstMonth.history.resourceTransferOutcomes.length + 1,
  );
  expect(compacted.world.history.statutoryTaxLiabilities).toBe(
    firstMonth.history.statutoryTaxLiabilities,
  );
  const ordinaryInstallment = payAnotherInstallment(false);
  expect(
    ordinaryInstallment.world.history.statutoryTaxLiabilities!.length,
  ).toBeGreaterThan(firstMonth.history.statutoryTaxLiabilities!.length);
  const compactReopened = deserializeWorld(serializeWorld(compacted.world));
  expect(
    serializeWorld(assessPaycheckTaxes(compactReopened, compacted.outcomeId)),
  ).toBe(serializeWorld(compactReopened));
  const ordinary = settleAllOfficeSalaries(at(initial, 365));
  const summarized = settleAllOfficeSalaries(at(past, 365));
  const outcomes = (world: World) =>
    world.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId === f.flow.id ||
        row.stableKey.startsWith(`past-office-summary:${f.flow.id}:`),
    );
  expect(outcomes(summarized)).toHaveLength(12);
  expect(
    outcomes(summarized).reduce(
      (sum, row) => sum + row.attemptedAmount.minorUnits,
      0,
    ),
  ).toBe(
    outcomes(ordinary).reduce(
      (sum, row) => sum + row.attemptedAmount.minorUnits,
      0,
    ),
  );
  expect(summarized.history.decisionTraces).toBe(
    initial.history.decisionTraces,
  );
  const reopened = deserializeWorld(serializeWorld(summarized));
  expect(serializeWorld(settleAllOfficeSalaries(reopened))).toBe(
    serializeWorld(summarized),
  );
  const finished = endHistoricalPastMode(summarized);
  expect(finished.pastMode).toBeUndefined();
  expect(finished.id).toBe(initial.id);
  expect(finished.history).toBe(summarized.history);
  const resumed = settleAllOfficeSalaries(at(finished, 372));
  expect(outcomes(resumed).length).toBeGreaterThan(outcomes(finished).length);
  expect(
    outcomes(resumed)
      .slice(outcomes(finished).length)
      .every(
        (row) => row.periodStartsAt > outcomes(finished).at(-1)!.periodEndsAt,
      ),
  ).toBe(true);
});
