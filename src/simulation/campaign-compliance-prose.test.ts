import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_COMPLIANCE_STATE_KEYS,
  GAME_ADULT_CANDIDACY_AGE,
  addDays,
  advanceWorld,
  ageOnDate,
  assessContribution,
  assessSecondCommittee,
  campaignObligations,
  createScenarioWorld,
  ensureCampaignOpponents,
  fileCampaign,
  lifePlaces,
  makeCurrencyCode,
  makeIsoDate,
} from "./index";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import type { CampaignRecord, EntityId, World } from "./types";

/**
 * No player-facing sentence quotes a statute at the player.
 *
 * Every refusal and permission these rules produce carries its authority in a
 * `citation` field beside the sentence, so a locator inside the sentence was
 * duplicating something the record already held. A screen shows the
 * information; the record holds where it came from.
 *
 * Two things make this sweep worth running rather than merely present. It has
 * to reach the branches that actually name a statute — an earlier version
 * swept a Kentucky campaign, whose campaign-finance law this repository has
 * not read, so every combination returned the same unregulated sentence and
 * the sweep passed against the unfixed file. And it has to assert the
 * citations are still recorded, because an over-correction that stripped the
 * provenance along with the prose would satisfy the first check while
 * destroying what the first check exists to protect.
 */

/** The fifty states and the District, as postal codes. */
const STATE_KEYS = (
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN " +
  "MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA " +
  "WV WI WY"
).split(" ");

const CITATION_SHAPE = /Const\.|art\.|§|Stat\.|Rev\.|Ann\.|U\.S\.C\.|http/;

/**
 * 247 days past the scenario's 2026-01-05 start, which carries the world past
 * the date the compiled sources were observed on. Before it, every read state
 * answers "unresolved" and no rule with a locator is reached.
 */
const PAST_SOURCE_OBSERVATION_DAYS = 247;

interface Filed {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly candidatePersonId: EntityId;
}

