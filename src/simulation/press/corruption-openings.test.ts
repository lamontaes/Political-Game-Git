import { describe, expect, it } from "vitest";
import { createPortabilityFixture } from "../portability-fixture";
import { chooseAppointee } from "../patronage/appointments";
import { recordRelationshipInteraction } from "../records";
import type {
  DecisionTraceRecord,
  EntityId,
  OfficeStaffPositionRecord,
  World,
} from "../types";
import {
  contractSteeringOpening,
  protectedPersonalAppointmentOpening,
  type NamedProgramPurchaseEvidence,
} from "./corruption-openings";

const purchase: NamedProgramPurchaseEvidence = {
  programRecordId: "program-1" as EntityId,
  programKey: "city:bus-service",
  purchaseRecordId: "purchase-1" as EntityId,
  awardRecordId: "award-1" as EntityId,
  vendorOrganizationId: "vendor-1" as EntityId,
  vendorPersonId: "vendor-person-1" as EntityId,
  purchaseJurisdictionId: "town-1" as EntityId,
  vendorJurisdictionId: "town-1" as EntityId,
  purchasePurpose: "services",
  awardingBodyId: "city-1" as EntityId,
  awardingOfficialPersonId: "official-1" as EntityId,
  authority: {
    status: "known",
    recordId: "authority-1" as EntityId,
    officialPersonId: "official-1" as EntityId,
    awardingBodyId: "city-1" as EntityId,
    scope: "goods-or-services-contract-award",
  },
  personalInterestRecordId: "interest-1" as EntityId,
  interestHolderPersonId: "official-1" as EntityId,
  interestedOrganizationId: "vendor-1" as EntityId,
  amountMinorUnits: 125_000,
  status: "paid",
};

function appointmentFixture(
  civilClass: OfficeStaffPositionRecord["civilClass"],
  personal = true,
) {
  const base = createPortabilityFixture();
  const [appointerPersonId, chosenPersonId, otherPersonId] = base.personOrder;
  if (!appointerPersonId || !chosenPersonId || !otherPersonId)
    throw new Error("Portability fixture needs three people.");
  const officeKey = "fixture-protected-office";
  let before = recordRelationshipInteraction(base, {
    stableKey: "fixture:protected-help-1",
    personIds: [chosenPersonId, appointerPersonId],
    eventId: null,
    occurredAt: base.currentDate,
    kind: "support:helped-through-a-hard-time",
    change: "strengthened",
    significance: "major",
    summary: "The candidate helped the appointer.",
    tags: [`relationship.actor:${String(chosenPersonId)}`],
  });
  before = recordRelationshipInteraction(before, {
    stableKey: "fixture:protected-help-2",
    personIds: [chosenPersonId, appointerPersonId],
    eventId: null,
    occurredAt: before.currentDate,
    kind: "support:helped-through-a-hard-time",
    change: "strengthened",
    significance: "major",
    summary: "The candidate helped the appointer again.",
    tags: [`relationship.actor:${String(chosenPersonId)}`],
  });
  const choice = chooseAppointee(before, {
    stableKey: "fixture:protected-appointment",
    appointerPersonId,
    post: { officeKey, title: "office director" },
    circle: [chosenPersonId, otherPersonId],
    eligible: () => true,
  });
  if (!choice) throw new Error("Fixture appointer did not choose anyone.");
  const chosenTrace = choice.world.history.decisionTraces.find(
    (trace) => trace.id === choice.decisionTraceId,
  )!;
  const optionKey = chosenTrace.selectedOptionKey!;
  const chosenId = optionKey.slice("person:".length) as EntityId;
  const otherId = [chosenPersonId, otherPersonId].find(
    (personId) => personId !== chosenId,
  )!;
  const trace: DecisionTraceRecord = {
    ...chosenTrace,
    context: {
      ...chosenTrace.context,
      considerations: personal
        ? [
            {
              stableKey: "fixture:personal-choice",
              optionKey,
              sourceType: "social:favor",
              direction: "supports",
              importance: "strong",
              confidence: "high",
              explanation: "The appointer repays a personal tie.",
              sourceRefs: [],
            },
            {
              stableKey: "fixture:merit-choice",
              optionKey: `person:${otherId}`,
              sourceType: "context:public-record",
              direction: "supports",
              importance: "strong",
              confidence: "high",
              explanation: "The other candidate has a stronger record.",
              sourceRefs: [],
            },
          ]
        : [],
    },
  };
  const position: OfficeStaffPositionRecord = {
    id: "position-1" as EntityId,
    stableKey: "fixture:position-1",
    sequence: 1,
    recordedAt: base.currentDate,
    officeKey,
    organizationId: "office-org-1" as EntityId,
    classKey: "fixture-position",
    title: "office director",
    duty: "Directs the office.",
    civilClass,
    civilClassBasis: "Fixture civil-service boundary.",
    profile: "fixture-office-staffing/v1",
  };
  const world: World = {
    ...choice.world,
    history: {
      ...choice.world.history,
      decisionTraces: choice.world.history.decisionTraces.map((row) =>
        row.id === trace.id ? trace : row,
      ),
      officeStaffPositions: [position],
    },
  };
  return { world, position, trace };
}

