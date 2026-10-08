import { describe, expect, it, vi } from "vitest";
import research from "../../data/research/legislature/chamber-leadership.json" with { type: "json" };
import seats from "../../data/research/laws/legislators-2023.json" with { type: "json" };
import { STATES } from "./state-reference";
import {
  chamberLeadershipProfileFor,
  leadershipProfilesForJurisdiction,
  chairMayDeclineFor,
  legislatureProfileFor,
} from "./legislature-game-profile";
import {
  knownRule,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "./legislature-rules";
import { municipalRulePackById } from "./municipal-rule-registry";

vi.mock("./municipal-rule-registry", () => ({
  municipalRulePackById: vi.fn(() => null),
}));

describe("one leadership data reader for every government", () => {
  it("covers all 56 places without phantom chambers or blank fields", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
    for (const usps of Object.keys(STATES)) {
      const profiles = leadershipProfilesForJurisdiction(`US-${usps}`);
      expect(profiles.length, usps).toBeGreaterThan(0);
      const count = seats.rows.find((row) => row.usps === usps);
      if (count?.unicameralSeats != null)
        expect(profiles, usps).toHaveLength(1);
      else if (count?.lowerSeats != null && count.upperSeats != null)
        expect(profiles, usps).toHaveLength(2);
      for (const profile of profiles) {
        expect(profile.assignmentAuthority).toBeTruthy();
        expect(profile.chairSelectionAuthority).toBeTruthy();
        expect(profile.posts.length).toBeGreaterThan(0);
        expect(profile.partyRatioRule).toBeTruthy();
        expect(typeof profile.chairMayDeclineBill).toBe("boolean");
        expect(["slight", "moderate", "strong", "decisive"]).toContain(
          profile.seniorityImportance,
        );
        expect(profile.status).toBe("estimated-from-average");
        for (const [field, citation] of Object.entries(profile.citations)) {
          expect(citation, `${usps}:${field}`).toMatch(/https:\/\//);
          if (
            profile.estimatedFields.includes(
              field as keyof typeof profile.citations,
            )
          ) {
            expect(
              profile.estimatedFrom[field as keyof typeof profile.citations],
            ).toBeTruthy();
          }
        }
      }
      const gameProfile = legislatureProfileFor(`US-${usps}`);
      if (gameProfile) expect(gameProfile.leadership).toEqual(profiles);
    }
  });

  it("has a complete, unambiguous field table behind every declared chamber", () => {
    const ids = research.rows.map(
      (row) => `${row.jurisdictionKey}|${row.chamberKey}`,
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of research.rows) {
      const template =
        research.templates[row.templateId as keyof typeof research.templates];
      expect(template, ids.join(",")).toBeDefined();
      for (const [field, id] of Object.entries(template)) {
        const table = research.tables[field as keyof typeof research.tables];
        expect(table.filter((reading) => reading.id === id)).toHaveLength(1);
        const reading = table.find((reading) => reading.id === id)!;
        expect(
          research.sources[reading.sourceId as keyof typeof research.sources],
        ).toBeDefined();
      }
    }
  });

  it("keeps party officers elected by their caucus, not a floor ballot", () => {
    const federal = leadershipProfilesForJurisdiction("US");
    expect(federal).toHaveLength(2);
    for (const profile of federal) {
      expect(
        profile.posts
          .filter((post) => /leader|whip/.test(post.key))
          .every((post) => post.selection === "caucus-vote"),
      ).toBe(true);
      expect(profile.estimatedFrom.seniorityImportance).toBeTruthy();
      expect(profile.partyRatioRule).toBe("party-agreement");
    }
  });

  it("reads council form rows in every place and gives actual committee rules precedence", () => {
    for (const usps of Object.keys(STATES)) {
      for (const councilForm of Object.keys(research.councilForms) as (
        "council-manager" | "mayor-council" | "elected-president"
      )[]) {
        const profile = chamberLeadershipProfileFor({
          jurisdictionKey: `US-${usps}`,
          chamberKey: "council",
          form: "council",
          councilForm,
        });
        expect(profile.posts.length).toBeGreaterThan(0);
        expect(profile.estimatedFields).toHaveLength(6);
      }
    }
    const source: RuleSourceRef = {
      authority: "statute",
      citation: "fixture committee rule",
      sourceTitle: "Fixture only",
      sourceUrl: null,
      retrievedAt: null,
      verification: "verified",
      note: null,
    };
    // The municipal registry contract carries a committee-specific rule; a chamber estimate must not erase it.
    const pack = {
      chambers: [
        {
          chamberKey: "council",
          committees: [
            {
              committeeKey: "fixture",
              chairMayDeclineToHear: knownRule(false, source),
            },
          ],
        },
      ],
    } as unknown as LegislativeRulePack;
    vi.mocked(municipalRulePackById).mockReturnValueOnce(pack);
    const profile = chamberLeadershipProfileFor({
      jurisdictionKey: `US-${Object.keys(STATES)[0]}`,
      chamberKey: "council",
      form: "council",
      councilRulePackId: "fixture",
    });
    expect(chairMayDeclineFor(profile, "fixture")).toBe(false);
    expect(profile.committeeChairRules[0]?.citation).toBe(source.citation);
    expect(chairMayDeclineFor(profile, "unread-committee")).toBe(
      profile.chairMayDeclineBill,
    );
  });
});
