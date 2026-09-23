import { describe, expect, it } from "vitest";
import {
  addDays,
  assertWorldIntegrity,
  deserializeWorld,
  scheduledActivityState,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  CONTACT_ACCEPTED_EVENT,
  CONTACT_COUNTERED_EVENT,
  CONTACT_DECLINED_EVENT,
  CONTACT_PROPOSED_EVENT,
  contactProposals,
} from "../simulation/people-contact";
import { recordRelationshipInteraction } from "../simulation/records";
import { recordPersonDeath } from "../simulation/vitality";
import { letAdultTimePass } from "./adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import {
  answerMeeting,
  askToMeet,
  offerAnotherDay,
  projectContacts,
} from "./people-contacts";

/**
 * CRUNCH47 B1 (P3): asking somebody to meet, and being asked. A channel is a
 * way of reaching a person, not a guarantee that they will say yes.
 */

function adultLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  return {
    player: game.playerPersonId,
    world: openOrdinaryLife(game.world, game.playerPersonId),
  };
}

const answersTo = (world: World, proposalEventId: EntityId) =>
  world.history.events.filter((event) =>
    event.tags.includes(`contact.proposal:${proposalEventId}`),
  );

describe("PEOPLE P3: reaching somebody", () => {
  const { player, world } = adultLife("people-contact-a");
  const view = projectContacts(world, player);

  it("lists real people with a real basis, and no invented channel", () => {
    expect(view.contacts.length).toBeGreaterThan(0);
    for (const contact of view.contacts) {
      expect(world.people[contact.personId]).toBeTruthy();
      expect(contact.basis.length).toBeGreaterThan(0);
      expect(contact.channels.length).toBeGreaterThan(0);
      // A channel describes how they could be reached. It is never phrased as
      // an instruction, because there is no command behind it — what can be
      // done is on `actions`.
      for (const channel of contact.channels) {
        expect(channel.label).not.toMatch(/^(Call|Talk|Catch|Speak|Ask|Meet) /);
        expect(channel).not.toHaveProperty("available");
      }
    }
    // The projection writes nothing.
    expect(serializeWorld(world)).toBe(serializeWorld(world));
  });

  it("refuses a day that is too soon, too far off, or nobody's to give", () => {
    const other = view.contacts[0]!.personId;
    for (const on of [
      world.currentDate,
      addDays(world.currentDate, 1),
      addDays(world.currentDate, 400),
    ]) {
      expect(() =>
        askToMeet(world, { personId: player, otherPersonId: other, on }),
      ).toThrow(/needs at least 2 days' notice/);
    }
    expect(() =>
      askToMeet(world, {
        personId: other,
        otherPersonId: player,
        on: addDays(world.currentDate, 5),
      }),
    ).toThrow(/being played/);
    // The refusal is shown to the player word for word, so it states the rule
    // and never an ISO date. The spoken dates live on the view instead.
    try {
      askToMeet(world, {
        personId: player,
        otherPersonId: other,
        on: world.currentDate,
      });
      throw new Error("Expected a refusal.");
    } catch (error) {
      const said = (error as Error).message;
      expect(said).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(said).toContain("45 days ahead");
    }
    expect(view.earliestMeetingSpoken).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(view.latestMeetingSpoken).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  const other = view.contacts[0]!.personId;
  const on = addDays(world.currentDate, 5);
  const asked = askToMeet(world, {
    personId: player,
    otherPersonId: other,
    on,
    purpose: "Catch up properly",
  });

  it("asking costs no time and holds nothing on the player's own calendar", () => {
    expect(asked.currentMoment).toEqual(world.currentMoment);
    const proposal = contactProposals(asked, player)[0]!;
    expect(proposal.answered).toBe(false);
    // Asking holds nobody's evening: a request is not a commitment.
    expect(
      asked.history.scheduledActivities.filter((activity) =>
        activity.sourceEntityIds.includes(proposal.eventId),
      ),
    ).toEqual([]);
    // They were told, and nobody else was.
    const knew = asked.history.knowledge.filter(
      (entry) => entry.eventId === proposal.eventId,
    );
    expect(knew.map((entry) => entry.personId)).toEqual([other]);
    // The projection now says the ask is outstanding.
    const entry = projectContacts(asked, player).contacts.find(
      (candidate) => candidate.personId === other,
    )!;
    expect(entry.outstanding?.direction).toBe("you-asked");
    expect(
      entry.actions.find((action) => action.kind === "ask-to-meet")!.available,
    ).toBe(false);
    assertWorldIntegrity(asked);
  });

  it("they answer in their own time, and any answer is a real answer", () => {
    let settled = asked;
    for (let day = 0; day < 4; day += 1) settled = passOrdinaryDays(settled, 1);
    const proposal = contactProposals(settled, player)[0]!;
    const answers = answersTo(settled, proposal.eventId);
    expect(answers).toHaveLength(1);
    const answer = answers[0]!;
    expect([
      CONTACT_ACCEPTED_EVENT,
      CONTACT_COUNTERED_EVENT,
      CONTACT_DECLINED_EVENT,
    ]).toContain(answer.type);
    // The player learns what they said.
    expect(
      settled.history.knowledge.some(
        (entry) => entry.personId === player && entry.eventId === answer.id,
      ),
    ).toBe(true);
    if (answer.type === CONTACT_ACCEPTED_EVENT) {
      const meeting = settled.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(proposal.eventId),
      )!;
      expect(meeting.participantPersonIds.sort()).toEqual(
        [player, other].sort(),
      );
      expect(scheduledActivityState(settled, meeting.id).start.date).toBe(on);
    } else {
      // A refusal or a different day leaves no confirmed meeting standing.
      expect(
        settled.history.scheduledActivities.some(
          (activity) =>
            activity.kind === "confirmed" &&
            activity.sourceEntityIds.includes(proposal.eventId),
        ),
      ).toBe(false);
    }
    expect(serializeWorld(deserializeWorld(serializeWorld(settled)))).toBe(
      serializeWorld(settled),
    );
  });

  it("the same proposal is answered once", () => {
    let settled = asked;
    for (let day = 0; day < 4; day += 1) settled = passOrdinaryDays(settled, 1);
    const proposal = contactProposals(settled, player)[0]!;
    expect(() =>
      answerMeeting(settled, {
        proposalEventId: proposal.eventId,
        answer: "accept",
      }),
    ).toThrow(/already been answered/);
    // And time passing again does not answer it twice.
    const later = passOrdinaryDays(settled, 3);
    expect(answersTo(later, proposal.eventId)).toHaveLength(1);
  });

  it("a different day offered back is an answer and a new request", () => {
    const theirAsk = askToMeet(
      { ...world, control: { kind: "person", personId: player } },
      { personId: player, otherPersonId: other, on },
    );
    const proposal = contactProposals(theirAsk, player)[0]!;
    const countered = offerAnotherDay(theirAsk, {
      proposalEventId: proposal.eventId,
      on: addDays(on, 7),
    });
    expect(
      answersTo(countered, proposal.eventId).map((event) => event.type),
    ).toEqual([CONTACT_COUNTERED_EVENT]);
    const fresh = contactProposals(countered, player).filter(
      (entry) => !entry.answered,
    );
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.on).toBe(addDays(on, 7));
    expect(fresh[0]!.fromPersonId).toBe(other);
    assertWorldIntegrity(countered);
  });

  it("nobody arranges anything with somebody who has died", () => {
    const gone = recordPersonDeath(world, {
      stableKey: "fixture:contact-death",
      personId: other,
      diedAt: world.currentDate,
      causeKey: "cause:people-fixture",
      sourceEntityIds: [world.id],
      summary: "Died before the call.",
      provenance: { kind: "authored", note: "PEOPLE contact fixture." },
    });
    expect(() =>
      askToMeet(gone, { personId: player, otherPersonId: other, on }),
    ).toThrow(/has died/);
    expect(
      projectContacts(gone, player).contacts.some(
        (entry) => entry.personId === other,
      ),
    ).toBe(false);
  });
});

describe("PEOPLE P3: somebody gets back in touch", () => {
  it("an old contact can reach out while the player never opens their page", () => {
    const { player, world } = adultLife("people-contact-c");
    let current = world;
    let invited = false;
    for (let step = 0; step < 60 && !invited; step += 1) {
      current = letAdultTimePass(current, 6);
      invited = current.history.events.some(
        (event) =>
          event.type === CONTACT_PROPOSED_EVENT &&
          event.participants.some(
            (entry) =>
              entry.personId === player && entry.role === "focus:asked-of",
          ),
      );
    }
    expect(invited, "somebody gets back in touch on this seed").toBe(true);
    const proposal = contactProposals(current, player).find(
      (entry) => entry.toPersonId === player && !entry.answered,
    )!;
    expect(proposal).toBeTruthy();
    // It is a real person with a real history, asking for a real day.
    expect(current.people[proposal.fromPersonId]).toBeTruthy();
    expect(proposal.on > current.currentDate).toBe(true);
    const answered = answerMeeting(current, {
      proposalEventId: proposal.eventId,
      answer: "accept",
    });
    expect(
      answered.history.scheduledActivities.some(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(proposal.eventId),
      ),
    ).toBe(true);
    assertWorldIntegrity(answered);
  });
});

describe("PEOPLE P3: the call, answered in the conversation", () => {
  it("is a scene with three real answers, and yes puts it on the calendar", () => {
    const { player, world } = adultLife("people-contact-c");
    let current = world;
    let view = null as ReturnType<typeof projectPlayerConversation>;
    for (let step = 0; step < 20 && !view; step += 1) {
      current = letAdultTimePass(current, 6);
      const open = availablePlayerConversations(current, player).find(
        (entry) => entry.subject === "scene-favor" && !entry.settled,
      );
      view = open
        ? projectPlayerConversation(current, player, "scene-favor")
        : null;
      if (view && !view.topicLabel.includes("wants to meet")) view = null;
    }
    expect(view, "an old contact asks to meet").toBeTruthy();
    expect(view!.intents.map((intent) => intent.key)).toEqual([
      "say-yes",
      "offer-another-day",
      "say-no",
      "ask-what-for",
    ]);
    const asking = projectPlayerConversation(current, player, "scene-favor")!;
    const agreed = commitConversationTurn(current, {
      session: asking.session,
      room: asking.room,
      progress: asking.progress,
      turnOrdinal: asking.turnOrdinal,
      addressee: asking.addressee,
      audibility: asking.audibility,
      intent: "say-yes",
    }).world;
    // Agreeing is not meeting: the evening is booked, no time has passed.
    expect(agreed.currentMoment).toEqual(current.currentMoment);
    const proposal = contactProposals(agreed, player).find(
      (entry) => entry.toPersonId === player,
    )!;
    expect(
      agreed.history.scheduledActivities.some(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(proposal.eventId),
      ),
    ).toBe(true);
    expect(agreed.history.relationshipInteractions.at(-1)!.kind).toBe(
      "contact:arranged-to-meet",
    );
    assertWorldIntegrity(agreed);
  });
});

describe("what the People screen says about somebody", () => {
  it("says a housemate lives with you, not when you last spoke", () => {
    // Found in a replay: a housemate read "Last in touch June 26, 2026"
    // seven months later, while they still lived together.
    for (const seed of [
      "contacts-home-a",
      "contacts-home-b",
      "contacts-home-c",
    ]) {
      const { player, world } = adultLife(seed);
      const later = { ...world, currentDate: addDays(world.currentDate, 400) };
      const view = projectContacts(later, player);
      const home = view.contacts.filter((contact) => contact.livesWithYou);
      if (home.length === 0) continue;
      for (const contact of home) {
        expect(contact.outOfTouch).toBe(false);
      }
      return;
    }
    throw new Error("No seed gave the player somebody to live with.");
  });

  it("shows a relationship that has gone wrong, not only its date", () => {
    const { player, world } = adultLife("contacts-strained");
    const other = projectContacts(world, player).contacts[0]!.personId;
    let next = world;
    for (const days of [0, 1]) {
      next = recordRelationshipInteraction(next, {
        stableKey: `contacts-strained:${days}`,
        personIds: [player, other],
        eventId: null,
        occurredAt: addDays(world.currentDate, -days),
        kind: "exchange:matter-party-response",
        change: "strained",
        significance: "meaningful",
        summary: "They distanced themselves.",
        tags: [],
      });
    }
    const contact = projectContacts(next, player).contacts.find(
      (entry) => entry.personId === other,
    )!;
    expect(contact.standing).toMatch(/would not rely on/);
  });
});