describe("corruption openings require a saved act and real authority", () => {
  it("leaves contract openings closed without the optional canonical purchase row", () => {
    expect(contractSteeringOpening(undefined)).toBeNull();
    expect(contractSteeringOpening(null)).toBeNull();
  });

  it("opens a contract lead only for a paid named-business award under the same official's saved authority", () => {
    expect(contractSteeringOpening(purchase)).toMatchObject({
      family: "M8",
      actorPersonIds: [purchase.awardingOfficialPersonId],
      participantPersonIds: [
        purchase.awardingOfficialPersonId,
        purchase.vendorPersonId,
      ],
      amountMinorUnits: purchase.amountMinorUnits,
      sourceRecordIds: [
        purchase.programRecordId,
        purchase.purchaseRecordId,
        purchase.awardRecordId,
        "authority-1" as EntityId,
        purchase.personalInterestRecordId,
      ],
    });
    expect(
      contractSteeringOpening({
        ...purchase,
        authority: { status: "unknown" },
      }),
    ).toBeNull();
    expect(
      contractSteeringOpening({ ...purchase, status: "failed" }),
    ).toBeNull();
    expect(
      contractSteeringOpening({
        ...purchase,
        authority: {
          status: "known",
          recordId: "authority-1" as EntityId,
          officialPersonId: "other-official" as EntityId,
          awardingBodyId: "city-1" as EntityId,
          scope: "goods-or-services-contract-award",
        },
      }),
    ).toBeNull();
    expect(
      contractSteeringOpening({
        ...purchase,
        authority: {
          status: "known",
          recordId: "authority-1" as EntityId,
          officialPersonId: "official-1" as EntityId,
          awardingBodyId: "other-city" as EntityId,
          scope: "goods-or-services-contract-award",
        },
      }),
    ).toBeNull();
    expect(
      contractSteeringOpening({
        ...purchase,
        vendorJurisdictionId: "another-town" as EntityId,
      }),
    ).toBeNull();
  });

  it("keeps a patronage opening closed when civil-service protection is unknown or absent", () => {
    const unknown = appointmentFixture("unknown");
    expect(
      protectedPersonalAppointmentOpening(unknown.world, {
        positionId: unknown.position.id,
        decisionTraceId: unknown.trace.id,
      }),
    ).toEqual({
      status: "closed",
      reason: "civil-service-protection-unknown",
    });

    const exempt = appointmentFixture("exempt");
    expect(
      protectedPersonalAppointmentOpening(exempt.world, {
        positionId: exempt.position.id,
        decisionTraceId: exempt.trace.id,
      }),
    ).toEqual({ status: "closed", reason: "position-not-protected" });
  });

  it("opens M10 only for a saved personal appointment to a classified post", () => {
    const fixture = appointmentFixture("classified");
    const result = protectedPersonalAppointmentOpening(fixture.world, {
      positionId: fixture.position.id,
      decisionTraceId: fixture.trace.id,
    });
    expect(result.status).toBe("opened");
    if (result.status !== "opened") throw new Error("Expected opening.");
    expect(result.opening.family).toBe("M10");
    expect(result.opening.actorPersonIds).toEqual([
      fixture.trace.context.actorPersonId,
    ]);
    expect(result.opening.participantPersonIds).toContain(
      fixture.trace.selectedOptionKey!.slice("person:".length),
    );

    const meritAppointment = appointmentFixture("classified", false);
    expect(
      protectedPersonalAppointmentOpening(meritAppointment.world, {
        positionId: meritAppointment.position.id,
        decisionTraceId: meritAppointment.trace.id,
      }),
    ).toEqual({
      status: "closed",
      reason: "appointment-was-not-personal",
    });
  });
});
