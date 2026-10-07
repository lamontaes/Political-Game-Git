// Fixture copied from exact1316 handler test; C5 tests native completion instead of manual dispatch.
import { expect, it } from "vitest";
import { applyLawConsequences } from "../../src/simulation/enacted-law-effects";
import { addSimulationMinutes, daysBetween } from "../../src/simulation/dates";
import { createLegislativeScenario } from "../../src/simulation/legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
} from "../../src/simulation/legislation";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  createOrganization,
  createOrganizationParticipation,
} from "../../src/simulation/life";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { publicProgramRecordId } from "../../src/simulation/public-program-integrity";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../../src/simulation/resources";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import {
  createScheduledActivity,
  performScheduledActivity,
} from "../../src/simulation/time-work";
import {
  advanceWorld,
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import type {
  EntityId,
  PublicProgramRecord,
  World,
} from "../../src/simulation/types";
import {
  SERVICE_RECIPIENT_KIND,
  SERVICE_DELIVERED_LAW_ROWS,
  SERVICE_DELIVERED_REGISTRATION,
} from "../../src/simulation/law-consequences/service-delivered";

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

import { createLawConsequenceRegistry } from "../../src/simulation/law-consequence-registry";
import { personName } from "../../src/simulation/people";
import { nationalPlacePlan } from "./places";
import { scheduledActivityState } from "../../src/simulation/time-work";
it("native completed service uses the admitted registry and saves exactly one receipt", () => {
  const selected = nationalPlacePlan("c5-native-service-20260930", 1)
    .watched[0]!;
  const f = fixture(selected.jurisdictionKey, false);
  expect(createLawConsequenceRegistry().handlers.get("service-delivered")).toBe(
    SERVICE_DELIVERED_REGISTRATION,
  );
  expect(
    f.world.history.events.filter(
      (e) => e.type === "service.delivery-recorded",
    ),
  ).toHaveLength(0);
  const completed = performScheduledActivity(f.world, f.activityId);
  expect(scheduledActivityState(completed, f.activityId).status).toBe(
    "completed",
  );
  const receipts = completed.history.events.filter(
    (e) => e.type === "service.delivery-recorded",
  );
  expect(receipts).toHaveLength(1);
  expect(receipts[0]!.participants[0]!.personId).toBe(f.personId);
  expect(receipts[0]!.lawEffectStamps![0]!.questionKey).toBe(f.questionKey);
  const restored = deserializeWorld(serializeWorld(completed));
  const repeat = applyLawConsequences(restored, {
    ...context(f),
    onDate: restored.currentDate,
  });
  expect(repeat).toBe(restored);
  console.log(
    JSON.stringify({
      person: personName(completed.people[f.personId]!),
      place: selected.jurisdictionKey,
      activityId: f.activityId,
      receiptId: receipts[0]!.id,
      receipt: receipts[0]!.summary,
      law: receipts[0]!.lawEffectStamps![0]!.governingLawKey,
    }),
  );
});
