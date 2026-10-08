import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { US_CONGRESS_RULE_PACK } from "./congress-rule-pack";
import { legislatureForState } from "./legislature-game-profile";
import { rulePackById } from "./legislature-rule-packs";
import { legislativePackForWorkKey } from "./legislative-institutions";
import {
  municipalCouncilRulePacks,
  municipalRulePackById as municipalGovernmentRulePackById,
  primaryReading,
} from "./municipal-government";
import { municipalRulePackById } from "./municipal-rule-registry";
import { allGovernmentUnits } from "./government-units";
import { municipalGovernmentForUnit } from "./rule-capability-resolver";
import { homeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { townCouncilProfilePack } from "./town-council-profile";
import { townCouncilProfileReading } from "./town-council-profile-inputs";
import { withMinorityPartyProcedureRows } from "./minority-party-procedure";
import { withCommitteeStandIns } from "./standing-committee";

describe("one legislative pack lookup", () => {
  it("keeps the complete jurisdiction matrix", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(new Set(CHIEF_EXECUTIVE_JURISDICTIONS).size).toBe(56);
  });

  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "%s: generated residents' bodies resolve without registration",
    (usps) => {
      const fixture = smallWorld({ place: usps, people: 3 });
      const local = homeLocalGovernmentUnits(fixture.world, fixture.personId);
      const units = [...local.municipal, ...local.counties, ...local.townships];
      const statePack = legislatureForState(`US-${usps}`);
      const packs = [
        US_CONGRESS_RULE_PACK,
        statePack ? withCommitteeStandIns(statePack) : null,
        ...units.map(townCouncilProfilePack),
        ...municipalCouncilRulePacks()
          .filter((pack) => pack.jurisdictionKey === `US-${usps}`)
          .map(withMinorityPartyProcedureRows),
      ].filter((pack) => pack !== null);
      expect(packs.length).toBeGreaterThan(0);
      for (const pack of packs) {
        const resolved = rulePackById(pack.packId);
        expect(resolved).toEqual(pack);
        expect(legislativePackForWorkKey(`institution:${pack.packId}`)).toEqual(
          resolved,
        );
      }
    },
  );

  it("re-exports the same municipal reader and preserves sourced packs", () => {
    expect(municipalGovernmentRulePackById).toBe(municipalRulePackById);
    for (const pack of municipalCouncilRulePacks()) {
      expect(municipalRulePackById(pack.packId)).toEqual(
        withMinorityPartyProcedureRows(pack),
      );
      expect(rulePackById(pack.packId)).toEqual(
        municipalRulePackById(pack.packId),
      );
    }
  });

  it("keeps cold profile fields identical to every matched source reading", () => {
    let matched = 0;
    for (const unit of allGovernmentUnits()) {
      const government = municipalGovernmentForUnit(unit);
      const reading = government ? primaryReading(government) : null;
      expect(townCouncilProfileReading(unit.id)).toEqual(
        reading
          ? {
              bodyName: reading.bodyName,
              bodySize: reading.bodySize,
              form: reading.form,
              evidence: reading.evidence,
            }
          : null,
      );
      if (reading) matched += 1;
    }
    expect(matched).toBeGreaterThan(0);
  });

  it("keeps unknown ids absent without swallowing source errors", () => {
    expect(rulePackById("municipal:unregistered", false)).toBeNull();
    expect(
      legislativePackForWorkKey("institution:municipal:unregistered"),
    ).toBeNull();
    expect(() => rulePackById("municipal:unregistered")).toThrow(
      "No legislative rule pack is registered",
    );
  });
});
