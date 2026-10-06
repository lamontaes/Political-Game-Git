import { describe, expect, it } from "vitest";

import { minorityPartyProcedureRows } from "./minority-party-procedure";
import { legislatureForState } from "./legislature-game-profile";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { STATES } from "./state-reference";
import { US_CONGRESS_RULE_PACK } from "./congress-rule-pack";
import { LOCAL_ORDINANCE_GAME_PROFILE_VERSION } from "./local-ordinance-game-profile";
import { municipalRulePackById } from "./municipal-rule-registry";

describe("minority-party procedure rows", () => {
  it("resolves a complete row for every compiled chamber", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const rows = minorityPartyProcedureRows(pack);
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

  it("resolves the same complete row for each generated state chamber", () => {
    for (const [usps] of Object.entries(STATES)) {
      const pack = legislatureForState(`US-${usps}`);
      if (!pack) continue;
      expect(minorityPartyProcedureRows(pack)).toHaveLength(
        pack.chambers.length,
      );
    }
  });

  it("resolves a procedure row for a generated municipal council", () => {
    const pack = municipalRulePackById(
      `gus2025:100019:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
    );
    expect(pack).not.toBeNull();
    expect(minorityPartyProcedureRows(pack!)).toHaveLength(
      pack!.chambers.length,
    );
  });

  it("resolves a procedure row for the compiled District of Columbia council", () => {
    const pack = municipalRulePackById("us-dc-washington-council-v1");
    expect(pack).not.toBeNull();
    expect(pack!.minorityPartyProcedureRows).toHaveLength(
      pack!.chambers.length,
    );
  });

  it("reads unlimited debate and cloture from the chamber's rule row", () => {
    const senate = [US_CONGRESS_RULE_PACK, ...LEGISLATIVE_RULE_PACKS]
      .flatMap((pack) =>
        minorityPartyProcedureRows(pack).map((row) => ({ pack, row })),
      )
      .find(({ row }) => row.clotureBar.kind === "known");

    expect(senate).toBeDefined();
    expect(senate!.row.unlimitedDebate).toMatchObject({
      kind: "known",
      value: true,
    });
    expect(senate!.row.clotureBar).toMatchObject({
      kind: "known",
      value: { numerator: 3, denominatorParts: 5 },
    });
  });
});
