import { describe, expect, it } from "vitest";

import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
} from "./legislative-starting-procedures";
import { legislatureForState } from "./legislature-game-profile";
import { rulePackById } from "./legislature-rule-packs";
import { stateJurisdictionForKey } from "./life-places";
import { STATES, TERRITORY_USPS } from "./state-reference";

const allStateKeys = Object.keys(STATES)
  .filter((usps) => usps !== "DC" && !TERRITORY_USPS.has(usps))
  .map((usps) => `US-${usps}`)
  .sort();

describe("saved legislative starting procedures", () => {
  it("covers precisely the fifty states under canonical jurisdiction keys and IDs", () => {
    const procedures = drawLegislativeStartingProcedures({
      seed: "civic-world",
    });

    expect(allStateKeys).toHaveLength(50);
    expect(Object.keys(procedures)).toEqual(allStateKeys);
    for (const key of allStateKeys) {
      expect(procedures[key]?.jurisdictionKey).toBe(key);
      expect(procedures[key]?.jurisdictionId).toBe(
        stateJurisdictionForKey(key)?.id,
      );
      expect(procedures[key]?.procedureProvenance).toEqual({
        kind: "game-profile",
        version: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
      });
    }
  });

  it("is deterministic per seed, with independent variation across seeds", () => {
    const first = drawLegislativeStartingProcedures({ seed: "civic-world" });
    expect(drawLegislativeStartingProcedures({ seed: "civic-world" })).toEqual(
      first,
    );

    const second = drawLegislativeStartingProcedures({ seed: "another-world" });
    expect(
      allStateKeys.some((key) => {
        const prior = first[key]!;
        const next = second[key]!;
        return (
          prior.effectiveDateDays !== next.effectiveDateDays ||
          prior.sessionCadence !== next.sessionCadence ||
          prior.sessionYearParity !== next.sessionYearParity ||
          JSON.stringify(prior.regularSessionCutoff) !==
            JSON.stringify(next.regularSessionCutoff) ||
          prior.measuresCarryOver !== next.measuresCarryOver
        );
      }),
    ).toBe(true);
  });

  it("limits active fields to bounded procedure choices", () => {
    const procedures = drawLegislativeStartingProcedures({ seed: "range" });
    for (const entry of Object.values(procedures)) {
      expect([75, 90, 105]).toContain(entry.effectiveDateDays);
      expect(["annual", "biennial"]).toContain(entry.sessionCadence);
      expect(["odd", "even", null]).toContain(entry.sessionYearParity);
      expect(entry.sessionYearParity === null).toBe(
        entry.sessionCadence === "annual",
      );
      if (entry.regularSessionCutoff !== null) {
        expect([
          { month: 5, day: 31 },
          { month: 6, day: 30 },
          { month: 7, day: 31 },
        ]).toContainEqual(entry.regularSessionCutoff);
      }
      expect(typeof entry.measuresCarryOver).toBe("boolean");
    }
    expect(
      new Set(
        Object.values(procedures).map((entry) => entry.effectiveDateDays),
      ),
    ).toEqual(new Set([75, 90, 105]));
    if (procedures["US-NV"]?.sessionCadence === "biennial") {
      expect(procedures["US-NV"].sessionYearParity).toBe("odd");
    }
  });

  it("snapshots full baseline packs without changing structural institutions", () => {
    const procedures = drawLegislativeStartingProcedures({ seed: "snapshot" });
    for (const key of allStateKeys) {
      const baseline = rulePackById(legislatureForState(key)!.packId);
      const saved = procedures[key]!.baselinePack;
      expect(saved).toEqual(baseline);
      expect(saved).not.toBe(baseline);
      expect(saved.packId).toBe(baseline.packId);
      expect(saved.chambers.map((chamber) => chamber.chamberKey)).toEqual(
        baseline.chambers.map((chamber) => chamber.chamberKey),
      );
    }
    expect(procedures["US-NE"]?.baselinePack.structure).toBe("unicameral");
    expect(procedures["US-NE"]?.baselinePack.chambers).toHaveLength(1);
  });

  it("preserves typed sourced session limits and fills only unresolved cutoffs", () => {
    const procedures = drawLegislativeStartingProcedures({ seed: "cutoffs" });
    for (const key of allStateKeys) {
      const entry = procedures[key]!;
      const sourceLimit =
        entry.baselinePack.session.regularSessionLatestAdjournment;
      expect(entry.regularSessionCutoff === null).toBe(
        sourceLimit !== undefined,
      );
    }
    expect(procedures["US-KY"]?.regularSessionCutoff).toBeNull();
    expect(
      procedures["US-KY"]?.baselinePack.session.regularSessionLatestAdjournment
        ?.value,
    ).toEqual({
      oddYear: { month: 3, day: 30 },
      evenYear: { month: 4, day: 15 },
    });
  });
});
