import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { beginHealthEpisode } from "./crisis/health";
import { ensureCrisisStandingAppropriations } from "./crisis-standing-appropriations";
import { addDays } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  eligibleStandingOperator,
  programAlternativesFor,
  programOperatorOrganization,
} from "./governing/program-governing";
import {
  programCommitments,
  PUBLIC_PROGRAM_INSTALLMENT,
} from "./governing/public-program";
import {
  decideGoverningMatter,
  governingMatters,
  openProgramMattersForAllOffices,
} from "./governing/state-governing";
import { stableHash } from "./ids";
import {
  createCareResponsibility,
  createHousehold,
  createOrganization,
  startHouseholdMembership,
} from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import {
  publicProgramRecordId,
  publicProgramRecords,
} from "./public-program-integrity";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import { scheduledActivityState } from "./time-work";
import { advanceWorld, assertWorldIntegrity, recordWorldEvent } from "./world";
import {
  base,
  procedure,
  provenance,
} from "../../tests/fixtures/funded-service-fixture";
import type {
  EntityId,
  Person,
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  World,
} from "./types";

/**
 * The standing 988 consumer, watched on the clock. A state's sourced crisis
 * appropriation (no bill) is committed to an eligible clinical operator, the
 * clock pays the operating installment, a named resident who is acutely
 * unwell decides to call, the crisis team's visit completes, and delivery is
 * recorded once against the standing authority and the paid installment.
 */

function drawPlace(seed: string): string {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  return places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
}

function inState(stateKey: string): World {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  return {
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
    control: { kind: "person", personId: procedure.playerPersonId },
  };
}

function standingAppropriation(world: World, place: string) {
  return publicProgramRecords(world).find(
    (r): r is PublicProgramAppropriationRecord =>
      r.kind === "appropriation" &&
      r.programKey ===
        `behavioral-health-crisis-response:${place.toLowerCase()}` &&
      r.availableFrom <= world.currentDate &&
      r.availableThrough >= world.currentDate,
  );
}

/** The first seed whose drawn place has a standing 988 appropriation today. */
function fundedSeed(prefix: string): { seed: string; place: string } {
  for (let n = 1; n < 200; n++) {
    const seed = `${prefix}-${n}`;
    const place = drawPlace(seed);
    if (
      standingAppropriation(
        ensureCrisisStandingAppropriations(inState(place)),
        place,
      )
    )
      return { seed, place };
  }
  throw new Error("No funded place drawn.");
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

function organization(
  world: World,
  key: string,
  classification: string,
  at: EntityId,
) {
  const next = createOrganization(world, {
    stableKey: key,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: key,
      classification: classification as never,
      locationJurisdictionId: at,
    },
  });
  return { world: next, id: next.history.organizations.at(-1)!.id };
}

/** Authored commitment record under the appropriation's own program key. */
function appendCommitment(
  world: World,
  programKey: string,
  jurisdictionId: EntityId,
  fields: object,
) {
  const key = `test:program:commitment:${world.history.nextSequence}`;
  let next = recordWorldEvent(world, {
    stableKey: `${key}:event`,
    type: "public-program.commitment",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [procedure.playerPersonId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["fixture.service"],
    summary: "Explicit saved test program contract.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const record = {
    ...fields,
    kind: "commitment",
    id: publicProgramRecordId(next, key),
    stableKey: key,
    sequence: next.history.nextSequence,
    programKey,
    jurisdictionId,
    recordedAt: next.currentDate,
    eventId: next.history.events.at(-1)!.id,
  } as PublicProgramCommitmentRecord;
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      publicProgramRecords: [
        ...(next.history.publicProgramRecords ?? []),
        record,
      ],
    },
  };
  return { world: next, record };
}

/**
 * The state's standing appropriation, an authored cash receipt into its
 * account, and a commitment of one operating payment, due tomorrow, to
 * `operatorId`. The clock pays it.
 */
