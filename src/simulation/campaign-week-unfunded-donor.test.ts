import { expect, it } from "vitest";

import {
  attendPartyWork,
  requestPartyWork,
} from "../presentation/campaign-life-actions";
import { fileForOffice } from "../presentation/campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import {
  campaignById,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignTreasuryPosition,
} from "./campaign-queries";
import { recordCampaignLifeAttendance } from "./campaign-life-activities";
import { campaignCompliancePackFor } from "./campaign-compliance";
import {
  chooseCampaignWeekAction,
  projectCampaignWeekActions,
} from "./campaign-week-actions";
import { candidacyPackForJurisdiction } from "./index";
import {
  homePartyChapters,
  joinPartyChapter,
} from "./living-world/party-chapters";
import { personName } from "./people";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";

// Team F regression: no donor cash, gift, or election date is inserted by this
// test. A named contact with unknown funds must not create committee money.
it(
  "keeps a covered Kentucky fundraiser from debiting an unfunded contact",
  { timeout: 300_000 },
  () => {
    const opening = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "campaign-week-recorded-backing",
        startAge: 34,
        placeKey: "kentucky",
      }),
    ).game!;
    const personId = opening.playerPersonId;
    let world = opening.world;
    for (
      let step = 0;
      world.currentDate < "2026-07-16" && step < 30;
      step += 1
    ) {
      const before = world.currentDate;
      world = passOrdinaryDays(world, 14);
      expect(world.currentDate > before).toBe(true);
    }
    expect(world.currentDate >= "2026-07-16").toBe(true);
    const office = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!.offices[0]!;
    world = fileForOffice(world, personId, null, office.officeKey);
    const chapter = homePartyChapters(world)[0]!;
    world = joinPartyChapter(world, personId, chapter.organizationId);
    for (const form of ["organization-meeting", "support-request"] as const) {
      world = requestPartyWork(world, personId, form, chapter.organizationId);
      world = attendPartyWork(
        world,
        personId,
        campaignLifeActivityRecords(world).at(-1)!.id,
        "attended",
      );
    }
    expect(
      campaignLifeOutcomeRecords(world).at(-1)?.supportDecision?.decision,
    ).toBe("granted");

    const view = projectCampaignWeekActions(world, personId)!;
    const campaign = campaignById(world, view.campaignId)!;
    const pack = campaignCompliancePackFor(world, campaign.id)!;
    expect(pack.itemizationThresholdMinorUnits).toMatchObject({
      state: "KNOWN",
      value: 20_000,
      source: {
        legalLocator: "KRS 121.180(3)(a)2.",
        supportCoverageFrom: "2026-07-15",
      },
    });
    const choice = view.choices.find((item) => item.form === "fundraiser")!;
    expect(choice).toBeDefined();
    const treasuryBefore = campaignTreasuryPosition(world, campaign)!
      .liquidBalance.minorUnits;
    const flowCountBefore = world.history.resourceFlows.length;
    const transferCountBefore = world.history.resourceTransferOutcomes.length;
    world = chooseCampaignWeekAction(world, personId, {
      campaignId: view.campaignId,
      choiceId: choice.id,
      revision: view.revision,
    });
    const activity = campaignLifeActivityRecords(world).at(-1)!;
    world = attendPartyWork(
      deserializeWorld(serializeWorld(world)),
      personId,
      activity.id,
      "attended",
    );
    const outcome = campaignLifeOutcomeRecords(world).at(-1)!;
    expect(outcome.activityId).toBe(activity.id);
    expect(outcome.raisedAmount).toBeNull();
    expect(outcome.resourceFlowId).toBeNull();
    expect(outcome.contactPersonIds).toHaveLength(1);
    const donorId = outcome.contactPersonIds[0]!;
    const donorName = personName(world.people[donorId]!);
    expect(donorName.length).toBeGreaterThan(1);
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: donorId },
        campaign.treasuryCurrency,
      ),
    ).toBeUndefined();
    expect(world.history.resourceFlows).toHaveLength(flowCountBefore);
    expect(world.history.resourceTransferOutcomes).toHaveLength(
      transferCountBefore,
    );
    expect(
      campaignTreasuryPosition(world, campaign)!.liquidBalance.minorUnits,
    ).toBe(treasuryBefore);
    const event = world.history.events.find(
      (item) => item.id === outcome.outcomeEventId,
    )!;
    expect(event.tags).toContain("compliance:not-attempted");
    expect(event.summary).toContain(donorName);
    expect(event.summary).toMatch(/available money for .* is not established/);

    const saved = deserializeWorld(serializeWorld(world));
    const beforeReplay = serializeWorld(saved);
    expect(
      recordCampaignLifeAttendance(
        saved,
        personId,
        activity.scheduledActivityId,
        "attended",
      ),
    ).toBe(saved);
    expect(serializeWorld(saved)).toBe(beforeReplay);
  },
);
