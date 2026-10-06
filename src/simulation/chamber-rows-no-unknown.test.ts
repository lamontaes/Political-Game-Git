import { describe, expect, it } from "vitest";

import { MUNICIPAL_RULE_PACKS_JSON } from "./municipal-rule-registry.generated";
import { legislatureForState } from "./legislature-game-profile";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { US_CONGRESS_RULE_PACK } from "./congress-rule-pack";
import {
  assertRulePackIntegrity,
  type LegislativeRulePack,
} from "./legislature-rules";
import { STATES } from "./state-reference";

function expectCompleteBodyRows(pack: {
  readonly packId: string;
  readonly chambers: readonly {
    readonly chamberKey: string;
    readonly seats: { readonly kind: string };
    readonly quorum: { readonly kind: string };
    readonly floorStages: readonly {
      readonly vote: { readonly kind: string };
    }[];
    readonly committees: readonly {
      readonly appointedMembers: number;
      readonly reportThreshold: {
        readonly numerator: number;
        readonly denominatorParts: number;
      };
    }[];
  }[];
  readonly session: {
    readonly adjournmentRule: { readonly kind: string };
    readonly measuresDieAtAdjournment: { readonly kind: string };
  };
}): void {
  expect(pack.chambers.length, pack.packId).toBeGreaterThan(0);
  for (const chamber of pack.chambers) {
    expect(
      chamber.seats.kind,
      `${pack.packId}/${chamber.chamberKey} seats`,
    ).toMatch(/^(known|unknown)$/);
    expect(
      chamber.quorum.kind,
      `${pack.packId}/${chamber.chamberKey} quorum`,
    ).toMatch(/^(known|unknown|not-applicable)$/);
    expect(
      chamber.floorStages.length,
      `${pack.packId}/${chamber.chamberKey} floor`,
    ).toBeGreaterThan(0);
    for (const stage of chamber.floorStages)
      expect(stage.vote.kind).toMatch(/^(known|unknown|not-applicable)$/);
    for (const committee of chamber.committees) {
      expect(committee.appointedMembers).toBeGreaterThan(0);
      expect(committee.reportThreshold.numerator).toBeGreaterThan(0);
      expect(committee.reportThreshold.denominatorParts).toBeGreaterThan(0);
    }
  }
  expect(pack.session.adjournmentRule.kind).toMatch(
    /^(known|unknown|not-applicable)$/,
  );
  expect(pack.session.measuresDieAtAdjournment.kind).toMatch(
    /^(known|unknown|not-applicable)$/,
  );
}

describe("per-level legislative body rows", () => {
  it("keeps a complete row shape for all compiled, generated, municipal, DC, and federal bodies", () => {
    const profileJurisdictions = Object.keys(STATES)
      .map((usps) => `US-${usps}`)
      .filter(
        (jurisdiction) =>
          !LEGISLATIVE_RULE_PACKS.some(
            (pack) => pack.jurisdictionKey === jurisdiction,
          ),
      );
    const statePacks = profileJurisdictions
      .map((jurisdiction) => legislatureForState(jurisdiction))
      .filter((pack) => pack !== null);
    const municipalPacks = JSON.parse(
      MUNICIPAL_RULE_PACKS_JSON,
    ) as LegislativeRulePack[];
    const districtOfColumbia = municipalPacks.filter(
      (pack) => pack.jurisdictionKey === "US-DC",
    );
    const packs = [
      ...LEGISLATIVE_RULE_PACKS,
      ...statePacks,
      ...municipalPacks,
      US_CONGRESS_RULE_PACK,
    ];

    expect(statePacks.length).toBeGreaterThan(0);
    expect(districtOfColumbia.length).toBeGreaterThan(0);
    for (const pack of packs) {
      if (!municipalPacks.includes(pack))
        expect(() => assertRulePackIntegrity(pack), pack.packId).not.toThrow();
      expectCompleteBodyRows(pack);
    }
    expect(US_CONGRESS_RULE_PACK.jurisdictionKey).toBe("US");
  });

  it("labels estimated profile rows as game estimates and leaves unread legal rules unknown", () => {
    const profiles = Object.keys(STATES)
      .map((usps) => legislatureForState(`US-${usps}`))
      .filter((pack) => pack?.basis === "game-profile");
    expect(profiles.length).toBeGreaterThan(0);

    for (const pack of profiles) {
      for (const chamber of pack!.chambers) {
        expect(chamber.quorum.kind).toBe("known");
        if (chamber.quorum.kind === "known") {
          expect(chamber.quorum.source.authority).toBe("game-profile");
          expect(chamber.quorum.source.note).toMatch(/ESTIMATED FROM AVERAGE/);
        }
        for (const stage of chamber.floorStages) {
          if (stage.vote.kind === "known") {
            expect(stage.vote.source.authority).toBe("game-profile");
            expect(stage.vote.source.note).toMatch(/ESTIMATED FROM AVERAGE/);
          }
        }
        for (const committee of chamber.committees) {
          expect(committee.appointedMembers).toBeGreaterThanOrEqual(5);
          expect(committee.appointedMembers).toBeLessThanOrEqual(25);
          expect(committee.reportThreshold.source.note).toMatch(
            /ESTIMATED FROM AVERAGE/,
          );
        }
        const unreadReferral = chamber.referral.multipleReferralAllowed;
        expect(unreadReferral.kind).toBe("unknown");
        if (unreadReferral.kind === "unknown") {
          expect("value" in unreadReferral).toBe(false);
          expect("source" in unreadReferral).toBe(false);
        }
      }
      expect(pack!.session.source.note).toMatch(/ESTIMATED FROM AVERAGE/);
    }
  });
});
