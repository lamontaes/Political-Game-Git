import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { submitTimeCommand } from "../presentation/time-command";
import { OrdinaryMeetingPanel } from "./OrdinaryMeetingPanel";

describe("ordinary meeting player panel", () => {
  it("offers the recorded room, exact speech and distinct choices after Attend", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: "2743000",
        seed: "team-e-meeting-route",
        startKind: "custom",
        startAge: 34,
        household: "shares-a-home",
      }),
    ).game!;
    const world = openOrdinaryLifeRecords(game.world, game.playerPersonId);
    const activity = world.history.scheduledActivities.find(
      (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const arrived = submitTimeCommand(world, {
      requestId: "team-e-arrive-at-meeting",
      personId: game.playerPersonId,
      sourceMoment: world.currentMoment,
      command: { kind: "attend-activity", activityId: activity.id },
    });
    expect(arrived.receipt.status).toBe("accepted");

    const html = renderToStaticMarkup(
      <OrdinaryMeetingPanel
        world={arrived.world}
        personId={game.playerPersonId}
        onWorldChange={() => {}}
        onOpenEntity={() => {}}
        onOutcome={() => {}}
      />,
    );
    expect(html).toContain('data-testid="ordinary-meeting-people"');
    expect(html).toContain('data-testid="read-meeting-agenda"');
    expect(html).toContain('data-testid="speak-ordinary-meeting"');
    expect(html).toContain('data-testid="stay-ordinary-meeting"');
    expect(html).toContain('data-testid="brief-ordinary-meeting"');
    expect(html).toContain('data-testid="leave-ordinary-meeting"');
    expect(html).toContain("15 minutes here");
  });
});
