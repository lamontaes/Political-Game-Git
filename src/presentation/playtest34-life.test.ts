import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
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
  enterLifePath,
  createCampaignElectionTransitionRegistry,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
  serializeWorld,
  deserializeWorld,
  simulationMinutesBetween,
  addSimulationMinutes,
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
      sourceEntityIds: [],
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

  it("retains concrete confidence and household context from the producer after reload", () => {
    const { world, personId } = life();
    const loaded = deserializeWorld(serializeWorld(world));
    const requests = lifeOpportunitiesFor(loaded, personId).filter((e) =>
      ["confidence-disclosed", "household-evening"].includes(e.kind),
    );
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      const event = loaded.history.events.find(
        (e) => e.id === request.eventId,
      )!;
      const details = lifeRequestDetails(event)!;
      expect(details).not.toBeNull();
      const scene = availableAdultSituations(
        buildAdultLifeContext(loaded, personId),
      ).find((s) => s.opportunity === request.kind)!;
      expect(scene.prose).toContain(details.opening);
      expect(scene.prose).toContain(
        loaded.people[request.counterpartPersonId!]!.givenName,
      );
    }
    expect(serializeWorld(loaded)).toBe(serializeWorld(world));
  });
});

describe("PLAYTEST34 line-level time and family speech", () => {
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
