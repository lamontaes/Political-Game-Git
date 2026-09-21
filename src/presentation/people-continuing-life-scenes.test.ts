import { describe, expect, it } from "vitest";
import { assertWorldIntegrity } from "../simulation";
import type { EntityId, World } from "../simulation";
import { ageOnDate, createEducationEnrollment, money } from "../simulation";
import { createResourcePosition } from "../simulation/resources";
import { enterLifePath } from "../simulation/life-paths2";
import { activeEducationEnrollmentsAt } from "../simulation/life-queries";
import { favorEntries } from "../simulation/life-favors";
import { contactBases, contactProposals } from "../simulation/people-contact";
import { recordNpcIntention } from "../simulation/people-continuing-life";
import {
  STUDY_DECLINED_EVENT,
  recordStudyAnswer,
} from "../simulation/people-study";
import { peerStudyApproach } from "../simulation/people-study-plan";
import {
  answerSharedWorkRequest,
  recordIntroductionOffer,
  recordRepairOffer,
  recordSharedWorkRequest,
} from "../simulation/people-social-followthrough";
import { activeSceneBinding } from "./contextual-scenes";
import type { ContextualSceneSubject } from "./contextual-scenes";
import { letAdultTimePass } from "./adult-life";
import { explicitNewGameSetup } from "./new-game-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import type { PlayerConversationView } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import {
  createScheduledActivity,
  scheduledActivityState,
} from "../simulation/time-work";

/**
 * MUSE-PEOPLE presentation: every follow-through family, read as a player
 * reads it. A scene is bound from records at an ordinary day boundary, says
 * who and what it is about in plain words, offers its named choices, costs no
 * time to answer, and writes the family's own outcome.
 *
 * The lives are Minneapolis lives; classmates and offers are placed with the
 * same writers production uses where ordinary play would take weeks to reach
 * them, and the NPC-initiated reconnection is left entirely to the world.
 */

const PLACE = "2743000"; // Minneapolis, Minnesota
const PROVENANCE = { kind: "authored" as const, note: "MUSE-PEOPLE scenes." };
const SLOW = 120_000;

function adultLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife(
      explicitNewGameSetup({ placeKey: PLACE, seed, startAge: 30 }),
    ),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    player: game.playerPersonId,
  };
}

function studyHousehold(seed: string) {
  const { world: opened, player } = adultLife(seed);
  const funded = createResourcePosition(opened, {
    stableKey: `scenes:${seed}:funds`,
    owner: { kind: "person", personId: player },
    openedAt: opened.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: PROVENANCE,
  });
  const entered = enterLifePath(funded, "college-office-certificate").world;
  const enrollment = activeEducationEnrollmentsAt(entered, player).at(-1)!;
  const peerIds = entered.personOrder.filter((id) => {
    const age = ageOnDate(entered.people[id]!.birthDate, entered.currentDate);
    return (
      id !== player &&
      age >= 18 &&
      age <= 55 &&
      activeEducationEnrollmentsAt(entered, id).length === 0
    );
  });
  let next = entered;
  const peers: EntityId[] = [];
  for (const peer of peerIds.slice(0, 3)) {
    next = createEducationEnrollment(next, {
      stableKey: `scenes:${seed}:peer:${peer}`,
      personId: peer,
      organizationId: enrollment.enrollment.organizationId,
      startedAt: next.currentDate,
      programKind: enrollment.enrollment.programKind,
      contextKind: "program:life-paths2-v2",
      provenance: PROVENANCE,
    });
    peers.push(peer);
  }
  next = recordStudyAnswer(next, {
    personId: player,
    peerPersonId: peers[0]!,
    outcome: "agrees",
    statement: "Yes. Let's work out who is doing what.",
  }).world;
  next = recordStudyAnswer(next, {
    personId: player,
    peerPersonId: peers[1]!,
    outcome: "declines",
    statement: "Not this term. I have too much on.",
  }).world;
  return { world: next, player, peers };
}

