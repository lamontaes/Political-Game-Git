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
import { recordStudyAnswer } from "../simulation/people-study";
import {
  PLAN_OPEN_EVENT,
  PLAN_PROPOSED_EVENT,
  PLAN_REST_DAYS,
  PROPOSABLE_APPROACHES,
  peerStudyApproach,
  revisionFor,
  settledStudyPlan,
  studyApproach,
  studyPlanProposals,
  studyPlanSettled,
} from "../simulation/people-study-plan";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * CRUNCH47 F47.1, the second education scene: having agreed to work with
 * somebody, deciding how.
 *
 * What this has to prove is that the disagreement is real — two approaches
 * that are both on the record, neither of them invented for the scene — and
 * that wanting different things is allowed to stay that way.
 */

/** Two adults on the same program who have agreed to work together. */
function collaborators(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 30 }),
  ).game!;
  const player = game.playerPersonId;
  const funded = createResourcePosition(openOrdinaryLife(game.world, player), {
    stableKey: `study-plan:${seed}:funds`,
    owner: { kind: "person", personId: player },
    openedAt: game.world.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: { kind: "authored", note: "F47.1 study plan fixture." },
  });
  const entered = enterLifePath(funded, "college-office-certificate").world;
  const enrollment = activeEducationEnrollmentsAt(entered, player).at(-1)!;
  const peerPersonId = entered.personOrder.find(
    (id) =>
      id !== player &&
      ageOnDate(entered.people[id]!.birthDate, entered.currentDate) >= 18 &&
      activeEducationEnrollmentsAt(entered, id).length === 0,
  )!;
  const enrolled = createEducationEnrollment(entered, {
    stableKey: `study-plan:${seed}:peer`,
    personId: peerPersonId,
    organizationId: enrollment.enrollment.organizationId,
    startedAt: entered.currentDate,
    programKind: enrollment.enrollment.programKind,
    contextKind: "program:life-paths2-v2",
    provenance: { kind: "authored", note: "F47.1 study plan fixture." },
  });
  // The agreement itself is written through its own writer, so what this file
  // tests is what happens after it, not how it came about.
  const agreed = recordStudyAnswer(enrolled, {
    personId: player,
    peerPersonId,
    outcome: "agrees",
    statement: "Yes. Let's work out who is doing what.",
  }).world;
  return { player, peerPersonId, world: agreed };
}

const open = (world: World, player: EntityId) =>
  availablePlayerConversations(world, player).find(
    (entry) => entry.subject === "scene-study-plan" && !entry.settled,
  );

