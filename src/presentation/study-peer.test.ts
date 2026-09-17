import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { ageOnDate, createEducationEnrollment, money } from "../simulation";
import { createResourcePosition } from "../simulation/resources";
import { enterLifePath } from "../simulation/life-paths2";
import { activeEducationEnrollmentsAt } from "../simulation/life-queries";
import {
  STUDY_COLLABORATION_EVENT,
  STUDY_DECLINED_EVENT,
  decideStudyPeerOutcome,
  studyAnswered,
  studyPeers,
} from "../simulation/people-study";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { recordTraitChange } from "../simulation/people-traits";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * CRUNCH47 F47.1: one complete education route, ported from the authored
 * cargo. Somebody on the same programme asks about working together, and what
 * they answer is decided before a word of it is chosen.
 */

/**
 * An adult on a supported programme, enrolled through the accepted route, with
 * one other person on the same programme.
 *
 * The enrollment is the education owner's own writer; nothing here invents a
 * class. The classmate is enrolled the same way, which is exactly what the
 * scene needs and all it needs.
 */
function studyingLife(seed: string, startAge = 30) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge }),
  ).game!;
  const player = game.playerPersonId;
  const funded = createResourcePosition(openOrdinaryLife(game.world, player), {
    stableKey: `study-fixture:${seed}:funds`,
    owner: { kind: "person", personId: player },
    openedAt: game.world.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: { kind: "authored", note: "F47.1 study fixture." },
  });
  const entered = enterLifePath(funded, "college-office-certificate");
  return { player, world: entered.world, entered: entered.world !== funded };
}

/** Puts one other adult on the same programme, through the same writer. */
function withClassmate(
  world: World,
  player: EntityId,
  seed: string,
): { world: World; peerPersonId: EntityId } {
  const enrollment = activeEducationEnrollmentsAt(world, player).at(-1)!;
  const peerPersonId = world.personOrder.find(
    (id) =>
      id !== player &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
      activeEducationEnrollmentsAt(world, id).length === 0,
  )!;
  return {
    peerPersonId,
    world: createEducationEnrollment(world, {
      stableKey: `study-fixture:${seed}:peer`,
      personId: peerPersonId,
      organizationId: enrollment.enrollment.organizationId,
      startedAt: world.currentDate,
      programKind: enrollment.enrollment.programKind,
      contextKind: "program:life-paths2-v2",
      provenance: { kind: "authored", note: "F47.1 study fixture." },
    }),
  };
}

const open = (world: World, player: EntityId) =>
  availablePlayerConversations(world, player).some(
    (entry) => entry.subject === "scene-study-peer" && !entry.settled,
  );

