import { describe, expect, it } from "vitest";
import {
  deserializeWorld,
  scheduledActivityState,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  CLAIM_CONTRADICTION_EVENT,
  claimStanceOf,
} from "../simulation/claim-stances";
import { CLAIM_CONTRADICTION_TRANSITION_KEY } from "../simulation/claim-contradictions";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import { projectPartyEncounters } from "../simulation/living-world/party-chapters";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { letAdultTimePass } from "./adult-life";
import { spokenDay, spokenEvening } from "./contextual-scene-families";
import type { ContextualSceneSubject } from "./contextual-scenes";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { attendChapterMeeting } from "./party-chapter-actions";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * PROSE B in an ordinary life: an organizer's invitation, the evening it
 * books, a housemate's question about that evening, a deliberate lie, and the
 * lie meeting evidence — all through normal time and the normal conversation
 * surface, with the controls the contract names.
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

/** Plays the ordinary route up to the evening question. */
function toEveningQuestion(seed: string) {
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
  const evening = passUntil(accepted, player, "scene-home-evening", 10);
  return {
    life,
    player,
    invite,
    invited: invited!,
    asked,
    accepted,
    meeting,
    evening,
  };
}

describe("PROSE B contextual scenes in ordinary play", () => {
  const route = toEveningQuestion("prose-b-0");
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

  it("a housemate asks about that evening, with an explicit Lie only where the record supports one", () => {
    const { evening, meeting } = route;
    expect(evening, "the evening question should arise").not.toBeNull();
    const view = projectPlayerConversation(
      evening!,
      player,
      "scene-home-evening",
    )!;
    expect(view.openingLine).toMatch(/evening|tonight|night/);
    const keys = Object.fromEntries(
      view.intents.map((intent) => [intent.key, intent]),
    );
    expect(keys["tell-plans"]?.truthIntent).toBe("sincere");
    expect(keys["tell-plans"]?.label).toContain(meeting.title);
    expect(keys["say-home"]?.truthIntent).toBe("deliberate-deception");
    expect(keys["ask-why"]?.truthIntent).toBeUndefined();
    expect(keys["invite-along"]).toBeDefined();
  });

  const lied = say(route.evening!, player, "scene-home-evening", "say-home");

  it("a lie saves its proposition, belief, words and listeners once", () => {
    const turn = lied.history.events.findLast((event) =>
      event.tags.some((tag) => tag.startsWith("claim.stance.v1:")),
    )!;
    const stance = claimStanceOf(turn)!;
    expect(stance).toMatchObject({
      propositionKey: `attends:${route.meeting.id}`,
      asserted: "denies",
      speakerBelief: "believes-true",
      intent: "deceive",
    });
    expect(stance.statement).toMatch(/^No, nothing\. I’ll be home /);
    const binding = sceneBindingsFor(lied, player, "home-evening").at(-1)!;
    expect(stance.recipientPersonIds).toEqual([
      binding.binding.speakerPersonId,
    ]);
    const claim = lied.history.claims.find(
      (entry) => entry.eventId === turn.id && entry.speakerPersonId === player,
    )!;
    expect(claim.statement).toBe(stance.statement);
    expect(claim.relationshipToTruth).toBe("unknown");
    expect(
      lied.history.knowledge.some(
        (entry) =>
          entry.personId === binding.binding.speakerPersonId &&
          entry.source.kind === "told-by" &&
          entry.source.claimId === claim.id,
      ),
    ).toBe(true);
    expect(
      lied.history.futureDueItems.some(
        (item) => item.transitionKey === CLAIM_CONTRADICTION_TRANSITION_KEY,
      ),
    ).toBe(true);
    expect(lied.currentMoment).toEqual(route.evening!.currentMoment);
  });

  it("save and reopen keep the scene settled and the stance exact", () => {
    const reopened = deserializeWorld(serializeWorld(lied));
    expect(serializeWorld(reopened)).toBe(serializeWorld(lied));
    const view = projectPlayerConversation(
      reopened,
      player,
      "scene-home-evening",
    )!;
    expect(view.settled).toBe(true);
    expect(view.intents).toEqual([]);
    expect(view.openingLine).toMatch(/See you then/);
  });

  it("going anyway lets the housemate see it, and they raise it", () => {
    let world = lied;
    world = attendChapterMeeting(world, player, route.meeting.id);
    expect(scheduledActivityState(world, route.meeting.id).status).toBe(
      "completed",
    );
    const found = passUntil(world, player, "scene-home-evening", 5)!;
    expect(found).not.toBeNull();
    const discovery = found.history.events.find(
      (event) => event.type === CLAIM_CONTRADICTION_EVENT,
    )!;
    expect(discovery.tags).toContain("claim.intent.deceive");
    expect(
      found.history.relationshipInteractions.some(
        (entry) =>
          entry.kind === "conflict:misled" && entry.change === "strained",
      ),
    ).toBe(true);
    const view = projectPlayerConversation(
      found,
      player,
      "scene-home-evening",
    )!;
    expect(view.topicLabel).toBe("What you said about that evening");
    expect(view.openingLine).toContain(route.meeting.title);
    const keys = view.intents.map((intent) => [intent.key, intent.truthIntent]);
    expect(keys).toEqual([
      ["admit-it", "sincere"],
      ["keep-denying", "deliberate-deception"],
    ]);
    // The player did not learn of the discovery until spoken to.
    expect(
      found.history.knowledge.some(
        (entry) => entry.personId === player && entry.eventId === discovery.id,
      ),
    ).toBe(false);
    const admitted = say(found, player, "scene-home-evening", "admit-it");
    expect(admitted.history.relationshipInteractions.at(-1)?.kind).toBe(
      "support:owned-a-mistake",
    );
  });

  it("control: a sincere answer schedules no check and finds nothing", () => {
    const honest = say(
      route.evening!,
      player,
      "scene-home-evening",
      "tell-plans",
    );
    expect(
      honest.history.futureDueItems.filter(
        (item) => item.transitionKey === CLAIM_CONTRADICTION_TRANSITION_KEY,
      ),
    ).toHaveLength(0);
    let world = attendChapterMeeting(honest, player, route.meeting.id);
    for (let day = 0; day < 4; day += 1) world = passOrdinaryDays(world, 1);
    expect(
      world.history.events.some(
        (event) => event.type === CLAIM_CONTRADICTION_EVENT,
      ),
    ).toBe(false);
  });

  it("control: an unanswered invitation offers no Lie, and background time is not frozen", () => {
    const world = route.invited;
    const open = sceneBindingsFor(world, player, "home-evening").at(-1);
    if (open?.binding.variant === "open-evening") {
      const view = projectPlayerConversation(
        world,
        player,
        "scene-home-evening",
      )!;
      expect(
        view.intents.some(
          (intent) => intent.truthIntent === "deliberate-deception",
        ),
      ).toBe(false);
    }
    // Ignoring the organizer entirely: days still pass.
    const later = passOrdinaryDays(world, 3);
    expect(later.currentDate > world.currentDate).toBe(true);
  });

  it("projection is pure", () => {
    const before = serializeWorld(route.evening!);
    availablePlayerConversations(route.evening!, player);
    projectPlayerConversation(route.evening!, player, "scene-home-evening");
    expect(serializeWorld(route.evening!)).toBe(before);
  });
});

