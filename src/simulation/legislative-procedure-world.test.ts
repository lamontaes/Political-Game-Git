import { describe, expect, it } from "vitest";

import { drawLegislativeStartingProcedures } from "./legislative-starting-procedures";
import {
  activeLegislativePackFromEntry,
  legislativeRulePackForWorld,
  regularSessionYearForWorld,
} from "./legislative-procedure-world";
import { assertRulePackIntegrity } from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import { legislatureForState } from "./legislature-game-profile";
import { stateJurisdictionForKey } from "./life-places";
import { createWorld } from "./world";
import { makeIsoDate } from "./dates";
import { resolveLegislativeEffectiveDate } from "./legislative-effective-date";

describe("saved active legislative procedure", () => {
  it("keeps every state's institutional structure and identifies game rules", () => {
    const entries = drawLegislativeStartingProcedures({ seed: "active-law" });
    expect(Object.values(entries)).toHaveLength(50);
    for (const entry of Object.values(entries)) {
      const active = activeLegislativePackFromEntry(entry);
      const playable = rulePackById(entry.baselinePack.packId);
      expect(() => assertRulePackIntegrity(active)).not.toThrow();
      expect(active.packId).toBe(entry.baselinePack.packId);
      expect(active.structure).toBe(entry.baselinePack.structure);
      expect(active.chamberOrder).toEqual(entry.baselinePack.chamberOrder);
      expect(active.chambers).toEqual(entry.baselinePack.chambers);
      expect(
        active.chambers.map((chamber) => ({
          chamberKey: chamber.chamberKey,
          committees: chamber.committees,
        })),
        entry.jurisdictionKey,
      ).toEqual(
        playable.chambers.map((chamber) => ({
          chamberKey: chamber.chamberKey,
          committees: chamber.committees,
        })),
      );
      expect(active.session.regularSessionYears?.value).toBe(
        entry.sessionYearParity ?? "annual",
      );
      expect(active.session.measuresDieAtAdjournment).toMatchObject({
        kind: "known",
        value: !entry.measuresCarryOver,
        source: { verification: "game-profile" },
      });
      expect(active.enactment.defaultEffectiveSchedule).toMatchObject({
        kind: "known",
        value: { kind: "days-after-enactment", days: entry.effectiveDateDays },
        source: { verification: "game-profile" },
      });
      expect(
        resolveLegislativeEffectiveDate(active, makeIsoDate("2026-02-01")).kind,
      ).toBe("game-default");
      if (entry.regularSessionCutoff) {
        expect(active.session.regularSessionLatestAdjournment).toMatchObject({
          kind: "known",
          value: {
            oddYear: entry.regularSessionCutoff,
            evenYear: entry.regularSessionCutoff,
          },
          source: { verification: "game-profile" },
        });
      } else {
        expect(active.session.regularSessionLatestAdjournment).toEqual(
          entry.baselinePack.session.regularSessionLatestAdjournment,
        );
      }
    }
  });

  it("keeps a save without a starting procedure on its legacy pack and calendar", () => {
    const jurisdiction = stateJurisdictionForKey("US-KY")!;
    const world = createWorld({
      seed: "legacy-legislature",
      currentDate: makeIsoDate("2026-01-01"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    const pack = rulePackById(legislatureForState("US-KY")!.packId);
    expect(legislativeRulePackForWorld(world, pack.packId)).toBe(pack);
    expect(regularSessionYearForWorld(world, jurisdiction.id, 2027)).toBe(true);
  });
});
