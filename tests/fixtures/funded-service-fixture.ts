import { expect } from "vitest";
import { daysBetween } from "../../src/simulation/dates";
import { createLegislativeScenario } from "../../src/simulation/legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
} from "../../src/simulation/legislation";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import { createOrganization } from "../../src/simulation/life";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { publicProgramRecordId } from "../../src/simulation/public-program-integrity";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../../src/simulation/resources";
import {
  advanceWorld,
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import { SERVICE_DELIVERED_LAW_ROWS } from "../../src/simulation/law-consequences/service-delivered-data";
import type {
  EntityId,
  PublicProgramRecord,
  World,
} from "../../src/simulation/types";

/**
 * A funded service in one place: an enacted service law, its appropriation,
 * an operator's commitment and one posted operating payment. Every amount is
 * an authored test contract. No recipient, request or trip is written here.
 */

export const questionKey =
  "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours";
export const programKey = "transit:bus-service";
export const provenance = {
  kind: "authored" as const,
  note: "Explicit L1 test contract; no production amount or forecast.",
};
export const procedure = createLegislativeScenario("alaska");
const catalog = createProductionPolicyCatalog();
export const base = {
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

export function enact(
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

export function appendProgram(
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

export function fundedServiceFixture(
  stateKey: string,
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
  return {
    world,
    personId,
    jurisdiction,
    measureId,
    providerId,
    commitmentId,
    commitmentEventId,
  };
}
