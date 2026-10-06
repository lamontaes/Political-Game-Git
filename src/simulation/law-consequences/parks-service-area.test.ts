import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { hasHouseholdResidenceInJurisdiction } from "../life-queries";
import { publicProgramRecordId } from "../public-program-integrity";
import { recordWorldEvent } from "../world";
import { lawExposureSentence } from "../../presentation/law-exposure-lines";
import { applyLawConsequences } from "../enacted-law-effects";
import { receiveParksCapacityOutturn } from "./modules/civil-family-services";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "../law-consequence-registry";
import type {
  EntityId,
  PublicProgramCapacityOutturnRecord,
  PublicProgramRecord,
  World,
} from "../types";
import { fundedServiceFixture } from "../../../tests/fixtures/funded-service-fixture";

const PARKS =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";

function saveParkRecord(
  world: World,
  kind: PublicProgramRecord["kind"],
  fields: object,
): { world: World; record: PublicProgramRecord } {
  const stableKey = `test:parks-area:${kind}:${world.history.nextSequence}`;
  const personId = (Object.keys(world.people) as EntityId[])[0]!;
  const eventWorld = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type: `public-program.${kind}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.history.legislativeMeasures!.at(-1)!.jurisdictionId,
    involvedEntityIds: [personId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["fixture.parks-area"],
    summary: "Explicit saved parks service-area test record.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const sequence = eventWorld.history.nextSequence;
  const jurisdictionId =
    world.history.legislativeMeasures!.at(-1)!.jurisdictionId;
  const record = {
    ...fields,
    id: publicProgramRecordId(eventWorld, stableKey),
    stableKey,
    sequence,
    kind,
    programKey: "parks:service-area-test",
    jurisdictionId,
    recordedAt: world.currentDate,
    eventId: eventWorld.history.events.at(-1)!.id,
  } as PublicProgramRecord;
  const next: World = {
    ...eventWorld,
    history: {
      ...eventWorld.history,
      nextSequence: sequence + 1,
      publicProgramRecords: [
        ...(eventWorld.history.publicProgramRecords ?? []),
        record,
      ],
    },
  };
  return { world: next, record };
}

describe("parks law area effects", () => {
  it("lands only a law-linked saved improvement on addresses in the service area", () => {
    const funded = fundedServiceFixture("US-AK", PARKS);
    const before = (Object.keys(funded.world.people) as EntityId[]).filter(
      (personId) =>
        hasHouseholdResidenceInJurisdiction(
          funded.world,
          personId,
          funded.jurisdiction.id,
        ),
    );
    expect(before.length).toBeGreaterThan(0);

    const sourceAppropriation = funded.world.history.publicProgramRecords!.find(
      (record) => record.kind === "appropriation",
    )!;
    const appropriation = saveParkRecord(funded.world, "appropriation", {
      accountOrganizationId: sourceAppropriation.accountOrganizationId,
      amount: sourceAppropriation.amount,
      availableFrom: funded.world.currentDate,
      availableThrough: addDays(funded.world.currentDate, 30),
      basis: sourceAppropriation.basis,
      sourceMeasureId: funded.measureId,
    });
    const commitment = saveParkRecord(appropriation.world, "commitment", {
      appropriationId: appropriation.record.id,
      alternativeKey: "park-maintenance",
      alternativeTitle: "Park maintenance",
      decidedByPersonId: funded.personId,
      authority: "Explicit saved test authority.",
      recipientOrganizationId: funded.providerId,
      installments: [
        {
          dueAt: funded.world.currentDate,
          amount: sourceAppropriation.amount,
          purpose: "maintenance",
        },
      ],
      deliveryLeadDays: 1,
    });
    const sourceInstallment = funded.world.history.publicProgramRecords!.find(
      (record) => record.kind === "installment",
    )!;
    const installment = saveParkRecord(commitment.world, "installment", {
      commitmentId: commitment.record.id,
      installmentIndex: 0,
      status: "posted",
      resourceFlowId: sourceInstallment.resourceFlowId,
      reason: null,
    });
    const outturn = saveParkRecord(installment.world, "capacity-outturn", {
      commitmentId: commitment.record.id,
      installmentId: installment.record.id,
      unitsOperational: 4,
      restoredUnits: 2,
      serviceLabel: "Park opening hours",
      unitLabel: "hours per week",
      placeLabel: funded.jurisdiction.name,
    });
    const savedOutturn = outturn.record;
    expect(savedOutturn.kind).toBe("capacity-outturn");
    if (savedOutturn.kind !== "capacity-outturn") throw new Error("fixture");
    if (commitment.record.kind !== "commitment") throw new Error("fixture");
    const worldWithOutturn: World = {
      ...outturn.world,
      history: {
        ...outturn.world.history,
        publicProgramRecords: [
          ...(outturn.world.history.publicProgramRecords ?? []),
          savedOutturn,
        ],
      },
    };
    const reached = receiveParksCapacityOutturn(
      worldWithOutturn,
      savedOutturn,
      commitment.record,
    );
    const exposures = reached.history.lawExposures ?? [];
    expect(
      exposures.filter((row) => row.sourceRecordId === savedOutturn.id),
    ).toHaveLength(before.length);
    expect(
      exposures
        .filter((row) => row.sourceRecordId === savedOutturn.id)
        .every(
          (row) =>
            row.measureId === funded.measureId &&
            row.direction === "none" &&
            row.amount === null &&
            row.cadence === null,
        ),
    ).toBe(true);
    const areaExposure = exposures.find(
      (row) => row.sourceRecordId === savedOutturn.id,
    )!;
    expect(areaExposure.stableKey).toContain(
      `${savedOutturn.id}:${appropriation.record.id}:${funded.measureId}`,
    );
    expect(
      lawExposureSentence(reached, areaExposure.personId, areaExposure),
    ).toContain("4 operational hours per week");
    expect(
      exposures
        .filter((row) => row.sourceRecordId === savedOutturn.id)
        .map((row) => row.personId)
        .sort(),
    ).toEqual(before.sort());
    expect(
      receiveParksCapacityOutturn(reached, savedOutturn, commitment.record),
    ).toBe(reached);

    const zeroOutturn = {
      ...savedOutturn,
      id: `zero:${savedOutturn.id}` as EntityId,
      unitsOperational: 0,
      restoredUnits: 0,
    };
    const worldWithZeroOutturn: World = {
      ...worldWithOutturn,
      history: {
        ...worldWithOutturn.history,
        publicProgramRecords: [
          ...(worldWithOutturn.history.publicProgramRecords ?? []),
          zeroOutturn,
        ],
      },
    };
    const zeroReached = receiveParksCapacityOutturn(
      worldWithZeroOutturn,
      zeroOutturn,
      commitment.record,
    );
    const zeroCause = zeroReached.history.lawExposures!.filter(
      (row) => row.sourceRecordId === zeroOutturn.id,
    );
    expect(zeroCause).toHaveLength(before.length);
    expect(
      zeroCause.every((row) => row.direction === "none" && row.amount === null),
    ).toBe(true);
    expect(
      lawExposureSentence(zeroReached, zeroCause[0]!.personId, zeroCause[0]!),
    ).toContain("closed is derived from the count");

    const unknownOutturn = {
      ...savedOutturn,
      id: `unknown:${savedOutturn.id}` as EntityId,
      restoredUnits: null,
    };
    const worldWithUnknownOutturn: World = {
      ...worldWithOutturn,
      history: {
        ...worldWithOutturn.history,
        publicProgramRecords: [
          ...(worldWithOutturn.history.publicProgramRecords ?? []),
          unknownOutturn,
        ],
      },
    };
    const unknownReached = receiveParksCapacityOutturn(
      worldWithUnknownOutturn,
      unknownOutturn,
      commitment.record,
    );
    const unknownCause = unknownReached.history.lawExposures!.find(
      (row) => row.sourceRecordId === unknownOutturn.id,
    )!;
    expect(
      lawExposureSentence(unknownReached, unknownCause.personId, unknownCause),
    ).toContain("newly restored is unknown and estimated");
  });

  it("writes nothing when no park service units changed", () => {
    const funded = fundedServiceFixture("US-AK", PARKS);
    const outturn: PublicProgramCapacityOutturnRecord = {
      id: "saved-outturn" as EntityId,
      stableKey: "saved-outturn",
      sequence: funded.world.history.nextSequence,
      eventId: "saved-event" as EntityId,
      kind: "capacity-outturn" as const,
      programKey: "parks:service-area-test",
      jurisdictionId: funded.jurisdiction.id,
      recordedAt: funded.world.currentDate,
      commitmentId: "missing-commitment" as EntityId,
      installmentId: "missing-installment" as EntityId,
      unitsOperational: 0,
      restoredUnits: 0,
    };
    const context = {
      onDate: funded.world.currentDate,
      activity: "service" as const,
      activityId: outturn.id,
      subjectIds: [],
      questionKey: PARKS,
      governingLawId: funded.measureId,
    };
    expect(
      applyLawConsequences(
        funded.world,
        context,
        LAW_CONSEQUENCE_REGISTRATIONS,
      ),
    ).toBe(funded.world);
    expect(funded.world.history.lawExposures ?? []).toEqual([]);
  });
});
