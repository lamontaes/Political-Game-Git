import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { scheduledActivityState } from "../simulation";
import { performVenueActivity, venueActivities } from "./venue-activity";

/**
 * Making the journey must not strand the thing it was booked for.
 *
 * The calendar draws two controls for one outing: "Carry out activity" on the
 * destination, which travels and attends in one press, and "Make the journey"
 * on the travel row, which is the first enabled control a player meets. Walked
 * in Springfield, Illinois, pressing the second completed the travel, recorded
 * no arrival, and left the meeting refusing "The current location is not
 * recorded" for the rest of the life — twice in one walk, measured in
 * `docs/playtest/making-the-journey-stranded-the-meeting-2026-09-22.md`.
 */
function lifeWithAJourney(seed: string, city: string, state: string) {
  // Not Kentucky. The walk was Springfield and the route is not place-specific.
  const home = requireLocalityInState(state, city);
  const created = createNewGameWorld({
    placeKey: home.key,
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  // A day, exactly as the walk pressed one: the opening scene is the earlier
  // commitment that holds both controls shut on the first morning.
  const world = passOrdinaryDays(
    openOrdinaryLife(created.world, created.playerPersonId),
    1,
  );
  const personId = created.playerPersonId;
  const travel = world.history.scheduledActivities.find(
    (activity) =>
      activity.location.locationKey === "ordinary-life:to-meeting-room",
  )!;
  const destination = world.history.scheduledActivities.find(
    (activity) =>
      activity.location.locationKey === "ordinary-life:meeting-room",
  )!;
  return { world, personId, travel, destination };
}

describe("making a journey on its own", () => {
  it.each([
    ["US-IL", "Springfield"],
    ["US-MD", "Baltimore"],
  ])(
    "leaves the destination it was booked for performable in %s",
    (st, city) => {
      const { world, personId, travel, destination } = lifeWithAJourney(
        `journey-alone-${city}`,
        city,
        st,
      );

      const arrived = performVenueActivity(world, personId, travel.id);
      expect(scheduledActivityState(arrived, travel.id).status).toBe(
        "completed",
      );
      expect(scheduledActivityState(arrived, destination.id).status).toBe(
        "scheduled",
      );

      const entry = venueActivities(arrived, personId).find(
        (candidate) => candidate.activity.id === destination.id,
      )!;
      // Specifically not the refusal the walk hit: having travelled there must
      // never read as not knowing where the player is.
      expect(entry.refusal).toBeNull();

      const attended = performVenueActivity(arrived, personId, destination.id);
      expect(scheduledActivityState(attended, destination.id).status).toBe(
        "completed",
      );
    },
  );
});
