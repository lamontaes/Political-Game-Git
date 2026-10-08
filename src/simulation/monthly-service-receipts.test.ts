import { describe, expect, it } from "vitest";
import { addSimulationMinutes } from "./dates";
import { childServiceFixture } from "../../tests/fixtures/child-service-fixture";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  fundedServiceFixture,
  questionKey as ruralTransitQuestion,
} from "../../tests/fixtures/funded-service-fixture";
import { juryCountyForPlace } from "./justice/jury-catchment";
import { requestPublicService } from "./public-service-requests";
import { publicProgramRecords } from "./public-program-integrity";
import type { EntityId } from "./types";
import {
  monthlyServiceReceiptSource,
  recordMonthlyServiceReceipts,
} from "./monthly-service-receipts";

describe("monthly service receipts", () => {
  it("records a paid law service for a served-place resident without an activity", () => {
    const fixture = fundedServiceFixture("US-AK", ruralTransitQuestion);
    const month = fixture.world.currentDate.slice(0, 7) + "-01";
    const world = recordMonthlyServiceReceipts(
      fixture.world,
      fixture.world.currentDate,
    );
    const receipt = monthlyServiceReceiptSource(
      world,
      fixture.measureId,
      fixture.personId,
      month as typeof fixture.world.currentDate,
    );
    expect(receipt).toMatchObject({
      personId: fixture.personId,
      measureId: fixture.measureId,
      channel: "public-service",
      direction: "gain",
      cadence: null,
      sourceRecordId: fixture.world.history.resourceTransferOutcomes.at(-1)!.id,
    });
    expect(fixture.world.history.scheduledActivities).toHaveLength(0);
  });

  it("records a child service only after the child enrolls with the paid provider", () => {
    const fixture = childServiceFixture(
      {
        question: "us-policy-positions:education.universal-preschool",
        name: "pre-K",
        age: 4,
      },
      "session10-monthly-pre-k-enrollment",
    );
    const measureId = fixture.funded.history.legislativeMeasures!.at(-1)!.id;
    const month = fixture.funded.currentDate.slice(0, 7) + "-01";
    const beforeEnrollment = recordMonthlyServiceReceipts(
      fixture.funded,
      fixture.funded.currentDate,
    );
    expect(
      monthlyServiceReceiptSource(
        beforeEnrollment,
        measureId,
        fixture.childId,
        month as typeof fixture.funded.currentDate,
      ),
    ).toBeUndefined();

    const start = addSimulationMinutes(fixture.funded.currentMoment, 30);
    const request = requestPublicService(fixture.funded, {
      personId: fixture.parentId,
      forPersonId: fixture.childId,
      commitmentId: fixture.commitmentId,
      start,
      end: addSimulationMinutes(start, 360),
    });
    expect(request.kind).toBe("scheduled");
    if (request.kind !== "scheduled") throw new Error(request.reason);
    const afterEnrollment = recordMonthlyServiceReceipts(
      request.world,
      request.world.currentDate,
    );
    expect(
      monthlyServiceReceiptSource(
        afterEnrollment,
        measureId,
        fixture.childId,
        month as typeof fixture.funded.currentDate,
      ),
    ).toMatchObject({ personId: fixture.childId, measureId });
    expect(
      monthlyServiceReceiptSource(
        afterEnrollment,
        measureId,
        fixture.parentId,
        month as typeof fixture.funded.currentDate,
      ),
    ).toBeUndefined();
  });

  it("uses the voted measure for a funded county service", () => {
    const fixture = fundedServiceFixture("US-AK", ruralTransitQuestion);
    const place = drawRandomPlace(
      "session10-county-service-receipt",
      (candidate) =>
        candidate.stateJurisdictionKey === "US-AK" &&
        juryCountyForPlace(candidate.context.jurisdiction.id) !== null,
    );
    const countyGeoid = juryCountyForPlace(place.context.jurisdiction.id)!;
    const countyProgramKey = `county-health-clinics:${countyGeoid}`;
    const countyJurisdictionId =
      `county-jurisdiction:${countyGeoid}` as EntityId;
    // The fixture's enacted service law stands in for the adopted county budget
    // measure so recordLawExposure can validate the source as a real law.
    const budgetMeasureId = fixture.measureId;
    const appropriationId = publicProgramRecords(fixture.world).find(
      (record) => record.kind === "appropriation",
    )!.id;
    const records = publicProgramRecords(fixture.world).map((record) => {
      if (record.id === fixture.commitmentId)
        return {
          ...record,
          programKey: countyProgramKey,
          jurisdictionId: countyJurisdictionId,
        };
      if (record.id === appropriationId && record.kind === "appropriation")
        return {
          ...record,
          programKey: countyProgramKey,
          jurisdictionId: countyJurisdictionId,
          sourceMeasureId: budgetMeasureId,
        };
      return record;
    });
    const resident = fixture.world.people[fixture.personId]!;
    const countyWorld = {
      ...fixture.world,
      people: {
        ...fixture.world.people,
        [fixture.personId]: {
          ...resident,
          homeJurisdictionId: place.context.jurisdiction.id,
        },
      },
      jurisdictions: {
        ...fixture.world.jurisdictions,
        [place.context.jurisdiction.id]: place.context.jurisdiction,
      },
      history: {
        ...fixture.world.history,
        publicProgramRecords: records,
      },
    };
    const month = countyWorld.currentDate.slice(0, 7) + "-01";
    const world = recordMonthlyServiceReceipts(
      countyWorld,
      countyWorld.currentDate,
    );
    expect(
      monthlyServiceReceiptSource(
        world,
        budgetMeasureId,
        fixture.personId,
        month as typeof countyWorld.currentDate,
      ),
    ).toMatchObject({
      measureId: budgetMeasureId,
      channel: "public-service",
      sourceRecordId: fixture.world.history.resourceTransferOutcomes.at(-1)!.id,
    });
  });
});
