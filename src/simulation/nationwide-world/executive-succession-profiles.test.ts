import { describe, expect, it } from "vitest";

import { isoDateFromParts } from "../dates";
import { US_STATE_USPS } from "./state-executive-candidacy-packs";
import { governorSuccessionLineForTitle } from "./governor-succession";
import { EXECUTIVE_SUCCESSION_PROFILES } from "./executive-succession-profiles";
import { createExecutiveSuccessionWorldRuleStore } from "./executive-succession-world-rules";

describe("source-backed executive succession profiles", () => {
  it("covers exactly the fifty states without treating territories as states", () => {
    const expected = US_STATE_USPS.map((usps) => `US-${usps}`).sort();
    const stateCodes = new Set<string>(US_STATE_USPS);
    const allTwoLetterKeys = Object.keys(EXECUTIVE_SUCCESSION_PROFILES)
      .filter((key) => /^US-[A-Z]{2}$/.test(key))
      .sort();
    const actual = allTwoLetterKeys.filter((key) =>
      stateCodes.has(key.slice(3)),
    );
    const additional = allTwoLetterKeys.filter(
      (key) => !stateCodes.has(key.slice(3)),
    );

    expect(actual).toEqual(expected);
    expect(additional).toEqual(
      ["US-AS", "US-DC", "US-GU", "US-MP", "US-PR", "US-VI"].sort(),
    );
    for (const jurisdictionKey of expected) {
      const profile = EXECUTIVE_SUCCESSION_PROFILES[jurisdictionKey]!;
      expect(profile.jurisdictionKey).toBe(jurisdictionKey);
      expect(profile.usps).toBe(jurisdictionKey.slice(3));
      expect(profile.permanentVacancy.status).toBe("verified");
      if (profile.permanentVacancy.status === "verified") {
        expect(profile.permanentVacancy.steps.length).toBeGreaterThan(0);
        expect(profile.permanentVacancy.source.citation.length).toBeGreaterThan(
          0,
        );
        expect(profile.permanentVacancy.source.url).toMatch(/^https:\/\//);
        expect(profile.permanentVacancy.source.pinpoint.length).toBeGreaterThan(
          0,
        );
        expect(profile.permanentVacancy.source.effectiveAsOf).toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        );
      }
    }
  });

  it("saves source-backed first lines separately from representative rules when conditions need a game profile", () => {
    const first = createExecutiveSuccessionWorldRuleStore(
      "succession-world-profile-test",
      isoDateFromParts(2026, 9, 23),
    );
    const repeated = createExecutiveSuccessionWorldRuleStore(
      "succession-world-profile-test",
      isoDateFromParts(2026, 9, 23),
    );
    expect(first).toEqual(repeated);
    expect(Object.keys(first.rules)).toHaveLength(56);
    expect(first.rules.ME!.lineEffectBasis).toBe("game-profile");
    expect(first.rules.OR!.lineEffectBasis).toBe("game-profile");
    expect(first.rules.NH!.lineEffectBasis).toBe("source-backed");
    expect(first.rules.AZ!.handoff).toBe("special-election");
    expect(first.rules.AZ!.handoffBasis).toBe("game-profile");
    expect(
      Object.values(first.rules).filter(
        (rule) => rule.lineEffectBasis === "source-backed",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      Object.values(first.rules).filter(
        (rule) => rule.lineEffectBasis === "game-profile",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("normalizes only the three supported first-line office families", () => {
    expect(governorSuccessionLineForTitle(" Lieutenant Governor ")).toBe(
      "lieutenant-governor",
    );
    expect(
      governorSuccessionLineForTitle("President pro tempore of the Senate"),
    ).toBe("senate-president");
    expect(governorSuccessionLineForTitle("Speaker of the Senate")).toBe(
      "senate-president",
    );
    expect(governorSuccessionLineForTitle("Secretary of State")).toBe(
      "secretary-of-state",
    );
    expect(governorSuccessionLineForTitle("Speaker of the House")).toBeNull();
    expect(governorSuccessionLineForTitle("Secretary")).toBeNull();
  });

  it("keeps the source title and disposition for state senate first lines", () => {
    for (const [stateUsps, disposition] of [
      ["NH", "acts"],
      ["TN", "succeeds"],
      ["WV", "acts"],
    ] as const) {
      const profile = EXECUTIVE_SUCCESSION_PROFILES[`US-${stateUsps}`]!;
      expect(profile.permanentVacancy.status).toBe("verified");
      if (profile.permanentVacancy.status !== "verified") continue;
      const first = profile.permanentVacancy.steps[0]!;
      expect(governorSuccessionLineForTitle(first.office)).toBe(
        "senate-president",
      );
      expect(first.disposition).toBe(disposition);
    }
  });
});
