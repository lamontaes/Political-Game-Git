import { describe, expect, it } from "vitest";
import { stateWageTaxInForce } from "../simulation/tax-policy";
import {
  stateKeysForTaxServiceProfiles,
  stateTaxServiceProfileForJurisdictionKey,
} from "../simulation/world-setup/state-tax-service-profiles";
import type { World } from "../simulation";
import { seatedChamberMember } from "../../tests/fixtures/seated-chamber-member";
import { politicsIssueAccess } from "./politics-issues";
import {
  fileStateWageTaxRateFromOffice,
  stateWageTaxForOffice,
} from "./tax-work";

describe("Taxes tab follows the saved state wage-tax filing route", () => {
  const kentucky = seatedChamberMember("KY");

  it("finds one saved-law profile path for all 50 states and DC and opens for a seated state member", () => {
    const { world, personId } = kentucky;
    const keys = stateKeysForTaxServiceProfiles();
    expect(keys).toHaveLength(51);
    for (const key of keys) {
      const profile = stateTaxServiceProfileForJurisdictionKey(world, key);
      expect(profile, `${key} saved profile`).not.toBeNull();
      expect(
        stateWageTaxInForce(world, key, world.currentDate)?.terms,
        `${key} in-force saved law`,
      ).toEqual(profile!.taxTerms);
    }
    expect(stateWageTaxForOffice(world, personId).kind).toBe("available");
    const proposalsBefore = world.history.taxProposals?.length ?? 0;
    expect(politicsIssueAccess(world, personId).tax).toBe(true);
    expect(world.history.taxProposals?.length ?? 0).toBe(proposalsBefore);
  });

  it("keeps the Alaska office route visible", () => {
    const { world, personId } = seatedChamberMember("AK");
    expect(stateWageTaxForOffice(world, personId).kind).toBe("available");
    expect(politicsIssueAccess(world, personId).tax).toBe(true);
  });

  it("refuses a person without current office and rechecks authority when filing", () => {
    const { world, personId } = kentucky;
    expect(politicsIssueAccess(world, personId).tax).toBe(true);
    const withoutOffice: World = { ...world, control: { kind: "observer" } };
    expect(politicsIssueAccess(withoutOffice, personId).tax).toBe(false);
    expect(() =>
      fileStateWageTaxRateFromOffice(withoutOffice, {
        personId,
        stableKey: "tax-access-recheck",
        rateBasisPoints: 100,
      }),
    ).toThrow(/Only the current character/);
    expect(withoutOffice.history.taxProposals).toBe(world.history.taxProposals);
  });
});
