import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  stateScheduleForFilingStatus as legacyStateScheduleForFilingStatus,
  type IncomeTaxSchedule,
} from "../../simulation/income-tax-withholding";
import { stateIncomeTaxScheduleFromSingleFact } from "./state-income-tax-schedule";

const statuses = [
  "single",
  "married-filing-jointly",
  "head-of-household",
  "married-filing-separately",
] as const;
const places = lifePlaceStateIdentities();

describe("state filing-status schedule rule", () => {
  it.each(
    places.flatMap((place, index) =>
      statuses.map((status) => ({ place, index, status })),
    ),
  )(
    "matches the legacy schedule transform for $place.jurisdictionKey / $status",
    ({ index, status }) => {
      const single: IncomeTaxSchedule = {
        standardDeductionMinor: 100_000 + index * 100,
        brackets: [
          { overMinor: 0, rateBasisPoints: 200 },
          { overMinor: 500_000 + index * 100, rateBasisPoints: 500 },
        ],
        sourceUrl: "https://example.invalid/schedule-source",
      };
      expect(stateIncomeTaxScheduleFromSingleFact(single, status)).toEqual(
        legacyStateScheduleForFilingStatus(single, status),
      );
    },
  );
});
