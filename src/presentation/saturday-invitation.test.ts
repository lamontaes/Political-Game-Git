import { describe, expect, it } from "vitest";

import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  askerChooser,
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import { personName } from "../simulation/people";
import { recordPersonDeath } from "../simulation/vitality";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { scheduledActivityState } from "../simulation/time-work";
import type { EntityId, World } from "../simulation/types";
import {
  acceptSocialInvitation,
  settleSocialInvitationFromScene,
  socialInvitationsFor,
} from "./social-invitation";
import { passOrdinaryDays } from "./ordinary-life";
import { performVenueActivity, venueActivities } from "./venue-activity";

function start(placeKey: string, seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 35,
    placeKey,
    startKind: "custom",
    household: "shares-a-home",
  });
  let world = refreshLifeOpportunities(
    openOrdinaryLifeRecords(game.world, game.playerPersonId),
    game.playerPersonId,
  );
  // An invitation now needs a reason in the host's own life, so it arrives
  // when one of the people this life knows has one: days pass until then.
  for (
    let day = 0;
    day < INVITATION_SEARCH_DAYS &&
    socialInvitationsFor(world, game.playerPersonId).length === 0;
    day += 1
  ) {
    world = refreshLifeOpportunities(
      passOrdinaryDays(world, 1),
      game.playerPersonId,
    );
  }
  return { world, personId: game.playerPersonId };
}

const INVITATION_SEARCH_DAYS = 400;

/**
 * Seeds whose worlds hold somebody with a reason to have people over within
 * the search window. Plain "saturday-2015900" has nobody who does in 400
 * days, which is a correct answer and not the one these tests are about.
 */
const SEEDS: Record<string, string> = {
  "5114968": "saturday-5114968",
  "2015900": "saturday-2015900-d",
  "0200065": "saturday-0200065",
};

function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function askerOf(world: World, eventId: EntityId): EntityId {
  return world.history.events
    .find((event) => event.id === eventId)!
    .participants.find((entry) => entry.role === "agency:asked")!.personId;
}

const PLACES = [
  ["5114968", "Charlottesville, Virginia"],
  ["2015900", "a Kansas city"],
  ["0200065", "a small place in Alaska"],
] as const;

