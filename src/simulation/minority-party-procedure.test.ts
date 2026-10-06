import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { US_CONGRESS_RULE_PACK } from "./congress-rule-pack";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { legislatureForState } from "./legislature-game-profile";
import { LOCAL_ORDINANCE_GAME_PROFILE_VERSION } from "./local-ordinance-game-profile";
import { minorityPartyProcedureRows } from "./minority-party-procedure";
import { municipalRulePackById } from "./municipal-rule-registry";
import { assertRulePackIntegrity } from "./legislature-rules";
import { STATES } from "./state-reference";

describe("minority-party procedure rows", () => {
  it("attaches a complete rule row to each compiled legislative chamber", () => {
    for (const pack of [US_CONGRESS_RULE_PACK, ...LEGISLATIVE_RULE_PACKS]) {
      const rows = minorityPartyProcedureRows(pack);
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
      expect(pack.minorityPartyProcedureRows).toHaveLength(
        pack.chambers.length,
      );
      expect(rows.map((row) => row.chamberKey)).toEqual(
        pack.chambers.map((chamber) => chamber.chamberKey),
      );
      for (const row of rows) {
        expect(row.packId).toBe(pack.packId);
        expect(row.motions.kind).toBe("known");
        expect(row.quorum).toEqual(
          pack.chambers.find((chamber) => chamber.chamberKey === row.chamberKey)
            ?.quorum,
        );
      }
    }
  });

  it("attaches complete rows to generated state legislatures", () => {
    for (const [usps] of Object.entries(STATES)) {
      const pack = legislatureForState(`US-${usps}`);
      if (!pack) continue;
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
      expect(pack.minorityPartyProcedureRows).toHaveLength(
        pack.chambers.length,
      );
    }
  });

  it("attaches complete rows to sourced and game-profile municipal councils", () => {
    const sourced = municipalRulePackById("us-dc-washington-council-v1");
    const generated = municipalRulePackById(
      `gus2025:100019:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
    );
    expect(sourced).not.toBeNull();
    expect(generated).not.toBeNull();
    expect(sourced!.minorityPartyProcedureRows).toHaveLength(
      sourced!.chambers.length,
    );
    expect(generated!.minorityPartyProcedureRows).toHaveLength(
      generated!.chambers.length,
    );
  });

  it("uses a chamber's recorded cloture stage as its debate rule", () => {
    const senate = minorityPartyProcedureRows(US_CONGRESS_RULE_PACK).find(
      (row) => row.chamberKey === "senate",
    );
    const house = minorityPartyProcedureRows(US_CONGRESS_RULE_PACK).find(
      (row) => row.chamberKey === "house",
    );

    expect(senate?.unlimitedDebate).toMatchObject({
      kind: "known",
      value: true,
    });
    expect(senate?.clotureBar).toMatchObject({
      kind: "known",
      value: { numerator: 3, denominatorParts: 5 },
    });
    expect(house?.unlimitedDebate).toMatchObject({
      kind: "known",
      value: false,
    });
    expect(house?.clotureBar.kind).toBe("not-applicable");
  });

  it("opens a new game in a randomly selected Washington place with procedure rows", () => {
    const opening = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "5363000",
      seed: "b12-p1-random-place-procedure-profile",
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const player = opening.world.people[opening.playerPersonId]!;
    const home = opening.world.jurisdictions[player.homeJurisdictionId]!;
    const pack = legislatureForState("US-WA");

    expect(home).toBeDefined();
    expect(pack?.minorityPartyProcedureRows).toHaveLength(
      pack!.chambers.length,
    );
    expect(minorityPartyProcedureRows(pack!)).toEqual(
      pack!.minorityPartyProcedureRows,
    );
  });
});
