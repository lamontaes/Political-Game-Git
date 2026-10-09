import { describe, expect, it } from "vitest";
import {
  paidLeaveBenefitMinor as legacyBenefit,
  paidLeaveCoveredDays as legacyCoveredDays,
  PAID_LEAVE_BENEFIT_RULES,
  type PaidLeaveBenefitRate,
} from "../../simulation/paid-leave-benefits";
import { STATES } from "../../simulation/state-reference";
import {
  paidLeaveBenefitFromFacts,
  paidLeaveCoveredDaysFromFacts,
} from "./paid-leave";

describe("standalone paid-leave benefit rules", () => {
  it.each(Object.keys(STATES))(
    "matches legacy benefit math for US-%s",
    (usps) => {
      const base = usps.charCodeAt(0);
      const absence = {
        seriousOwnDaysSinceOnset: [1, 5, 7, 9, 14].map(
          (day) => day + (base % 2),
        ),
        seriousCaringDays: base % 4,
      };
      const unpaidDays = 10;
      const covered = paidLeaveCoveredDaysFromFacts(
        absence,
        unpaidDays,
        PAID_LEAVE_BENEFIT_RULES.ownConditionWaitingDays,
      );
      expect(covered).toBe(legacyCoveredDays(absence, unpaidDays));

      const rate: PaidLeaveBenefitRate = {
        percent: 65 + (base % 5),
        maxWeeklyMinor: 110_000 + base * 100,
      };
      const periodPayMinor = 300_000 + base * 100;
      const workdays = 10;
      expect(
        paidLeaveBenefitFromFacts(rate, periodPayMinor, workdays, covered),
      ).toBe(legacyBenefit(rate, periodPayMinor, workdays, covered));
    },
  );
});
