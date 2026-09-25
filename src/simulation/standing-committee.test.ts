import { describe, expect, it } from "vitest";

import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "./legislative-institutions";
import { LEGISLATIVE_RULE_PACKS, rulePackById } from "./legislature-rule-packs";
import { stateJurisdictionForKey } from "./life-places";

/**
 * A researched legislature whose committees have not been read refers its
 * bills to a stand-in standing committee (owner decision 2026-09-23). Every
 * lookup the game uses must return the pack with that committee: the bill
 * clock reads the institutional lookups, not `rulePackById`, and a pack
 * without a committee blocks every bill at referral.
 */
describe("the stand-in standing committee reaches every pack lookup", () => {
  const unread = LEGISLATIVE_RULE_PACKS.filter((pack) =>
    pack.chambers.some((chamber) => chamber.committees.length === 0),
  );

  it("covers the researched packs whose committees are unread", () => {
    expect(unread.map((pack) => pack.jurisdictionKey).sort()).toEqual([
      "US-IL",
      "US-MD",
      "US-MN",
      "US-MO",
      "US-NV",
      "US-OH",
    ]);
  });

  it.each(unread.map((pack) => [pack.jurisdictionKey, pack] as const))(
    "%s has a committee in every chamber however the pack is found",
    (_key, pack) => {
      const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey)!;
      for (const found of [
        rulePackById(pack.packId),
        legislativePackForWorkKey(`institution:${pack.packId}`),
        legislativePackForJurisdiction(jurisdiction.id),
      ]) {
        expect(found?.packId).toBe(pack.packId);
        for (const chamber of found!.chambers)
          expect(chamber.committees.length).toBeGreaterThan(0);
      }
      // One cached pack, whichever lookup found it.
      expect(legislativePackForWorkKey(`institution:${pack.packId}`)).toBe(
        rulePackById(pack.packId),
      );
    },
  );
});
