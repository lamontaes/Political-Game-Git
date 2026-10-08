import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { addDays, daysBetween } from "./dates";
import { PUBLIC_PROGRAM_INSTALLMENT } from "./governing/public-program";
import { stableHash } from "./ids";
import {
  createOrganization,
  createWorkRelationship,
  createHousehold,
  startHouseholdMembership,
  recordHouseholdMembershipState,
} from "./life";
import { householdMembershipsAt } from "./life-queries";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { createCharacterHistoryContextPeople } from "./character-history";
import {
  SUBSTANCE_USE_DISORDER_KEY,
  holdsPackCondition,
} from "./crisis/condition-pack";
import {
  MORTALITY_WINDOW_KEY,
  ensureCrisisMortality,
} from "./crisis/mortality";
import { scheduleFutureDueItem } from "./future-transitions";
import { createMindProvenance, recordGoalState } from "./mind";
import {
  LIVELIHOOD_GOAL_KEY,
  PRIVACY_GOAL_KEY,
} from "./people-goal-pursuit-content";
import {
  createResourcePosition,
  money as usd,
  createDwelling,
  startDwellingOccupancy,
  recordDwellingOccupancyState,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { scheduledActivityState } from "./time-work";
import { advanceWorld, assertWorldIntegrity, recordWorldEvent } from "./world";
import housingFirstService from "../../data/research/health/housing-first-service.json";
import { SERVICE_DELIVERED_LAW_ROWS } from "./law-consequences/service-delivered-data";
import {
  PUBLIC_SERVICE_ATTENDANCE,
  PUBLIC_SERVICE_RESIDENT_REQUESTS,
} from "./public-service-producer";
import {
  appendProgram,
  base,
  enact,
  procedure,
  provenance,
} from "../../tests/fixtures/funded-service-fixture";
import type { EntityId, Person, World } from "./types";

const PARKS =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
const HARM_REDUCTION =
  "us-policy-positions:health-human-services.harm-reduction-services";
const TRANSIT =
  "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit";

/** A place from all 56, named by its seed. */
function drawPlace(seed: string): string {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  return places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
}

/** Authored fixture: this person's recorded home is in the served place. */
function homeIn(world: World, personId: EntityId, jurisdictionId: EntityId) {
  const person = world.people[personId]!;
  const move = <T extends { kind: string; endedAt?: unknown }>(fact: T): T =>
    fact.kind === "residence" && fact.endedAt === null
      ? { ...fact, jurisdictionId }
      : fact;
  const moved = {
    ...person,
    homeJurisdictionId: jurisdictionId,
    establishedFacts: person.establishedFacts.map(move),
    ...(person.detailLevel === "materialized"
      ? {
          details: {
            ...person.details,
            generatedFacts: person.details.generatedFacts.map(move),
          },
        }
      : {}),
  } as Person;
  return { ...world, people: { ...world.people, [personId]: moved } };
}

function organization(world: World, key: string, at: EntityId) {
  const next = createOrganization(world, {
    stableKey: key,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: key,
      classification: key.includes("account")
        ? "sector:government"
        : "sector:private",
      locationJurisdictionId: at,
    },
  });
  return { world: next, id: next.history.organizations.at(-1)!.id };
}

/** Authored fixture: a paid job, located where the test says. */
function job(
  world: World,
  personId: EntityId,
  at: EntityId,
  weeklyHours: number,
) {
  const employer = organization(world, `test:employer:${personId}`, at);
  return createWorkRelationship(employer.world, {
    stableKey: `test:work:${personId}`,
    personId,
    organizationId: employer.id,
    startedAt: world.currentDate,
    kind: "employment:service-test",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Clerk",
      occupationClassification: null,
      locationJurisdictionId: at,
      timeDemand: {
        expectedWeekly: {
          minimumHours: weeklyHours / 2,
          maximumHours: weeklyHours,
        },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: at,
      },
    },
  });
}

