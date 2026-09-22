import { describe, expect, it } from "vitest";
import {
  addDays,
  controlledCommitmentsBlockingActivityPerformance,
  assertWorldIntegrity,
  scheduledActivityState,
  type World,
} from "../simulation";
import {
  CONTACT_ACCEPTED_EVENT,
  contactProposals,
} from "../simulation/people-contact";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { askToMeet, projectContacts } from "./people-contacts";
import { declineCalendarActivity } from "./calendar-time-control";
import { performVenueActivity, venueActivities } from "./venue-activity";

/**
 * The owner's first playtest (2026-09-22): he asked somebody to meet, they
 * said yes, and pressing Attend on the calendar did nothing. The meeting was
 * held "Arranged in person", and the venue route compared that label with his
 * home, found no journey between them, and refused. A meeting two people
 * arranged themselves names no venue, so it asks for no journey.
 */
function acceptedMeeting() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: "3260600",
        seed: `contact-attend-${attempt}`,
        startAge: 29,
      }),
    ).game!;
    const player = game.playerPersonId;
    const world = openOrdinaryLife(game.world, player);
    for (const contact of projectContacts(world, player).contacts) {
      const on = addDays(world.currentDate, 2);
      let settled: World = askToMeet(world, {
        personId: player,
        otherPersonId: contact.personId,
        on,
      });
      settled = passOrdinaryDays(settled, 1);
      const proposal = contactProposals(settled, player)[0];
      if (!proposal) continue;
      const accepted = settled.history.events.some(
        (event) =>
          event.type === CONTACT_ACCEPTED_EVENT &&
          event.tags.includes(`contact.proposal:${proposal.eventId}`),
      );
      if (!accepted) continue;
      const meeting = settled.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(proposal.eventId),
      );
      if (!meeting) continue;
      // Clear the tentative holds that come first (the posted public meeting,
      // a weekend plan), so what is measured is the meeting itself.
      for (const id of controlledCommitmentsBlockingActivityPerformance(
        settled,
        meeting.id,
      ))
        settled = declineCalendarActivity(settled, player, id).world;
      if (
        controlledCommitmentsBlockingActivityPerformance(settled, meeting.id)
          .length === 0
      )
        return { world: settled, player, meeting };
    }
  }
  throw new Error("No seed produced an accepted meeting.");
}

describe("Attend on a meeting arranged with somebody", () => {
  const { world, player, meeting } = acceptedMeeting();

  it("is offered with no refusal and no journey", () => {
    const entry = venueActivities(world, player).find(
      (candidate) => candidate.activity.id === meeting.id,
    );
    expect(entry, "the meeting is the player's to attend").toBeTruthy();
    expect(entry!.refusal).toBeNull();
    expect(entry!.journey).toBeNull();
  });

  it("pressing it holds the meeting", () => {
    const after = performVenueActivity(world, player, meeting.id);
    expect(after).not.toBe(world);
    expect(scheduledActivityState(after, meeting.id).status).not.toBe(
      "scheduled",
    );
    assertWorldIntegrity(after);
  });
});
