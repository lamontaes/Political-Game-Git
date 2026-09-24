import { describe, expect, it } from "vitest";

import {
  addSimulationMinutes,
  createScheduledActivity,
  scheduledActivityState,
} from "../simulation";
import { createNewGameWorld } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { venueActivities } from "./venue-activity";

/**
 * A Nevada life eight years in listed 104 party meetings under Places, every
 * one of them in the past, and none could be answered. An optional hold whose
 * time has gone stays "scheduled" in the record when nothing lapsed it; it is
 * not something the player can go to any more.
 */
function lifeWithAnInvitation(kind: "tentative" | "confirmed") {
  const created = createNewGameWorld({
    placeKey: "nebraska",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "lapsed-invitation",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  const personId = created.playerPersonId;
  const opened = openOrdinaryLife(created.world, personId);
  const start = addSimulationMinutes(opened.currentMoment, 60 * 24 * 3);
  const world = createScheduledActivity(opened, {
    stableKey: `lapsed-invitation-test:${kind}`,
    title: "County party meeting",
    summary: "A county party meeting. Coming is optional.",
    kind,
    start,
    end: addSimulationMinutes(start, 90),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "lapsed-invitation-test:hall",
      label: "Party hall",
      jurisdictionId: null,
    },
    sourceEntityIds: [personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  return {
    world,
    personId,
    activityId: world.history.scheduledActivities.at(-1)!.id,
  };
}

describe("Invitations whose time has gone", () => {
  it("are offered while ahead and leave the list once past", () => {
    const { world, personId, activityId } = lifeWithAnInvitation("tentative");
    expect(
      venueActivities(world, personId).some(
        (entry) => entry.activity.id === activityId,
      ),
    ).toBe(true);

    // Read the same record once its time has gone, as a long skip that never
    // lapsed it leaves it.
    const state = scheduledActivityState(world, activityId);
    const later = {
      ...world,
      currentMoment: addSimulationMinutes(state.end, 1),
    };
    // The record is untouched: it still says it was offered and never lapsed.
    expect(scheduledActivityState(later, activityId).status).toBe("scheduled");
    expect(
      venueActivities(later, personId).some(
        (entry) => entry.activity.id === activityId,
      ),
    ).toBe(false);
  });

  it("keeps a confirmed commitment however late, so it can be resolved", () => {
    const { world, personId, activityId } = lifeWithAnInvitation("confirmed");
    // Time does not step over a confirmed commitment; read it at its end.
    const state = scheduledActivityState(world, activityId);
    const past = {
      ...world,
      currentMoment: addSimulationMinutes(state.end, 1),
    };
    expect(
      venueActivities(past, personId).some(
        (entry) => entry.activity.id === activityId,
      ),
    ).toBe(true);
  });
});