function committedTo(world: World, place: string, operatorId: EntityId) {
  const appropriation = standingAppropriation(world, place)!;
  const payer = organization(
    world,
    "test:receipts-payer",
    "sector:private",
    appropriation.jurisdictionId,
  );
  let next = createResourcePosition(payer.world, {
    stableKey: "test:payer-cash",
    owner: { kind: "organization", organizationId: payer.id },
    openedAt: payer.world.currentDate,
    openingBalance: money(50_000, "USD"),
    provenance,
  });
  next = createResourceFlow(next, {
    stableKey: "test:receipt",
    source: { kind: "organization", organizationId: payer.id },
    recipient: {
      kind: "organization",
      organizationId: appropriation.accountOrganizationId,
    },
    startsAt: next.currentDate,
    amount: money(50_000, "USD"),
    cadenceKind: "schedule:one-time",
    basisKind: "custom:test-receipt",
    basisReference: { kind: "none" } as never,
    restrictionKind: null,
    jurisdictionId: appropriation.jurisdictionId,
    provenance,
  });
  next = recordResourceTransferOutcome(next, {
    stableKey: "test:receipt:paid",
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: money(50_000, "USD"),
    transferredAmount: money(50_000, "USD"),
    reasonKind: null,
    note: "Authored public receipt so the account holds cash.",
    provenance,
  });
  const part = appendCommitment(
    next,
    appropriation.programKey,
    appropriation.jurisdictionId,
    {
      appropriationId: appropriation.id,
      alternativeKey: "crisis-operating",
      alternativeTitle: "988 crisis team operating support",
      decidedByPersonId: procedure.playerPersonId,
      authority: "Explicit authored test contract; not a live decision.",
      recipientOrganizationId: operatorId,
      installments: [
        {
          dueAt: addDays(next.currentDate, 1),
          amount: money(10_000, "USD"),
          purpose: "operating",
        },
      ],
      deliveryLeadDays: null,
    },
  );
  const commitment = part.record;
  next = scheduleFutureDueItem(part.world, {
    stableKey: `${commitment.stableKey}:installment:0`,
    dueAt: addDays(next.currentDate, 1),
    transitionKey: PUBLIC_PROGRAM_INSTALLMENT,
    entityIds: [appropriation.accountOrganizationId],
    jurisdictionId: appropriation.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [commitment.eventId] },
  });
  assertWorldIntegrity(next);
  return { world: next, appropriation, commitmentId: commitment.id };
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

function scenario(place: string, operatorKind: "clinical" | "transit") {
  let world = ensureCrisisStandingAppropriations(inState(place));
  const jurisdictionId = stateJurisdictionForKey(place)!.id;
  // A transit company formed first: ineligible however early it is.
  const transit = organization(
    world,
    "test:county-transit",
    "enterprise:transit",
    jurisdictionId,
  );
  const clinic = organization(
    transit.world,
    "test:county-health-department",
    "service:public-health",
    jurisdictionId,
  );
  world = clinic.world;
  const chosen = eligibleStandingOperator(
    world,
    standingAppropriation(world, place)!.programKey,
    jurisdictionId,
  );
  const residents = (Object.keys(world.people) as EntityId[])
    .filter((id) => id !== procedure.playerPersonId)
    .sort();
  const [unwell, well] = residents as [EntityId, EntityId];
  for (const id of [unwell, well]) world = homeIn(world, id, jurisdictionId);
  world = beginHealthEpisode(world, {
    stableKey: `test:acute:${unwell}`,
    personId: unwell,
    severity: "acute",
    initialLimitation: "limited",
    origin: { kind: "authored", note: provenance.note },
    causalParentIds: [],
  });
  const funded = committedTo(
    world,
    place,
    operatorKind === "clinical" ? chosen! : transit.id,
  );
  return { ...funded, chosen, clinicId: clinic.id, unwell, well };
}