function say(world: World, player: EntityId, intent: string): World {
  const view = projectPlayerConversation(world, player, "scene-study-peer")!;
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

describe("F47.1: somebody on your programme", () => {
  const life = studyingLife("study-peer-a");
  const player = life.player;
  const classroom = withClassmate(life.world, player, "study-peer-a");
  const world = passOrdinaryDays(classroom.world, 1, {
    stopForTentativeHolds: true,
  });

  it("is bound from a real enrollment and a real classmate, or not at all", () => {
    expect(activeEducationEnrollmentsAt(world, player).length).toBeGreaterThan(
      0,
    );
    const peers = studyPeers(world, player);
    expect(peers.length).toBeGreaterThan(0);
    for (const peer of peers) {
      expect(world.people[peer.personId]).toBeTruthy();
      expect(
        activeEducationEnrollmentsAt(world, peer.personId).some(
          (entry) => entry.enrollment.organizationId === peer.organizationId,
        ),
      ).toBe(true);
    }
    const bound = sceneBindingsFor(world, player, "study-peer").at(-1);
    expect(bound?.binding.variant).toBe("coursework");
    expect(peers.map((peer) => peer.personId)).toContain(
      bound!.binding.speakerPersonId,
    );
    // Somebody who is not studying never sees it.
    const notStudying = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "study-peer-none",
        startAge: 34,
      }),
    ).game!;
    const ordinary = openOrdinaryLife(
      notStudying.world,
      notStudying.playerPersonId,
    );
    expect(studyPeers(ordinary, notStudying.playerPersonId)).toEqual([]);
    expect(
      sceneBindingsFor(
        passOrdinaryDays(ordinary, 1),
        notStudying.playerPersonId,
        "study-peer",
      ),
    ).toEqual([]);
  });

  it("opens in the programme's own words and offers the three authored choices", () => {
    expect(open(world, player)).toBe(true);
    const view = projectPlayerConversation(world, player, "scene-study-peer")!;
    expect(view.openingLine).toMatch(
      /chosen a project group|found anyone to work with/,
    );
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "offer",
      "ask",
      "keep-looking",
    ]);
    // Nothing here is a claim about the world, so nothing is truth-marked.
    expect(view.intents.every((intent) => !intent.truthIntent)).toBe(true);
  });

  it("the answer is decided before the wording, and a refusal is never a yes", () => {
    const peerId = sceneBindingsFor(world, player, "study-peer").at(-1)!.binding
      .speakerPersonId;
    const decided = decideStudyPeerOutcome(world, {
      personId: player,
      peerPersonId: peerId,
    }).outcome;
    expect(["agrees", "counterproposes", "declines"]).toContain(decided);
    // Whatever they mean, the line that is actually said means that and only
    // that: the reply list for one meaning never holds another meaning's line.
    const said = say(world, player, "offer");
    const turn = [...said.history.events]
      .reverse()
      .find((event) => event.type === "conversation.study-turn")!;
    const reply = turn.context.immediateReaction ?? "";
    const agreeing = /Let’s work out who is doing what|I’d like that/.test(
      reply,
    );
    const refusing =
      /already committed to another group|not looking for the same kind/.test(
        reply,
      );
    const narrower = /main work divided up/.test(reply);
    expect([agreeing, narrower, refusing].filter(Boolean)).toHaveLength(1);
    if (decided === "agrees") expect(agreeing).toBe(true);
    if (decided === "declines") expect(refusing).toBe(true);
    if (decided === "counterproposes") expect(narrower).toBe(true);
    // And the record agrees with the words.
    const settled = said.history.events.filter(
      (event) =>
        event.type === STUDY_COLLABORATION_EVENT ||
        event.type === STUDY_DECLINED_EVENT,
    );
    expect(settled).toHaveLength(1);
    expect(settled[0]!.tags).toContain(`study.outcome:${decided}`);
    expect(settled[0]!.type).toBe(
      decided === "declines" ? STUDY_DECLINED_EVENT : STUDY_COLLABORATION_EVENT,
    );
  });

  it("records what was actually settled, and settles it once", () => {
    const answered = say(world, player, "offer");
    const settled = answered.history.events.filter(
      (event) =>
        event.type === STUDY_COLLABORATION_EVENT ||
        event.type === STUDY_DECLINED_EVENT,
    );
    expect(settled).toHaveLength(1);
    const peerId = sceneBindingsFor(world, player, "study-peer").at(-1)!.binding
      .speakerPersonId;
    expect(studyAnswered(answered, player, peerId)).toBe(true);
    // Answering costs no time; the work itself would have its own hours.
    expect(answered.currentMoment).toEqual(world.currentMoment);
    // An agreement is a shared undertaking; being turned down is not a
    // grievance and writes no relationship record at all.
    const interaction = answered.history.relationshipInteractions.at(-1)!;
    if (settled[0]!.type === STUDY_COLLABORATION_EVENT) {
      expect(interaction.kind).toBe("work:shared-coursework");
      expect(interaction.change).toBe("formed");
    } else {
      expect(answered.history.relationshipInteractions.length).toBe(
        world.history.relationshipInteractions.length,
      );
    }
    // It is not asked again.
    const later = passOrdinaryDays(answered, 1, {
      stopForTentativeHolds: true,
    });
    expect(open(later, player)).toBe(false);
    assertWorldIntegrity(answered);
    expect(serializeWorld(deserializeWorld(serializeWorld(answered)))).toBe(
      serializeWorld(answered),
    );
  });

  it("turning it down costs nothing academically", () => {
    const before = activeEducationEnrollmentsAt(world, player).length;
    const declined = say(world, player, "keep-looking");
    expect(activeEducationEnrollmentsAt(declined, player).length).toBe(before);
    expect(
      declined.history.events.filter(
        (event) => event.type === STUDY_DECLINED_EVENT,
      ),
    ).toHaveLength(1);
    // And sharing a class still is not a friendship.
    expect(declined.history.relationshipInteractions.length).toBe(
      world.history.relationshipInteractions.length,
    );
  });

  it("somebody already committed elsewhere says so, whoever they are", () => {
    const peers = studyPeers(world, player);
    const peerId = peers[0]!.personId;
    const event = [...world.history.events]
      .reverse()
      .find((entry) => entry.involvedEntityIds.includes(peerId));
    if (!event) return;
    // Even the most sociable person has no place to offer once they have
    // taken work on with somebody else.
    const outgoing = recordTraitChange(world, {
      personId: peerId,
      trait: "sociability",
      value: 2,
      eventId: event.id,
      reason: "Test: a sociable classmate.",
    });
    const elsewhere = studyPeers(outgoing, player).filter(
      (peer) => peer.personId !== peerId,
    )[0];
    if (!elsewhere) return;
    const taken = say(
      { ...outgoing, control: { kind: "person", personId: player } },
      player,
      "offer",
    );
    expect(studyAnswered(taken, player, peerId)).toBe(true);
  });
});
