import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import * as decisions from "../simulation/decisions";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { SeededRng, pickDistinct } from "../simulation/rng";
import { ageOnDate } from "../simulation/dates";
import { createEducationEnrollment } from "../simulation/life";
import { createResourcePosition, money } from "../simulation/resources";
import { enterLifePath } from "../simulation/life-paths2";
import { activeEducationEnrollmentsAt } from "../simulation/life-queries";
import {
  decideStudyPeerOutcome,
  studyAnswered,
  STUDY_COLLABORATION_EVENT,
  STUDY_DECLINED_EVENT,
} from "../simulation/people-study";
import { refreshContextualScenes } from "./contextual-scene-producers";
import { projectPlayerConversation } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";

const SEED = "a125-study-undecided-20261001";
const [place] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const evaluate = decisions.evaluateDecision;

function classroom() {
  const small = smallWorld({
    place: place!.jurisdictionKey,
    people: 16,
    seed: SEED,
  });
  const adults = small.world.personOrder.filter(
    (id) =>
      ageOnDate(small.world.people[id]!.birthDate, small.world.currentDate) >=
      18,
  );
  expect(adults.length).toBeGreaterThanOrEqual(2);
  const [player, peer] = adults;
  let world: World = {
    ...small.world,
    control: { kind: "person", personId: player! },
  };
  world = createResourcePosition(world, {
    stableKey: "a125-study-funds",
    owner: { kind: "person", personId: player! },
    openedAt: world.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit study fixture funds; not earned pay.",
    },
  });
  const entered = enterLifePath(world, "college-office-certificate");
  expect(entered.ok, entered.message).toBe(true);
  world = entered.world;
  const enrollment = activeEducationEnrollmentsAt(world, player!).at(-1)!;
  expect(enrollment).toBeDefined();
  world = createEducationEnrollment(world, {
    stableKey: "a125-study-peer",
    personId: peer!,
    organizationId: enrollment.enrollment.organizationId,
    startedAt: world.currentDate,
    programKind: enrollment.enrollment.programKind,
    contextKind: "program:life-paths2-v2",
    provenance: {
      kind: "authored",
      note: "Actual enrollment writer for this fixture classmate.",
    },
  });
  world = refreshContextualScenes(world, player!);
  expect(
    projectPlayerConversation(world, player!, "scene-study-peer"),
  ).not.toBeNull();
  return { world, player: player!, peer: peer! };
}

function force(outcome: "undecided" | "agrees" | "declines") {
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation(
      (
        world: Parameters<typeof evaluate>[0],
        input: Parameters<typeof evaluate>[1],
      ): ReturnType<typeof evaluate> => {
        const packet = evaluate(world, input);
        if (input.decisionType !== "people.study-collaboration") return packet;
        return {
          ...packet,
          outcomeKind: outcome === "undecided" ? "undecided" : "selected",
          selectedOptionKey: outcome === "undecided" ? null : outcome,
        };
      },
    );
}

function offer(world: World, player: EntityId) {
  const view = projectPlayerConversation(world, player, "scene-study-peer")!;
  expect(view.intents.some((i) => i.key === "offer")).toBe(true);
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent: "offer",
  }).world;
}

afterEach(() => vi.restoreAllMocks());

describe(`A125 unanswered study offer in ${place!.jurisdictionKey}`, () => {
  it("renders an unanswered offer without refusal, agreement or relationship, and keeps the saved scene open", () => {
    const { world, player, peer } = classroom();
    force("undecided");
    expect(
      decideStudyPeerOutcome(world, { personId: player, peerPersonId: peer })
        .outcome,
    ).toBeNull();
    const next = offer(world, player);
    const turn = [...next.history.events]
      .reverse()
      .find((e) => e.type === "conversation.study-turn")!;
    expect(turn.context.immediateReaction).toBe("You have not had an answer.");
    expect(
      next.history.events.filter(
        (e) =>
          e.type === STUDY_COLLABORATION_EVENT ||
          e.type === STUDY_DECLINED_EVENT,
      ),
    ).toHaveLength(0);
    expect(studyAnswered(next, player, peer)).toBe(false);
    expect(next.history.relationshipInteractions).toEqual(
      world.history.relationshipInteractions,
    );
    expect(next.currentMoment).toEqual(world.currentMoment);
    const continued = deserializeWorld(serializeWorld(next));
    const view = projectPlayerConversation(
      continued,
      player,
      "scene-study-peer",
    )!;
    expect(view).not.toBeNull();
    expect(view.intents.some((i) => i.key === "ask")).toBe(true);
    expect(view.intents.some((i) => i.key === "keep-looking")).toBe(true);
    expect(view.intents.some((i) => i.key === "offer")).toBe(false);
    expect(studyAnswered(continued, player, peer)).toBe(false);
  });

  it.each(["agrees", "declines"] as const)(
    "keeps the actual selected %s writer and matching assembled reply",
    (selected: "agrees" | "declines") => {
      const { world, player, peer } = classroom();
      force("undecided");
      const waiting = offer(world, player);
      vi.restoreAllMocks();
      force(selected);
      const next = offer(deserializeWorld(serializeWorld(waiting)), player);
      expect(studyAnswered(next, player, peer)).toBe(true);
      const events = next.history.events.filter(
        (e) =>
          e.type === STUDY_COLLABORATION_EVENT ||
          e.type === STUDY_DECLINED_EVENT,
      );
      expect(events).toHaveLength(1);
      expect(events[0]!.tags).toContain(`study.outcome:${selected}`);
      expect(events[0]!.type).toBe(
        selected === "agrees"
          ? STUDY_COLLABORATION_EVENT
          : STUDY_DECLINED_EVENT,
      );
      const reply = [...next.history.events]
        .reverse()
        .find((e) => e.type === "conversation.study-turn")!.context
        .immediateReaction!;
      expect(reply).not.toBe("You have not had an answer.");
      expect(
        selected === "agrees"
          ? /Let’s work out|I’d like that/.test(reply)
          : /already committed|not looking/.test(reply),
      ).toBe(true);
      expect(next.history.relationshipInteractions.length).toBe(
        world.history.relationshipInteractions.length +
          (selected === "agrees" ? 1 : 0),
      );
      const continued = deserializeWorld(serializeWorld(next));
      expect(continued.history.events).toEqual(next.history.events);
      expect(continued.currentMoment).toEqual(world.currentMoment);
    },
  );
});