describe("the standing 988 consumer", () => {
  const { seed, place } = fundedSeed("team5-988");
  it(`an acutely unwell resident calls, the clinical team's visit completes, and delivery cites the standing authority (${place}, seed ${seed})`, () => {
    const f = scenario(place, "clinical");
    expect(f.chosen).toBe(f.clinicId);
    let world = f.world;
    world = advanceWorld(world, 1, registry); // the installment is paid
    expect(requestsBy(world, f.unwell)).toEqual([]);
    world = advanceWorld(world, 1, registry); // residents decide
    const [request, ...more] = requestsBy(world, f.unwell);
    expect(more).toEqual([]);
    expect(request!.summary).toContain("a crisis response");
    const trace = world.history.decisionTraces.find(
      (t) =>
        t.context.decisionType === "public-service:request" &&
        t.context.actorPersonId === f.unwell,
    )!;
    expect(trace.selectedOptionKey).toBe("ask");
    expect(trace.context.considerations.map((c) => c.explanation)).toEqual([
      "Is acutely unwell right now.",
    ]);
    // No health record bears on calling: not asked, nothing saved.
    expect(requestsBy(world, f.well)).toEqual([]);
    expect(
      world.history.decisionTraces.some(
        (t) => t.context.actorPersonId === f.well,
      ),
    ).toBe(false);
    expect(deliveries(world)).toEqual([]);
    world = advanceWorld(world, 1, registry); // the visit has ended
    const visit = world.history.scheduledActivities.find((a) =>
      a.participantPersonIds.includes(f.unwell),
    )!;
    expect(scheduledActivityState(world, visit.id).status).toBe("completed");
    const [receipt, ...extra] = deliveries(world);
    expect(extra).toEqual([]);
    expect(receipt!.participants[0]!.personId).toBe(f.unwell);
    expect(receipt!.summary).toContain("1.5 hours");
    const stamp = receipt!.lawEffectStamps![0]!;
    expect(stamp).toMatchObject({
      source: "standing-appropriation",
      governingLawKey: f.appropriation.id,
      questionKey: null,
      effectKind: "service-delivered",
      jurisdictionId: f.appropriation.jurisdictionId,
    });
    const installment = publicProgramRecords(world).find(
      (r) =>
        r.kind === "installment" &&
        r.commitmentId === f.commitmentId &&
        r.status === "posted",
    )!;
    expect(stamp.sourceRecordIds).toEqual(
      expect.arrayContaining([
        visit.id,
        f.commitmentId,
        f.appropriation.id,
        f.appropriation.eventId,
        installment.id,
        f.clinicId,
        f.unwell,
      ]),
    );
    const later = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      7,
      registry,
    );
    expect(deliveries(later)).toHaveLength(1);
  });

  it(`money committed to a transit company buys no crisis call and no delivery (${place}, seed ${seed})`, () => {
    const f = scenario(place, "transit");
    const world = advanceWorld(f.world, 3, registry);
    expect(
      publicProgramRecords(world).some(
        (r) =>
          r.kind === "installment" &&
          r.commitmentId === f.commitmentId &&
          r.status === "posted",
      ),
    ).toBe(true);
    expect(requestsBy(world, f.unwell)).toEqual([]);
    expect(deliveries(world)).toEqual([]);
  });

  it(`with no lawful provider on record the governor's choice commits nothing and makes up no provider (${place}, seed ${seed})`, () => {
    let world = ensureCrisisStandingAppropriations(inState(place));
    const jurisdictionId = stateJurisdictionForKey(place)!.id;
    // Only a transit company works here: it cannot run a crisis team.
    world = organization(
      world,
      "test:county-transit",
      "enterprise:transit",
      jurisdictionId,
    ).world;
    const appropriation = standingAppropriation(world, place)!;
    const usps = place.slice(3);
    world = ensureStateExecutiveIncumbent(
      world,
      procedure.playerPersonId,
      usps,
    );
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === usps,
    )!;
    world = {
      ...world,
      control: { kind: "person", personId: governor.personId },
    };
    world = openProgramMattersForAllOffices(world, new Set([appropriation.id]));
    const matter = governingMatters(world).find(
      (entry) => entry.appropriationId === appropriation.id,
    )!;
    const paying = programAlternativesFor(world, appropriation).find(
      (alternative) => alternative.installments.length > 0,
    )!;
    const option = matter.options.find(
      (entry) => entry.key === `program:${paying.key}`,
    )!;
    const organizationsBefore = world.history.organizations.length;
    const flowsBefore = world.history.resourceFlows.length;
    expect(() =>
      programOperatorOrganization(
        world,
        appropriation.programKey,
        jurisdictionId,
      ),
    ).toThrow(/No eligible operator/);
    const decided = decideGoverningMatter(world, matter.id, option.key);
    // The governor's choice is recorded; the money simply finds no provider.
    expect(decided).toMatchObject({ ok: true });
    expect(
      governingMatters(decided.world).find((entry) => entry.id === matter.id)
        ?.status,
    ).not.toBe("open");
    world = advanceWorld(decided.world, 3, registry);
    expect(world.history.organizations).toHaveLength(organizationsBefore);
    expect(
      programCommitments(world, appropriation.programKey).filter(
        (commitment) => commitment.appropriationId === appropriation.id,
      ),
    ).toEqual([]);
    expect(world.history.resourceFlows).toHaveLength(flowsBefore);
    expect(
      world.history.events.filter((e) => e.type === "service.requested"),
    ).toEqual([]);
    expect(deliveries(world)).toEqual([]);
  });

  it(`two same-kind providers: the earlier formed runs the program, then the lower ID (${place}, seed ${seed})`, () => {
    let world = ensureCrisisStandingAppropriations(inState(place));
    const jurisdictionId = stateJurisdictionForKey(place)!.id;
    const programKey = standingAppropriation(world, place)!.programKey;
    const later = createOrganization(world, {
      stableKey: "test:clinic-later",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Later clinic",
        classification: "service:clinic",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const laterId = later.history.organizations.at(-1)!.id;
    world = createOrganization(later, {
      stableKey: "test:clinic-earlier",
      formedAt: addDays(later.currentDate, -400),
      provenance,
      initialProfile: {
        name: "Earlier clinic",
        classification: "service:clinic",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const earlierId = world.history.organizations.at(-1)!.id;
    // Recorded second, formed first: formation date decides, not order.
    expect(eligibleStandingOperator(world, programKey, jurisdictionId)).toBe(
      earlierId,
    );
    const twin = createOrganization(world, {
      stableKey: "test:clinic-twin",
      formedAt: addDays(later.currentDate, -400),
      provenance,
      initialProfile: {
        name: "Twin clinic",
        classification: "service:clinic",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const twinId = twin.history.organizations.at(-1)!.id;
    expect(eligibleStandingOperator(twin, programKey, jurisdictionId)).toBe(
      [earlierId, twinId].sort()[0],
    );
    expect(laterId).not.toBe(
      eligibleStandingOperator(twin, programKey, jurisdictionId),
    );
  });

  it(`a family member at home with a saved duty of care weighs against calling; sharing the house alone does not (${place}, seed ${seed})`, () => {
    const f = scenario(place, "clinical");
    // Authored: the two residents share one household.
    let home = createHousehold(f.world, {
      stableKey: "test:shared-home",
      formedAt: f.world.currentDate,
      label: "Shared home",
      provenance: { kind: "authored", note: provenance.note },
    });
    const householdId = home.history.households.at(-1)!.id;
    for (const personId of [f.unwell, f.well])
      home = startHouseholdMembership(home, {
        stableKey: `test:shared-home:${personId}`,
        personId,
        householdId,
        startedAt: home.currentDate,
        residenceRole: "shared",
        kind: "resident:family",
        provenance: { kind: "authored", note: provenance.note },
      });
    const care = (world: World, caregiver: EntityId) =>
      createCareResponsibility(world, {
        stableKey: `test:care:${caregiver}:${f.unwell}`,
        caregiverPersonId: caregiver,
        recipientPersonId: f.unwell,
        startedAt: world.currentDate,
        kind: "personal:adult-family",
        share: "primary",
        context: "Looks after them.",
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 20 },
          attention: "moderate",
          concurrency: "mostly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: null,
        },
        provenance: { kind: "authored", note: provenance.note },
      });
    const reasons = (world: World) => {
      const trace = advanceWorld(
        world,
        2,
        registry,
      ).history.decisionTraces.find(
        (t) =>
          t.context.decisionType === "public-service:request" &&
          t.context.actorPersonId === f.unwell,
      )!;
      // Acute illness still outweighs a carer at home: the resident calls.
      expect(trace.selectedOptionKey).toBe("ask");
      return trace.context.considerations.map((c) => c.explanation).sort();
    };
    // Sharing the house, and a carer who lives elsewhere, are not help at home.
    expect(reasons(home)).toEqual(["Is acutely unwell right now."]);
    const away = care(home, procedure.playerPersonId);
    expect(reasons(away)).toEqual(["Is acutely unwell right now."]);
    expect(reasons(care(away, f.well))).toEqual(
      [
        "Is acutely unwell right now.",
        "Someone at home looks after them.",
      ].sort(),
    );
  });
});
