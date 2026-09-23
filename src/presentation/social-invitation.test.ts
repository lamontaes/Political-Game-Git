import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import {
  controlledCommitmentsBlockingMinuteAdvance,
  scheduledActivityState,
} from "../simulation/time-work";
import { simulationMinutesBetween } from "../simulation/dates";
import {
  socialInvitationsFor,
  declineSocialInvitation,
} from "./social-invitation";
import { passOrdinaryDays } from "./ordinary-life";

function start() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    // A Kansas city whose world holds somebody with a birthday to mark in
    // the first year; an invitation needs a reason in the host's own life.
    seed: "saturday-2015900-d",
    startAge: 35,
    placeKey: "2015900",
    startKind: "custom",
    household: "shares-a-home",
  });
  let world = refreshLifeOpportunities(
    openOrdinaryLifeRecords(game.world, game.playerPersonId),
    game.playerPersonId,
  );
  for (
    let day = 0;
    day < 400 && socialInvitationsFor(world, game.playerPersonId).length === 0;
    day += 1
  ) {
    world = refreshLifeOpportunities(
      passOrdinaryDays(world, 1),
      game.playerPersonId,
    );
  }
  return { world, personId: game.playerPersonId };
}
describe("explicit personal invitation refusal", () => {
  it("declines a future invitation, cancels only its hold, preserves identity and reloads", () => {
    const { world, personId } = start();
    const bytes = serializeWorld(world);
    const invitation = socialInvitationsFor(world, personId)[0]!;
    expect(invitation).toBeDefined();
    expect(serializeWorld(world)).toBe(bytes);
    const minutes =
      simulationMinutesBetween(world.currentMoment, invitation.end) + 1;
    expect(
      controlledCommitmentsBlockingMinuteAdvance(world, minutes),
    ).toContain(invitation.activityId);
    const next = declineSocialInvitation(world, {
      personId,
      activityId: invitation.activityId,
      revision: invitation.revision,
    });
    expect(next.currentMoment).toEqual(world.currentMoment);
    expect(next.history.scheduledActivities).toEqual(
      world.history.scheduledActivities,
    );
    expect(next.history.events.slice(0, world.history.events.length)).toEqual(
      world.history.events,
    );
    expect(next.history.events.at(-1)!.tags).toContain(
      `invitation:${invitation.invitationEventId}`,
    );
    expect(scheduledActivityState(next, invitation.activityId).status).toBe(
      "cancelled",
    );
    expect(
      controlledCommitmentsBlockingMinuteAdvance(next, minutes),
    ).not.toContain(invitation.activityId);
    expect(socialInvitationsFor(next, personId)).not.toContainEqual(invitation);
    expect(deserializeWorld(serializeWorld(next))).toEqual(next);
    expect(() =>
      declineSocialInvitation(next, {
        personId,
        activityId: invitation.activityId,
        revision: invitation.revision,
      }),
    ).toThrow();
    for (const activity of world.history.scheduledActivities.filter(
      (a) => a.id !== invitation.activityId,
    ))
      expect(scheduledActivityState(next, activity.id)).toEqual(
        scheduledActivityState(world, activity.id),
      );
  });
  it("refuses a different person, stale revision and unrelated activity", () => {
    const { world, personId } = start();
    const invitation = socialInvitationsFor(world, personId)[0]!;
    expect(invitation).toBeDefined();
    for (const input of [
      {
        personId: "not-player",
        activityId: invitation.activityId,
        revision: invitation.revision,
      },
      { personId, activityId: invitation.activityId, revision: "stale" },
      { personId, activityId: "unrelated", revision: invitation.revision },
    ])
      expect(() => declineSocialInvitation(world, input)).toThrow();
  });
});