describe("a favor somebody actually asked for", () => {
  it("the asker's own words open it; agreeing answers the same request the Story would", () => {
    const life = adultLife("prose-b-1");
    const player = life.playerPersonId;
    let world = life.world;
    for (
      let step = 0;
      step < 30 && !offered(world, player, "scene-favor");
      step += 1
    ) {
      world = letAdultTimePass(world, 3);
    }
    const view = projectPlayerConversation(world, player, "scene-favor")!;
    expect(view).not.toBeNull();
    expect(view.openingLine).toContain("Could you look over my invitation");
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "agree",
      "agree-with-limit",
      "decline",
      "ask-how-long",
    ]);
    const asked = say(world, player, "scene-favor", "ask-how-long");
    expect(asked.history.events.at(-1)!.context.immediateReaction).toMatch(
      /About 20 minutes/,
    );
    const agreed = say(asked, player, "scene-favor", "agree-with-limit");
    expect(
      agreed.history.events.some(
        (event) =>
          event.type === "life.favour-response" &&
          event.tags.includes("favour.conditions"),
      ),
    ).toBe(true);
    // Answered here, the request is no longer open anywhere.
    expect(
      lifeOpportunitiesFor(agreed, player).some(
        (entry) => entry.kind === "favour-request",
      ),
    ).toBe(false);
    // Agreeing is not doing: no proofreading time was spent.
    expect(agreed.currentMoment).toEqual(world.currentMoment);
  });
});

describe("spoken dates", () => {
  it("says a day the way a person would", () => {
    const today = "2026-09-15" as never;
    expect(spokenDay("2026-09-15" as never, today)).toBe("today");
    expect(spokenEvening("2026-09-15" as never, today)).toBe("tonight");
    expect(spokenEvening("2026-09-16" as never, today)).toBe(
      "tomorrow evening",
    );
    expect(spokenEvening("2026-09-18" as never, today)).toBe("Friday evening");
    expect(spokenDay("2026-10-06" as never, today)).toBe("on October 6, 2026");
  });
});
