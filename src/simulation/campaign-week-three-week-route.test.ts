import { expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  attendPartyWork,
  requestPartyWork,
} from "../presentation/campaign-life-actions";
import { fileForOffice } from "../presentation/campaign-projection";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import {
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
} from "./campaign-queries";
import { recordCampaignLifeAttendance } from "./campaign-life-activities";
import {
  chooseCampaignWeekAction,
  projectCampaignWeekActions,
} from "./campaign-week-actions";
import { addDays } from "./dates";
import { candidacyPackForJurisdiction } from "./index";
import {
  homePartyChapters,
  joinPartyChapter,
} from "./living-world/party-chapters";
import { deserializeWorld, serializeWorld } from "./serialization";
import { scheduledActivityState } from "./time-work";
import type { EntityId, IsoDate } from "./types";

// Team F acceptance probe only: the published #736 source head stays stable.
// This calls the same filing, party, campaign and clock writers as the player.
it(
  "keeps three recorded campaign weeks and their results through save/reload",
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
    const office = candidacyPackForJurisdiction(
      opening.world.people[personId]!.homeJurisdictionId,
    )!.offices[0]!;
    let world = fileForOffice(
      opening.world,
      personId,
      null,
      office.officeKey,
      addDays(opening.world.currentDate, 28),
    );
    expect(
      projectCampaignWeekActions(world, personId)!.availabilityReason,
    ).toBe("needs-host");

    const chapter = homePartyChapters(world)[0]!;
    world = joinPartyChapter(world, personId, chapter.organizationId);
    for (const form of ["organization-meeting", "support-request"] as const) {
      world = requestPartyWork(world, personId, form, chapter.organizationId);
      const activity = campaignLifeActivityRecords(world).at(-1)!;
      const reloaded = deserializeWorld(serializeWorld(world));
      expect(
        scheduledActivityState(reloaded, activity.scheduledActivityId).status,
      ).toBe("scheduled");
      world = attendPartyWork(reloaded, personId, activity.id, "attended");
      expect(
        scheduledActivityState(world, activity.scheduledActivityId).status,
      ).toBe("completed");
    }
    expect(
      campaignLifeOutcomeRecords(world).at(-1)?.supportDecision?.decision,
    ).toBe("granted");

    const completed: {
      activityId: EntityId;
      holdId: EntityId;
      date: IsoDate;
    }[] = [];
    for (const form of ["door-canvass", "phone-shift", "fundraiser"] as const) {
      const view = projectCampaignWeekActions(world, personId)!;
      const choice = view.choices.find((item) => item.form === form);
      expect(
        choice,
        `${form} was not offered in week ${completed.length + 1}`,
      ).toBeDefined();
      expect(choice!.cashCost).toBeNull();
      if (completed.length > 0) {
        expect(view.weekStart >= addDays(completed.at(-1)!.date, 7)).toBe(true);
      }
      world = chooseCampaignWeekAction(world, personId, {
        campaignId: view.campaignId,
        choiceId: choice!.id,
        revision: view.revision,
      });
      const activity = campaignLifeActivityRecords(world).at(-1)!;
      expect(activity.form).toBe(form);
      expect(
        scheduledActivityState(world, activity.scheduledActivityId).status,
      ).toBe("scheduled");

      world = deserializeWorld(serializeWorld(world));
      expect(
        scheduledActivityState(world, activity.scheduledActivityId).status,
      ).toBe("scheduled");
      for (const prior of completed) {
        expect(scheduledActivityState(world, prior.holdId).status).toBe(
          "completed",
        );
      }
      world = attendPartyWork(world, personId, activity.id, "attended");
      const outcome = campaignLifeOutcomeRecords(world).at(-1)!;
      expect(outcome.activityId).toBe(activity.id);
      expect(outcome.contactPersonIds.length).toBeGreaterThan(0);
      expect(
        scheduledActivityState(world, activity.scheduledActivityId).status,
      ).toBe("completed");
      completed.push({
        activityId: activity.id,
        holdId: activity.scheduledActivityId,
        date: world.currentDate,
      });

      const beforeReplay = serializeWorld(world);
      const beforeTransferCount = world.history.resourceTransferOutcomes.length;
      const beforeOutcomeCount = campaignLifeOutcomeRecords(world).filter(
        (item) => item.activityId === activity.id,
      ).length;
      const reloaded = deserializeWorld(beforeReplay);
      expect(
        recordCampaignLifeAttendance(
          reloaded,
          personId,
          activity.scheduledActivityId,
          "attended",
        ),
      ).toBe(reloaded);
      expect(serializeWorld(reloaded)).toBe(beforeReplay);
      expect(reloaded.history.resourceTransferOutcomes).toHaveLength(
        beforeTransferCount,
      );
      expect(
        campaignLifeOutcomeRecords(reloaded).filter(
          (item) => item.activityId === activity.id,
        ),
      ).toHaveLength(beforeOutcomeCount);
      expect(beforeOutcomeCount).toBe(1);
      world = reloaded;

      if (completed.length < 3) {
        const nextWeek = addDays(world.currentDate, 7);
        while (world.currentDate < nextWeek) {
          const priorDate = world.currentDate;
          world = passOrdinaryDays(world);
          expect(world.currentDate > priorDate).toBe(true);
        }
      }
    }

    const saved = deserializeWorld(serializeWorld(world));
    for (const result of completed) {
      expect(scheduledActivityState(saved, result.holdId).status).toBe(
        "completed",
      );
      expect(
        campaignLifeOutcomeRecords(saved).filter(
          (item) => item.activityId === result.activityId,
        ),
      ).toHaveLength(1);
    }
    expect(completed).toHaveLength(3);
  },
);
