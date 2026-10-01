import { describe, expect, it } from "vitest";
import { addSimulationMinutes, daysBetween } from "../dates";
import { createLegislativeScenario } from "../legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
} from "../legislation";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createOrganization, createOrganizationParticipation } from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { publicProgramRecordId } from "../public-program-integrity";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  createScheduledActivity,
  performScheduledActivity,
} from "../time-work";
import { advanceWorld, assertWorldIntegrity, recordWorldEvent } from "../world";
import type { LawConsequenceRow } from "../law-consequence-types";
import type { EntityId, PublicProgramRecord, World } from "../types";
import {
  applyLawServiceConsequence,
  resolveLawServiceConsequence,
  SERVICE_ACTION,
  SERVICE_SELECTOR,
  SERVICE_HOURS,
  FUNDED_SERVICE,
  SERVICE_RECIPIENT_KIND,
  SERVICE_DELIVERED_LAW_ROWS,
} from "./service-delivered";

const questionKey =
  "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours";
const programKey = "transit:bus-service";
const provenance = {
  kind: "authored" as const,
  note: "Explicit L1 test contract; no production amount or forecast.",
};
const procedure = createLegislativeScenario("alaska");
const catalog = createProductionPolicyCatalog();
const base = {
  ...procedure.world,
  policyCatalog: {
    ...catalog,
    domains: { ...procedure.world.policyCatalog.domains, ...catalog.domains },
    issues: { ...procedure.world.policyCatalog.issues, ...catalog.issues },
    propositions: {
      ...procedure.world.policyCatalog.propositions,
      ...catalog.propositions,
    },
    subjects: {
      ...procedure.world.policyCatalog.subjects,
      ...catalog.subjects,
    },
    principles: {
      ...procedure.world.policyCatalog.principles,
      ...catalog.principles,
    },
    domainOrder: [
      ...new Set([
        ...procedure.world.policyCatalog.domainOrder,
        ...catalog.domainOrder,
      ]),
    ],
    issueOrder: [
      ...new Set([
        ...procedure.world.policyCatalog.issueOrder,
        ...catalog.issueOrder,
      ]),
    ],
    propositionOrder: [
      ...new Set([
        ...procedure.world.policyCatalog.propositionOrder,
        ...catalog.propositionOrder,
      ]),
    ],
    subjectOrder: [
      ...new Set([
        ...procedure.world.policyCatalog.subjectOrder,
        ...catalog.subjectOrder,
      ]),
    ],
    principleOrder: [
      ...new Set([
        ...procedure.world.policyCatalog.principleOrder,
        ...catalog.principleOrder,
      ]),
    ],
  },
};
const row: LawConsequenceRow = {
  id: "test:funded-service",
  kind: "service-delivered",
  when: "service",
  who: { selector: SERVICE_SELECTOR, predicates: [] },
  what: SERVICE_ACTION,
  amount: { op: "record", key: SERVICE_HOURS, unit: "hours" },
  conditions: [{ capability: FUNDED_SERVICE, parameters: {} }],
  lag: { days: 0, sourceIds: ["test:actual-completion"] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["test:actual-completion"],
    population: "Recorded service participants",
    scope: "Explicit completed fixture trip",
    why: "The participant completed the saved interval.",
    uncertainty: "No ridership, capacity or population prediction.",
  },
};

function enact(
  world: World,
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  keyOfQuestion = questionKey,
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === keyOfQuestion,
  )!;
  const key = `test:service-law:${jurisdictionId}:${world.history.nextSequence}`;
  let next = introduceMeasure(world, {
    stableKey: key,
    jurisdictionId,
    rulePackId: procedure.pack.packId,
    designation: "Service test act (authored)",
    shortTitle: "Recorded service operating appropriation",
    summary:
      "Authored contract using the fixture procedure; not proof of this place's enactment rules.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: procedure.playerPersonId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  for (
    let index = 0;
    index < 40 && measurePosition(next, measureId).phase !== "enacted";
    index++
  ) {
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error("No canonical next step for the authored service law.");
    next = applyLegislativeStep({ ...procedure, measureId }, next, step).world;
  }
  expect(measurePosition(next, measureId).phase).toBe("enacted");
  const effectiveAt = next.history.legislativeEnactments!.at(-1)!.effectiveAt;
  if (effectiveAt && effectiveAt > next.currentDate)
    next = advanceWorld(next, daysBetween(next.currentDate, effectiveAt));
  return next;
}

