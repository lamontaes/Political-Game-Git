import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  createMindProvenance,
  recordPersonalValue,
  latestPersonalValue,
  serializeWorld,
  deserializeWorld,
  createSyntheticMindCatalog,
  assertWorldIntegrity,
  recordPersonDeath,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { assertLifeMindContent } from "../simulation/life-mind-content";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import { openNextLifeScene, currentOpeningLifeScene } from "./life-scene-flow";
import {
  projectLifeConversation,
  commitLifeConversation,
} from "./life-conversation";
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
  it("generates known nonresident and deceased parents without inventing cause or household presence", () => {
    const covered = new Set<string>();
    for (let seed = 0; seed < 80 && covered.size < 2; seed++) {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        startAge: 7,
        seed: `parent-history-${seed}`,
      });
      const kinship = game.world.history.kinshipRelationships.find((entry) =>
        entry.stableKey.endsWith(":nonresident-parent:kinship"),
      );
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
  it("explains a recorded refusal even after the value changes", () => {
    const game = start();
    let world = openNextLifeScene(game.world, game.playerPersonId);
    const id = currentOpeningLifeScene(
      world,
      game.playerPersonId,
    )!.presentPersonIds.find((id) => id !== game.playerPersonId)!;
    function privacy(orientation: "embraces" | "rejects") {
      const previous = latestPersonalValue(world, id, LIFE_MIND_IDS.privacy)!;
      world = recordPersonalValue(world, {
        ...previous,
        stableKey: `privacy:${orientation}`,
        orientation,
        provenance: createMindProvenance("authored", {
          note: "Explicit test state",
        }),
        supersedesValueId: previous.id,
      });
    }
    privacy("embraces");
    let view = projectLifeConversation(world, game.playerPersonId, id)!;
    world = commitLifeConversation(world, {
      playerPersonId: game.playerPersonId,
      personId: id,
      revision: view.revision,
      intent: "share",
    });
    privacy("rejects");
    view = projectLifeConversation(world, game.playerPersonId, id)!;
    world = commitLifeConversation(world, {
      playerPersonId: game.playerPersonId,
      personId: id,
      revision: view.revision,
      intent: "explain",
    });
    expect(
      projectLifeConversation(world, game.playerPersonId, id)!.transcript.at(
        -1,
      )!.reply,
    ).toBe("I'm not ready to talk about it. Please leave it there.");
  });
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