/** Authored fixture: a goal of the person's own. */
function goal(world: World, personId: EntityId, goalKey: string) {
  return recordGoalState(world, {
    stableKey: `test:goal:${personId}:${goalKey}`,
    personId,
    goalKey,
    recordedAt: world.currentDate,
    objective: goalKey,
    domain: "life:ordinary",
    scope: "personal",
    priority: "moderate",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", { note: provenance.note }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

/**
 * The service law enacted through the real legislative path, its
 * appropriation and the operator's commitment saved, and the one operating
 * installment left for the clock to pay tomorrow. Residents and their
 * records are authored per scenario.
 */
function fundedTomorrow(
  stateKey: string,
  keyOfQuestion: string,
  paidInDays = 1,
) {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  let world: World = {
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
    control: { kind: "person", personId: procedure.playerPersonId },
  };
  world = enact(world, jurisdiction.id, "yes", keyOfQuestion);
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === keyOfQuestion,
  )!;
  world = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [proposition.id]: {
          ...proposition,
          consequences: [...SERVICE_DELIVERED_LAW_ROWS[keyOfQuestion]!],
        },
      },
    },
  };
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const account = organization(world, "test:service-account", jurisdiction.id);
  const provider = organization(
    account.world,
    "test:service-operator",
    jurisdiction.id,
  );
  world = provider.world;
  world = createResourcePositionFor(world, account.id);
  let part = appendProgram(world, jurisdiction.id, "appropriation", {
    accountOrganizationId: account.id,
    amount: money(10_000),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, paidInDays + 30),
    sourceMeasureId: measureId,
    basis: { kind: "authored-fixture", note: provenance.note },
  });
  world = part.world;
  part = appendProgram(world, jurisdiction.id, "commitment", {
    appropriationId: part.record.id,
    alternativeKey: "operating-support",
    alternativeTitle: "Operating support",
    decidedByPersonId: procedure.playerPersonId,
    authority: "Explicit authored test contract; not a live decision.",
    recipientOrganizationId: provider.id,
    installments: [
      {
        dueAt: addDays(world.currentDate, paidInDays),
        amount: money(10_000),
        purpose: "operating",
      },
    ],
    deliveryLeadDays: null,
  });
  world = part.world;
  const commitment = part.record;
  // The same due item commitPublicProgram writes for a later installment.
  world = scheduleFutureDueItem(world, {
    stableKey: `${commitment.stableKey}:installment:0`,
    dueAt: addDays(world.currentDate, paidInDays),
    transitionKey: PUBLIC_PROGRAM_INSTALLMENT,
    entityIds: [account.id],
    jurisdictionId: jurisdiction.id,
    provenance: { kind: "simulated", sourceEntityIds: [commitment.eventId] },
  });
  const residents = (Object.keys(world.people) as EntityId[])
    .filter((id) => id !== procedure.playerPersonId)
    .sort();
  return {
    world,
    jurisdiction,
    measureId,
    commitmentId: commitment.id,
    providerId: provider.id,
    residents,
  };
}

const money = (dollars: number) => usd(dollars, "USD");
function createResourcePositionFor(world: World, organizationId: EntityId) {
  return createResourcePosition(world, {
    stableKey: "test:operating-cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(10_000),
    provenance,
  });
}

const registry = createCampaignElectionTransitionRegistry();
const deliveries = (world: World) =>
  world.history.events.filter((e) => e.type === "service.delivery-recorded");
const requestsBy = (world: World, personId: EntityId) =>
  world.history.events.filter(
    (e) =>
      e.type === "service.requested" &&
      e.participants.some((p) => p.personId === personId),
  );
const traceFor = (world: World, personId: EntityId) =>
  world.history.decisionTraces.find(
    (t) =>
      t.context.decisionType === "public-service:request" &&
      t.context.actorPersonId === personId,
  );

