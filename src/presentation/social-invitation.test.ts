import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { recordRelationshipInteraction } from "../simulation/records";
import {
  controlledCommitmentsBlockingMinuteAdvance,
  scheduledActivityState,
} from "../simulation/time-work";
import { simulationMinutesBetween } from "../simulation/dates";
import {
  socialInvitationsFor,
  acceptSocialInvitation,
  declineSocialInvitation,
} from "./social-invitation";
import {
  invitationOpening,
  SOCIAL_INVITATION_REPLIES,
} from "./social-invitation-language";
import { projectWorldRecap } from "./world-recap";
import { projectWorld39Journal } from "./world39-journal";
import { SocialInvitationPanel } from "./SocialInvitationPanel";
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
    let pass = 0;
    pass < Math.ceil(400 / 7) && socialInvitationsFor(world, game.playerPersonId).length === 0;
    pass += 1
  ) {
    // A weekly pass lands inside the occasion's 2–12 day notice window while
    // avoiding a whole-world refresh after every single day.
    world = refreshLifeOpportunities(
      passOrdinaryDays(world, 7),
      game.playerPersonId,
    );
  }
  return { world, personId: game.playerPersonId };
}
describe("explicit personal invitation refusal", () => {
  let fixture: ReturnType<typeof start>;
  beforeAll(() => {
    fixture = start();
  }, 30_000);

  it("renders the recorded ask, presents it as unread, and saves the exact answer for its host", () => {
    const { world, personId } = fixture;
    const invitation = socialInvitationsFor(world, personId)[0]!;
    const markup = renderToStaticMarkup(
      createElement(SocialInvitationPanel, {
        world,
        personId,
        onWorldChange: () => {},
      }),
    );
    expect(markup).toContain(
      "My birthday’s Tuesday. Do you want to come over Saturday?",
    );
    expect(markup).toContain("Saturday, September 5 · 3–6 p.m.");
    expect(markup).toContain("Say you’ll come");
    expect(markup).toContain("Say you can’t make it");
    expect(markup).not.toContain("Attendance is optional");
    expect(markup).not.toContain("Decline invitation");
    expect(
      invitationOpening(world, invitation.invitationEventId, personId),
    ).toBe("My birthday’s Tuesday. Do you want to come over Saturday?");
    const notice = projectWorldRecap(world, personId, 0, 100)?.entries.find(
      (entry) => entry.eventId === invitation.invitationEventId,
    );
    expect(notice?.headline).toBe("Beth invited you over for Saturday.");
    expect(notice?.directInvitation).toBe(true);

    const answered = acceptSocialInvitation(world, {
      personId,
      activityId: invitation.activityId,
      revision: invitation.revision,
    });
    const reply = answered.history.claims.find(
      (claim) =>
        claim.stableKey ===
        `social-invitation:accept:${invitation.activityId}:claim`,
    );
    expect(reply?.statement).toBe(SOCIAL_INVITATION_REPLIES.accept.statement);
    expect(
      answered.history.knowledge.some(
        (record) =>
          record.personId === invitation.counterpartPersonId &&
          record.source.kind === "told-by" &&
          record.source.claimId === reply?.id,
      ),
    ).toBe(true);
    expect(
      projectWorldRecap(answered, personId, 0, 100)?.entries.some(
        (entry) => entry.eventId === invitation.invitationEventId,
      ),
    ).not.toBe(true);
    const acceptedEvent = answered.history.events.find(
      (event) => event.stableKey === `social-invitation:accept:${invitation.activityId}`,
    )!;
    expect(
      projectWorld39Journal(answered, personId).entries.some(
        (entry) => entry.sourceId === acceptedEvent.id,
      ),
    ).toBe(false);
  });

  it("uses the saved title and belief for a non-home invitation", () => {
    const { world, personId } = fixture;
    const invitation = socialInvitationsFor(world, personId)[0]!;
    const nonHome = {
      ...world,
      history: {
        ...world.history,
        scheduledActivities: world.history.scheduledActivities.map((activity) =>
          activity.id === invitation.activityId
            ? {
                ...activity,
                title: "Reception at City Hall",
                location: { ...activity.location, label: "City Hall" },
              }
            : activity,
        ),
        knowledge: world.history.knowledge.map((record) =>
          record.eventId === invitation.invitationEventId &&
          record.personId === personId
            ? { ...record, believedSummary: "Beth invited you to the reception." }
            : record,
        ),
      },
    };
    const markup = renderToStaticMarkup(
      createElement(SocialInvitationPanel, {
        world: nonHome,
        personId,
        onWorldChange: () => {},
      }),
    );
    expect(markup).toContain("Reception at City Hall");
    expect(markup).not.toContain("invited you over");
    const notice = projectWorldRecap(nonHome, personId, 0, 100)?.entries.find(
      (entry) => entry.eventId === invitation.invitationEventId,
    );
    expect(notice?.headline).toBe("Beth invited you to the reception.");
  });

  it("declines a future invitation, cancels only its hold, preserves identity and reloads", () => {
    const { world, personId } = fixture;
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
    expect(
      next.history.claims.find(
        (claim) =>
          claim.stableKey ===
          `social-invitation:decline:${invitation.activityId}:claim`,
      )?.statement,
    ).toBe(SOCIAL_INVITATION_REPLIES.decline.statement);
    expect(scheduledActivityState(next, invitation.activityId).status).toBe(
      "cancelled",
    );
    expect(
      controlledCommitmentsBlockingMinuteAdvance(next, minutes),
    ).not.toContain(invitation.activityId);
    expect(socialInvitationsFor(next, personId)).not.toContainEqual(invitation);
    const declinedEvent = next.history.events.find(
      (event) => event.stableKey === `social-invitation:decline:${invitation.activityId}`,
    )!;
    expect(
      projectWorld39Journal(next, personId).entries.some(
        (entry) => entry.sourceId === declinedEvent.id,
      ),
    ).toBe(false);
    const consequential = recordRelationshipInteraction(next, {
      stableKey: `test:invitation-consequence:${declinedEvent.id}`,
      personIds: [personId, invitation.counterpartPersonId!],
      eventId: declinedEvent.id,
      occurredAt: next.currentDate,
      kind: "conflict:invitation-answer",
      change: "strained",
      significance: "meaningful",
      summary: "The refusal changed how they stood with one another.",
      tags: [],
    });
    expect(
      projectWorld39Journal(consequential, personId).entries.some(
        (entry) => entry.sourceId === declinedEvent.id,
      ),
    ).toBe(true);
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
    const { world, personId } = fixture;
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