function say(world: World, player: EntityId, intent: string): World {
  const view = projectPlayerConversation(world, player, "scene-study-plan")!;
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

describe("F47.1: how the two of you do the work", () => {
  const base = collaborators("study-plan-a");
  const player = base.player;
  const peerId = base.peerPersonId;
  const world = passOrdinaryDays(base.world, 1, {
    stopForTentativeHolds: true,
  });
  const theirs = peerStudyApproach(world, {
    personId: player,
    peerPersonId: peerId,
  }).approachId;
  const differing = PROPOSABLE_APPROACHES.find((id) => id !== theirs)!;

  it("is bound from the agreement, and never without one", () => {
    const bound = sceneBindingsFor(world, player, "study-plan").at(-1);
    expect(bound?.binding.variant).toBe("proposal");
    expect(bound?.binding.speakerPersonId).toBe(peerId);
    expect(open(world, player)).toBeTruthy();
    // Somebody who agreed nothing with anybody is never asked how.
    const alone = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "study-plan-none",
        startAge: 34,
      }),
    ).game!;
    const ordinary = passOrdinaryDays(
      openOrdinaryLife(alone.world, alone.playerPersonId),
      1,
    );
    expect(
      sceneBindingsFor(ordinary, alone.playerPersonId, "study-plan"),
    ).toEqual([]);
  });

  it("offers the authored approaches, and theirs is not a reaction to yours", () => {
    const view = projectPlayerConversation(world, player, "scene-study-plan")!;
    expect(view.intents.map((intent) => intent.key)).toEqual([
      ...PROPOSABLE_APPROACHES,
    ]);
    // Whatever the player says, the other person wanted what they wanted.
    for (const pick of PROPOSABLE_APPROACHES) {
      const said = say(world, player, pick);
      const proposals = studyPlanProposals(said, player, peerId)!;
      expect(proposals.mine).toBe(pick);
      expect(proposals.theirs).toBe(theirs);
      expect(studyApproach(proposals.theirs)).toBeTruthy();
    }
  });

  it("wanting the same thing is not staged as a disagreement", () => {
    const agreed = say(world, player, theirs);
    expect(studyPlanSettled(agreed, player, peerId)).toBe(true);
    expect(settledStudyPlan(agreed, player, peerId)?.id).toBe(theirs);
    // Settling it is one thing that passed between them, recorded once by the
    // writer that owns it.
    const added = agreed.history.relationshipInteractions.filter(
      (entry) => !world.history.relationshipInteractions.includes(entry),
    );
    expect(added).toHaveLength(1);
    expect(added[0]!.kind).toBe("work:shared-plan");
    const later = passOrdinaryDays(agreed, 1);
    expect(
      sceneBindingsFor(later, player, "study-plan").some(
        (entry) => entry.binding.variant === "disagreement",
      ),
    ).toBe(false);
    expect(open(later, player)).toBeUndefined();
    assertWorldIntegrity(agreed);
  });

  it("the disagreement is the two proposals that are actually on the record", () => {
    const proposed = say(world, player, differing);
    expect(
      proposed.history.events.filter(
        (event) => event.type === PLAN_PROPOSED_EVENT,
      ),
    ).toHaveLength(2);
    const next = passOrdinaryDays(proposed, 1);
    const bound = sceneBindingsFor(next, player, "study-plan").at(-1)!;
    expect(bound.binding.variant).toBe("disagreement");
    expect(bound.binding.facts.myApproach).toBe(
      studyApproach(differing)!.label,
    );
    expect(bound.binding.facts.theirApproach).toBe(
      studyApproach(theirs)!.label,
    );
    const view = projectPlayerConversation(next, player, "scene-study-plan")!;
    const keys = view.intents.map((intent) => intent.key);
    expect(keys[0]).toBe("compare");
    expect(keys.at(-1)).toBe("hold");
    // The revision a player can offer is the one authored for exactly these
    // two approaches, and it is offered only when there is one.
    const revision = revisionFor(differing, theirs);
    expect(keys.includes("compromise")).toBe(!!revision);
    if (revision) {
      expect(
        view.intents.find((intent) => intent.key === "compromise")!.label,
      ).toContain(revision.label);
    }
    // There is no half-way version of these two, and none is invented.
    expect(revisionFor("evidence-first", "one-draft-together")).toBeUndefined();
  });

  it("the answer is decided before the wording, and is settled once", () => {
    const next = passOrdinaryDays(say(world, player, differing), 1);
    const held = say(next, player, "hold");
    const turn = [...held.history.events]
      .reverse()
      .find((event) => event.type === "conversation.study-plan-turn")!;
    const reply = turn.context.immediateReaction ?? "";
    // Held their own proposal, so agreement here means coming round to it.
    const agreeing = /do it your way|Your way, then/.test(reply);
    const partly = /I can agree to .* but I still want to change/.test(reply);
    const open_ = /leave this open|not persuaded yet/.test(reply);
    expect([agreeing, partly, open_].filter(Boolean)).toHaveLength(1);
    // The record says the same thing the words said.
    if (agreeing) {
      expect(studyPlanSettled(held, player, peerId)).toBe(true);
      // Coming round to the player's approach settles that approach, never a
      // third one nobody proposed.
      expect(settledStudyPlan(held, player, peerId)?.id).toBe(differing);
    } else {
      expect(studyPlanSettled(held, player, peerId)).toBe(false);
      const opened = held.history.events.filter(
        (event) => event.type === PLAN_OPEN_EVENT,
      );
      expect(opened).toHaveLength(1);
      expect(opened[0]!.tags).toContain(
        partly
          ? "study.plan.outcome:counterproposes"
          : "study.plan.outcome:unresolved",
      );
      // Not getting your way is not a falling-out, and writes no relationship
      // record at all.
      expect(held.history.relationshipInteractions.length).toBe(
        next.history.relationshipInteractions.length,
      );
    }
    // Saying it costs no time, and the class is untouched either way.
    expect(held.currentMoment).toEqual(next.currentMoment);
    expect(activeEducationEnrollmentsAt(held, player).length).toBe(
      activeEducationEnrollmentsAt(next, player).length,
    );
    assertWorldIntegrity(held);
    expect(serializeWorld(deserializeWorld(serializeWorld(held)))).toBe(
      serializeWorld(held),
    );
  });

  it("a question left open rests, and then comes back", () => {
    const next = passOrdinaryDays(say(world, player, differing), 1);
    const held = say(next, player, "hold");
    if (studyPlanSettled(held, player, peerId)) return;
    const soon = passOrdinaryDays(held, 2);
    expect(open(soon, player)).toBeUndefined();
    const later = passOrdinaryDays(held, PLAN_REST_DAYS + 1);
    const returned = sceneBindingsFor(later, player, "study-plan").filter(
      (entry) => entry.binding.variant === "disagreement",
    );
    expect(returned.length).toBeGreaterThan(1);
    // It comes back against the record of it being left open, so it is the
    // same question returning rather than the same scene repeating.
    const openedId = held.history.events.find(
      (event) => event.type === PLAN_OPEN_EVENT,
    )!.id;
    expect(returned.at(-1)!.binding.sourceEntityIds).toContain(openedId);
  });
});
