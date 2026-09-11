import { describe, expect, it } from "vitest";
import {
  ageOnDate,
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
  lifePlaceSearch,
} from "../simulation";
import { recordOrganizationParticipationState } from "../simulation/life";
import { activeOrganizationParticipationsAt } from "../simulation/life-queries";
import {
  latestPersonalityTendency,
  latestPersonalValue,
} from "../simulation/queries";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import {
  activeOrdinaryGoal,
  chooseOrdinaryLifeGoal,
} from "../simulation/life-personality";
import {
  lifeOpportunitiesFor,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { createOpeningLifeController } from "./opening-life";
import { joinOrdinaryGroup } from "./ordinary-community";
import {
  chooseOpeningLifeScene,
  currentOpeningLifeScene,
  openNextLifeScene,
  walkOpeningNeighborhood,
} from "./life-scene-flow";
import { projectLifeConversation } from "./life-conversation";

function start(age = 24, seed = "ordinary-agency") {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    startAge: age,
    seed,
  });
}

describe("ordinary-life agency and boundaries", () => {
  it("does not derive the player's personality from a name or gender", () => {
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 24,
      seed: "same-personality-seed",
    };
    const a = createNewGameWorld({
      ...setup,
      givenName: "Alex",
      gender: "male",
    });
    const b = createNewGameWorld({
      ...setup,
      givenName: "Morgan",
      gender: "female",
    });
    for (const id of [LIFE_MIND_IDS.conversation, LIFE_MIND_IDS.leisure])
      expect(
        latestPersonalityTendency(a.world, a.playerPersonId, id)?.expressionKey,
      ).toBe(
        latestPersonalityTendency(b.world, b.playerPersonId, id)?.expressionKey,
      );
    for (const id of [
      LIFE_MIND_IDS.privacy,
      LIFE_MIND_IDS.connection,
      LIFE_MIND_IDS.learning,
    ])
      expect(
        latestPersonalValue(a.world, a.playerPersonId, id)?.orientation,
      ).toBe(latestPersonalValue(b.world, b.playerPersonId, id)?.orientation);
  });
  it("completes a personal goal only after performing the activity", () => {
    const game = start(6);
    let world = chooseOrdinaryLifeGoal(
      game.world,
      game.playerPersonId,
      "learning",
    );
    for (let n = 0; n < 12; n++) {
      world = openNextLifeScene(world, game.playerPersonId);
      const scene = currentOpeningLifeScene(world, game.playerPersonId);
      if (!scene) break;
      if (scene.definition.key === "young.home.choose-activity") {
        expect(activeOrdinaryGoal(world, game.playerPersonId, "learning")).toBe(
          true,
        );
        world = chooseOpeningLifeScene(
          world,
          game.playerPersonId,
          scene.eventId,
          "read",
        );
        expect(activeOrdinaryGoal(world, game.playerPersonId, "learning")).toBe(
          false,
        );
        assertWorldIntegrity(world);
        return;
      }
      world = chooseOpeningLifeScene(
        world,
        game.playerPersonId,
        scene.eventId,
        scene.choices[0]!.key,
      );
    }
    throw new Error("The available reading activity was not reachable.");
  });
  it("records accompanied travel and keeps childhood conversations age-appropriate", () => {
    const game = start(6);
    const next = walkOpeningNeighborhood(
      openNextLifeScene(game.world, game.playerPersonId),
      game.playerPersonId,
      "neighborhood",
    );
    expect(next.currentMoment.minuteOfDay).toBe(
      game.world.currentMoment.minuteOfDay + 5,
    );
    const arrival = next.history.events.find(
      (event) => event.type === "life.scene.arrived",
    )!;
    expect(arrival.participants).toHaveLength(2);
    const scene = currentOpeningLifeScene(next, game.playerPersonId)!;
    expect(scene.definition.setting).toBe("neighborhood");
    for (const id of scene.presentPersonIds.filter(
      (id) => id !== game.playerPersonId,
    ))
      expect(
        projectLifeConversation(next, game.playerPersonId, id)!.intents.some(
          (intent) => intent.key === "date",
        ),
      ).toBe(false);
    expect(serializeWorld(deserializeWorld(serializeWorld(next)))).toBe(
      serializeWorld(next),
    );
  });
  it("makes shared participation real and leaves candidacy absent without its prerequisites", () => {
    const young = start(17);
    expect(joinOrdinaryGroup(young.world, young.playerPersonId)).toBe(
      young.world,
    );
    expect(
      lifeOpportunitiesFor(
        refreshLifeOpportunities(young.world, young.playerPersonId),
        young.playerPersonId,
      ).some((entry) => entry.kind === "candidacy-approach"),
    ).toBe(false);
    let reached = false;
    for (const seed of [
      "group-a",
      "group-b",
      "group-c",
      "group-d",
      "group-e",
      "group-f",
      "group-g",
      "group-h",
    ]) {
      const game = start(24, seed);
      expect(
        lifeOpportunitiesFor(
          refreshLifeOpportunities(game.world, game.playerPersonId),
          game.playerPersonId,
        ).some((entry) => entry.kind === "candidacy-approach"),
      ).toBe(false);
      const joined = joinOrdinaryGroup(game.world, game.playerPersonId);
      expect(
        activeOrganizationParticipationsAt(joined, game.playerPersonId).length,
      ).toBe(
        activeOrganizationParticipationsAt(game.world, game.playerPersonId)
          .length + 1,
      );
      expect(joinOrdinaryGroup(joined, game.playerPersonId)).toBe(joined);
      expect(joined.history.campaignCommitments).toEqual(
        game.world.history.campaignCommitments,
      );
      assertWorldIntegrity(joined);
      reached ||= lifeOpportunitiesFor(joined, game.playerPersonId).some(
        (entry) => entry.kind === "candidacy-approach",
      );
    }
    expect(reached).toBe(true);
  });
  it.each(["inactive", "ended"] as const)(
    "can rejoin after participation becomes %s without duplicating people",
    (status) => {
      const game = start();
      const joined = joinOrdinaryGroup(game.world, game.playerPersonId);
      const membership = activeOrganizationParticipationsAt(
        joined,
        game.playerPersonId,
      ).at(-1)!;
      const state = joined.history.organizationParticipationStates
        .filter(
          (entry) => entry.participationId === membership.participation.id,
        )
        .at(-1)!;
      const left = recordOrganizationParticipationState(joined, {
        stableKey: `test:leave:${status}`,
        participationId: membership.participation.id,
        effectiveAt: joined.currentDate,
        status,
        roleKind: state.roleKind,
        context: "Left the group.",
        provenance: membership.participation.provenance,
        supersedesStateId: state.id,
      });
      const rejoined = joinOrdinaryGroup(
        deserializeWorld(serializeWorld(left)),
        game.playerPersonId,
      );
      expect(
        activeOrganizationParticipationsAt(rejoined, game.playerPersonId),
      ).toHaveLength(
        activeOrganizationParticipationsAt(joined, game.playerPersonId).length,
      );
      expect(Object.keys(rejoined.people)).toEqual(Object.keys(joined.people));
      expect(rejoined.history.organizations).toEqual(
        joined.history.organizations,
      );
      expect(rejoined.history.organizationParticipations.length).toBe(
        joined.history.organizationParticipations.length +
          (status === "ended" ? 1 : 0),
      );
      expect(joinOrdinaryGroup(rejoined, game.playerPersonId)).toBe(rejoined);
      assertWorldIntegrity(rejoined);
    },
  );
  it("uses one generation controller across transition callbacks in multiple places", () => {
    for (const name of ["Boston", "Honolulu", "Anchorage"]) {
      const place = lifePlaceSearch(name, 1)[0]!;
      expect(place).toBeDefined();
      const controller = createOpeningLifeController({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        seed: name,
        startAge: 18,
      });
      expect(controller.read().game).toBeNull();
      const result = controller.finishTransition();
      expect(controller.finishTransition()).toBe(result);
      expect(
        ageOnDate(
          result.game!.world.people[result.game!.playerPersonId]!.birthDate,
          result.game!.world.currentDate,
        ),
      ).toBe(18);
    }
  });
});
