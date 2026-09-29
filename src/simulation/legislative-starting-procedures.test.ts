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

  it("is the same for every world: no seed draws a state's procedure", () => {
    const first = drawLegislativeStartingProcedures({ seed: "civic-world" });
    expect(
      drawLegislativeStartingProcedures({ seed: "another-world" }),
    ).toEqual(first);
  });

  it("reads each state's calendar from its researched session table", () => {
    const procedures = drawLegislativeStartingProcedures({ seed: "range" });
    for (const entry of Object.values(procedures)) {
      expect(entry.effectiveDateDays).toBe(90);
      expect(["annual", "biennial"]).toContain(entry.sessionCadence);
      expect(["odd", "even", null]).toContain(entry.sessionYearParity);
      expect(entry.sessionYearParity === null).toBe(
        entry.sessionCadence === "annual",
      );
      expect(typeof entry.measuresCarryOver).toBe("boolean");
    }
    // Nevada's compiled pack establishes biennial sessions in odd years.
    expect(procedures["US-NV"]?.sessionCadence).toBe("biennial");
    expect(procedures["US-NV"]?.sessionYearParity).toBe("odd");
    // Carryover follows the reference pack, never a draw.
    for (const key of allStateKeys) {
      const expiry =
        procedures[key]!.baselinePack.session.measuresDieAtAdjournment;
      expect(procedures[key]!.measuresCarryOver).toBe(
        expiry.kind === "known" ? !expiry.value : false,
      );
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

  it("preserves typed sourced session limits and fills only unresolved cutoffs from the table", () => {
    const procedures = drawLegislativeStartingProcedures({ seed: "cutoffs" });
    for (const key of allStateKeys) {
      const entry = procedures[key]!;
      const sourceLimit =
        entry.baselinePack.session.regularSessionLatestAdjournment;
      if (sourceLimit !== undefined)
        expect(entry.regularSessionCutoff).toBeNull();
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