function commit(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  intent: string,
): World {
  const view = projectPlayerConversation(world, player, subject)!;
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

/** Walk like a player: other open scenes in the family are turned down. */
function walkTo(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  variant: string,
  step: (world: World) => World,
  max = 40,
): World {
  const family = subject.replace("scene-", "") as Parameters<
    typeof activeSceneBinding
  >[2];
  const refusals = [
    "say-no",
    "decline",
    "decline-shared-work",
    "decline-repair",
    "decline-introduction",
    "leave-work",
    "let-stand",
  ];
  let current = world;
  for (let index = 0; index < max; index += 1) {
    const open = availablePlayerConversations(current, player).some(
      (entry) => entry.subject === subject && !entry.settled,
    );
    const active = activeSceneBinding(current, player, family);
    if (open && active?.binding.variant === variant) return current;
    if (open) {
      const view = projectPlayerConversation(current, player, subject)!;
      const no =
        refusals
          .map((key) => view.intents.find((intent) => intent.key === key))
          .find(Boolean) ?? view.intents.at(-1)!;
      current = commit(current, player, subject, no.key);
      continue;
    }
    current = step(current);
  }
  throw new Error(`No ${variant} scene opened.`);
}

/** Assembled text a player would never be shown. */
const BROKEN =
  /\bthe (go|proofread|work out|look|sit)\b|\.\.|undefined|\{name\}|null|Reached out about|You and \w+ got to know each other[^”]*\.[^”]*\?/;

function readable(view: PlayerConversationView, speakerGiven: string) {
  for (const text of [view.topicLabel, view.briefing, view.openingLine]) {
    expect(text).not.toMatch(BROKEN);
  }
  for (const intent of view.intents) {
    expect(`${intent.label} ${intent.description}`).not.toMatch(BROKEN);
  }
  expect(`${view.briefing} ${view.openingLine}`).toContain(speakerGiven);
}

function answersCostNothing(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  keys: readonly string[],
) {
  for (const key of keys) {
    const after = commit(world, player, subject, key);
    assertWorldIntegrity(after);
    expect(after.currentMoment).toEqual(world.currentMoment);
  }
}

describe("family 1 scenes — a later request, and the same ask raised again", () => {
  it(
    "asks in the peer's words, then raises agreed work that was not done",
    () => {
      const base = studyHousehold("scenes-shared-work");
      const ready = passOrdinaryDays(base.world, 1, {
        stopForTentativeHolds: true,
      });
      const approach = peerStudyApproach(ready, {
        personId: base.player,
        peerPersonId: base.peers[0]!,
      }).approachId;
      const settled = commit(ready, base.player, "scene-study-plan", approach);
      let world = passOrdinaryDays(settled, 15);
      const peer = base.peers[0]!;
      if (
        !favorEntries(world, base.player).some((entry) =>
          entry.request.tags.includes(
            "followthrough.family:shared-work-request",
          ),
        )
      ) {
        const collaboration = world.history.events.find(
          (event) =>
            event.type === "life.study-collaboration-agreed" &&
            event.involvedEntityIds.includes(peer),
        )!.id;
        world = recordSharedWorkRequest(world, {
          playerId: base.player,
          peerId: peer,
          collaborationId: collaboration,
          programName: "the certificate",
        }).world;
      }
      const asked = walkTo(
        world,
        base.player,
        "scene-favor",
        "shared-work-request",
        (current) => passOrdinaryDays(current, 1),
      );
      const view = projectPlayerConversation(
        asked,
        base.player,
        "scene-favor",
      )!;
      readable(view, asked.people[peer]!.givenName);
      expect(view.intents.map((intent) => intent.key)).toEqual([
        "agree-shared-work",
        "agree-limit-shared-work",
        "decline-shared-work",
      ]);
      answersCostNothing(asked, base.player, "scene-favor", [
        "agree-shared-work",
        "decline-shared-work",
      ]);

      // Agreed and left undone: the peer brings it up on their own record.
      const request = favorEntries(asked, base.player).find((entry) =>
        entry.request.tags.includes("followthrough.family:shared-work-request"),
      )!;
      let agreed = answerSharedWorkRequest(asked, {
        playerId: base.player,
        requestId: request.request.id,
        answer: "agree",
        statement: "Sure.",
      }).world;
      agreed = recordNpcIntention(agreed, {
        npcId: peer,
        targetPersonId: base.player,
        kind: "follow-up",
        objective: "Bring up the notes that were agreed and not done",
        sourceEventId: request.request.id,
        deadline: null,
      }).world;
      for (let leg = 0; leg < 8; leg += 1) agreed = passOrdinaryDays(agreed, 5);
      const raised = walkTo(
        agreed,
        base.player,
        "scene-favor",
        "shared-work-request",
        (current) => letAdultTimePass(current, 3),
      );
      const again = projectPlayerConversation(
        raised,
        base.player,
        "scene-favor",
      )!;
      readable(again, raised.people[peer]!.givenName);
      expect(again.briefing).toMatch(/It has not been done yet\./);
      expect(again.intents.map((intent) => intent.key)).toContain(
        "withdraw-work",
      );
      answersCostNothing(raised, base.player, "scene-favor", [
        "withdraw-work",
        "leave-work",
      ]);
      // Doing it spends its own disclosed minutes, once, and nothing more.
      if (again.intents.some((intent) => intent.key === "do-shared-work")) {
        const done = commit(
          raised,
          base.player,
          "scene-favor",
          "do-shared-work",
        );
        expect(
          favorEntries(done, base.player).find(
            (entry) => entry.request.id === request.request.id,
          )?.status,
        ).toBe("performed");
        expect(done.currentMoment.minuteOfDay).toBe(
          raised.currentMoment.minuteOfDay + request.details.minutes!,
        );
      }
    },
    SLOW,
  );
});

describe("family 3 scenes — a childhood friend reaches back on their own", () => {
  it(
    "is bound at a day boundary without any panel, and names the moment",
    () => {
      const life = adultLife("scenes-reconnect");
      // Only days pass here: no page, panel or conversation is projected
      // until the scene is already on record.
      let world = life.world;
      for (let step = 0; step < 20; step += 1) {
        if (
          world.history.events.some(
            (event) => event.type === "life.reconnect-raised",
          )
        ) {
          break;
        }
        world = letAdultTimePass(world, 3);
      }
      const raised = world.history.events.find(
        (event) => event.type === "life.reconnect-raised",
      )!;
      expect(raised).toBeTruthy();
      expect(raised.visibility).toBe("private");
      const friend = raised.involvedEntityIds.find((id) => id !== life.player)!;
      const bound = walkTo(
        world,
        life.player,
        "scene-favor",
        "reconnect",
        (current) => letAdultTimePass(current, 1),
      );
      const view = projectPlayerConversation(
        bound,
        life.player,
        "scene-favor",
      )!;
      readable(view, bound.people[friend]!.givenName);
      expect(view.topicLabel).toMatch(/wants to meet$/);
      expect(view.openingLine).toMatch(/when we were kids/);
      expect(view.intents.map((intent) => intent.key)).toEqual([
        "say-yes",
        "offer-another-day",
        "say-no",
        "ask-what-for",
      ]);
      answersCostNothing(bound, life.player, "scene-favor", [
        "say-yes",
        "say-no",
        "ask-what-for",
      ]);
      // Agreeing books the evening through the contact route; it is not
      // attendance, and the proposal is answered once.
      const agreed = commit(bound, life.player, "scene-favor", "say-yes");
      const proposal = contactProposals(agreed, life.player).find(
        (entry) => entry.fromPersonId === friend,
      )!;
      expect(proposal.answered).toBe(true);
      const meeting = agreed.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "confirmed" &&
          activity.sourceEntityIds.includes(proposal.eventId),
      )!;
      expect(meeting).toBeTruthy();

      // The later callback remembers only a meeting that happened. On the
      // day, the friend checks in; going spends the meeting's own minutes.
      const meetingDay = scheduledActivityState(agreed, meeting.id).start.date;
      const onTheDay = walkTo(
        agreed,
        life.player,
        "scene-favor",
        "meeting-day",
        (current) => letAdultTimePass(current, 1),
      );
      expect(onTheDay.currentDate).toBe(meetingDay);
      const dayView = projectPlayerConversation(
        onTheDay,
        life.player,
        "scene-favor",
      )!;
      readable(dayView, onTheDay.people[friend]!.givenName);
      expect(dayView.intents.map((intent) => intent.key)).toEqual([
        "go-meet",
        "call-off",
        "answer-later",
      ]);
      const attended = commit(onTheDay, life.player, "scene-favor", "go-meet");
      expect(scheduledActivityState(attended, meeting.id).status).toBe(
        "completed",
      );
      let after = attended;
      for (let step = 0; step < 3; step += 1)
        after = letAdultTimePass(after, 1);
      assertWorldIntegrity(after);
      expect(
        after.history.events.filter(
          (event) =>
            event.type === "life.reconnect-completed" &&
            event.involvedEntityIds.includes(friend),
        ),
      ).toHaveLength(1);
      expect(
        after.history.relationshipInteractions.some(
          (interaction) =>
            interaction.kind === "contact:reconnected" &&
            interaction.personIds.includes(friend),
        ),
      ).toBe(true);

      // An optional hold earlier the same day does not stand in the way: it
      // lapses, as letting the day run would lapse it, and the meeting is
      // still gone to once.
      const start = scheduledActivityState(onTheDay, meeting.id).start;
      const held = createScheduledActivity(onTheDay, {
        stableKey: "scenes:reconnect:afternoon-hold",
        title: "Something in the afternoon",
        summary: "An optional hold before the meeting.",
        kind: "tentative",
        start: { ...start, minuteOfDay: start.minuteOfDay - 180 },
        end: { ...start, minuteOfDay: start.minuteOfDay - 120 },
        participantPersonIds: [life.player],
        responsiblePersonId: life.player,
        location: {
          locationKey: "scenes:hold",
          label: "Somewhere",
          jurisdictionId: null,
        },
        sourceEntityIds: [raised.id],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [life.player] },
      });
      const holdId = held.history.scheduledActivities.at(-1)!.id;
      const heldView = projectPlayerConversation(
        held,
        life.player,
        "scene-favor",
      )!;
      expect(heldView.intents.map((intent) => intent.key)).toContain("go-meet");
      const wentAnyway = commit(held, life.player, "scene-favor", "go-meet");
      expect(scheduledActivityState(wentAnyway, meeting.id).status).toBe(
        "completed",
      );
      expect(scheduledActivityState(wentAnyway, holdId).status).toBe(
        "cancelled",
      );

      // Called off on the day: the friend is told, the evening is freed,
      // time moves on, and nothing is remembered as a reunion.
      const calledOff = commit(
        onTheDay,
        life.player,
        "scene-favor",
        "call-off",
      );
      expect(scheduledActivityState(calledOff, meeting.id).status).toBe(
        "cancelled",
      );
      expect(
        calledOff.history.knowledge.some(
          (entry) =>
            entry.personId === friend &&
            calledOff.history.events.find((event) => event.id === entry.eventId)
              ?.type === "life.meeting-called-off",
        ),
      ).toBe(true);
      let freed = calledOff;
      for (let step = 0; step < 3; step += 1)
        freed = letAdultTimePass(freed, 1);
      expect(freed.currentDate > calledOff.currentDate).toBe(true);
      expect(
        freed.history.events.some(
          (event) => event.type === "life.reconnect-completed",
        ),
      ).toBe(false);

      // Turned down, the same reconnection is remembered as nothing at all.
      const declined = commit(bound, life.player, "scene-favor", "say-no");
      let quiet = declined;
      for (let step = 0; step < 14; step += 1)
        quiet = letAdultTimePass(quiet, 1);
      expect(
        quiet.history.events.some(
          (event) => event.type === "life.reconnect-completed",
        ),
      ).toBe(false);
    },
    SLOW,
  );
});

