import { describe, expect, it } from "vitest";
import {
  annualTax as legacyAnnualTax,
  withholdingForPaycheck as legacyWithholding,
  type IncomeTaxSchedule,
} from "../../simulation/income-tax-withholding";
import { STATES } from "../../simulation/state-reference";
import {
  annualTaxMinor,
  withholdingForPaycheckFromFacts,
} from "./income-tax-calculation";

describe("standalone annual tax and paycheck withholding rules", () => {
  it.each(Object.keys(STATES))("matches legacy tax math for US-%s", (usps) => {
    const income = 4_000_000 + usps.charCodeAt(0) * 10_000;
    const schedule: IncomeTaxSchedule = {
      standardDeductionMinor: 1_500_000 + usps.charCodeAt(1) * 1000,
      brackets: [
        { overMinor: 0, rateBasisPoints: 1000 },
        { overMinor: income / 2, rateBasisPoints: 2200 },
        { overMinor: income, rateBasisPoints: 3700 },
      ],
      sourceUrl: "https://www.irs.gov/",
    };
    expect(annualTaxMinor(income, schedule.brackets)).toBe(
      legacyAnnualTax(income, schedule.brackets),
    );
    const paycheckMinor = Math.floor(income / 26);
    expect(
      withholdingForPaycheckFromFacts(paycheckMinor, 26, schedule),
    ).toEqual(legacyWithholding(paycheckMinor, 26, schedule));
  });
});
