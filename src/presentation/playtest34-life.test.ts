import { enterLifePath } from "../simulation/life-paths2";
import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { letStoryTimePass } from "./life-story";
import { projectLifeConversation } from "./life-conversation";
import {
  chooseAdultOption,
  projectAdultLife,
  letAdultTimePass,
} from "./adult-life";
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
  favorEntries,
  performFavor,
  cancelFavor,
} from "../simulation/life-favors";
import { lifeRequestDetails } from "../simulation/life-request-details";
import {
  availableAdultSituations,
  buildAdultLifeContext,
} from "../simulation/adult-situations";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
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
  placeKey = "lexington-fayette",
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

describe("PLAYTEST34 canonical request → choice → performance → saved follow-through", () => {
  it.each(["lexington-fayette"])(
    "assembles an ordinary named favor in %s, binds a limit once and charges only performance",
    (placeKey) => {
      const { world, personId } = life(`p34-life-${placeKey}`, 35, placeKey);
      const entry = favorEntries(world, personId)[0]!;
      expect(entry).toBeDefined();
      const scene = availableAdultSituations(
        buildAdultLifeContext(world, personId),
      ).find((scene) => scene.key === "adult.friend-favour")!;
      expect(scene.prose).toContain(entry.name);
      expect(scene.prose).toContain("picnic");
      expect(
        scene.options.find((o) => o.key === "conditions")!.label,
      ).toContain(entry.details.condition!);
      const asked = deserializeWorld(serializeWorld(world));
      expect(favorEntries(asked, personId)[0]!.details).toEqual(entry.details);
      const agreed = chooseAdultOption(asked, {
        personId,
        situationKey: "adult.friend-favour",
        optionKey: "conditions",
      });
      expect(agreed.currentMoment).toEqual(world.currentMoment);
      const saved = deserializeWorld(serializeWorld(agreed));
      const same = favorEntries(saved, personId)[0]!;
      expect(same.request.id).toBe(entry.request.id);
      expect(same.counterpartId).toBe(entry.counterpartId);
      expect(same.condition).toBe(entry.details.condition);
      expect(same.status).toBe("agreed");
      expect(same.response!.summary).toContain("has not been done");
      expect(() =>
        chooseAdultOption(saved, {
          personId,
          situationKey: "adult.friend-favour",
          optionKey: "do-it",
        }),
      ).toThrow();
      const done = performFavor(
        saved,
        personId,
        entry.request.id,
        createCampaignElectionTransitionRegistry(),
      );
      expect(
        simulationMinutesBetween(saved.currentMoment, done.currentMoment),
      ).toBe(20);
      expect(favorEntries(done, personId)[0]!.status).toBe("performed");
      expect(
        done.history.events.filter((e) => e.type === "life.favour-performed"),
      ).toHaveLength(1);
      expect(
        done.history.relationshipInteractions.filter((e) =>
          e.tags.includes("life.favour-performed"),
        ),
      ).toHaveLength(1);
      const loadedDone = deserializeWorld(serializeWorld(done));
      expect(
        performFavor(
          loadedDone,
          personId,
          entry.request.id,
          createCampaignElectionTransitionRegistry(),
        ),
      ).toBe(loadedDone);
      expect(cancelFavor(loadedDone, personId, entry.request.id)).toBe(
        loadedDone,
      );
      expect(done.history.personalityTendencies).toEqual(
        saved.history.personalityTendencies,
      );
      assertWorldIntegrity(done);
    },
  );

  it("a saved unperformed agreement returns with the same person/task; due replay cannot repeat it", () => {
    const { world, personId } = life();
    const entry = favorEntries(world, personId)[0]!;
    const agreed = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "do-it",
    });
    const loaded = deserializeWorld(serializeWorld(agreed));
    const later = letAdultTimePass(loaded, 97);
    const callbacks = later.history.events.filter(
      (e) =>
        e.type === "life.earlier-choice-returned" &&
        e.tags.includes(`life.favour-request:${entry.request.id}`),
    );
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]!.summary).toContain(entry.name);
    expect(callbacks[0]!.summary).toContain(entry.details.task);
    expect(callbacks[0]!.summary).toContain("have not finished");
    expect(
      projectAdultLife(later, personId).moments.some(
        (moment) => moment.summary === callbacks[0]!.summary,
      ),
    ).toBe(true);
    expect(
      callbacks[0]!.participants.some(
        (p) => p.personId === entry.counterpartId,
      ),
    ).toBe(true);
    const again = letAdultTimePass(deserializeWorld(serializeWorld(later)), 1);
    expect(
      again.history.events.filter((e) =>
        e.tags.includes(
          `origin:${favorEntries(loaded, personId)[0]!.response!.id}`,
        ),
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(again);
  });

  it("a confirmed commitment inside the performance interval blocks it without losing time or creating rewards", () => {
    const { world, personId } = life();
    const entry = favorEntries(world, personId)[0]!;
    const agreed = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "do-it",
    });
    const busy = createScheduledActivity(agreed, {
      stableKey: "p34:conflict",
      title: "Authored test appointment",
      summary:
        "A protected illustrative appointment starts ten minutes from now.",
      kind: "confirmed",
      start: addSimulationMinutes(agreed.currentMoment, 10),
      end: addSimulationMinutes(agreed.currentMoment, 40),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "p34:conflict",
        label: "Test appointment",
        jurisdictionId: null,
      },
      sourceEntityIds: [entry.request.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const loaded = deserializeWorld(serializeWorld(busy));
    expect(
      performFavor(
        loaded,
        personId,
        entry.request.id,
        createCampaignElectionTransitionRegistry(),
      ),
    ).toBe(loaded);
    expect(favorEntries(loaded, personId)[0]!.status).toBe("agreed");
    expect(
      loaded.history.events.some((e) => e.type === "life.favour-performed"),
    ).toBe(false);
  });

  it("keeps favor performance outside the accepted paid shift and settles its wages once after reload", () => {
    const { world, personId } = life();
    const entry = favorEntries(world, personId)[0]!;
    const agreed = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "do-it",
    });
    const working = enterLifePath(agreed, "shop-assistant").world;
    const handlers = createCampaignElectionTransitionRegistry();
    const morning = letAdultTimePass(working, 1);
    const during = advanceWorldMinutes(morning, 180, handlers);
    const loaded = deserializeWorld(serializeWorld(during));
    expect(performFavor(loaded, personId, entry.request.id, handlers)).toBe(
      loaded,
    );
    const afterShift = advanceWorldMinutes(loaded, 180, handlers);
    const done = performFavor(afterShift, personId, entry.request.id, handlers);
    expect(
      simulationMinutesBetween(afterShift.currentMoment, done.currentMoment),
    ).toBe(20);
    const tomorrow = letAdultTimePass(
      deserializeWorld(serializeWorld(done)),
      1,
    );
    const paid = tomorrow.history.resourceTransferOutcomes.filter(
      (o) =>
        o.status === "completed" &&
        !morning.history.resourceTransferOutcomes.some(
          (before) => before.id === o.id,
        ),
    );
    expect(paid).toHaveLength(1);
    expect(paid[0]!.transferredAmount.minorUnits).toBe(7200);
    const replay = deserializeWorld(serializeWorld(tomorrow));
    expect(performFavor(replay, personId, entry.request.id, handlers)).toBe(
      replay,
    );
    expect(replay.history.resourceTransferOutcomes).toEqual(
      tomorrow.history.resourceTransferOutcomes,
    );
  });

  it("withdraws a specific commitment without elapsed time or a performance reward", () => {
    const { world, personId } = life();
    const entry = favorEntries(world, personId)[0]!;
    const agreed = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "do-it",
    });
    const cancelled = cancelFavor(agreed, personId, entry.request.id);
    expect(cancelled.currentMoment).toEqual(agreed.currentMoment);
    expect(favorEntries(cancelled, personId)[0]!.outcome!.summary).toContain(
      entry.name,
    );
    expect(
      performFavor(
        cancelled,
        personId,
        entry.request.id,
        createCampaignElectionTransitionRegistry(),
      ),
    ).toBe(cancelled);
    expect(
      cancelled.history.events.filter(
        (e) => e.type === "life.favour-performed",
      ),
    ).toHaveLength(0);
  });

  it.each([
    { seed: "p34-life-confidence", kind: "confidence-disclosed" },
    { seed: "p34-life-lexington-fayette", kind: "household-evening" },
  ])("retains producer context for $kind after reload", ({ seed, kind }) => {
    const { world, personId } = life(seed);
    const loaded = deserializeWorld(serializeWorld(world));
    const request = lifeOpportunitiesFor(loaded, personId).find(
      (e) => e.kind === kind,
    )!;
    expect(request).toBeDefined();
    const event = loaded.history.events.find((e) => e.id === request.eventId)!;
    const details = lifeRequestDetails(event)!;
    expect(details).not.toBeNull();
    const scene = availableAdultSituations(
      buildAdultLifeContext(loaded, personId),
    ).find((s) => s.opportunity === request.kind)!;
    expect(scene).toBeDefined();
    expect(scene.prose).toContain(details.opening);
    expect(scene.prose).toContain(
      loaded.people[request.counterpartPersonId!]!.givenName,
    );
    expect(serializeWorld(loaded)).toBe(serializeWorld(world));
  });
});

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
    expect(view.transcript.at(-1)!.reply).toContain("I need some privacy now");
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