describe("families 4 and 5 scenes — a rethink, and an introduction", () => {
  it(
    "a rethink after a refusal names what was refused and what is offered",
    () => {
      const base = studyHousehold("scenes-repair");
      const refuser = base.peers[1]!;
      const refusal = base.world.history.events.find(
        (event) =>
          event.type === STUDY_DECLINED_EVENT &&
          event.involvedEntityIds.includes(refuser),
      )!;
      const offered = recordRepairOffer(base.world, {
        playerId: base.player,
        counterpartId: refuser,
        refusalEventId: refusal.id,
        offerKind: "collaborate-now",
        refusedSummary: "working together on coursework",
        offerText: "work together on the coursework after all",
        statement:
          "I've been thinking about the coursework. I'd like to work on it together after all, if you still want to.",
      }).world;
      const bound = walkTo(
        offered,
        base.player,
        "scene-favor",
        "repair-attempt",
        (current) => passOrdinaryDays(current, 1),
      );
      const view = projectPlayerConversation(
        bound,
        base.player,
        "scene-favor",
      )!;
      readable(view, bound.people[refuser]!.givenName);
      expect(view.topicLabel).toMatch(/has had a rethink$/);
      expect(view.briefing).toMatch(
        /turned down working together on the coursework and would now like to work on it together after all\./,
      );
      answersCostNothing(bound, base.player, "scene-favor", [
        "accept-repair",
        "decline-repair",
      ]);
    },
    SLOW,
  );

  it(
    "an introduction names both people and asks for consent",
    () => {
      const base = studyHousehold("scenes-introduction");
      const introducer = contactBases(base.world, base.player).find(
        (basis) => !base.peers.includes(basis.personId),
      )!.personId;
      const third = base.peers[2]!;
      const offered = recordIntroductionOffer(base.world, {
        playerId: base.player,
        introducerId: introducer,
        thirdId: third,
        reason: "they are on the same certificate program.",
        statement: "You two should meet. You are on the same program.",
      }).world;
      const bound = walkTo(
        offered,
        base.player,
        "scene-favor",
        "introduction",
        (current) => passOrdinaryDays(current, 1),
      );
      const view = projectPlayerConversation(
        bound,
        base.player,
        "scene-favor",
      )!;
      readable(view, bound.people[introducer]!.givenName);
      expect(view.briefing).toContain(
        `introduce you to ${bound.people[third]!.givenName}`,
      );
      expect(view.intents.map((intent) => intent.key)).toEqual([
        "consent-introduction",
        "decline-introduction",
      ]);
      answersCostNothing(bound, base.player, "scene-favor", [
        "consent-introduction",
        "decline-introduction",
      ]);
    },
    SLOW,
  );
});
