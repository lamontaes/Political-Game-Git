import { describe, expect, it } from "vitest";

import {
  cancelScheduledActivity,
  deserializeWorld,
  scheduledActivityState,
  serializeWorld,
} from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { submitTimeCommand } from "./time-command";

const subject = "neighborhood-meeting-notice";

const game = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: "2743000",
    seed: "meeting-presence:2743000",
    startKind: "custom",
    startAge: 34,
    household: "shares-a-home",
  }),
).game!;
const player = game.playerPersonId;
const opened = openOrdinaryLifeRecords(game.world, player);
const meeting = opened.history.scheduledActivities.find(
  (activity) => activity.stableKey === "ordinary-life:public-meeting:activity",
)!;

function offered(world: typeof opened): boolean {
  return availablePlayerConversations(world, player).some(
    (entry) => entry.subject === subject,
  );
}

describe("the posted meeting's conversation topic", () => {
  it("closes after real attendance and stays closed after a saved reload", () => {
    expect(scheduledActivityState(opened, meeting.id).status).toBe("scheduled");
    expect(offered(opened)).toBe(true);
    expect(projectPlayerConversation(opened, player, subject)).not.toBeNull();

    const command = {
      kind: "attend-activity" as const,
      activityId: meeting.id,
    };
    const entered = submitTimeCommand(opened, {
      requestId: "topic-meeting-enter",
      personId: player,
      sourceMoment: opened.currentMoment,
      command,
    });
    expect(entered.receipt.status).toBe("accepted");
    expect(scheduledActivityState(entered.world, meeting.id).status).toBe(
      "scheduled",
    );
    expect(offered(entered.world)).toBe(false);

    const stayed = submitTimeCommand(entered.world, {
      requestId: "topic-meeting-stay",
      personId: player,
      sourceMoment: entered.world.currentMoment,
      command,
    });
    expect(stayed.receipt.status).toBe("accepted");
    expect(scheduledActivityState(stayed.world, meeting.id).status).toBe(
      "completed",
    );
    const reloaded = deserializeWorld(serializeWorld(stayed.world));
    expect(offered(reloaded)).toBe(false);
    expect(projectPlayerConversation(reloaded, player, subject)).toBeNull();
  });

  it("closes a canceled hold without deleting the saved notice", () => {
    const canceled = cancelScheduledActivity(opened, meeting.id);
    expect(scheduledActivityState(canceled, meeting.id).status).toBe(
      "cancelled",
    );
    expect(
      canceled.history.workItems.some(
        (item) => item.stableKey === "ordinary-life:public-meeting",
      ),
    ).toBe(true);
    const reloaded = deserializeWorld(serializeWorld(canceled));
    expect(offered(reloaded)).toBe(false);
    expect(projectPlayerConversation(reloaded, player, subject)).toBeNull();
  });
});
