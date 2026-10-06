import { describe, expect, it } from "vitest";
import { hasHouseholdResidenceInJurisdiction } from "../life-queries";
import { publicProgramRecordId } from "../public-program-integrity";
import { applyPublicProgramCapacityOutturnReceivers } from "../public-program-capacity-outturn";
import { recordWorldEvent } from "../world";
import { lawExposureSentence } from "../../presentation/law-exposure-lines";
import { applyLawConsequences } from "../enacted-law-effects";
import {
  createParksCapacityOutturnReceiver,
  registrations,
} from "./modules/civil-family-services";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "../law-consequence-registry";
import { deserializeWorld, serializeWorld } from "../serialization";
import type {
  EntityId,
  PublicProgramCapacityOutturnRecord,
  PublicProgramRecord,
  World,
} from "../types";
import { fundedServiceFixture } from "../../../tests/fixtures/funded-service-fixture";

const PARKS =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";

const localParksReceiver = createParksCapacityOutturnReceiver(
  (world, context, moduleRegistrations) =>
    applyLawConsequences(world, context, moduleRegistrations),
);
const localOutturnReceivers = [
  { key: "parks-local-composition", receive: localParksReceiver },
];

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
    programKey:
      (fields as { programKey?: string }).programKey ??
      "parks:service-area-test",
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
    const funded = fundedServiceFixture(
      "US-AK",
      PARKS,
      "parks:service-area-test",
    );
    const before = (Object.keys(funded.world.people) as EntityId[]).filter(
      (personId) =>
        hasHouseholdResidenceInJurisdiction(
          funded.world,
          personId,
          funded.jurisdiction.id,
        ),
    );
    expect(before.length).toBeGreaterThan(0);

    const records = funded.world.history.publicProgramRecords!;
    const appropriation = records.find(
      (record) =>
        record.kind === "appropriation" &&
        record.sourceMeasureId === funded.measureId,
    );
    if (appropriation?.kind !== "appropriation") throw new Error("fixture");
    const commitmentRecord = records.find(
      (record) =>
        record.kind === "commitment" &&
        record.appropriationId === appropriation.id,
    );
    if (commitmentRecord?.kind !== "commitment") throw new Error("fixture");
    const installmentRecord = records.find(
      (record) =>
        record.kind === "installment" &&
        record.commitmentId === commitmentRecord.id &&
        record.status === "posted",
    );
    if (installmentRecord?.kind !== "installment") throw new Error("fixture");
    const outturn = saveParkRecord(funded.world, "capacity-outturn", {
      programKey: commitmentRecord.programKey,
      commitmentId: commitmentRecord.id,
      installmentId: installmentRecord.id,
      unitsOperational: 4,
      restoredUnits: 2,
      serviceLabel: "Park opening hours",
      unitLabel: "hours per week",
      placeLabel: funded.jurisdiction.name,
    });
    const savedOutturn = outturn.record;
    expect(savedOutturn.kind).toBe("capacity-outturn");
    if (savedOutturn.kind !== "capacity-outturn") throw new Error("fixture");
    const worldWithOutturn = outturn.world;
    const reached = applyPublicProgramCapacityOutturnReceivers(
      funded.world,
      worldWithOutturn,
      commitmentRecord,
      installmentRecord,
      localOutturnReceivers,
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
      `${savedOutturn.id}:${appropriation.id}:${funded.measureId}`,
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
      applyPublicProgramCapacityOutturnReceivers(
        reached,
        reached,
        commitmentRecord,
        installmentRecord,
        localOutturnReceivers,
      ),
    ).toBe(reached);

    const continued = deserializeWorld(serializeWorld(reached));
    expect(continued.history.lawExposures).toEqual(
      reached.history.lawExposures,
    );
    expect(
      applyPublicProgramCapacityOutturnReceivers(
        continued,
        continued,
        commitmentRecord,
        installmentRecord,
        localOutturnReceivers,
      ),
    ).toBe(continued);

    const zeroSaved = saveParkRecord(worldWithOutturn, "capacity-outturn", {
      commitmentId: commitmentRecord.id,
      installmentId: installmentRecord.id,
      unitsOperational: 0,
      restoredUnits: 0,
      serviceLabel: "Park opening hours",
      unitLabel: "hours per week",
      placeLabel: funded.jurisdiction.name,
    });
    if (zeroSaved.record.kind !== "capacity-outturn")
      throw new Error("fixture");
    const zeroOutturn = zeroSaved.record;
    const zeroReached = applyPublicProgramCapacityOutturnReceivers(
      worldWithOutturn,
      zeroSaved.world,
      commitmentRecord,
      installmentRecord,
      localOutturnReceivers,
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

    const unknownSaved = saveParkRecord(zeroSaved.world, "capacity-outturn", {
      commitmentId: commitmentRecord.id,
      installmentId: installmentRecord.id,
      unitsOperational: 4,
      restoredUnits: null,
      serviceLabel: "Park opening hours",
      unitLabel: "hours per week",
      placeLabel: funded.jurisdiction.name,
    });
    if (unknownSaved.record.kind !== "capacity-outturn")
      throw new Error("fixture");
    const unknownOutturn = unknownSaved.record;
    const unknownReached = applyPublicProgramCapacityOutturnReceivers(
      zeroSaved.world,
      unknownSaved.world,
      commitmentRecord,
      installmentRecord,
      localOutturnReceivers,
    );
    const unknownCause = unknownReached.history.lawExposures!.find(
      (row) => row.sourceRecordId === unknownOutturn.id,
    )!;
    expect(
      lawExposureSentence(unknownReached, unknownCause.personId, unknownCause),
    ).toContain("newly restored is unknown and estimated");
  });

  it("writes nothing when no park service units changed", () => {
    const funded = fundedServiceFixture(
      "US-AK",
      PARKS,
      "parks:service-area-test",
    );
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
      applyLawConsequences(funded.world, context, [
        ...LAW_CONSEQUENCE_REGISTRATIONS,
        ...registrations,
      ]),
    ).toBe(funded.world);
    expect(funded.world.history.lawExposures ?? []).toEqual([]);
  });
});
