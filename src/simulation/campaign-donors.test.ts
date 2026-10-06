import { describe, expect, it } from "vitest";
import { fixtureMeetsRecordedCandidacyAge } from "../../tests/fixtures/candidacy-age";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import {
  addDays,
  candidacyPackById,
  createScenarioWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
} from "./index";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import { generatePoliticalStartingConditions } from "./world-setup/political-start";
import { recordRelationshipInteraction } from "./records";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { createResourcePosition } from "./resources";
import {
  askCampaignDonor,
  assessCampaignContribution,
  runCampaignCallTime,
} from "./campaign-donors";
import type { EntityId, World } from "./types";

function fixture(): {
  world: World;
  campaignId: EntityId;
  candidateId: EntityId;
  donorId: EntityId;
} {
  const base = createScenarioWorld("campaign-donor-test", KENTUCKY_CONTEXT, {
    peopleCount: 8,
  });
  const candidateId = base.personOrder.find((id) =>
    fixtureMeetsRecordedCandidacyAge(base, id),
  );
  if (!candidateId) throw new Error("No candidate in fixture.");
  let world = ensureWorldStartingConditions(
    { ...base, control: { kind: "person", personId: candidateId } },
    {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    },
  );
  const donorId = world.personOrder.find((id) => id !== candidateId)!;
  const pack = candidacyPackById("us-ky-general-assembly-v1:candidacy")!;
  const officeKey = pack.offices[0]!.officeKey;
  const opponents = ensureCampaignOpponents(world, {
    stableKey: "campaign-donor-fixture",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidateId, donorId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "campaign-donor-fixture",
    candidatePersonId: candidateId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey,
    districtBinding: namedSeatForFixture(world, candidateId, officeKey),
    electionDate: addDays(world.currentDate, 30),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Test committee",
    donorPoolName: "Legacy placeholder",
    advertisingVendorName: "Vendor",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  world = recordRelationshipInteraction(filed.world, {
    stableKey: "campaign-donor-known",
    personIds: [candidateId, donorId],
    eventId: null,
    occurredAt: filed.world.currentDate,
    kind: "contact:met-in-community",
    change: "formed",
    significance: "meaningful",
    summary: "They met in their community.",
    tags: [],
  });
  world = createResourcePosition(world, {
    stableKey: "campaign-donor-cash",
    owner: { kind: "person", personId: donorId },
    openedAt: world.currentDate,
    openingBalance: {
      minorUnits: 1_000_000,
      currency: makeCurrencyCode("USD"),
    },
    provenance: {
      kind: "authored",
      note: "Fixture means for contribution tests.",
    },
  });
  world = recordPrivateBelief(world, {
    stableKey: "campaign-donor-support-view",
    personId: donorId,
    propositionId: null,
    subject: { kind: "official", personId: candidateId },
    formedAt: world.currentDate,
    position: "support",
    conviction: "tentative",
    salience: "moderate",
    flexibility: "open",
    rationale: "Fixture support view.",
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
  return { world, campaignId: filed.campaign.id, candidateId, donorId };
}

describe("campaign contributions from named people", () => {
  it("records an individual gift no larger than the saved means or limit", () => {
    const f = fixture();
    const limit = assessCampaignContribution(f.world, f.campaignId);
    const result = askCampaignDonor(f.world, {
      campaignId: f.campaignId,
      personId: f.donorId,
      amountMinorUnits: limit.minorUnits + 50_000,
    });
    expect(result.ask.outcome).toBe("gave");
    expect(result.ask.amountMinorUnits).toBeLessThanOrEqual(limit.minorUnits);
    expect(result.ask.amountMinorUnits).toBeLessThanOrEqual(
      result.meansMinorUnits!,
    );
    expect(result.world.history.campaignAsks).toContainEqual(result.ask);
  });

  it("records an opposer's refusal even when they have means", () => {
    const f = fixture();
    const prior = f.world.history.privateBeliefs.find(
      (row) => row.personId === f.donorId && row.subject?.kind === "official",
    )!;
    const world = recordPrivateBelief(f.world, {
      stableKey: "campaign-donor-opposition-view",
      personId: f.donorId,
      propositionId: null,
      subject: { kind: "official", personId: f.candidateId },
      formedAt: f.world.currentDate,
      position: "oppose",
      conviction: "strong",
      salience: "central",
      flexibility: "open",
      rationale: "Fixture opposition view.",
      formation: createFormationContext("reflection:updated"),
      supersedesBeliefId: prior.id,
    });
    const result = askCampaignDonor(world, {
      campaignId: f.campaignId,
      personId: f.donorId,
      amountMinorUnits: 100_000,
    });
    expect(result.ask.outcome).toBe("declined");
    expect(result.ask.reasonBeliefId).not.toBeNull();
  });

  it("runs unanswered donor calls in a stable order and does not ask twice", () => {
    const f = fixture();
    const first = runCampaignCallTime(f.world, f.campaignId);
    const repeated = runCampaignCallTime(f.world, f.campaignId);
    expect(first.history.campaignAsks).toEqual(repeated.history.campaignAsks);
    expect(runCampaignCallTime(first, f.campaignId)).toBe(first);
  });

  it("uses a nonzero estimated limit where no accepted pack is present", () => {
    const f = fixture();
    const campaigns = f.world.history.campaigns!.map((campaign) =>
      campaign.id === f.campaignId
        ? { ...campaign, compliancePackId: null }
        : campaign,
    );
    const world = { ...f.world, history: { ...f.world.history, campaigns } };
    const limit = assessCampaignContribution(world, f.campaignId);
    expect(limit.estimated).toBe(true);
    expect(limit.minorUnits).toBeGreaterThan(0);
  });
});
