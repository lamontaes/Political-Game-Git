import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SUPREME_COURT_APPOINTMENT_PROFILE } from "./supreme-court-appointment-profile";

const FILES = [
  "supreme-court-appointments.ts",
  "supreme-court-appointment-profile.ts",
  "finding-restitution.ts",
];

describe("court and restitution values name their provenance", () => {
  it("leaves no placeholder, unresearched or blanket marker in these files", () => {
    for (const file of FILES) {
      const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(text, file).not.toMatch(/placeholder|unresearched|blanket/i);
    }
  });

  it("marks the vacancy-to-nomination time as an estimate with its dated cases", () => {
    const profile = SUPREME_COURT_APPOINTMENT_PROFILE;
    expect(profile.daysFromVacancyToNominationEstimated).toBe(true);
    expect(profile.daysFromVacancyToNominationEstimatedFrom).toMatch(
      /Garland.*Kavanaugh.*Barrett.*Jackson/,
    );
    expect(profile.daysFromVacancyToNomination).toBe(21);
  });
});