describe("a Saturday invitation, said yes to", () => {
  it.each(PLACES)(
    "in %s (%s), names who asked, becomes a plan, and is kept",
    (placeKey) => {
      const { world, personId } = start(placeKey, SEEDS[placeKey]!);
      const invitation = socialInvitationsFor(world, personId)[0];
      expect(invitation).toBeDefined();
      const askerId = askerOf(world, invitation!.invitationEventId);
      const asker = personName(world.people[askerId]!);

      // The invitation reads from the player's side and names the asker.
      const asking = world.history.events.find(
        (event) => event.id === invitation!.invitationEventId,
      )!;
      // Who asked, and the reason from their own life, dated.
      expect(asking.summary).toMatch(
        new RegExp(
          `^${asker}, who (turns \\d+|moved|started at .+) on [A-Z][a-z]+ \\d{1,2}, \\d{4}, asked you over`,
        ),
      );
      expect(invitation!.title).toBe(`Saturday afternoon at ${asker}'s`);
      const known = world.history.knowledge.find(
        (entry) =>
          entry.personId === personId &&
          entry.eventId === invitation!.invitationEventId,
      )!;
      expect(known.believedSummary).toMatch(
        new RegExp(
          `^${asker} .+ on the afternoon of [A-Z][a-z]+ \\d{1,2}, \\d{4}\\. Going is optional\\.$`,
        ),
      );

      const accepted = acceptSocialInvitation(world, {
        personId,
        activityId: invitation!.activityId,
        revision: invitation!.revision,
      });
      expect(accepted.currentMoment).toEqual(world.currentMoment);
      expect(
        scheduledActivityState(accepted, invitation!.activityId).status,
      ).toBe("cancelled");
      expect(socialInvitationsFor(accepted, personId)).toEqual([]);
      const plan = accepted.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(invitation!.invitationEventId),
      )!;
      expect(plan.responsiblePersonId).toBe(personId);
      expect(scheduledActivityState(accepted, plan.id).start).toEqual(
        invitation!.start,
      );
      expect(accepted.history.events.at(-1)!.summary).toBe(
        `You told ${asker} you would come.`,
      );
      expect(deserializeWorld(serializeWorld(accepted))).toEqual(accepted);

      // The week passes as a player would pass it. Saturday's plan is what
      // stops it, not something that lapses on the way.
      const saturday = passOrdinaryDays(
        accepted,
        daysUntil(accepted.currentDate, invitation!.start.date),
      );
      expect(scheduledActivityState(saturday, plan.id).status).toBe(
        "scheduled",
      );
      // It can be kept: a trip there, and nothing refusing it.
      const entry = venueActivities(saturday, personId).find(
        ({ activity }) => activity.id === plan.id,
      )!;
      expect(entry.refusal).toBeNull();
      expect(entry.journey).not.toBeNull();

      const kept = performVenueActivity(saturday, personId, plan.id);
      expect(scheduledActivityState(kept, plan.id).status).toBe("completed");
      const attended = kept.history.events.find(
        (event) => event.type === "life.social-occasion-attended",
      )!;
      expect(attended.summary).toBe(`You spent the afternoon at ${asker}'s.`);
      expect(
        kept.history.relationshipInteractions.some(
          (interaction) =>
            interaction.eventId === attended.id &&
            interaction.personIds.includes(askerId) &&
            interaction.personIds.includes(personId),
        ),
      ).toBe(true);
      // Nothing says this one passed without an answer. (The evening in and
      // the public meeting the player let go of that week do, and should.)
      const lapses = kept.history.events.filter((event) =>
        event.summary.includes("passed without an answer"),
      );
      expect(lapses.length).toBeGreaterThan(0);
      for (const lapse of lapses)
        expect(
          lapse.involvedEntityIds.some(
            (id) => id === plan.id || id === invitation!.activityId,
          ),
        ).toBe(false);
      // Keeping it once records it once.
      expect(performVenueActivity(kept, personId, plan.id)).toBe(kept);
    },
    120_000,
  );

  it("is kept when the player simply lets the week go by", () => {
    const { world, personId } = start("5114968", "saturday-5114968");
    const invitation = socialInvitationsFor(world, personId)[0]!;
    const askerId = askerOf(world, invitation.invitationEventId);
    const accepted = acceptSocialInvitation(world, {
      personId,
      activityId: invitation.activityId,
      revision: invitation.revision,
    });
    const plan = accepted.history.scheduledActivities.at(-2)!;
    expect(plan.kind).toBe("confirmed");
    const week = passOrdinaryDays(
      accepted,
      daysUntil(accepted.currentDate, invitation.start.date) + 1,
    );
    expect(
      week.currentDate > scheduledActivityState(accepted, plan.id).start.date,
    ).toBe(true);
    expect(scheduledActivityState(week, plan.id).status).toBe("completed");
    const attended = week.history.events.filter(
      (event) => event.type === "life.social-occasion-attended",
    );
    expect(attended).toHaveLength(1);
    expect(attended[0]!.involvedEntityIds).toContain(askerId);
  }, 120_000);

  it("answered in conversation, moves the calendar with the answer", () => {
    const { world, personId } = start("2015900", SEEDS["2015900"]!);
    const invitation = socialInvitationsFor(world, personId)[0]!;
    const askerId = askerOf(world, invitation.invitationEventId);

    const yes = settleSocialInvitationFromScene(world, world, {
      personId,
      counterpartPersonId: askerId,
      accepted: true,
    });
    expect(scheduledActivityState(yes, invitation.activityId).status).toBe(
      "cancelled",
    );
    expect(
      yes.history.scheduledActivities.some(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(invitation.invitationEventId),
      ),
    ).toBe(true);

    const no = settleSocialInvitationFromScene(world, world, {
      personId,
      counterpartPersonId: askerId,
      accepted: false,
    });
    expect(scheduledActivityState(no, invitation.activityId).status).toBe(
      "cancelled",
    );
    expect(
      no.history.scheduledActivities.filter(
        (activity) => activity.kind === "confirmed",
      ),
    ).toEqual(
      world.history.scheduledActivities.filter(
        (activity) => activity.kind === "confirmed",
      ),
    );
  });
});

describe("who asks", () => {
  it("moves on from whoever asked last, rather than one neighbor every week", () => {
    const { world, personId } = start("0200065", "saturday-0200065");
    const invitation = socialInvitationsFor(world, personId)[0]!;
    const askedLast = askerOf(world, invitation.invitationEventId);
    // Everybody who has asked this person anything in the opening week.
    const askers = new Set(
      world.history.events.flatMap((event) =>
        event.participants
          .filter((entry) => entry.role === "agency:asked")
          .map((entry) => entry.personId),
      ),
    );
    const others = world.personOrder.filter(
      (id) => id !== personId && !askers.has(id),
    );
    const choose = askerChooser(world, personId);
    // Somebody who has asked yields to somebody who has not, wherever they
    // sit in the world's order.
    expect(choose(world, [askedLast, others.at(-1)!])).toBe(others.at(-1));
    expect(choose(world, [others.at(-1)!, askedLast])).toBe(others.at(-1));
    // Nobody has asked yet: the world's order decides, the same way each time.
    const [first, second] = world.personOrder.filter((id) =>
      others.includes(id),
    );
    expect(choose(world, [second!, first!])).toBe(first);
    // And the one who asked is still chosen when nobody else could.
    expect(choose(world, [askedLast])).toBe(askedLast);
    // Unless they have since died, when nobody is.
    const died = recordPersonDeath(world, {
      stableKey: `saturday:death:${askedLast}`,
      personId: askedLast,
      diedAt: world.currentDate,
      causeKey: "cause:saturday-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Saturday invitation fixture." },
    });
    expect(choose(died, [askedLast])).toBeNull();
    expect(choose(died, [askedLast, first!])).toBe(first);
  });
});