function appendProgram(
  world: World,
  jurisdictionId: EntityId,
  kind: PublicProgramRecord["kind"],
  fields: object,
) {
  const key = `test:program:${kind}:${world.history.nextSequence}`;
  const personId = procedure.playerPersonId;
  let next = recordWorldEvent(world, {
    stableKey: `${key}:event`,
    type: `public-program.${kind}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
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
    kind,
    id: publicProgramRecordId(next, key),
    stableKey: key,
    sequence: next.history.nextSequence,
    programKey,
    jurisdictionId,
    recordedAt: next.currentDate,
    eventId: next.history.events.at(-1)!.id,
  } as PublicProgramRecord;
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
  assertWorldIntegrity(next);
  return { world: next, record };
}

function fixture(
  stateKey: string,
  complete = true,
  recipient = true,
  keyOfQuestion = questionKey,
) {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  let world: World = {
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
  };
  const personId = procedure.playerPersonId;
  world = { ...world, control: { kind: "person", personId } };
  world = enact(world, jurisdiction.id, "yes", keyOfQuestion);
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const organization = (
    key: string,
    classification: "sector:government" | "sector:private",
  ) => {
    world = createOrganization(world, {
      stableKey: key,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: key,
        classification,
        locationJurisdictionId: jurisdiction.id,
      },
    });
    return world.history.organizations.at(-1)!.id;
  };
  const accountId = organization("test:service-account", "sector:government");
  const providerId = organization("test:recorded-provider", "sector:private");
  world = createResourcePosition(world, {
    stableKey: "test:operating-cash",
    owner: { kind: "organization", organizationId: accountId },
    openedAt: world.currentDate,
    openingBalance: money(10_000, "USD"),
    provenance,
  });
  let part = appendProgram(world, jurisdiction.id, "appropriation", {
    accountOrganizationId: accountId,
    amount: money(10_000, "USD"),
    availableFrom: world.currentDate,
    availableThrough: world.currentDate,
    sourceMeasureId: measureId,
    basis: { kind: "authored-fixture", note: provenance.note },
  });
  world = part.world;
  const appropriationId = part.record.id;
  part = appendProgram(world, jurisdiction.id, "commitment", {
    appropriationId,
    alternativeKey: "recorded-trip",
    alternativeTitle: "Operating support for the recorded trip",
    decidedByPersonId: personId,
    authority:
      "Explicit authored test contract; not a live government decision.",
    recipientOrganizationId: providerId,
    installments: [
      {
        dueAt: world.currentDate,
        amount: money(10_000, "USD"),
        purpose: "operating",
      },
    ],
    deliveryLeadDays: null,
  });
  world = part.world;
  const commitmentId = part.record.id,
    commitmentEventId = part.record.eventId;
  world = createResourceFlow(world, {
    stableKey: "test:operating-payment",
    source: { kind: "organization", organizationId: accountId },
    recipient: { kind: "organization", organizationId: providerId },
    startsAt: world.currentDate,
    amount: money(10_000, "USD"),
    cadenceKind: "schedule:one-time",
    basisKind: "obligation:program",
    basisReference: {
      kind: "public-program",
      commitmentId,
      installmentIndex: 0,
    },
    restrictionKind: null,
    jurisdictionId: jurisdiction.id,
    provenance,
  });
  const flowId = world.history.resourceFlows.at(-1)!.id;
  world = recordResourceTransferOutcome(world, {
    stableKey: "test:paid-operating",
    resourceFlowId: flowId,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: money(10_000, "USD"),
    transferredAmount: money(10_000, "USD"),
    reasonKind: null,
    note: "Actual fixture cash transfer, not service delivery.",
    provenance,
  });
  part = appendProgram(world, jurisdiction.id, "installment", {
    commitmentId,
    installmentIndex: 0,
    status: "posted",
    resourceFlowId: flowId,
    reason: null,
  });
  world = part.world;
  const sourceEntityIds = [commitmentEventId];
  if (recipient) {
    world = createOrganizationParticipation(world, {
      stableKey: "test:requested-service",
      personId,
      organizationId: providerId,
      startedAt: world.currentDate,
      kind: SERVICE_RECIPIENT_KIND,
      roleKind: "participant:service-recipient",
      context: "Explicit request to take the fixture service trip.",
      provenance,
    });
    sourceEntityIds.push(world.history.organizationParticipations.at(-1)!.id);
  }
  world = createScheduledActivity(world, {
    stableKey: "test:actual-trip",
    title: "Recorded public-service trip",
    summary:
      "An explicitly scheduled fixture trip, with a recorded recipient and operator commitment.",
    kind: "travel",
    start: world.currentMoment,
    end: addSimulationMinutes(world.currentMoment, 60),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "test:trip",
      label: jurisdiction.name,
      jurisdictionId: jurisdiction.id,
    },
    sourceEntityIds,
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  const activityId = world.history.scheduledActivities.at(-1)!.id;
  if (complete) world = performScheduledActivity(world, activityId);
  return {
    world,
    personId,
    activityId,
    jurisdictionId: jurisdiction.id,
    questionKey: keyOfQuestion,
  };
}

const context = (f: ReturnType<typeof fixture>) => ({
  onDate: f.world.currentDate,
  activity: "service" as const,
  activityId: f.activityId,
  subjectIds: [f.personId],
  questionKey: f.questionKey,
});

describe("service kind reuses actual completion and recipient records", () => {
  it.each(
    lifePlaceStateIdentities().flatMap((state) =>
      Object.keys(SERVICE_DELIVERED_LAW_ROWS).map((key) => ({ state, key })),
    ),
  )(
    "preserves records and saves one named receipt: $state.jurisdictionKey / $key",
    ({ state, key }) => {
      const f = fixture(state.jurisdictionKey, true, true, key);
      const row = SERVICE_DELIVERED_LAW_ROWS[key]![0]!;
      const resolved = resolveLawServiceConsequence(f.world, row, context(f));
      expect(resolved, state.jurisdictionKey).toHaveLength(1);
      expect(resolved[0]!.value).toEqual({
        type: "amount",
        value: 1,
        unit: "hours",
      });
      const next = applyLawServiceConsequence(f.world, resolved[0]!);
      expect(next.history.events.length).toBe(
        f.world.history.events.length + 1,
      );
      expect(next.history.events.slice(0, -1)).toEqual(f.world.history.events);
      expect({
        ...next.history,
        events: f.world.history.events,
        nextSequence: f.world.history.nextSequence,
      }).toEqual(f.world.history);
      const receipt = next.history.events.at(-1)!;
      expect(receipt.participants[0]!.personId).toBe(f.personId);
      expect(receipt.lawEffectStamps?.[0]).toMatchObject({
        governingLawKey: resolved[0]!.law.measureId,
        questionKey: key,
        jurisdictionId: f.jurisdictionId,
        effectKind: "service-delivered",
      });
      const restored = deserializeWorld(serializeWorld(next));
      expect(applyLawServiceConsequence(restored, resolved[0]!)).toBe(restored);
      const repealed = enact(restored, f.jurisdictionId, "no", key);
      expect(
        resolveLawServiceConsequence(repealed, row, {
          ...context(f),
          onDate: repealed.currentDate,
        }),
      ).toEqual([]);
      expect(
        repealed.history.events.slice(0, restored.history.events.length),
      ).toEqual(restored.history.events);
    },
  );
  it("payment and a scheduled trip do not become delivered service", () => {
    const f = fixture(lifePlaceStateIdentities()[0]!.jurisdictionKey, false);
    expect(resolveLawServiceConsequence(f.world, row, context(f))).toEqual([]);
  });
  it("an activity participant does not become a service recipient without a saved request", () => {
    const f = fixture(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
      true,
      false,
    );
    expect(resolveLawServiceConsequence(f.world, row, context(f))).toEqual([]);
  });
  it("refuses tampered amounts and malformed bindings", () => {
    const f = fixture(lifePlaceStateIdentities()[0]!.jurisdictionKey);
    const resolved = resolveLawServiceConsequence(f.world, row, context(f))[0]!;
    expect(
      applyLawServiceConsequence(f.world, {
        ...resolved,
        value: { type: "amount", value: 999, unit: "hours" },
      }),
    ).toBe(f.world);
    expect(
      resolveLawServiceConsequence(
        f.world,
        {
          ...row,
          amount: { op: "constant", value: 1, unit: "hours", sourceIds: [] },
        },
        context(f),
      ),
    ).toEqual([]);
  });
});
