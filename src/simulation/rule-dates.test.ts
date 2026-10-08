import { describe, expect, it } from "vitest";
import { STATES } from "./state-reference";
import { makeIsoDate } from "./dates";
import { stateTaxPowerEvidenceFor } from "./state-tax-authority";
import { localTaxPowerEvidenceFor } from "./local-tax-authority";
import { recordedStateSessionWindows } from "./governing/governing-calendar";
import {
  federalIncomeTaxScheduleFor,
  withholdingForPaycheck,
} from "./income-tax-withholding";
import { researchRuleTable } from "./research-rule-tables";
import sessionData from "../../data/research/laws/state-session-calendars-2026.json" with { type: "json" };

describe("dates are read from the assessed record and source year", () => {
  it.each(Object.keys(STATES))(
    "uses the shared dated readers in %s",
    (usps) => {
      const key = `US-${usps}`;
      const date = makeIsoDate("2037-04-05");
      expect(stateTaxPowerEvidenceFor(key, "sales", date)?.asOf).toBe(date);
      expect(
        localTaxPowerEvidenceFor({
          asOf: date,
          stateUsps: usps,
          level: "MUNICIPALITY",
          governmentKey: key,
          instrument: "property",
        }).asOf,
      ).toBe(date);
      expect(recordedStateSessionWindows(key, date)).toBeNull();
      const recordedDate = makeIsoDate(sessionData.asOf);
      expect(recordedStateSessionWindows(key, recordedDate)).toEqual(
        (
          sessionData.regularSessions as Readonly<
            Record<string, readonly unknown[]>
          >
        )[key] ?? null,
      );
    },
  );

  it("keeps the acquired tax year exact and marks every unread year", () => {
    const data = researchRuleTable("federalIncomeTaxes");
    const baseline = makeIsoDate(`${data.baselineTaxYear}-03-15`);
    const acquired = federalIncomeTaxScheduleFor("single", baseline);
    expect(acquired).toEqual(data.records[0]!.schedules.single);
    expect(acquired.estimatedFrom).toBeUndefined();
    for (const year of [data.baselineTaxYear - 1, data.baselineTaxYear + 1]) {
      const estimated = federalIncomeTaxScheduleFor(
        "single",
        makeIsoDate(`${year}-03-15`),
      );
      expect(estimated.taxYear).toBe(year);
      expect(estimated.estimatedFrom).toBe(data.estimate.estimatedFrom);
      expect(estimated.estimatedFrom).not.toBe("");
      // The compiled sample has one year: its median preserves the acquired amounts.
      expect(withholdingForPaycheck(100_000, 52, estimated)).toEqual(
        withholdingForPaycheck(100_000, 52, acquired),
      );
    }
  });
});
