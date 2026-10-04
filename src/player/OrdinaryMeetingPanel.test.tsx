import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { ensureLocalGovernmentSeats } from "../simulation/living-world/local-government-seats";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { submitTimeCommand } from "../presentation/time-command";
import { projectStoryMeetingScene } from "../presentation/story-scene-day";
import { OrdinaryMeetingPanel } from "./OrdinaryMeetingPanel";

describe("ordinary meeting player panel", () => {
  it("keeps the recorded room, agenda and attendance choices without legacy chat", () => {
    const fixture = smallWorld({
      place: "2743000",
      seed: "team-e-meeting-route",
      people: 4,
    });
    const personId = fixture.personId;
    const world = openOrdinaryLife(
      ensureLocalGovernmentSeats(fixture.world, personId),
      personId,
    );
    const activity = world.history.scheduledActivities.find(
      (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const arrived = submitTimeCommand(world, {
      requestId: "team-e-arrive-at-meeting",
      personId: personId,
      sourceMoment: world.currentMoment,
      command: { kind: "attend-activity", activityId: activity.id },
    });
    expect(arrived.receipt.status).toBe("accepted");

    const html = renderToStaticMarkup(
      <OrdinaryMeetingPanel
        world={arrived.world}
        personId={personId}
        onWorldChange={() => {}}
        onOpenEntity={() => {}}
        onOutcome={() => {}}
      />,
    );
    expect(html).toContain('data-testid="ordinary-meeting-people"');
    expect(html).toContain('data-testid="read-meeting-agenda"');
    expect(html).not.toContain('data-testid="speak-ordinary-meeting"');
    expect(html).not.toContain("meeting-speech-");
    for (const actor of projectStoryMeetingScene(arrived.world, personId)!
      .actors) {
      if (actor.spokenLine)
        expect(html).not.toContain(
          renderToStaticMarkup(<p>{actor.spokenLine}</p>),
        );
    }
    expect(html).not.toContain("ordinary-meeting-spoken-words");
    expect(html).toContain('data-testid="ordinary-meeting-roll-call"');
    expect(html).toContain('data-testid="stay-ordinary-meeting"');
    expect(html).toContain('data-testid="brief-ordinary-meeting"');
    expect(html).toContain('data-testid="leave-ordinary-meeting"');
    expect(html).not.toContain("15 minutes here");
    expect(html).toContain(">Go briefly</button>");
    expect(html).toContain("The home endpoint is not recorded.");
    expect(html).toContain(">Stay through the meeting</button>");
    expect(html).toContain(">Leave and return home</button>");
  });
});
