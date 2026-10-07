import { describe, expect, it } from "vitest";
import {
  fundedServiceFixture,
  questionKey as ruralTransitQuestion,
} from "../../tests/fixtures/funded-service-fixture";
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
});
