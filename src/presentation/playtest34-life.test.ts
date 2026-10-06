import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { letStoryTimePass } from "./life-story";
import { projectLifeConversation } from "./life-conversation";
import { projectAdultLife } from "./adult-life";
import {
  currentOpeningLifeScene,
  openNextLifeScene,
  chooseOpeningLifeScene,
} from "./life-scene-flow";
import { projectPlayerConversation } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import {
  conversationExchangeTurns,
  conversationHistoryPage,
  conversationRelationship,
} from "./scene-conversation";
import {
  assertWorldIntegrity,
  advanceWorldMinutes,
  createCampaignElectionTransitionRegistry,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
  serializeWorld,
  deserializeWorld,
  simulationMinutesBetween,
  addSimulationMinutes,
  recordGoalState,
  createMindProvenance,
  type World,
  type EntityId,
} from "../simulation";

function life(
  seed = "p34-life-lexington-fayette",
  age = 35,
  placeKey = "2146027",
) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: age,
    depth: age >= 18 ? "summarize-earlier-life" : "play-formative-years",
    questionnaire: "skipped",
    placeKey,
    household: "shares-a-home",
  });
  return {
    world:
      age >= 18
        ? openOrdinaryLife(game.world, game.playerPersonId)
        : openNextLifeScene(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}
function line(
  world: World,
  personId: EntityId,
  other: EntityId,
  intent: string,
) {
  const view = projectPlayerConversation(world, personId, "life-talk", {
    addressee: other,
  })!;
  expect(view).not.toBeNull();
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
    transitionHandlers: createCampaignElectionTransitionRegistry(),
  }).world;
}

