import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../../districts/catalog";
import { listDistrictIdentities } from "../../districts/query";
import { stateCandidacyPack } from "../candidacy-packs";
import { governmentUnit } from "../government-units";
import { legislatureForState } from "../legislature-game-profile";
import { rulePackById } from "../legislature-rule-packs";
import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
} from "../legislative-starting-procedures";
import { legislativePackForWorkKey } from "../legislative-institutions";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
  localOrdinanceGameRulePackById,
} from "../local-ordinance-game-profile";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../municipal-government";
import { planStateChambers } from "../nationwide-world/state-legislature-opening";
import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  US_STATE_USPS,
  US_TERRITORY_GOVERNED_NAMES,
} from "../nationwide-world/state-executive-candidacy-packs";
import { stateJurisdictionForKey } from "../life-places";

/** This is profile/identity coverage; it does not advance a World or prove a vote. */
describe("automatic law structural coverage", () => {
  it("has one saved procedure, pack, candidate route and seating plan per state", () => {
    const stateKeys = US_STATE_USPS.map((usps) => `US-${usps}`).sort();
    const procedures = drawLegislativeStartingProcedures({
      seed: "automatic-law-coverage",
    });
    const catalog = districtIdentityCatalog();

    expect(stateKeys).toHaveLength(50);
    expect(new Set(stateKeys).size).toBe(50);
    expect(Object.keys(procedures).sort()).toEqual(stateKeys);

    for (const key of stateKeys) {
      const usps = key.slice(3);
      const jurisdiction = stateJurisdictionForKey(key);
      const pack = legislatureForState(key);
      const candidacy = stateCandidacyPack(key);
      const procedure = procedures[key];
      expect(jurisdiction, key).not.toBeNull();
      expect(pack, key).not.toBeNull();
      expect(candidacy, key).not.toBeNull();
      expect(procedure?.jurisdictionId, key).toBe(jurisdiction?.id);
      expect(procedure?.baselinePack.packId, key).toBe(pack?.packId);
      expect(procedure?.procedureProvenance, key).toEqual({
        kind: "game-profile",
        version: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
      });
      expect(rulePackById(pack!.packId)?.packId, key).toBe(pack!.packId);
      expect(candidacy?.legislativeRulePackId, key).toBe(pack!.packId);
      expect(candidacy?.jurisdictionKey, key).toBe(key);
      const plan = planStateChambers(candidacy!);
      expect(plan.unseated, key).toEqual([]);
      expect(plan.chambers.length, key).toBe(candidacy!.offices.length);
      for (const chamber of plan.chambers) {
        expect(chamber.size, `${key}:${chamber.chamberKey}`).toBeGreaterThan(0);
        expect(chamber.districts, `${key}:${chamber.chamberKey}`).toHaveLength(
          chamber.size,
        );
        expect(
          chamber.districts.filter((district) => district !== null).length,
          `${key}:${chamber.chamberKey}`,
        ).toBeLessThanOrEqual(chamber.size - chamber.atLargeSeats);
      }
      const districts = listDistrictIdentities(catalog, { stateUsps: usps });
      expect(districts.length, key).toBeGreaterThan(0);
      expect(districts.every((district) => district.stateUsps === usps)).toBe(
        true,
      );
    }
  });

  it("keeps D.C. and five territories in their distinct current structures", () => {
    const territoryUsps = Object.keys(US_TERRITORY_GOVERNED_NAMES).sort();
    expect(territoryUsps).toEqual(["AS", "GU", "MP", "PR", "VI"]);
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(new Set(CHIEF_EXECUTIVE_JURISDICTIONS).size).toBe(56);
    for (const usps of ["DC", ...territoryUsps]) {
      expect(CHIEF_EXECUTIVE_JURISDICTIONS).toContain(usps);
      expect(stateJurisdictionForKey(`US-${usps}`)).toBeDefined();
    }

    const dcCouncil = municipalGovernmentByKey("us-dc-washington");
    expect(dcCouncil).not.toBeNull();
    const dcPack = municipalRulePackFor(dcCouncil!);
    expect(dcPack.ok).toBe(true);
    if (!dcPack.ok) throw new Error(JSON.stringify(dcPack.missing));
    expect(dcPack.pack.packId).toBe("us-dc-washington-council-v1");
    expect(legislatureForState("US-DC")).toBeNull();
    expect(stateCandidacyPack("US-DC")).toBeNull();
    // Current defect: the sourced Council pack exists but the generic member
    // work-key resolver does not admit it. Profile presence is not a vote route.
    expect(
      legislativePackForWorkKey("institution:us-dc-washington-council-v1"),
    ).toBeNull();

    const puertoRico = legislatureForState("US-PR");
    expect(puertoRico?.structure).toBe("bicameral");
    expect(stateCandidacyPack("US-PR")?.legislativeRulePackId).toBe(
      puertoRico?.packId,
    );
    // P.R. has a pack but is outside the 50-state saved procedure/opening loop.
    expect(
      drawLegislativeStartingProcedures({ seed: "automatic-law-coverage" })[
        "US-PR"
      ],
    ).toBeUndefined();
    for (const usps of ["GU", "VI", "AS", "MP"]) {
      expect(legislatureForState(`US-${usps}`)).toBeNull();
      expect(stateCandidacyPack(`US-${usps}`)).toBeNull();
    }
  });

  it("admits matched city and county fiscal packs but leaves township fiscal authority closed", () => {
    const examples = [
      ["gus2025:100019", "municipality", true],
      ["gus2025:100001", "county", true],
      ["gus2025:101703", "township", false],
    ] as const;
    for (const [id, unitType, fiscal] of examples) {
      const unit = governmentUnit(id);
      const packId = `${id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
      expect(unit?.unitType, id).toBe(unitType);
      expect(unit?.functionalActive, id).toBe(true);
      expect(localOrdinanceGameRulePackById(packId)?.packId, id).toBe(packId);
      expect(localFiscalGameAuthorityForRulePackId(packId)?.unit.id, id).toBe(
        fiscal ? id : undefined,
      );
      expect(
        legislativePackForWorkKey(`institution:${packId}`)?.packId,
        id,
      ).toBe(fiscal ? packId : undefined);
    }
  });
});
