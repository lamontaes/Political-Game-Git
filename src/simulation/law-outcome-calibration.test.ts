import { describe, expect, it } from "vitest";
import {
  createLawOutcomeCalibration,
  assessLawOutcomeCalibration,
} from "./law-outcome-calibration";
import { createDemoWorld } from "./demo";
import { deserializeWorld, serializeWorld } from "./serialization";
import { OUTCOME_LINKS, outcomeLinkStatus, outcomeFactor } from "./outcome-web";

describe("law research is an opening calibration, not an outcome writer", () => {
  it("draws distinct seed targets once and preserves them in the saved world", () => {
    const first = createDemoWorld("law-calibration-first");
    const second = createDemoWorld("law-calibration-second");
    expect(first.lawOutcomeCalibration).toEqual(
      createLawOutcomeCalibration(first.seed),
    );
    expect(second.lawOutcomeCalibration).not.toEqual(
      first.lawOutcomeCalibration,
    );
    expect(Object.keys(first.lawOutcomeCalibration!)).toHaveLength(3);
    expect(Object.keys(first.openingLawEstimates!)).toHaveLength(56);
    for (const row of Object.values(first.openingLawEstimates!)) {
      expect(Number.isSafeInteger(row.publicRelationsAnnualPayCents)).toBe(
        true,
      );
      expect(row.publicRelationsAnnualPayCents).toBeGreaterThan(0);
    }
    expect(second.openingLawEstimates).not.toEqual(first.openingLawEstimates);
    expect(deserializeWorld(serializeWorld(first)).openingLawEstimates).toEqual(
      first.openingLawEstimates,
    );
    expect(Object.keys(first.openingLobbyistAnnualPayCents!)).toHaveLength(56);
    expect(second.openingLobbyistAnnualPayCents).not.toEqual(
      first.openingLobbyistAnnualPayCents,
    );
    expect(
      deserializeWorld(serializeWorld(first)).openingLobbyistAnnualPayCents,
    ).toEqual(first.openingLobbyistAnnualPayCents);
    for (const target of Object.values(first.lawOutcomeCalibration!)) {
      expect(target.target).toBeGreaterThanOrEqual(target.band[0]);
      expect(target.target).toBeLessThanOrEqual(target.band[1]);
      expect(target.lagMonths).toBeGreaterThanOrEqual(target.lagBandMonths[0]);
      expect(target.lagMonths).toBeLessThanOrEqual(target.lagBandMonths[1]);
    }
    expect(
      deserializeWorld(serializeWorld(first)).lawOutcomeCalibration,
    ).toEqual(first.lawOutcomeCalibration);
  });
  it("excludes all three calibration links from simulation multipliers", () => {
    const world = createDemoWorld("calibration-no-multiplier");
    const links = OUTCOME_LINKS.filter((link) => link.calibration);
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.size).toBeNull();
      expect(outcomeLinkStatus(link)).toBe("calibration-only");
      expect(
        outcomeFactor(
          world,
          world.jurisdictionOrder[0]!,
          link.to,
          world.currentDate,
        ),
      ).toEqual({ outcome: link.to, multiplier: 1, causes: [] });
    }
  });
  it("fails actual observations outside the band instead of replacing them", () => {
    const world = createDemoWorld("calibration-observation");
    const key = Object.keys(world.lawOutcomeCalibration!)[0]!;
    const target = world.lawOutcomeCalibration![key]!;
    expect(
      assessLawOutcomeCalibration(world, key, target.target, target.lagMonths)
        .status,
    ).toBe("PASS");
    const observed = target.band[1] + 1;
    const assessment = assessLawOutcomeCalibration(
      world,
      key,
      observed,
      target.lagMonths,
    );
    expect(assessment.status).toBe("FAIL");
    expect("observed" in assessment && assessment.observed).toBe(observed);
    expect(assessLawOutcomeCalibration(world, key, null, null).status).toBe(
      "unavailable",
    );
    expect(
      assessLawOutcomeCalibration(
        { ...world, lawOutcomeCalibration: undefined },
        key,
        0,
        0,
      ).status,
    ).toBe("unavailable");
  });
});