describe("PLAYTEST34 line-level time and family speech", () => {
  it("a genuinely changed privacy need explains withdrawal instead of forcing NPC agreement", () => {
    const { world, personId } = life("p34-mom-game-3", 10);
    const mom = currentOpeningLifeScene(world, personId)!.presentPersonIds.find(
      (id) => id !== personId,
    )!;
    const proposed = line(world, personId, mom, "activity");
    const changed = recordGoalState(proposed, {
      stableKey: "p34:changed-privacy",
      personId: mom,
      goalKey: "opening-life:privacy",
      recordedAt: world.currentDate,
      objective: "Have some privacy now.",
      domain: "life:ordinary",
      scope: "personal",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: createMindProvenance("authored", {
        note: "Explicit test-only intervening privacy need, not an inferred motive.",
      }),
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    const refused = line(
      deserializeWorld(serializeWorld(changed)),
      personId,
      mom,
      "acceptProposal",
    );
    const view = projectLifeConversation(refused, personId, mom)!;
    expect(view.transcript.at(-1)!.reply).toContain(
      "I need some time alone now",
    );
    expect(view.proposal!.status).toBe("declined");
    expect(refused.currentMoment).toEqual(world.currentMoment);
    expect(view.intents.some((intent) => intent.key === "spendTime")).toBe(
      false,
    );
  });

  it("a saved appointment interrupting the proposed half hour leaves the game pending; cancellation charges nothing", () => {
    const { world, personId } = life("p34-mom-game-3", 10);
    const mom = currentOpeningLifeScene(world, personId)!.presentPersonIds.find(
      (id) => id !== personId,
    )!;
    const agreed = line(
      line(world, personId, mom, "activity"),
      personId,
      mom,
      "acceptProposal",
    );
    const busy = createScheduledActivity(agreed, {
      stableKey: "p34:game-interruption",
      title: "Illustrative protected appointment",
      summary: "A test appointment starts inside the proposed half hour.",
      kind: "confirmed",
      start: addSimulationMinutes(agreed.currentMoment, 10),
      end: addSimulationMinutes(agreed.currentMoment, 40),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "p34:game-interruption",
        label: "Test appointment",
        jurisdictionId: null,
      },
      sourceEntityIds: [
        projectLifeConversation(agreed, personId, mom)!.proposal!.request.id,
      ],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const loaded = deserializeWorld(serializeWorld(busy));
    expect(() => line(loaded, personId, mom, "spendTime")).toThrow(/overlaps/);
    expect(
      projectLifeConversation(loaded, personId, mom)!.proposal!.status,
    ).toBe("accepted");
    expect(loaded.currentMoment).toEqual(world.currentMoment);
    const cancelled = line(loaded, personId, mom, "cancelProposal");
    expect(cancelled.currentMoment).toEqual(world.currentMoment);
    expect(
      cancelled.history.events.some((e) =>
        e.tags.includes("life.proposal.performed"),
      ),
    ).toBe(false);
  });

  it.each(["acceptProposal", "suggestGame"])(
    "Mom's own new-game proposal survives reload and %s without an unrelated refusal",
    (intent) => {
      const { world, personId } = life("p34-mom-game-3", 10);
      const mom = currentOpeningLifeScene(
        world,
        personId,
      )!.presentPersonIds.find((id) => id !== personId)!;
      const proposed = line(world, personId, mom, "activity");
      const offered = projectLifeConversation(proposed, personId, mom)!;
      expect(offered.person.relationship).toBe("your mom");
      expect(offered.proposal!.terms.activity).toBe("new-game");
      expect(offered.transcript.at(-1)!.reply).toContain("try a new game");
      const explained =
        intent === "acceptProposal"
          ? line(
              deserializeWorld(serializeWorld(proposed)),
              personId,
              mom,
              "explain",
            )
          : deserializeWorld(serializeWorld(proposed));
      const agreed = line(explained, personId, mom, intent);
      const agreement = projectLifeConversation(agreed, personId, mom)!;
      expect(agreement.proposal!.request.id).toBe(offered.proposal!.request.id);
      expect(agreement.proposal!.status).toBe("accepted");
      expect(agreement.transcript.at(-1)!.reply).toContain(
        "Yes, let's try a new game",
      );
      expect(agreed.currentMoment).toEqual(world.currentMoment);
      let saved = deserializeWorld(serializeWorld(agreed));
      for (let n = 0; n < 10; n++)
        saved = line(saved, personId, mom, n % 2 ? "remember" : "acknowledge");
      expect(saved.currentMoment).toEqual(world.currentMoment);
      const performed = line(saved, personId, mom, "spendTime");
      expect(
        simulationMinutesBetween(world.currentMoment, performed.currentMoment),
      ).toBe(30);
      expect(
        projectLifeConversation(performed, personId, mom)!.proposal!.status,
      ).toBe("performed");
      expect(
        performed.history.events.filter((event) =>
          event.tags.includes("life.proposal.performed"),
        ),
      ).toHaveLength(1);
      expect(() =>
        line(
          deserializeWorld(serializeWorld(performed)),
          personId,
          mom,
          "spendTime",
        ),
      ).toThrow();
      expect(performed.history.resourceOutcomes).toEqual(
        world.history.resourceOutcomes,
      );
      assertWorldIntegrity(performed);
    },
  );

  it.each(["declineProposal", "cancelProposal"])(
    "%s closes the actual saved game proposal for zero time",
    (intent) => {
      const { world, personId } = life("p34-mom-game-3", 10);
      const mom = currentOpeningLifeScene(
        world,
        personId,
      )!.presentPersonIds.find((id) => id !== personId)!;
      let proposed = line(world, personId, mom, "activity");
      if (intent === "cancelProposal")
        proposed = line(proposed, personId, mom, "acceptProposal");
      const closed = line(
        deserializeWorld(serializeWorld(proposed)),
        personId,
        mom,
        intent,
      );
      const saved = deserializeWorld(serializeWorld(closed));
      expect(saved.currentMoment).toEqual(world.currentMoment);
      const view = projectLifeConversation(saved, personId, mom)!;
      expect(view.proposal!.status).toBe(
        intent === "cancelProposal" ? "cancelled" : "declined",
      );
      expect(
        view.intents.some(
          (i) => i.key === "spendTime" || i.key === "acceptProposal",
        ),
      ).toBe(false);
      expect(() => line(saved, personId, mom, intent)).toThrow();
      expect(
        saved.history.events.filter((e) =>
          e.tags.includes("life.proposal.performed"),
        ),
      ).toHaveLength(0);
    },
  );

  it("an interrupted explicit childhood wait stops the whole caller-owned clock request", () => {
    const { world, personId } = life("p34-family-meeting", 10);
    const requests: number[] = [];
    const waited = letStoryTimePass(world, personId, (current, days) => {
      requests.push(days);
      return advanceWorldMinutes(
        current,
        10,
        createCampaignElectionTransitionRegistry(),
      );
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toBeLessThanOrEqual(31);
    expect(
      simulationMinutesBetween(world.currentMoment, waited.currentMoment),
    ).toBe(10);
  });

  it("ten dialogue lines and history/topic browsing cost zero; one authored test meeting owns 60 minutes once", () => {
    const { world: initial, personId } = life("p34-family-meeting", 10);
    const scene = currentOpeningLifeScene(initial, personId)!;
    const other = scene.presentPersonIds.find((id) => id !== personId)!;
    const scheduled = createScheduledActivity(initial, {
      stableKey: "p34:test-meeting",
      title: "Test meeting",
      summary:
        "An illustrative authored 60-minute interval, not a universal meeting duration.",
      kind: "confirmed",
      start: initial.currentMoment,
      end: addSimulationMinutes(initial.currentMoment, 60),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "p34:test-meeting",
        label: "Test interval",
        jurisdictionId: null,
      },
      sourceEntityIds: [scene.eventId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const activityId = scheduled.history.scheduledActivities.at(-1)!.id;
    let world = scheduled;
    for (const intent of [
      "greet",
      "scene",
      "activity",
      "explain",
      "share",
      "acknowledge",
      "remember",
      "greet",
      "activity",
      "explain",
    ])
      world = line(world, personId, other, intent);
    expect(world.currentMoment).toEqual(initial.currentMoment);
    expect(
      world.history.events.filter((e) => e.type === "life.conversation"),
    ).toHaveLength(10);
    expect(scheduledActivityState(world, activityId).status).toBe("scheduled");
    const snapshot = serializeWorld(world);
    conversationHistoryPage(
      conversationExchangeTurns(world, personId, "life-talk", other),
      1,
    );
    projectAdultLife(world, personId);
    expect(serializeWorld(world)).toBe(snapshot);
    world = line(world, personId, other, "leave");
    expect(scheduledActivityState(world, activityId).status).toBe("scheduled");
    const loaded = deserializeWorld(serializeWorld(world));
    const performed = performScheduledActivity(
      loaded,
      activityId,
      createCampaignElectionTransitionRegistry(),
    );
    expect(
      simulationMinutesBetween(initial.currentMoment, performed.currentMoment),
    ).toBe(60);
    expect(scheduledActivityState(performed, activityId).status).toBe(
      "completed",
    );
    expect(() =>
      performScheduledActivity(
        performed,
        activityId,
        createCampaignElectionTransitionRegistry(),
      ),
    ).toThrow();
    expect(performed.history.resourceTransferOutcomes).toEqual(
      initial.history.resourceTransferOutcomes,
    );
    assertWorldIntegrity(performed);
  });

  it("an adult guardian speaks to the child as an adult, with canonical family labels and no dating", () => {
    const { world, personId } = life("p34-family-meeting", 10);
    const other = currentOpeningLifeScene(
      world,
      personId,
    )!.presentPersonIds.find((id) => id !== personId)!;
    const relation = conversationRelationship(world, personId, other);
    expect(["your mom", "your dad", "your parent", "your guardian"]).toContain(
      relation,
    );
    const said = line(world, personId, other, "activity");
    const reply = said.history.events.at(-1)!.context.immediateReaction!;
    expect(reply).toMatch(/We could|How about/);
    expect(reply).not.toMatch(/^Can we/);
    expect(
      projectPlayerConversation(said, personId, "life-talk", {
        addressee: other,
      })!.intents.some((i) => i.key === "date"),
    ).toBe(false);
    expect(said.currentMoment).toEqual(world.currentMoment);
    const saved = deserializeWorld(serializeWorld(said));
    expect(conversationRelationship(saved, personId, other)).toBe(relation);
  });

  it("small opening answers and stop-reading choices do not complete or charge the surrounding activity", () => {
    const { world, personId } = life("p34-family-meeting", 6);
    const scene = currentOpeningLifeScene(world, personId)!;
    const choice = scene.choices.find((c) =>
      /^(Ask|Say|Tell|Let)/.test(c.label),
    );
    expect(choice).toBeDefined();
    const answer = chooseOpeningLifeScene(
      world,
      personId,
      scene.eventId,
      choice!.key,
      createCampaignElectionTransitionRegistry(),
    );
    expect(answer.currentMoment).toEqual(world.currentMoment);
    expect(() =>
      chooseOpeningLifeScene(answer, personId, scene.eventId, choice!.key),
    ).toThrow();
  });
});
