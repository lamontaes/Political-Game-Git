import { describe, expect, it } from "vitest";
import { scheduledActivityState } from "../simulation";
import type { EntityId, World } from "../simulation";
import { projectPartyEncounters } from "../simulation/living-world/party-chapters";
import { spokenDay } from "./contextual-scene-families";
import type { ContextualSceneSubject } from "./contextual-scenes";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * PROSE B in an ordinary life: an organizer's invitation reaches the normal
 * conversation surface and books the meeting through the chapter's writer.
 */

function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
}

function offered(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
): boolean {
  return availablePlayerConversations(world, player).some(
    (entry) => entry.subject === subject && !entry.settled,
  );
}

function passUntil(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  maxDays = 60,
): World | null {
  let current = world;
  for (let day = 0; day < maxDays; day += 1) {
    if (offered(current, player, subject)) return current;
    const next = passOrdinaryDays(current, 1, { stopForTentativeHolds: true });
    if (next === current) return null;
    current = next;
  }
  return offered(current, player, subject) ? current : null;
}

function say(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  intent: string,
): World {
  const view = projectPlayerConversation(world, player, subject)!;
  expect(view, `${subject} should be open`).not.toBeNull();
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  }).world;
}

/** Plays the ordinary route up to an organizer invitation. */
function toInvitation(seed: string) {
  const life = adultLife(seed);
  const player = life.playerPersonId;
  const invited = passUntil(life.world, player, "scene-party-invite");
  expect(invited, "an organizer should reach out").not.toBeNull();
  const invite = projectPlayerConversation(
    invited!,
    player,
    "scene-party-invite",
  )!;
  const asked = say(invited!, player, "scene-party-invite", "ask-what-happens");
  const accepted = say(asked, player, "scene-party-invite", "say-yes");
  const meeting = accepted.history.scheduledActivities.find(
    (activity) =>
      activity.kind === "confirmed" &&
      activity.participantPersonIds.includes(player) &&
      scheduledActivityState(accepted, activity.id).status === "scheduled",
  )!;
  return {
    life,
    player,
    invite,
    invited: invited!,
    asked,
    accepted,
    meeting,
  };
}

describe("PROSE B contextual scenes in ordinary play", () => {
  const route = toInvitation("prose-b-0");
  const { player } = route;

  it("an organizer's invitation is a real, specific exchange", () => {
    const { invite } = route;
    expect(invite.topicLabel).toMatch(/^An invitation from the .+/);
    expect(invite.openingLine).toMatch(/I organize the|with the/);
    expect(invite.openingLine).toMatch(/community room/);
    expect(invite.intents.map((intent) => intent.key)).toEqual([
      "say-yes",
      "not-sure",
      "no-thanks",
      "ask-what-happens",
    ]);
    // Nothing in an invitation is a factual claim; no truth marking.
    expect(invite.intents.every((intent) => !intent.truthIntent)).toBe(true);
  });

  it("a follow-up question keeps the exchange open; talking takes no time", () => {
    const { invited, asked, accepted } = route;
    expect(asked.currentMoment).toEqual(invited.currentMoment);
    expect(accepted.currentMoment).toEqual(invited.currentMoment);
    const after = projectPlayerConversation(
      asked,
      player,
      "scene-party-invite",
    )!;
    expect(after.settled).toBe(false);
    expect(after.intents.map((intent) => intent.key)).not.toContain(
      "ask-what-happens",
    );
  });

  it("saying yes goes through the chapter's own acceptance, and the exchange stays settled", () => {
    const { accepted, meeting } = route;
    expect(meeting.title).toMatch(/open meeting/);
    expect(
      projectPartyEncounters(accepted, player).some((chapter) =>
        chapter.activities.some((entry) => entry.state === "accepted"),
      ),
    ).toBe(true);
    const view = projectPlayerConversation(
      accepted,
      player,
      "scene-party-invite",
    )!;
    expect(view.settled).toBe(true);
    expect(view.openingLine).toMatch(/See you/);
  });
});

describe("spoken dates", () => {
  it("says a day the way a person would", () => {
    const today = "2026-09-15" as never;
    expect(spokenDay("2026-09-15" as never, today)).toBe("today");
    expect(spokenDay("2026-10-06" as never, today)).toBe("on October 6, 2026");
  });
});
