import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  serializeWorld,
  deserializeWorld,
  createSyntheticMindCatalog,
  assertWorldIntegrity,
  recordPersonDeath,
} from "../simulation";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  otherParentQuestionApplies,
} from "./new-game";
import { assertLifeMindContent } from "../simulation/life-mind-content";
import { openNextLifeScene, currentOpeningLifeScene } from "./life-scene-flow";
import { projectLifeConversation } from "./life-conversation";
import { buildLifeIntroduction } from "./life-introduction";

function start() {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    startAge: 6,
    household: "shares-a-home",
    seed: "boundaries",
  });
}
describe("OPENING-LIFE1 refusals and historical truth", () => {
  it("records the nonresident or deceased parent the player names, without inventing cause or household presence", () => {
    const covered = new Set<string>();
    // The other parent is the player's answer (A148): find a life with one
    // parent at home, then give each answer.
    const setups = Array.from({ length: 80 }, (_, seed) => ({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 7,
      seed: `parent-history-${seed}`,
    })).filter((setup) => otherParentQuestionApplies(setup));
    for (const answer of ["nonresident", "deceased"] as const) {
      const game = createNewGameWorld({ ...setups[0]!, otherParent: answer });
      const kinship = game.world.history.kinshipRelationships.find((entry) =>
        entry.stableKey.endsWith(":nonresident-parent:kinship"),
      );
      expect(kinship, answer).toBeDefined();
      if (!kinship) continue;
      const parentId = kinship.personIds.find(
        (id) => id !== game.playerPersonId,
      )!;
      const death = game.world.history.personDeaths.find(
        (entry) => entry.personId === parentId,
      );
      covered.add(death ? "deceased" : "nonresident");
      const before = serializeWorld(game.world);
      const introduction = buildLifeIntroduction(
        game.world,
        game.playerPersonId,
      )!;
      expect(
        introduction.household.some((person) => person.personId === parentId),
      ).toBe(false);
      expect(
        introduction.grounding.some((fact) => fact.basis === kinship.id),
      ).toBe(true);
      if (death) {
        expect(death.causeKey).toBe("cause:unknown");
        expect(
          introduction.grounding.find((fact) => fact.basis === kinship.id)!
            .text,
        ).toContain("has died");
      }
      const entered = openNextLifeScene(game.world, game.playerPersonId);
      expect(
        currentOpeningLifeScene(entered, game.playerPersonId)
          ?.presentPersonIds ?? [],
      ).not.toContain(parentId);
      expect(serializeWorld(game.world)).toBe(before);
      expect(
        buildLifeIntroduction(deserializeWorld(before), game.playerPersonId),
      ).toEqual(introduction);
      assertWorldIntegrity(game.world);
    }
    expect([...covered].sort()).toEqual(["deceased", "nonresident"]);
  });
  it("keeps the synthetic catalog firewall closed", () => {
    expect(() => assertLifeMindContent(createSyntheticMindCatalog())).toThrow(
      /Unsupported production/,
    );
  });
  it("invalidates presence after an independent time advance", () => {
    const game = start();
    const world = openNextLifeScene(game.world, game.playerPersonId);
    expect(currentOpeningLifeScene(world, game.playerPersonId)).not.toBeNull();
    expect(
      currentOpeningLifeScene(
        advanceWorldMinutes(world, 1),
        game.playerPersonId,
      ),
    ).toBeNull();
  });
  // The refusal that is explained from what was recorded, even after the
  // person's need has passed, is tested on the path it now takes, an
  // invitation turned down, in conversation-choice-rules.test.ts. Rule R1
  // removed "Ask if you can tell them something", the path this used.
  it("does not introduce a deceased relative as a current housemate", () => {
    const game = start();
    const world = openNextLifeScene(game.world, game.playerPersonId);
    const id = currentOpeningLifeScene(
      world,
      game.playerPersonId,
    )!.presentPersonIds.find((id) => id !== game.playerPersonId)!;
    const dead = recordPersonDeath(world, {
      stableKey: "test:deceased-housemate",
      personId: id,
      diedAt: world.currentDate,
      causeKey: "custom:test-death",
      sourceEntityIds: [id],
      summary: "Authored deceased-person test state.",
      provenance: {
        kind: "authored",
        note: "Regression test; no mortality rate or real cause asserted.",
      },
    });
    assertWorldIntegrity(dead);
    const before = serializeWorld(dead);
    expect(
      buildLifeIntroduction(dead, game.playerPersonId)!.household.some(
        (person) => person.personId === id,
      ),
    ).toBe(false);
    expect(projectLifeConversation(dead, game.playerPersonId, id)).toBeNull();
    expect(serializeWorld(dead)).toBe(before);
  });
});
