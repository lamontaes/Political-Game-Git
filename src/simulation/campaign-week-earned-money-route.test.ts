import { expect, it } from "vitest";

import {
  fileForOffice,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import {
  CANDIDATE_OWN_MONEY_EVENT,
  candidatePersonalBalance,
  contributeOwnMoneyToCampaign,
} from "./campaign-money-sources";
import {
  activeCampaignForCandidate,
  campaignActionResult,
  campaignTreasuryPosition,
} from "./campaign-queries";
import {
  enterLifePath,
  performLifePathSession,
  scheduleLifePathSession,
} from "./life-paths2";
import { performCampaignAction } from "./campaigns";
import { requireElectionContest } from "./election-contests";
import { candidacyPackForJurisdiction } from "./candidacy";
import { resourcePositionAt } from "./resource-queries";
import { makeCurrencyCode } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

const personalCash = (world: World, personId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "person", personId },
    makeCurrencyCode("USD"),
  )?.liquidBalance.minorUnits ?? 0;

// Team F proof: every dollar starts with a completed shop shift and recorded
// pay. No opening savings, donor funds, election date or media reach is authored.
// PLACEHOLDER(overnight): the existing shop wage, $500 self-funding button and
// half-treasury advertising price are used only to prove recorded money flow.
it(
  "moves earned pay through the candidate's committee into one paid buy",
  { timeout: 300_000 },
  () => {
    const opening = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "campaign-earned-pay-to-expense",
      placeKey: "kentucky",
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
    });
    const personId = opening.playerPersonId;
    let world = opening.world;
    expect(personalCash(world, personId)).toBe(0);

    const entered = enterLifePath(world, "shop-assistant");
    expect(entered.ok, entered.message).toBe(true);
    world = entered.world;
    const workId = world.history.workRelationships.at(-1)!.id;
    for (let shift = 0; shift < 8; shift += 1) {
      const scheduled = scheduleLifePathSession(world, workId);
      expect(scheduled.ok, scheduled.message).toBe(true);
      const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
      const worked = performLifePathSession(scheduled.world, activityId);
      expect(worked.ok, worked.message).toBe(true);
      world = passOrdinaryDays(worked.world, 1);
    }
    const wages = world.history.resourceTransferOutcomes.filter((outcome) =>
      outcome.note?.startsWith("Payment for the completed shift"),
    );
    expect(wages).toHaveLength(8);
    expect(wages.every((outcome) => outcome.status === "completed")).toBe(true);
    const earned = personalCash(world, personId);
    expect(earned).toBeGreaterThanOrEqual(50_000);

    const office = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!.offices[0]!;
    world = fileForOffice(world, personId, null, office.officeKey);
    const campaign = activeCampaignForCandidate(world, personId)!;
    expect(campaign.candidatePersonId).toBe(personId);
    expect(campaign.jurisdictionId).toBe(
      world.people[personId]!.homeJurisdictionId,
    );
    expect(
      requireElectionContest(world, campaign.contestId).electionDate >=
        world.currentDate,
    ).toBe(true);
    expect(() =>
      contributeOwnMoneyToCampaign(
        world,
        world.personOrder.find((id) => id !== personId)!,
        1,
      ),
    ).toThrow(/no campaign/i);
    expect(candidatePersonalBalance(world, personId)).toBe(earned);
    expect(
      campaignTreasuryPosition(world, campaign)!.liquidBalance.minorUnits,
    ).toBe(0);
    expect(() => spendAnAfternoon(world, personId, "advertising")).toThrow(
      /nothing in the account/i,
    );
    expect(() =>
      contributeOwnMoneyToCampaign(world, personId, earned + 1),
    ).toThrow(/do not have that much/i);

    const beforeGift = world.history.resourceTransferOutcomes.length;
    world = contributeOwnMoneyToCampaign(world, personId, 50_000);
    expect(candidatePersonalBalance(world, personId)).toBe(earned - 50_000);
    expect(
      campaignTreasuryPosition(world, campaign)!.liquidBalance.minorUnits,
    ).toBe(50_000);
    expect(world.history.resourceTransferOutcomes).toHaveLength(beforeGift + 1);
    const ownEvent = world.history.events.at(-1)!;
    expect(ownEvent.type).toBe(CANDIDATE_OWN_MONEY_EVENT);
    expect(ownEvent.jurisdictionId).toBe(campaign.jurisdictionId);
    const ownOutcome = world.history.resourceTransferOutcomes.at(-1)!;
    expect(ownOutcome.status).toBe("completed");
    expect(ownOutcome.transferredAmount.minorUnits).toBe(50_000);
    const ownFlow = world.history.resourceFlows.find(
      (flow) => flow.id === ownOutcome.resourceFlowId,
    )!;
    expect(ownFlow.source).toEqual({ kind: "person", personId });
    expect(ownFlow.recipient).toEqual({
      kind: "organization",
      organizationId: campaign.organizationId,
    });

    world = deserializeWorld(serializeWorld(world));
    expect(candidatePersonalBalance(world, personId)).toBe(earned - 50_000);
    expect(
      campaignTreasuryPosition(world, campaign)!.liquidBalance.minorUnits,
    ).toBe(50_000);
    const beforeBuy = world.history.resourceTransferOutcomes.length;
    const personalBeforeBuy = candidatePersonalBalance(world, personId);
    world = spendAnAfternoon(world, personId, "advertising");
    const action = (world.history.campaignActions ?? []).at(-1)!;
    const result = campaignActionResult(world, action.id)!;
    expect(action.campaignId).toBe(campaign.id);
    expect(result.spentAmount?.minorUnits).toBe(25_000);
    const expenseFlow = world.history.resourceFlows.find(
      (flow) => flow.id === result.resourceFlowId,
    )!;
    expect(expenseFlow.source).toEqual({
      kind: "organization",
      organizationId: campaign.organizationId,
    });
    expect(expenseFlow.recipient).toEqual({
      kind: "organization",
      organizationId: campaign.advertisingVendorOrganizationId,
    });
    const expenseOutcome = world.history.resourceTransferOutcomes.find(
      (outcome) => outcome.id === result.resourceOutcomeId,
    )!;
    expect(expenseOutcome.status).toBe("completed");
    expect(expenseOutcome.transferredAmount.minorUnits).toBe(25_000);
    expect(
      campaignTreasuryPosition(world, campaign)!.liquidBalance.minorUnits,
    ).toBe(25_000);
    expect(candidatePersonalBalance(world, personId)).toBe(personalBeforeBuy);
    expect(world.history.resourceTransferOutcomes).toHaveLength(beforeBuy + 1);

    const saved = deserializeWorld(serializeWorld(world));
    expect(candidatePersonalBalance(saved, personId)).toBe(earned - 50_000);
    expect(
      campaignTreasuryPosition(saved, campaign)!.liquidBalance.minorUnits,
    ).toBe(25_000);
    const beforeReplay = serializeWorld(saved);
    expect(() => performCampaignAction(saved, action.id)).toThrow(
      /already complete/i,
    );
    expect(serializeWorld(saved)).toBe(beforeReplay);
  },
);
