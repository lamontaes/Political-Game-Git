import { describe, expect, it } from "vitest";

import {
  foundMovementAs,
  joinMovement,
  leaderCandidates,
  worldStates,
  type World,
} from "../simulation";
import { searchLifePlaces } from "../simulation/life-places";
import { projectMovements } from "./movements-view";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

function openLife(seed: string): World {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-NM",
    scope: "locality",
  })[0]!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!.world;
}

function questionId(world: World, key: string) {
  return Object.values(world.policyCatalog.propositions).find((row) =>
    row.stableKey.endsWith(key),
  )!.id;
}

describe("what the player reads about movements", { timeout: 900_000 }, () => {
  it("says plainly that nothing is organizing, and offers every question to found one on", () => {
    const world = openLife("movements-view-empty");
    const me = world.control.kind === "person" ? world.control.personId : "";
    const view = projectMovements(world, me);
    expect(view.here).toEqual([]);
    expect(view.questions.length).toBe(
      world.policyCatalog.propositionOrder.length,
    );
  });

  it("shows a neighbor's movement with who leads it and what the player may do", () => {
    let world = openLife("movements-view-card");
    const me = world.control.kind === "person" ? world.control.personId : "";
    expect(worldStates(world).some((row) => row.stateKey === "US-NM")).toBe(
      true,
    );
    const leader = leaderCandidates(world, "US-NM")[0]!;
    world = foundMovementAs(world, {
      personId: leader,
      propositionId: questionId(world, "automatic-voter-registration"),
      answer: "yes",
    });
    let card = projectMovements(world, me).here[0]!;
    expect(card.title).toBe(
      "New Mexico movement for “Automatic voter registration”",
    );
    expect(card.lines[0]).toMatch(/^Founded .* Led by .+\.$/);
    expect(card.actions.map((row) => row.key)).toEqual([
      "join",
      "oppose",
      "support",
      "condemn",
      "calm",
    ]);
    world = joinMovement(world, card.key, me);
    card = projectMovements(world, me).here[0]!;
    expect(card.role).toBe("member");
    expect(card.lines).toContain("Besides its leader, one person has joined.");
    expect(card.actions.map((row) => row.label)).toContain("Leave it");
  });
});