function fileKentuckyCampaign(seed: string): Filed {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const scenario = advanceWorld(created, PAST_SOURCE_OBSERVATION_DAYS);
  const candidatePersonId = scenario.personOrder.find(
    (personId) =>
      ageOnDate(scenario.people[personId]!.birthDate, scenario.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  const base: World = {
    ...scenario,
    control: { kind: "person", personId: candidatePersonId },
  };
  const opponents = ensureCampaignOpponents(base, {
    stableKey: seed,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: seed,
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: "us-ky-general-assembly-v1:house",
    electionDate: addDays(base.currentDate, 21),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the test fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return {
    world: filed.world,
    campaign: filed.campaign,
    candidatePersonId,
  };
}

/**
 * The same campaign, run in another state.
 *
 * Which law governs a campaign is read off the place it is being run in, so
 * moving the campaign record to a state's life place is how a fixture reaches
 * a state whose law the repository has actually read. The same move is what
 * the Nebraska case in `campaigns.test.ts` makes.
 */
function campaignRunIn(
  filed: Filed,
  stateJurisdictionKey: string,
  officeKey: string,
): { world: World; campaign: CampaignRecord } | null {
  const place = lifePlaces().find(
    (candidate) =>
      candidate.scope === "state" &&
      candidate.stateJurisdictionKey === stateJurisdictionKey,
  );
  if (!place) return null;
  const campaign: CampaignRecord = {
    ...filed.campaign,
    jurisdictionId: place.context.jurisdiction.id,
    officeKey,
  };
  const world: World = {
    ...filed.world,
    history: {
      ...filed.world.history,
      campaigns: filed.world.history.campaigns?.map((record) =>
        record.id === filed.campaign.id ? campaign : record,
      ),
    },
  };
  return { world, campaign };
}

describe("campaign compliance sentences are written for a player", () => {
  it("quotes no statute at the player, across every combination", () => {
    const filed = fileKentuckyCampaign("compliance-prose");
    const sentences: { where: string; decision: string; reason: string }[] = [];

    // Every state whose law the repository has read, so the sweep reaches the
    // branches that have a locator to leak in the first place.
    for (const stateKey of CAMPAIGN_COMPLIANCE_STATE_KEYS) {
      const moved = campaignRunIn(filed, stateKey, "compliance-sweep:seat");
      if (!moved) continue;
      for (const sourcePersonId of [null, filed.candidatePersonId] as const) {
        for (const incomingMinorUnits of [1, 100_000, 10_000_000]) {
          for (const organized of [true, false, null] as const) {
            const ruling = assessContribution(moved.world, {
              campaignId: moved.campaign.id,
              sourcePersonId: sourcePersonId as EntityId | null,
              incomingMinorUnits,
              statementOfOrganizationFiled: organized,
              treasurerPersonId:
                organized === true ? filed.candidatePersonId : null,
              treasurerQualifiedElector: organized,
            });
            sentences.push({
              where: `contribution ${stateKey}/${String(sourcePersonId)}/${incomingMinorUnits}/${String(organized)}`,
              decision: ruling.decision,
              reason: ruling.reason,
            });
          }
        }
      }

      // The office this character is already running for, and one they are
      // not: the first reaches the refusal, the second the permission.
      for (const officeKey of ["compliance-sweep:seat", "another:seat"]) {
        const ruling = assessSecondCommittee(moved.world, {
          personId: filed.candidatePersonId,
          stateJurisdictionKey: stateKey,
          officeKey,
        });
        sentences.push({
          where: `second committee ${stateKey}/${officeKey}`,
          decision: ruling.decision,
          reason: ruling.reason,
        });
      }
    }

    // And every other state, which answers that it has read no law here.
    for (const usps of STATE_KEYS) {
      const ruling = assessSecondCommittee(filed.world, {
        personId: filed.candidatePersonId,
        stateJurisdictionKey: `US-${usps}`,
        officeKey: "us-ky-general-assembly-v1:house",
      });
      sentences.push({
        where: `second committee US-${usps}`,
        decision: ruling.decision,
        reason: ruling.reason,
      });
    }

    /*
     * The teeth. A sweep that never reached a rule would pass against an
     * unfixed file, which is exactly how the first version of this test
     * failed. Both outcomes that name a statute have to be in the sample
     * before the assertion below means anything.
     */
    const decisions = new Set(sentences.map((entry) => entry.decision));
    expect(decisions.has("allowed")).toBe(true);
    expect(decisions.has("refused")).toBe(true);
    expect(sentences.length).toBeGreaterThan(80);

    const offending = sentences.filter((entry) =>
      CITATION_SHAPE.test(entry.reason),
    );
    expect(offending).toEqual([]);
  });

  it("still records the authority behind every compiled rule", () => {
    // The over-correction guard. Removing a locator from a sentence must not
    // remove it from the record; the provenance is what makes the sentence
    // checkable by a person later.
    let rows = 0;
    for (const usps of STATE_KEYS) {
      for (const rule of campaignObligations(
        `US-${usps}`,
        makeIsoDate("2026-10-01"),
      )) {
        rows += 1;
        expect(rule.legalLocator.trim().length).toBeGreaterThan(0);
        expect(CITATION_SHAPE.test(rule.legalLocator)).toBe(true);
      }
    }
    expect(rows).toBeGreaterThan(0);
  });

  it("carries the citation beside the sentence rather than inside it", () => {
    const filed = fileKentuckyCampaign("compliance-prose-citation");
    const state = CAMPAIGN_COMPLIANCE_STATE_KEYS[0]!;
    const moved = campaignRunIn(filed, state, "compliance-sweep:seat");
    expect(moved).not.toBeNull();
    const ruling = assessContribution(moved!.world, {
      campaignId: moved!.campaign.id,
      sourcePersonId: null,
      incomingMinorUnits: 10_000_000,
      statementOfOrganizationFiled: true,
      treasurerPersonId: filed.candidatePersonId,
      treasurerQualifiedElector: true,
    });
    expect(ruling.citation).not.toBeNull();
    expect(CITATION_SHAPE.test(ruling.citation!)).toBe(true);
    expect(CITATION_SHAPE.test(ruling.reason)).toBe(false);
  });
});