describe("residents ask for a paid service on their own records, then take part", () => {
  it.each(lifePlaceStateIdentities())(
    "housing-first assistance reaches a displaced resident in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const f = fundedTomorrow(
        jurisdictionKey,
        housingFirstService.questionKey,
      );
      const [displaced, quiet] = f.residents as [EntityId, EntityId];
      let world = homeIn(
        homeIn(f.world, displaced, f.jurisdiction.id),
        quiet,
        f.jurisdiction.id,
      );
      for (const { membership, state } of householdMembershipsAt(
        world,
        displaced,
      )) {
        world = recordHouseholdMembershipState(world, {
          stableKey: `test:leave-household:${membership.id}`,
          membershipId: membership.id,
          effectiveAt: world.currentDate,
          status: "ended",
          residenceRole: state.residenceRole,
          kind: state.kind,
          provenance,
          supersedesStateId: state.id,
        });
      }
      world = createHousehold(world, {
        stableKey: "test:displaced-household",
        formedAt: world.currentDate,
        label: "Test household",
        provenance,
      });
      const householdId = world.history.households.at(-1)!.id;
      world = startHouseholdMembership(world, {
        stableKey: "test:displaced-member",
        personId: displaced,
        householdId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:family",
        provenance,
      });
      world = createDwelling(world, {
        stableKey: "test:lost-home",
        establishedAt: world.currentDate,
        jurisdictionId: f.jurisdiction.id,
        locationLabel: "Test home",
        classification: "residential:apartment",
        provenance,
      });
      const dwellingId = world.history.dwellings.at(-1)!.id;
      world = startDwellingOccupancy(world, {
        stableKey: "test:lost-occupancy",
        occupant: { kind: "household", householdId },
        dwellingId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "residence:rented",
        provenance,
      });
      const occupancy = world.history.dwellingOccupancies.at(-1)!;
      const initial = world.history.dwellingOccupancyStates.at(-1)!;
      // Saved edge fixture: the existing rent producer writes this event and
      // ends occupancy with this provenance when it executes an eviction.
      world = recordWorldEvent(world, {
        stableKey: "test:eviction",
        type: "housing.evicted",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: f.jurisdiction.id,
        involvedEntityIds: [displaced, householdId],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary: "Authored eviction fixture.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      world = recordDwellingOccupancyState(world, {
        stableKey: "test:ended-occupancy",
        dwellingOccupancyId: occupancy.id,
        effectiveAt: world.currentDate,
        status: "ended",
        residenceRole: "primary",
        kind: initial.kind,
        reason: "Test eviction",
        provenance: {
          kind: "simulated-event",
          eventId: world.history.events.at(-1)!.id,
        },
        supersedesStateId: initial.id,
      });
      const lostStateId = world.history.dwellingOccupancyStates.at(-1)!.id;
      const before = world;
      world = advanceWorld(world, 3, registry);
      const trace = traceFor(world, displaced)!;
      expect(trace.selectedOptionKey).toBe("ask");
      expect(trace.context.considerations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            explanation: housingFirstService.requestReasonKey,
            sourceRefs: [
              {
                kind: "life-history",
                reference: {
                  family: "dwelling-occupancy-state",
                  recordId: lostStateId,
                },
              },
            ],
          }),
        ]),
      );
      expect(traceFor(world, quiet)).toBeUndefined();
      expect(requestsBy(world, quiet)).toEqual([]);
      const receipts = deliveries(world);
      expect(receipts).toHaveLength(1);
      expect(receipts[0]!.participants[0]!.personId).toBe(displaced);
      expect(receipts[0]!.lawEffectStamps![0]).toMatchObject({
        questionKey: housingFirstService.questionKey,
        jurisdictionId: f.jurisdiction.id,
        effectKind: "service-delivered",
      });
      expect(
        advanceWorld(
          deserializeWorld(serializeWorld(world)),
          3,
          registry,
        ).history.events.filter(
          (event) => event.type === "service.delivery-recorded",
        ),
      ).toHaveLength(1);
      // A replacement home removes the reason even though the old eviction
      // remains in history. Missing housing records never supply this reason.
      const rehoused = startDwellingOccupancy(before, {
        stableKey: "test:replacement-occupancy",
        occupant: { kind: "household", householdId },
        dwellingId,
        startedAt: before.currentDate,
        residenceRole: "primary",
        kind: "residence:rented",
        provenance,
      });
      const quietWorld = advanceWorld(rehoused, 3, registry);
      expect(traceFor(quietWorld, displaced)).toBeUndefined();
      expect(deliveries(quietWorld)).toEqual([]);
    },
    30_000,
  );

  const parksSeed = "team5-producer-parks";
  const parksPlace = drawPlace(parksSeed);
  it(`parks: one asks, one declines, one ties, one has no reason; the visit is delivered once (${parksPlace}, seed ${parksSeed})`, () => {
    const f = fundedTomorrow(parksPlace, PARKS);
    const [leisure, worker, torn, none] = f.residents as [
      EntityId,
      EntityId,
      EntityId,
      EntityId,
    ];
    expect(none).toBeDefined();
    let world = f.world;
    for (const id of [leisure, worker, torn, none])
      world = homeIn(world, id, f.jurisdiction.id);
    world = goal(world, leisure, PRIVACY_GOAL_KEY);
    world = job(world, worker, f.jurisdiction.id, 40);
    world = goal(world, torn, PRIVACY_GOAL_KEY);
    world = goal(world, torn, LIVELIHOOD_GOAL_KEY);
    assertWorldIntegrity(world);
    const enactedOn = world.currentDate;

    // Day 1: the clock pays the operating installment; nobody has asked.
    world = advanceWorld(world, 1, registry);
    expect(
      world.history.futureDueItems.filter(
        (d) => d.transitionKey === PUBLIC_SERVICE_RESIDENT_REQUESTS,
      ),
    ).toHaveLength(1);
    expect(requestsBy(world, leisure)).toEqual([]);

    // Day 2: residents weigh it from their own records.
    world = advanceWorld(world, 1, registry);
    const [request, ...more] = requestsBy(world, leisure);
    expect(more).toEqual([]);
    expect(request!.summary).toContain("a park program visit");
    const asked = traceFor(world, leisure)!;
    expect(asked.selectedOptionKey).toBe("ask");
    expect(
      asked.context.considerations.map((c) => [c.optionKey, c.explanation]),
    ).toEqual([["ask", "Wants to make some time for themselves."]]);
    const declined = traceFor(world, worker)!;
    expect(declined.selectedOptionKey).toBe("wait");
    expect(declined.context.considerations[0]!.explanation).toBe(
      "Hours already go to work as Clerk.",
    );
    expect(requestsBy(world, worker)).toEqual([]);
    // Equal reasons for and against: a saved trace, no request.
    expect(traceFor(world, torn)).toBeDefined();
    expect(requestsBy(world, torn)).toEqual([]);
    // No record bears on parks: not asked, nothing saved.
    expect(traceFor(world, none)).toBeUndefined();
    expect(requestsBy(world, none)).toEqual([]);
    const activity = world.history.scheduledActivities.find((a) =>
      a.participantPersonIds.includes(leisure),
    )!;
    expect(scheduledActivityState(world, activity.id).status).toBe("scheduled");
    expect(deliveries(world)).toEqual([]);

    // Day 3: the visit has ended; the resident took part.
    world = advanceWorld(world, 1, registry);
    expect(scheduledActivityState(world, activity.id).status).toBe("completed");
    const [receipt, ...extra] = deliveries(world);
    expect(extra).toEqual([]);
    expect(receipt!.participants[0]!.personId).toBe(leisure);
    expect(receipt!.summary).toContain("1.5 hours");
    const stamp = receipt!.lawEffectStamps![0]!;
    expect(stamp).toMatchObject({
      questionKey: PARKS,
      jurisdictionId: f.jurisdiction.id,
      effectKind: "service-delivered",
    });
    const installment = world.history.publicProgramRecords!.find(
      (r) =>
        r.kind === "installment" &&
        r.commitmentId === f.commitmentId &&
        r.status === "posted",
    )!;
    expect(installment.recordedAt).toBe(addDays(enactedOn, 1));
    expect(stamp.sourceRecordIds).toEqual(
      expect.arrayContaining([
        activity.id,
        f.commitmentId,
        installment.id,
        leisure,
      ]),
    );
    expect(
      world.history.futureDueItems.filter(
        (d) => d.transitionKey === PUBLIC_SERVICE_ATTENDANCE,
      ),
    ).toHaveLength(1);

    // Save, Continue and a week more: still one delivery, nobody re-asks
    // without a new payment.
    const later = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      7,
      registry,
    );
    expect(deliveries(later)).toHaveLength(1);
    expect(requestsBy(later, leisure)).toHaveLength(1);
  });

  const transitSeed = "team5-producer-transit";
  const transitPlace = drawPlace(transitSeed);
  it(`highway money moved to transit: work inside the served place asks, work outside does not (${transitPlace}, seed ${transitSeed})`, () => {
    const f = fundedTomorrow(transitPlace, TRANSIT);
    const [commuter, away] = f.residents as [EntityId, EntityId];
    let world = f.world;
    for (const id of [commuter, away])
      world = homeIn(world, id, f.jurisdiction.id);
    world = job(world, commuter, f.jurisdiction.id, 40);
    // The procedure world's own home place is not the served place.
    const elsewhere = base.jurisdictionOrder[0]!;
    expect(elsewhere).not.toBe(f.jurisdiction.id);
    world = job(world, away, elsewhere, 40);
    world = advanceWorld(world, 3, registry);
    expect(traceFor(world, commuter)!.selectedOptionKey).toBe("ask");
    expect(requestsBy(world, commuter)[0]!.summary).toContain("a trip");
    expect(traceFor(world, away)!.selectedOptionKey).toBe("wait");
    expect(traceFor(world, away)!.context.considerations[0]!.explanation).toBe(
      "Works as Clerk somewhere the service does not run.",
    );
    expect(requestsBy(world, away)).toEqual([]);
    const [receipt, ...extra] = deliveries(world);
    expect(extra).toEqual([]);
    expect(receipt!.participants[0]!.personId).toBe(commuter);
    expect(receipt!.summary).toContain("0.75 hours");
    expect(receipt!.lawEffectStamps![0]).toMatchObject({
      questionKey: TRANSIT,
      effectKind: "service-delivered",
    });
  });

  const harmSeed = "lw16-harm-reduction-2";
  const harmPlace = drawPlace(harmSeed);
  it(`harm reduction: people with the substance use record ask, full-time work holds one back, people without it have no reason (${harmPlace}, seed ${harmSeed})`, () => {
    // The model first exposes people at its next quarter window; the service
    // is paid the day after, so the records exist when residents weigh it.
    const window = ensureCrisisMortality(base).history.futureDueItems.find(
      (item) => item.transitionKey === MORTALITY_WINDOW_KEY,
    )!;
    const paidInDays = daysBetween(base.currentDate, window.dueAt) + 1;
    const f = fundedTomorrow(harmPlace, HARM_REDUCTION, paidInDays);
    f.world = ensureCrisisMortality(f.world);
    // Authored fixture: twenty-year-olds living in the served place, given the
    // pack's starting conditions at the survey's shares by age.
    const date = f.world.currentDate;
    let world = createCharacterHistoryContextPeople(
      f.world,
      Array.from({ length: 80 }, (_, index) => ({
        stableKey: `lw16:harm:${index}`,
        givenName: "Resident",
        familyName: `Member-${index}`,
        birthDate: addDays(date, -Math.round(22 * 365.25) - index),
        homeJurisdictionId: f.jurisdiction.id,
      })),
    );
    const cohortIds = world.personOrder.slice(-80);
    // Run to the window: the model's own first exposure writes the
    // starting conditions of everyone in the world.
    world = advanceWorld(world, paidInDays - 1, registry);
    const holders = cohortIds.filter((id) =>
      holdsPackCondition(world, id, SUBSTANCE_USE_DISORDER_KEY),
    );
    const others = cohortIds.filter((id) => !holders.includes(id));
    expect(holders.length).toBeGreaterThan(5);
    const [free, busy] = holders as [EntityId, EntityId];
    const [healthy] = others as [EntityId];
    world = job(world, busy, f.jurisdiction.id, 40);
    assertWorldIntegrity(world);

    world = advanceWorld(world, 3, registry);

    const askedTrace = traceFor(world, free)!;
    expect(askedTrace.selectedOptionKey).toBe("ask");
    expect(
      askedTrace.context.considerations.map((c) => [
        c.optionKey,
        c.explanation,
      ]),
    ).toEqual([["ask", "Lives with a substance use disorder."]]);
    expect(requestsBy(world, free)[0]!.summary).toContain(
      "a harm reduction visit",
    );
    // The same record, but forty hours of work already hold the day.
    const heldBack = traceFor(world, busy)!;
    // Equal reasons for and against: a saved trace, no request.
    expect(heldBack.selectedOptionKey).not.toBe("ask");
    expect(heldBack.context.considerations.map((c) => c.optionKey)).toEqual([
      "ask",
      "wait",
    ]);
    expect(requestsBy(world, busy)).toEqual([]);
    // No record of the condition: no reason, nothing saved.
    expect(traceFor(world, healthy)).toBeUndefined();
    expect(requestsBy(world, healthy)).toEqual([]);
    // Everyone who asked held the record; the law's receipt follows the visit.
    const askers = cohortIds.filter((id) => requestsBy(world, id).length > 0);
    expect(askers.length).toBeGreaterThan(0);
    expect(askers.every((id) => holders.includes(id))).toBe(true);
    const receipts = deliveries(world);
    expect(receipts.length).toBe(askers.length);
    expect(receipts[0]!.lawEffectStamps![0]).toMatchObject({
      questionKey: HARM_REDUCTION,
      jurisdictionId: f.jurisdiction.id,
      effectKind: "service-delivered",
    });
    console.info(
      `LW-16 harm reduction, ${harmPlace} (seed ${harmSeed}): ${holders.length} of ${cohortIds.length} twenty-two-year-olds hold the record; ${askers.length} asked; ${receipts.length} visits delivered; the 40-hour worker with the record waited.`,
    );
  }, 240_000);
});
